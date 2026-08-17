import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { normalizeDashboardCategory } from '../transactions/category-normalizer';
import { resolveTransactionDate } from './transaction-date';
import { resolveBillDueDate } from './bill-detection';
import { parsePaymentIntent, PaymentIntent } from './payment-intent';
import { matchBills } from './bill-matcher';
import { parseContributionIntent, ContributionIntent } from './goal-contribution-intent';
import { matchGoals } from './goal-matcher';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { ContextsService } from '../contexts/contexts.service';
import { BillsService } from '../bills/bills.service';
import { Bill } from '../bills/entities/bill.entity';
import { GoalsService } from '../goals/goals.service';
import { Goal, GoalType } from '../goals/entities/goal.entity';
import { 
  TelegramUpdate, 
  TelegramMessage, 
  TelegramCallbackQuery,
  TelegramBotResponse,
  ParsedTransaction,
  TelegramChat
} from './interfaces/telegram.interface';
import { MessageProcessorService } from './message-processor.service';
import { ContextDetectionService } from './context-detection.service';
import { ContextSetupService } from './context-setup.service';
import { getTelegramTranslation, formatTemplate, TelegramTranslations } from './translations';
import { describeUpdate } from './utils/log-sanitizer';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;
  private readonly telegramMode: string;
  private readonly batchTransactions = new Map<string, ParsedTransaction[]>();
  /**
   * Settlements waiting for the user to press "yes, mark as paid". Keyed by a
   * temp id (never the bill id itself) so callback data stays opaque, exactly
   * like stored transactions.
   */
  private readonly pendingBillPayments = new Map<string, { billId: string; amount?: number }>();
  /** Goal deposits waiting for "yes, deposit" — same opaque temp-id scheme. */
  private readonly pendingGoalContributions = new Map<string, { goalId: string; amount: number }>();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;
  private isPolling = false;
  private shouldStopPolling = false;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private usersService: UsersService,
    private transactionsService: TransactionsService,
    private contextsService: ContextsService,
    private messageProcessor: MessageProcessorService,
    private contextDetection: ContextDetectionService,
    private contextSetup: ContextSetupService,
    private billsService: BillsService,
    private goalsService: GoalsService,
  ) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.webhookUrl = this.configService.get('TELEGRAM_WEBHOOK_URL');
    this.telegramMode = this.configService.get('TELEGRAM_MODE', 'webhook');
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.webhookSecret = this.resolveWebhookSecret();
  }

  /**
   * Secret shared with Telegram so the webhook endpoint can tell genuine
   * updates from forged ones. Defaults to a value derived from the bot token
   * so deployments need no extra configuration: anyone able to derive it
   * already holds the token, which grants more than the webhook does.
   */
  private resolveWebhookSecret(): string {
    const configured = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    if (configured) {
      // Telegram only accepts A-Z, a-z, 0-9, _ and - (1-256 chars); a rejected
      // secret would leave setWebhook failing and the bot silently unreachable.
      if (/^[A-Za-z0-9_-]{1,256}$/.test(configured)) {
        return configured;
      }
      this.logger.error(
        'TELEGRAM_WEBHOOK_SECRET contains characters Telegram rejects (allowed: A-Z, a-z, 0-9, _, -). Falling back to the token-derived secret.',
      );
    }

    if (!this.botToken) {
      return '';
    }

    return crypto
      .createHash('sha256')
      .update(`financy-webhook:${this.botToken}`)
      .digest('hex');
  }

  /**
   * Constant-time check of the X-Telegram-Bot-Api-Secret-Token header sent
   * with every webhook update once the secret is registered.
   */
  verifyWebhookSecret(providedSecret?: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    // Hashing both sides keeps the comparison constant-time regardless of the
    // provided value's length (timingSafeEqual throws on length mismatch).
    const expected = crypto.createHash('sha256').update(this.webhookSecret).digest();
    const actual = crypto.createHash('sha256').update(providedSecret ?? '').digest();

    return crypto.timingSafeEqual(expected, actual);
  }

  async onModuleInit() {
    if (this.botToken) {
      if (this.telegramMode === 'polling') {
        await this.deleteWebhook();
        await this.startPolling();
        this.logger.log('Telegram bot started in POLLING mode');
      } else {
        await this.setupWebhook();
      }
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured. Telegram integration disabled.');
    }
  }

  async onModuleDestroy() {
    this.shouldStopPolling = true;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.logger.log('Telegram polling stopped');
  }

  async setupWebhook(): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/setWebhook`, {
          url: this.webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
          secret_token: this.webhookSecret,
        })
      );

      if (response.data.ok) {
        this.logger.log('Telegram webhook setup successfully');
      } else {
        this.logger.error('Failed to setup webhook:', response.data);
        this.logger.error(
          'The bot will not receive updates until the webhook is registered with its secret token (retry via POST /api/v1/webhooks/telegram/setup).',
        );
      }
    } catch (error) {
      this.logger.error('Error setting up webhook:', error.message);
      this.logger.error(
        'The bot will not receive updates until the webhook is registered with its secret token (retry via POST /api/v1/webhooks/telegram/setup).',
      );
    }
  }

  async deleteWebhook(): Promise<void> {
    try {
      // First, check current webhook status
      const infoResponse = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/getWebhookInfo`)
      );

      if (infoResponse.data.ok && infoResponse.data.result.url) {
        this.logger.log(`Existing webhook found: ${infoResponse.data.result.url}`);
      }

      // Delete the webhook
      const response = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/deleteWebhook`, {
          drop_pending_updates: true,
        })
      );

      if (response.data.ok) {
        this.logger.log('Telegram webhook deleted successfully');

        // Verify deletion
        const verifyResponse = await lastValueFrom(
          this.httpService.get(`${this.baseUrl}/getWebhookInfo`)
        );

        if (verifyResponse.data.ok) {
          this.logger.log(`Webhook status after deletion: ${JSON.stringify(verifyResponse.data.result)}`);
        }
      } else {
        this.logger.warn('Failed to delete webhook:', response.data);
      }
    } catch (error) {
      this.logger.error('Error deleting webhook:', error.message);
    }
  }

  async startPolling(): Promise<void> {
    this.logger.log('Starting Telegram polling...');
    this.shouldStopPolling = false;
    this.isPolling = false;

    // Start the polling loop
    this.pollLoop();
  }

  private async pollLoop(): Promise<void> {
    while (!this.shouldStopPolling) {
      await this.poll();

      // Short delay between polls (only if we should continue)
      if (!this.shouldStopPolling) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.log('Polling loop ended');
  }

  private async poll(): Promise<void> {
    // Prevent concurrent polling
    if (this.isPolling) {
      this.logger.warn('Skipping poll - already polling');
      return;
    }

    this.isPolling = true;

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/getUpdates`, {
          params: {
            offset: this.lastUpdateId + 1,
            timeout: 30,
            allowed_updates: ['message', 'callback_query'],
          },
          timeout: 35000, // Slightly longer than Telegram's timeout
        })
      );

      if (response.data.ok && response.data.result.length > 0) {
        for (const update of response.data.result) {
          this.lastUpdateId = update.update_id;
          await this.processUpdate(update);
        }
      }
    } catch (error) {
      // Handle 409 conflicts gracefully
      if (error.response?.status === 409) {
        this.logger.warn('Polling conflict detected (409). Another instance may be running. Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else if (error.code !== 'ECONNABORTED') {
        this.logger.error('Error polling for updates:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
        });

        // Add a small delay on errors to avoid hammering the API
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } finally {
      this.isPolling = false;
    }
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      this.logger.debug('Processing update:', describeUpdate(update));

      if (update.message) {
        await this.processMessage(update.message);
      } else if (update.callback_query) {
        await this.processCallbackQuery(update.callback_query);
      }
    } catch (error) {
      this.logger.error('Error processing update:', error);
      
      const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
      if (chatId) {
        await this.sendMessage(chatId, 'Sorry, I encountered an error processing your message. Please try again.');
      }
    }
  }

  private async processMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const telegramUserId = message.from?.id?.toString();
    const telegramUsername = message.from?.username;

    // Handle bot added to group
    if (message.new_chat_members?.some(member => member.is_bot)) {
      await this.handleBotAddedToGroup(message.chat, telegramUserId);
      return;
    }

    if (!telegramUserId) {
      await this.sendMessage(chatId, 'Unable to identify user. Please try again.');
      return;
    }

    const userId = await this.getUserFromTelegramId(telegramUserId);

    // Special handling for /start command with token (linking flow)
    // Allow unregistered users to process linking commands
    if (!userId && message.text?.startsWith('/start ')) {
      await this.handleCommand(chatId, message.text, userId, telegramUserId, telegramUsername);
      return;
    }

    if (!userId) {
      await this.handleUnregisteredUser(chatId, message.from);
      return;
    }

    // Check if we're in a setup flow
    const setupState = this.contextSetup.getSetupState(chatId.toString());
    if (setupState && setupState.step === 'name' && message.text && !message.text.startsWith('/')) {
      await this.handleContextNameInput(chatId, message.text, userId);
      return;
    }

    // Handle different message types
    if (message.text?.startsWith('/')) {
      await this.handleCommand(chatId, message.text, userId, telegramUserId, telegramUsername);
      return;
    }

    // One gate for every kind of content in a group — text, voice, photo,
    // PDF: only members who can record expenses in the group's context get
    // through, and nobody is enrolled as a side effect unless the chat's own
    // wizard created its context with that "everyone here" promise.
    if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
      const gate = await this.contextDetection.enrollGroupSender(
        userId,
        chatId.toString(),
        message.chat.type,
      );
      if (!gate.allowed) {
        const translation = getTelegramTranslation(await this.getUserLanguage(userId));
        const template =
          gate.reason === 'cannot-post' ? translation.groups.cannotPost : translation.groups.noAccess;
        await this.sendMessage(chatId, formatTemplate(template, { name: gate.contextName ?? '' }));
        return;
      }
    }

    if (message.voice) {
      await this.handleVoiceMessage(chatId, message.voice, userId);
    } else if (message.photo && message.photo.length > 0) {
      await this.handlePhotoMessage(chatId, message.photo, userId);
    } else if (message.document) {
      await this.handleDocumentMessage(chatId, message.document, userId);
    } else if (message.text) {
      await this.handleTextMessage(chatId, message.text, userId, message);
    } else {
      await this.sendMessage(chatId, 'I can process text messages, voice messages, photos, and PDF receipts. Please try one of those!');
    }
  }

  private async processCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat?.id;
    const data = callbackQuery.data;
    const telegramUserId = callbackQuery.from.id.toString();

    if (!chatId || !data) return;

    const userId = await this.getUserFromTelegramId(telegramUserId);
    if (!userId) return;

    try {
      // Handle setup-related callbacks
      if (data.startsWith('setup_')) {
        await this.handleSetupCallback(chatId, data, userId, callbackQuery.id);
        return;
      }

      // Handle batch transaction callbacks
      if (data.startsWith('confirm_batch_') || data.startsWith('review_batch_') || data.startsWith('cancel_batch_')) {
        await this.handleBatchCallback(chatId, data, userId);
        return;
      }

      // Handle transaction-related callbacks
      const [action, transactionId] = data.split('_');

      switch (action) {
        case 'confirm':
          await this.confirmTransaction(chatId, transactionId, userId);
          break;
        case 'edit':
          await this.editTransaction(chatId, transactionId, userId);
          break;
        case 'cancel':
          await this.cancelTransaction(chatId, transactionId);
          break;
        case 'bill':
          await this.registerBillFromStored(chatId, transactionId, userId);
          break;
        case 'paybill':
          await this.settlePendingBillPayment(chatId, transactionId, userId);
          break;
        case 'paycancel':
          await this.cancelPendingBillPayment(chatId, transactionId, userId);
          break;
        case 'remindpay':
          // From a due-date reminder: the id is the bill itself — reminders
          // outlive any short-lived pending-payment store.
          await this.completeBillPayment(chatId, transactionId, undefined, userId);
          break;
        case 'goalpay':
          await this.settlePendingGoalContribution(chatId, transactionId, userId);
          break;
        case 'goalcancel':
          await this.cancelPendingGoalContribution(chatId, transactionId, userId);
          break;
        case 'goalremind':
          // From a month-end reminder: the id is the goal itself, and the
          // missing amount is recomputed at press time, never trusted stale.
          await this.completeGoalTopUp(chatId, transactionId, userId);
          break;
        default:
          await this.sendMessage(chatId, 'Unknown action.');
      }

      // Answer the callback query to remove the "loading" state
      await this.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      this.logger.error('Error processing callback query:', error);
      await this.sendMessage(chatId, 'Error processing your request.');
    }
  }

  private async handleCommand(chatId: number, command: string, userId: string, telegramUserId?: string, telegramUsername?: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case '/start':
        // Check if a link token was provided via deep link (e.g., /start TOKEN)
        if (args.length > 0) {
          // Always handle link command if token is provided (will check if already linked inside)
          await this.handleLinkCommand(chatId, userId, args, telegramUserId, telegramUsername);
        } else {
          // No token, just send welcome message
          await this.sendWelcomeMessage(chatId, userId);
        }
        break;

      case '/help':
        await this.sendHelpMessage(chatId);
        break;

      case '/contexts':
        await this.handleContextsCommand(chatId, userId);
        break;

      case '/summary':
        await this.handleSummaryCommand(chatId, userId, args);
        break;

      case '/link':
        await this.handleLinkCommand(chatId, userId, args, telegramUserId, telegramUsername);
        break;

      default:
        await this.sendMessage(chatId, '🤔 Unknown command. Type /help for available commands.');
    }
  }

  private async handleTextMessage(chatId: number, text: string, userId: string, message?: TelegramMessage): Promise<void> {
    try {
      // Group senders were already gated in processMessage.

      // "paguei a alares" settles an open bill rather than creating a second
      // expense. Only when a bill actually matches — otherwise the message
      // falls through untouched and parses as a normal transaction.
      const paymentIntent = parsePaymentIntent(text);
      if (paymentIntent) {
        const handled = await this.tryBillSettlement(chatId, paymentIntent, userId, message);
        if (handled) {
          return;
        }
      }

      // "aportei 500 no dólar" tops up a savings goal rather than logging an
      // expense. Same discipline as bills: only when a goal actually matches.
      const contributionIntent = parseContributionIntent(text);
      if (contributionIntent) {
        const handled = await this.tryGoalContribution(chatId, contributionIntent, userId, message);
        if (handled) {
          return;
        }
      }

      await this.sendMessage(chatId, '🤔 Processing your transactions...');

      // Get user's default currency from their profile
      let defaultCurrency = 'USD'; // fallback default
      try {
        // (was querying telegramUserId with the database id, so the text flow
        // always fell back to USD)
        const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });
        if (user && user.defaultCurrency) {
          defaultCurrency = user.defaultCurrency;
          this.logger.log(`Using user's default currency: ${defaultCurrency}`);
        }
      } catch (error) {
        this.logger.warn('Could not fetch user default currency, using USD:', error.message);
      }

      // Determine context for this message
      let contextId: string | null = null;
      if (message) {
        try {
          contextId = await this.contextDetection.determineContext(message, userId);
        } catch (error) {
          this.logger.warn('Could not determine context:', error.message);
        }
      }

      const parsedTransactions = await this.messageProcessor.processTextMessage(text, userId, defaultCurrency);

      if (parsedTransactions && parsedTransactions.length > 0) {
        // Filter transactions with sufficient confidence
        // Inclusive on purpose: the regex fallback reports exactly 0.6, and it
        // exists precisely so an AI outage still yields a confirmable draft —
        // a strict comparison silently discarded everything it produced.
        const validTransactions = parsedTransactions.filter(transaction => transaction.confidence >= 0.6);
        
        if (validTransactions.length > 0) {
          // Add context info to all transactions
          validTransactions.forEach(transaction => {
            if (contextId) {
              transaction.contextId = contextId;
            }
          });

          if (validTransactions.length === 1) {
            // Single transaction - use existing format
            const confirmationMessage = await this.formatTransactionConfirmation(validTransactions[0], userId);
            const userLanguage = await this.getUserLanguage(userId);
            const translation = getTelegramTranslation(userLanguage);
            await this.sendMessage(chatId, confirmationMessage, {
              reply_markup: {
                inline_keyboard: [[
                  { text: translation.buttons.confirm, callback_data: `confirm_${validTransactions[0].tempId}` },
                  { text: translation.buttons.edit, callback_data: `edit_${validTransactions[0].tempId}` },
                  { text: translation.buttons.cancel, callback_data: `cancel_${validTransactions[0].tempId}` },
                ]],
              },
            });
          } else {
            // Multiple transactions - use batch format
            const confirmationMessage = await this.formatMultiTransactionConfirmation(validTransactions, userId);
            const batchId = crypto.randomBytes(16).toString('hex');
            
            // Store batch for processing
            this.storeBatchTransactions(batchId, validTransactions);
            
            const userLanguage = await this.getUserLanguage(userId);
            const translation = getTelegramTranslation(userLanguage);
            await this.sendMessage(chatId, confirmationMessage, {
              reply_markup: {
                inline_keyboard: [[
                  { text: translation.buttons.confirmAll, callback_data: `confirm_batch_${batchId}` },
                  { text: translation.buttons.review, callback_data: `review_batch_${batchId}` },
                  { text: translation.buttons.cancelAll, callback_data: `cancel_batch_${batchId}` },
                ]],
              },
            });
          }
        } else {
          await this.sendMessage(chatId, 
            '🤷‍♀️ I found some transactions but they seem unclear. Please try a clearer format like:\n\n' +
            '• "Spent $50 on groceries"\n' +
            '• "Coffee $5 and gas $40"\n' +
            '• "Paid R$25 for lunch at McDonald\'s"\n' +
            '• "Got €200 from freelance work"'
          );
        }
      } else {
        await this.sendMessage(chatId, 
          '🤷‍♀️ I couldn\'t understand any transactions in that message. Please try a format like:\n\n' +
          '• "Spent $50 on groceries"\n' +
          '• "Coffee $5 and gas $40"\n' +
          '• "Received $1000 salary"\n' +
          '• "Paid R$25 for lunch, then $40 for gas"'
        );
      }
    } catch (error) {
      this.logger.error('Error processing text message:', error);
      await this.sendMessage(chatId, 'Sorry, I couldn\'t process that transaction. Please try again.');
    }
  }

  private async handleVoiceMessage(chatId: number, voice: any, userId: string): Promise<void> {
    try {
      await this.sendMessage(chatId, '🎤 Processing your voice message...');

      const audioText = await this.messageProcessor.processVoiceMessage(voice, userId);
      
      if (audioText) {
        await this.sendMessage(chatId, `I heard: "${audioText}"`);
        await this.handleTextMessage(chatId, audioText, userId);
      } else {
        await this.sendMessage(chatId, 'Sorry, I couldn\'t understand the voice message. Please try again or type your transaction.');
      }
    } catch (error) {
      this.logger.error('Error processing voice message:', error);
      await this.sendMessage(chatId, 'Sorry, I couldn\'t process that voice message.');
    }
  }

  private async handlePhotoMessage(chatId: number, photos: any[], userId: string): Promise<void> {
    try {
      const translation = getTelegramTranslation(await this.getUserLanguage(userId));
      await this.sendMessage(chatId, translation.receipt.processingPhoto);

      // Get user's default currency from their profile
      let defaultCurrency = 'USD'; // fallback default
      try {
        const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });
        if (user && user.defaultCurrency) {
          defaultCurrency = user.defaultCurrency;
          this.logger.log(`Using user's default currency for photo: ${defaultCurrency}`);
        }
      } catch (error) {
        this.logger.warn('Could not fetch user default currency for photo, using USD:', error.message);
      }

      // Process all photos
      const extractedTransactions = await this.messageProcessor.processPhotoMessage(photos, userId, defaultCurrency);
      await this.presentExtractedReceipts(chatId, extractedTransactions, userId);
    } catch (error) {
      this.logger.error('Error processing photo message:', error);
      const translation = getTelegramTranslation(await this.getUserLanguage(userId));
      await this.sendMessage(chatId, translation.receipt.failed);
    }
  }

  private async handleDocumentMessage(chatId: number, document: any, userId: string): Promise<void> {
    const translation = getTelegramTranslation(await this.getUserLanguage(userId));

    // The only document type the OCR pipeline understands is a PDF receipt.
    if (document.mime_type !== 'application/pdf') {
      await this.sendMessage(chatId, translation.receipt.unsupportedFile);
      return;
    }

    try {
      await this.sendMessage(chatId, translation.receipt.processingPdf);

      let defaultCurrency = 'USD';
      try {
        const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });
        if (user?.defaultCurrency) {
          defaultCurrency = user.defaultCurrency;
        }
      } catch (error) {
        this.logger.warn('Could not fetch user default currency for PDF, using USD:', error.message);
      }

      const extractedTransactions = await this.messageProcessor.processPdfMessage(
        document,
        userId,
        defaultCurrency,
      );
      await this.presentExtractedReceipts(chatId, extractedTransactions, userId);
    } catch (error) {
      this.logger.error('Error processing document message:', error);
      await this.sendMessage(chatId, translation.receipt.failed);
    }
  }

  /**
   * Shows the transactions read from a receipt (photo or PDF) with confirm
   * buttons — one confirmation for a single transaction, a batch for several,
   * and a clear message when nothing legible came back. Shared by the photo
   * and PDF handlers so both behave identically.
   */
  private async presentExtractedReceipts(
    chatId: number,
    extractedTransactions: ParsedTransaction[],
    userId: string,
  ): Promise<void> {
    const translation = getTelegramTranslation(await this.getUserLanguage(userId));
    const validTransactions = (extractedTransactions || []).filter((t) => t.confidence > 0.6);

    if (validTransactions.length === 0) {
      const hadResults = extractedTransactions && extractedTransactions.length > 0;
      await this.sendMessage(
        chatId,
        hadResults ? translation.receipt.lowConfidence : translation.receipt.notRecognized,
      );
      return;
    }

    if (validTransactions.length === 1) {
      const single = validTransactions[0];

      // A bill is an intention, not a fact: instead of "confirm this expense"
      // the bot asks whether it was paid. "Already paid" runs the normal
      // confirm flow (the date clamp files it today); "bill to pay" registers
      // it under Planning with the detected due date. Batches keep the plain
      // flow — bills arrive as single documents.
      const dueDate = resolveBillDueDate(single, new Date());
      if (dueDate) {
        single.dueDate = dueDate;
        const message = await this.formatBillCandidate(single, dueDate, translation, userId);
        await this.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: [[
              { text: translation.buttons.alreadyPaid, callback_data: `confirm_${single.tempId}` },
              { text: translation.buttons.registerBill, callback_data: `bill_${single.tempId}` },
              { text: translation.buttons.cancel, callback_data: `cancel_${single.tempId}` },
            ]],
          },
        });
        return;
      }

      const confirmationMessage = await this.formatTransactionConfirmation(single, userId);
      await this.sendMessage(chatId, confirmationMessage, {
        reply_markup: {
          inline_keyboard: [[
            { text: translation.buttons.confirm, callback_data: `confirm_${single.tempId}` },
            { text: translation.buttons.edit, callback_data: `edit_${single.tempId}` },
            { text: translation.buttons.cancel, callback_data: `cancel_${single.tempId}` },
          ]],
        },
      });
      return;
    }

    const confirmationMessage = await this.formatMultiTransactionConfirmation(validTransactions, userId);
    const batchId = crypto.randomBytes(16).toString('hex');
    this.storeBatchTransactions(batchId, validTransactions);
    await this.sendMessage(chatId, confirmationMessage, {
      reply_markup: {
        inline_keyboard: [[
          { text: translation.buttons.confirmAll, callback_data: `confirm_batch_${batchId}` },
          { text: translation.buttons.review, callback_data: `review_batch_${batchId}` },
          { text: translation.buttons.cancelAll, callback_data: `cancel_batch_${batchId}` },
        ]],
      },
    });
  }

  private async sendWelcomeMessage(chatId: number, userId?: string): Promise<void> {
    // Check if user is already linked
    const isLinked = !!userId;

    let message: string;

    if (isLinked) {
      // Message for existing/linked users
      message = `
🏦 <b>Welcome back to Financy!</b>

Great to see you again! I'm ready to help you track your finances. 💼

<b>Quick Reminders:</b>

💰 <b>Track Transactions</b>
Just tell me what you spent or earned:
• "Paid $50 for groceries"
• "Received $1000 salary"
• "Spent R$25 on lunch"

🎤 <b>Voice Messages</b>
Send me a voice message describing your transaction

📷 <b>Receipt Photos</b>
Take a photo of any receipt and I'll extract the details

📊 <b>Useful Commands</b>
/summary - View your spending summary
/contexts - Manage your financial contexts
/help - Show detailed help

Let's continue tracking your finances! 🚀
      `;
    } else {
      // Message for new/unlinked users
      message = `
🏦 <b>Welcome to Financy!</b>

I'm your personal financial assistant bot!

To get started, you'll need to link your Telegram account to your Financy web account:

<b>📱 Step 1:</b> Create an account
• Visit: ${this.configService.get('FRONTEND_URL', 'https://financy.app')}
• Register or log in

<b>🔗 Step 2:</b> Link your account
• Go to Settings → Telegram Integration
• Click "Generate Link Token" or scan the QR code
• Your account will be linked automatically!

<b>✨ Once linked, you can:</b>
• Track transactions via text, voice, or photos
• View spending summaries anytime
• Manage multiple financial contexts
• Access all your data synced with the web app

Questions? Type /help for more information! 😊
      `;
    }

    await this.sendMessage(chatId, message);
  }

  private async sendHelpMessage(chatId: number): Promise<void> {
    const message = `
🆘 <b>Financy Help</b>

<b>Adding Transactions:</b>
• Type naturally: "Bought coffee for $5"
• Send voice messages
• Take photos of receipts

<b>Commands:</b>
/start - Welcome message
/help - This help message
/contexts - Manage financial contexts
/summary [days] - Spending summary (default: 30 days)
/link [token] - Link your Telegram to web account

<b>Examples:</b>
• "Spent $50 on groceries at Walmart"
• "Received $1200 salary from work"
• "Paid R$35 for dinner"
• "Got €200 freelance payment"

Need more help? Visit our web app for detailed features!
    `;

    await this.sendMessage(chatId, message);
  }

  private async handleContextsCommand(chatId: number, userId: string): Promise<void> {
    try {
      const contexts = await this.contextsService.findUserContexts(userId);
      
      if (contexts.length === 0) {
        await this.sendMessage(chatId, 'You don\'t have any financial contexts yet. Create one in the web app!');
        return;
      }

      let message = '📁 <b>Your Financial Contexts:</b>\n\n';
      contexts.forEach((context, index) => {
        const icon = this.getContextIcon(context.type);
        message += `${icon} <b>${context.name}</b>\n`;
        message += `   Type: ${context.type}\n`;
        if (context.description) {
          message += `   ${context.description}\n`;
        }
        message += '\n';
      });

      message += 'Use the web app to manage contexts and switch between them.';
      await this.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Error handling contexts command:', error);
      await this.sendMessage(chatId, 'Error retrieving your contexts.');
    }
  }

  private async handleSummaryCommand(chatId: number, userId: string, args: string[]): Promise<void> {
    try {
      const days = args.length > 0 ? parseInt(args[0]) || 30 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const summary = await this.transactionsService.findUserTransactions(userId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        page: 1,
        limit: 1000,
      });

      let message = `📊 <b>Financial Summary (Last ${days} days)</b>\n\n`;
      message += `💰 Income: $${summary.summary.totalIncome.toFixed(2)}\n`;
      message += `💸 Expenses: $${summary.summary.totalExpenses.toFixed(2)}\n`;
      message += `📈 Net: $${summary.summary.netAmount.toFixed(2)}\n`;
      message += `📝 Transactions: ${summary.summary.transactionCount}\n\n`;

      if (summary.summary.categories.length > 0) {
        message += '<b>Top Categories:</b>\n';
        summary.summary.categories.slice(0, 5).forEach(cat => {
          message += `• ${cat.category}: $${cat.amount.toFixed(2)}\n`;
        });
      }

      await this.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Error handling summary command:', error);
      await this.sendMessage(chatId, 'Error generating your summary.');
    }
  }

  private async handleLinkCommand(chatId: number, userId: string, args: string[], telegramUserId?: string, telegramUsername?: string): Promise<void> {
    // If user is already linked, show status
    if (userId) {
      await this.sendMessage(chatId, '✅ Your Telegram account is already linked to Financy!\n\nYou can now track your transactions here.');
      return;
    }

    // If no token provided, show instructions
    if (args.length === 0) {
      const message = `
🔗 <b>Link Your Account</b>

To link your Telegram account with the web app:

<b>Step 1:</b> Create an account
• Visit: ${this.configService.get('FRONTEND_URL', 'https://financy.app')}
• Register or log in to your account

<b>Step 2:</b> Generate linking token
• Go to Settings → Telegram Integration
• Click "Generate Linking Token"
• Copy the token

<b>Step 3:</b> Use the token
• Send: <code>/link YOUR_TOKEN_HERE</code>

<b>Example:</b>
<code>/link abc123def456...</code>

This will securely link your accounts and sync your transaction data! 🚀
      `;

      await this.sendMessage(chatId, message);
      return;
    }

    // Ensure we have telegramUserId
    if (!telegramUserId) {
      await this.sendMessage(chatId, 'Unable to identify your Telegram account. Please try again.');
      return;
    }

    // Process the linking token
    const token = args[0];

    try {
      const linkedUser = await this.usersService.linkTelegramWithToken(token, telegramUserId, telegramUsername);

      const firstName = linkedUser.firstName || 'there';
      const successMessage = `
✅ <b>Account Linked Successfully!</b>

Hello, ${firstName}! Your Telegram account is now connected to Financy! 🎉

<b>What you can do now:</b>
• Send text messages with transactions
• Send voice messages describing expenses
• Take photos of receipts for automatic processing
• View summaries with /summary
• Manage contexts with /contexts

Start tracking your finances by sending me a message like:
"Spent $20 on lunch at Subway"

Type /help for more information!
      `;

      await this.sendMessage(chatId, successMessage);
    } catch (error) {
      this.logger.error('Error linking Telegram account:', error);
      
      let errorMessage = '❌ <b>Linking Failed</b>\n\n';
      
      if (error.message.includes('Invalid or expired')) {
        errorMessage += 'The linking token is invalid or has expired. Please generate a new token in the web app.';
      } else if (error.message.includes('already linked')) {
        errorMessage += 'This Telegram account is already linked to another Financy account.';
      } else {
        errorMessage += 'An error occurred while linking your account. Please try again or contact support.';
      }

      await this.sendMessage(chatId, errorMessage);
    }
  }

  private async handleUnregisteredUser(chatId: number, user: any): Promise<void> {
    const message = `
👋 Hi ${user.first_name}!

To use Financy, you need to create an account first:

1. Visit our web app: ${this.configService.get('FRONTEND_URL', 'https://financy.app')}
2. Create your account
3. Go to Settings → Telegram Integration
4. Follow the linking instructions

Once linked, you can track transactions directly through Telegram! 🚀
    `;

    await this.sendMessage(chatId, message);
  }

  /**
   * Turns a parsed message (text, voice or receipt) into the payload the
   * transactions service expects. Two things were wrong before this existed:
   * dashboardCategory was never set, so bot transactions landed in "Other" on
   * the dashboard, and the extracted date was thrown away in favour of today,
   * so a receipt from last week was filed under today.
   */
  private buildTransactionPayload(transactionData: ParsedTransaction): CreateTransactionDto {
    const dashboardCategory = normalizeDashboardCategory(
      transactionData.type,
      transactionData.category,
    );

    return {
      amount: transactionData.amount,
      description: transactionData.description,
      type: transactionData.type as any,
      currency: transactionData.currency,
      category: dashboardCategory,
      dashboardCategory,
      merchantName: transactionData.merchantName,
      date: resolveTransactionDate(transactionData.date, new Date()),
      contextId: transactionData.contextId,
    };
  }

  private async confirmTransaction(chatId: number, tempId: string, userId: string): Promise<void> {
    try {
      const transactionData = await this.messageProcessor.getStoredTransaction(tempId);

      if (!transactionData) {
        await this.sendMessage(chatId, 'Transaction data expired. Please try again.');
        return;
      }

      // Create the transaction
      const transaction = await this.transactionsService.create(
        this.buildTransactionPayload(transactionData),
        userId,
      );

      await this.sendMessage(chatId, `✅ Transaction confirmed!\n\n💰 ${transactionData.amount} ${transactionData.currency} - ${transactionData.description}`);
      
      // Clean up stored transaction
      await this.messageProcessor.removeStoredTransaction(tempId);
    } catch (error) {
      this.logger.error('Error confirming transaction:', error);
      await this.sendMessage(chatId, 'Error saving transaction. Please try again.');
    }
  }

  private async editTransaction(chatId: number, tempId: string, userId: string): Promise<void> {
    const message = `
✏️ <b>Edit Transaction</b>

Please send me the corrected transaction details in this format:
• Amount: $50
• Description: Groceries  
• Category: Food & Dining
• Merchant: Walmart

Or just type the complete transaction again:
"Spent $50 on groceries at Walmart"
    `;

    await this.sendMessage(chatId, message);
  }

  private async cancelTransaction(chatId: number, tempId: string): Promise<void> {
    await this.messageProcessor.removeStoredTransaction(tempId);
    await this.sendMessage(chatId, '❌ Transaction cancelled.');
  }

  /** "This looks like a bill" card: amount, due date, and the paid-yet question. */
  private async formatBillCandidate(
    transaction: ParsedTransaction,
    dueDate: string,
    translation: TelegramTranslations,
    userId: string,
  ): Promise<string> {
    const language = await this.getUserLanguage(userId);
    const amount = this.formatMoney(Number(transaction.amount), transaction.currency, language);
    const overdue = dueDate < new Date().toISOString().slice(0, 10);
    const merchantLine = transaction.merchantName ? `\n🏪 ${transaction.merchantName}` : '';
    const dueLine =
      `📅 <b>${translation.bills.dueLabel}</b> ${this.formatDateForLanguage(dueDate, language)}` +
      (overdue ? ` ${translation.bills.overdueTag}` : '');

    return (
      `${translation.bills.detected}\n\n` +
      `💰 <b>${amount}</b> — ${transaction.description}${merchantLine}\n` +
      `${dueLine}\n\n` +
      `${translation.bills.question}`
    );
  }

  /**
   * The "bill to pay" button: turns a stored receipt reading into a Bill with
   * the detected due date, instead of a transaction.
   */
  private async registerBillFromStored(chatId: number, tempId: string, userId: string): Promise<void> {
    const language = await this.getUserLanguage(userId);
    const translation = getTelegramTranslation(language);

    try {
      const transactionData = await this.messageProcessor.getStoredTransaction(tempId);

      if (!transactionData) {
        await this.sendMessage(chatId, translation.bills.expired);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const dueDate = resolveBillDueDate(transactionData, new Date()) ?? today;
      // Bills are always money going out; normalize whatever the model said
      // into an expense dashboard key, exactly like confirmed transactions.
      const dashboardCategory = normalizeDashboardCategory('expense', transactionData.category);

      const bill = await this.billsService.create(
        {
          description: transactionData.description,
          amount: Number(transactionData.amount),
          currency: transactionData.currency,
          dueDate,
          category: dashboardCategory,
          dashboardCategory,
          merchantName: transactionData.merchantName,
          contextId: transactionData.contextId,
        },
        userId,
      );

      const template = dueDate < today ? translation.bills.registeredOverdue : translation.bills.registered;
      await this.sendMessage(
        chatId,
        formatTemplate(template, {
          description: bill.description,
          date: this.formatDateForLanguage(dueDate, language),
        }),
      );

      await this.messageProcessor.removeStoredTransaction(tempId);
    } catch (error) {
      this.logger.error('Error registering bill from receipt:', error);
      await this.sendMessage(chatId, translation.receipt.failed);
    }
  }

  /**
   * The "paguei X" flow. Returns true when the message was handled as a bill
   * settlement (a match was found, or the open bills were listed); false lets
   * the caller parse it as an ordinary expense.
   */
  private async tryBillSettlement(
    chatId: number,
    intent: PaymentIntent,
    userId: string,
    message?: TelegramMessage,
  ): Promise<boolean> {
    const language = await this.getUserLanguage(userId);
    const translation = getTelegramTranslation(language);

    let openBills: Bill[] = [];
    try {
      const chatType = message?.chat?.type ?? 'private';
      if ((chatType === 'group' || chatType === 'supergroup') && message) {
        // In a linked group chat, settlement stays inside that context.
        const contextId = await this.contextDetection.determineContext(message, userId);
        openBills = await this.billsService.findAll(userId, { contextId, status: 'open' });
      } else {
        openBills = await this.billsService.findOpenForSettlement(userId);
      }
    } catch (error) {
      this.logger.warn('Could not load open bills for settlement:', error.message);
      return false;
    }

    if (openBills.length === 0) {
      return false;
    }

    const matches = matchBills(openBills, intent);

    if (matches.length === 1) {
      await this.presentSettlementConfirmation(chatId, matches[0], intent.amount, translation, language);
      return true;
    }

    if (matches.length > 1) {
      await this.presentSettlementOptions(chatId, matches, intent.amount, translation, language);
      return true;
    }

    // A bare "paguei" with open bills gets the list to pick from; a specific
    // query that matched nothing falls through to the normal expense flow.
    if (intent.tokens.length === 0 && intent.amount === undefined) {
      await this.presentSettlementOptions(chatId, openBills, undefined, translation, language);
      return true;
    }

    return false;
  }

  private async presentSettlementConfirmation(
    chatId: number,
    bill: Bill,
    amountOverride: number | undefined,
    translation: TelegramTranslations,
    language: string,
  ): Promise<void> {
    const tempId = this.storePendingBillPayment({ billId: bill.id, amount: amountOverride });
    const dueDateIso = String(bill.dueDate).slice(0, 10);
    const overdue = dueDateIso < new Date().toISOString().slice(0, 10);

    let text =
      `${translation.bills.settleConfirm}\n\n` +
      `💰 <b>${this.formatMoney(Number(bill.amount), bill.currency, language)}</b> — ${bill.description}\n` +
      `📅 <b>${translation.bills.dueLabel}</b> ${this.formatDateForLanguage(dueDateIso, language)}` +
      (overdue ? ` ${translation.bills.overdueTag}` : '');

    // Paying late usually costs more; when the message named its own amount,
    // say what will actually be recorded.
    if (amountOverride !== undefined && Math.abs(amountOverride - Number(bill.amount)) >= 0.005) {
      text += `\n${formatTemplate(translation.bills.payingAmount, {
        amount: this.formatMoney(amountOverride, bill.currency, language),
      })}`;
    }

    text += `\n\n${translation.bills.settleQuestion}`;

    await this.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [[
          { text: translation.buttons.settle, callback_data: `paybill_${tempId}` },
          { text: translation.buttons.cancel, callback_data: `paycancel_${tempId}` },
        ]],
      },
    });
  }

  private async presentSettlementOptions(
    chatId: number,
    bills: Bill[],
    amountOverride: number | undefined,
    translation: TelegramTranslations,
    language: string,
  ): Promise<void> {
    const rows = bills.slice(0, 3).map((bill) => {
      const tempId = this.storePendingBillPayment({ billId: bill.id, amount: amountOverride });
      const label = `${bill.description} — ${this.formatMoney(Number(bill.amount), bill.currency, language)}`;
      // Telegram caps button labels; the description is the discriminator.
      return [{ text: label.slice(0, 60), callback_data: `paybill_${tempId}` }];
    });
    rows.push([{ text: translation.buttons.cancel, callback_data: 'paycancel_none' }]);

    await this.sendMessage(chatId, translation.bills.settleOptions, {
      reply_markup: { inline_keyboard: rows },
    });
  }

  private async settlePendingBillPayment(chatId: number, tempId: string, userId: string): Promise<void> {
    const pending = this.pendingBillPayments.get(tempId);

    if (!pending) {
      const translation = getTelegramTranslation(await this.getUserLanguage(userId));
      await this.sendMessage(chatId, translation.bills.expired);
      return;
    }

    this.pendingBillPayments.delete(tempId);
    await this.completeBillPayment(chatId, pending.billId, pending.amount, userId);
  }

  /**
   * The shared end of every settle path — text confirmation, reminder button,
   * pick list: pay the bill in the presser's name and tell them what happened,
   * including the next installment or occurrence the payment spawned.
   */
  private async completeBillPayment(
    chatId: number,
    billId: string,
    amount: number | undefined,
    userId: string,
  ): Promise<void> {
    const language = await this.getUserLanguage(userId);
    const translation = getTelegramTranslation(language);

    try {
      const { bill, transaction, nextBill } = await this.billsService.pay(billId, { amount }, userId);

      let text = formatTemplate(translation.bills.settled, {
        description: bill.description,
        amount: this.formatMoney(Number(transaction.amount), transaction.currency, language),
      });

      if (nextBill) {
        const template = nextBill.installmentNumber
          ? translation.bills.nextInstallment
          : translation.bills.nextOccurrence;
        text += `\n${formatTemplate(template, {
          number: nextBill.installmentNumber ?? '',
          total: nextBill.installmentTotal ?? '',
          date: this.formatDateForLanguage(String(nextBill.dueDate).slice(0, 10), language),
        })}`;
      }

      await this.sendMessage(chatId, text);
    } catch (error) {
      const status = typeof error?.getStatus === 'function' ? error.getStatus() : error?.status;

      if (status === 409) {
        await this.sendMessage(chatId, translation.bills.alreadyPaid);
        return;
      }
      if (status === 403) {
        await this.sendMessage(chatId, translation.bills.noPermission);
        return;
      }
      if (status === 404) {
        await this.sendMessage(chatId, translation.bills.expired);
        return;
      }

      this.logger.error('Error settling bill from chat:', error);
      await this.sendMessage(chatId, 'Error saving transaction. Please try again.');
    }
  }


  /**
   * Handles a "saved / aportei" message. Returns true when it owned the
   * conversation (a goal matched, options were listed, or the amount was
   * asked for); false lets the caller parse it as an ordinary transaction.
   */
  private async tryGoalContribution(
    chatId: number,
    intent: ContributionIntent,
    userId: string,
    message?: TelegramMessage,
  ): Promise<boolean> {
    const language = await this.getUserLanguage(userId);
    const translation = getTelegramTranslation(language);

    let goals: Goal[] = [];
    try {
      goals = await this.goalsService.findOpenForContribution(userId);

      // In a linked group chat, deposits stay inside that context — the
      // same scope discipline bill settlements follow.
      const chatType = message?.chat?.type ?? 'private';
      if ((chatType === 'group' || chatType === 'supergroup') && message) {
        const groupContextId = await this.contextDetection.determineContext(message, userId);
        goals = goals.filter((goal) => goal.contextId === groupContextId);
      }
    } catch (error) {
      this.logger.warn('Could not load goals for contribution:', error.message);
      return false;
    }

    if (goals.length === 0) {
      return false;
    }

    // Specific words that match nothing are not ours to answer — the message
    // is probably an ordinary transaction ("guardei o recibo do mercado").
    const matches = intent.tokens.length > 0 ? matchGoals(goals, intent.tokens) : goals;
    if (intent.tokens.length > 0 && matches.length === 0) {
      return false;
    }

    if (intent.amount === undefined) {
      await this.sendMessage(chatId, translation.goals.askAmount);
      return true;
    }

    if (matches.length === 1) {
      await this.presentGoalContributionConfirmation(
        chatId,
        matches[0],
        intent.amount,
        translation,
        language,
      );
      return true;
    }

    await this.presentGoalContributionOptions(chatId, matches, intent.amount, translation, language);
    return true;
  }

  private goalProgressLines(goal: Goal, translation: TelegramTranslations, language: string): string {
    const lines: string[] = [];

    if (goal.goalType === GoalType.RECURRING && goal.monthlyTarget != null) {
      lines.push(
        formatTemplate(translation.goals.monthLine, {
          month: this.formatMonthName(language),
          current: this.formatMoney(Number(goal.monthContributed ?? 0), goal.currency, language),
          target: this.formatMoney(Number(goal.monthlyTarget), goal.currency, language),
        }),
      );
      if (Number(goal.monthContributed ?? 0) >= Number(goal.monthlyTarget)) {
        lines.push(translation.goals.monthComplete);
      }
    }

    if (goal.targetAmount != null) {
      lines.push(
        formatTemplate(translation.goals.totalLine, {
          current: this.formatMoney(Number(goal.currentAmount), goal.currency, language),
          target: this.formatMoney(Number(goal.targetAmount), goal.currency, language),
        }),
      );
      if (goal.isAchieved) {
        lines.push(translation.goals.achieved);
      }
    } else if (goal.goalType === GoalType.RECURRING) {
      lines.push(
        formatTemplate(translation.goals.totalOpenLine, {
          current: this.formatMoney(Number(goal.currentAmount), goal.currency, language),
        }),
      );
    }

    return lines.join('\n');
  }

  private async presentGoalContributionConfirmation(
    chatId: number,
    goal: Goal,
    amount: number,
    translation: TelegramTranslations,
    language: string,
  ): Promise<void> {
    const tempId = this.storePendingGoalContribution({ goalId: goal.id, amount });

    const text =
      formatTemplate(translation.goals.confirmQuestion, {
        amount: this.formatMoney(amount, goal.currency, language),
        name: goal.name,
      }) +
      '\n\n' +
      this.goalProgressLines(goal, translation, language);

    await this.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [[
          { text: translation.buttons.contribute, callback_data: `goalpay_${tempId}` },
          { text: translation.buttons.cancel, callback_data: `goalcancel_${tempId}` },
        ]],
      },
    });
  }

  private async presentGoalContributionOptions(
    chatId: number,
    goals: Goal[],
    amount: number,
    translation: TelegramTranslations,
    language: string,
  ): Promise<void> {
    const rows = goals.slice(0, 3).map((goal) => {
      const tempId = this.storePendingGoalContribution({ goalId: goal.id, amount });
      const label = `${goal.name} — ${this.formatMoney(amount, goal.currency, language)}`;
      return [{ text: label.slice(0, 60), callback_data: `goalpay_${tempId}` }];
    });
    rows.push([{ text: translation.buttons.cancel, callback_data: 'goalcancel_none' }]);

    await this.sendMessage(chatId, translation.goals.options, {
      reply_markup: { inline_keyboard: rows },
    });
  }

  private async settlePendingGoalContribution(
    chatId: number,
    tempId: string,
    userId: string,
  ): Promise<void> {
    const pending = this.pendingGoalContributions.get(tempId);

    if (!pending) {
      const translation = getTelegramTranslation(await this.getUserLanguage(userId));
      await this.sendMessage(chatId, translation.goals.expired);
      return;
    }

    this.pendingGoalContributions.delete(tempId);
    await this.completeGoalContribution(chatId, pending.goalId, pending.amount, userId);
  }

  private async cancelPendingGoalContribution(
    chatId: number,
    tempId: string,
    userId: string,
  ): Promise<void> {
    this.pendingGoalContributions.delete(tempId);
    const translation = getTelegramTranslation(await this.getUserLanguage(userId));
    await this.sendMessage(chatId, translation.goals.cancelled);
  }

  /**
   * The shared end of every deposit path — confirmation button, pick list,
   * month-end reminder: record the deposit in the presser's name and answer
   * with the goal's fresh progress.
   */
  private async completeGoalContribution(
    chatId: number,
    goalId: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    const language = await this.getUserLanguage(userId);
    const translation = getTelegramTranslation(language);

    try {
      const { goal } = await this.goalsService.contribute(goalId, { amount }, userId);

      const text =
        formatTemplate(translation.goals.contributed, {
          amount: this.formatMoney(amount, goal.currency, language),
          name: goal.name,
        }) +
        '\n' +
        this.goalProgressLines(goal, translation, language);

      await this.sendMessage(chatId, text);
    } catch (error) {
      const status = typeof error?.getStatus === 'function' ? error.getStatus() : error?.status;

      if (status === 409) {
        await this.sendMessage(chatId, translation.goals.archived);
        return;
      }
      if (status === 403) {
        await this.sendMessage(chatId, translation.goals.noPermission);
        return;
      }
      if (status === 404) {
        await this.sendMessage(chatId, translation.goals.notFound);
        return;
      }

      this.logger.error('Error recording goal contribution from chat:', error);
      await this.sendMessage(chatId, 'Error saving transaction. Please try again.');
    }
  }

  /**
   * The month-end reminder's button: deposit exactly what is still missing
   * this month, measured now — the amount printed on the button may be
   * minutes or days stale.
   */
  private async completeGoalTopUp(chatId: number, goalId: string, userId: string): Promise<void> {
    const language = await this.getUserLanguage(userId);
    const translation = getTelegramTranslation(language);

    let goal: Goal;
    try {
      goal = await this.goalsService.findOne(goalId, userId);
    } catch {
      await this.sendMessage(chatId, translation.goals.notFound);
      return;
    }

    const missing = Number(goal.monthlyTarget ?? 0) - Number(goal.monthContributed ?? 0);
    if (missing <= 0) {
      await this.sendMessage(
        chatId,
        formatTemplate(translation.goals.monthAlreadyComplete, { name: goal.name }),
      );
      return;
    }

    await this.completeGoalContribution(chatId, goalId, Math.round(missing * 100) / 100, userId);
  }

  private storePendingGoalContribution(entry: { goalId: string; amount: number }): string {
    const tempId = crypto.randomBytes(16).toString('hex');
    this.pendingGoalContributions.set(tempId, entry);

    const timer = setTimeout(() => this.pendingGoalContributions.delete(tempId), 10 * 60 * 1000);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    return tempId;
  }

  /** "agosto", "August", "agosto" — the chat's own language. */
  formatMonthName(language: string, date: Date = new Date()): string {
    return new Intl.DateTimeFormat(language, { month: 'long' }).format(date);
  }

  /** Public seams for bot-adjacent services (the due-date reminder job). */
  sendChatMessage(chatId: number, text: string, options?: any): Promise<TelegramBotResponse> {
    return this.sendMessage(chatId, text, options);
  }

  formatMoneyForChat(amount: number, currency: string, language: string): string {
    return this.formatMoney(amount, currency, language);
  }

  formatDateForChat(isoDate: string, language: string): string {
    return this.formatDateForLanguage(isoDate, language);
  }

  private async cancelPendingBillPayment(chatId: number, tempId: string, userId: string): Promise<void> {
    this.pendingBillPayments.delete(tempId);
    const translation = getTelegramTranslation(await this.getUserLanguage(userId));
    await this.sendMessage(chatId, translation.bills.cancelled);
  }

  private storePendingBillPayment(entry: { billId: string; amount?: number }): string {
    const tempId = crypto.randomBytes(16).toString('hex');
    this.pendingBillPayments.set(tempId, entry);

    // Same 10-minute lifetime as stored transactions; unref so a forgotten
    // confirmation never holds the process open.
    const timer = setTimeout(() => this.pendingBillPayments.delete(tempId), 10 * 60 * 1000);
    timer.unref?.();

    return tempId;
  }

  private localeFor(language: string): string {
    if (language === 'pt') return 'pt-BR';
    if (language === 'es') return 'es-ES';
    return 'en-US';
  }

  private formatMoney(amount: number, currency: string, language: string): string {
    try {
      return new Intl.NumberFormat(this.localeFor(language), {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      // A currency code a model invented — show it rather than crash the chat.
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  private formatDateForLanguage(isoDate: string, language: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(this.localeFor(language));
  }

  private async sendMessage(chatId: number, text: string, options?: any): Promise<TelegramBotResponse> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/sendMessage`, {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...options,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error sending message:', error);
      throw error;
    }
  }

  private async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    try {
      await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/answerCallbackQuery`, {
          callback_query_id: callbackQueryId,
        })
      );
    } catch (error) {
      this.logger.error('Error answering callback query:', error);
    }
  }

  private async getUserFromTelegramId(telegramId: string): Promise<string | null> {
    try {
      const user = await this.usersRepository.findOne({
        where: { telegramUserId: telegramId },
        select: ['id'],
      });
      return user?.id || null;
    } catch (error) {
      this.logger.error('Error finding user by Telegram ID:', error);
      return null;
    }
  }

  private async getUserLanguage(userId: string): Promise<string> {
    try {
      const user = await this.usersRepository.findOne({ 
        where: { id: userId, isActive: true },
        select: ['language']
      });
      return user?.language || 'en';
    } catch (error) {
      this.logger.warn('Could not fetch user language, using default:', error.message);
      return 'en';
    }
  }

  private async formatTransactionConfirmation(transaction: ParsedTransaction, userId: string): Promise<string> {
    const userLanguage = await this.getUserLanguage(userId);
    const t = getTelegramTranslation(userLanguage);

    let contextInfo = '';
    if (transaction.contextId) {
      try {
        const context = await this.contextDetection.getContextInfo(transaction.contextId, userId);
        const contextEmoji = this.getContextIcon(context.type);
        contextInfo = `${contextEmoji} <b>${t.context}:</b> ${context.name}\n`;
      } catch (error) {
        this.logger.warn('Could not get context info:', error.message);
      }
    }
    
    // Format amount display with currency conversion info
    let amountDisplay = `${transaction.amount} ${transaction.currency}`;
    if (transaction.originalAmount && transaction.originalCurrency && 
        transaction.originalCurrency !== transaction.currency) {
      amountDisplay = `${transaction.amount} ${transaction.currency} (from ${transaction.originalAmount} ${transaction.originalCurrency})`;
    }

    // Get conversational opening and closing based on transaction type and details
    const { opening, closing } = this.getConversationalMessages(transaction, t);

    return `
${opening}

${t.logged}
💵 ${amountDisplay} → ${transaction.description}
🏷️  ${transaction.type}${transaction.category ? ` • ${transaction.category}` : ''}
${transaction.merchantName ? `🏪 ${transaction.merchantName}\n` : ''}${contextInfo}
${closing}
    `;
  }

  private getConversationalMessages(transaction: ParsedTransaction, t: any): { opening: string; closing: string } {
    const isInvestment = transaction.category?.toLowerCase().includes('investment') || 
                        transaction.description?.toLowerCase().includes('investment');
    const isSavings = transaction.category?.toLowerCase().includes('saving') || 
                     transaction.description?.toLowerCase().includes('saving');
    const isIncome = transaction.type === 'income';
    const isTransfer = transaction.type === 'transfer';

    // Determine message type
    let messageType = 'expense';
    if (isIncome) messageType = 'income';
    else if (isTransfer && (isInvestment || isSavings)) messageType = 'investment';
    else if (isTransfer) messageType = 'transfer';

    // Get random messages from translations
    const openingOptions = t.conversation[messageType];
    const closingOptions = t.confirmation;
    
    const opening = openingOptions[Math.floor(Math.random() * openingOptions.length)];
    const closing = closingOptions[Math.floor(Math.random() * closingOptions.length)];

    return { opening, closing };
  }

  private async formatMultiTransactionConfirmation(transactions: ParsedTransaction[], userId: string): Promise<string> {
    let message = `📊 <b>Multiple Transactions Detected (${transactions.length})</b>\n\n`;
    
    let totalAmount = 0;
    const currencyMap = new Map<string, number>();
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
      
      // Track totals by currency
      const existing = currencyMap.get(transaction.currency) || 0;
      currencyMap.set(transaction.currency, existing + transaction.amount);
      
      // Format amount display with currency conversion info
      let amountDisplay = `${transaction.amount} ${transaction.currency}`;
      if (transaction.originalAmount && transaction.originalCurrency && 
          transaction.originalCurrency !== transaction.currency) {
        amountDisplay = `${transaction.amount} ${transaction.currency} (from ${transaction.originalAmount} ${transaction.originalCurrency})`;
      }
      
      message += `${i + 1}. ${typeEmoji} <b>${amountDisplay}</b> - ${transaction.description}`;
      if (transaction.category) {
        message += ` (${transaction.category})`;
      }
      if (transaction.merchantName) {
        message += ` at ${transaction.merchantName}`;
      }
      message += `\n`;
    }
    
    // Add summary by currency
    message += `\n<b>Summary:</b>\n`;
    for (const [currency, amount] of currencyMap.entries()) {
      message += `💵 Total ${currency}: ${amount.toFixed(2)}\n`;
    }
    
    // Add context info if available
    const firstTransactionWithContext = transactions.find(t => t.contextId);
    if (firstTransactionWithContext?.contextId) {
      try {
        const context = await this.contextDetection.getContextInfo(firstTransactionWithContext.contextId, userId);
        const contextEmoji = this.getContextIcon(context.type);
        message += `\n${contextEmoji} <b>Context:</b> ${context.name}\n`;
      } catch (error) {
        this.logger.warn('Could not get context info:', error.message);
      }
    }
    
    message += `\nPlease confirm all ${transactions.length} transactions:`;
    return message;
  }

  private storeBatchTransactions(batchId: string, transactions: ParsedTransaction[]): void {
    // Store batch for 10 minutes
    this.batchTransactions.set(batchId, transactions);
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      this.batchTransactions.delete(batchId);
    }, 10 * 60 * 1000);
  }

  private async handleBatchCallback(chatId: number, data: string, userId: string): Promise<void> {
    const [action, , batchId] = data.split('_'); // confirm_batch_abc123 -> ["confirm", "batch", "abc123"]
    const transactions = this.batchTransactions.get(batchId);
    
    if (!transactions) {
      await this.sendMessage(chatId, 'Batch data expired. Please try again.');
      return;
    }
    
    switch (action) {
      case 'confirm':
        await this.confirmBatchTransactions(chatId, batchId, transactions, userId);
        break;
      case 'review':
        await this.reviewBatchTransactions(chatId, batchId, transactions, userId);
        break;
      case 'cancel':
        await this.cancelBatchTransactions(chatId, batchId);
        break;
    }
  }

  private async confirmBatchTransactions(chatId: number, batchId: string, transactions: ParsedTransaction[], userId: string): Promise<void> {
    try {
      const savedTransactions = [];
      const errors = [];
      
      for (let i = 0; i < transactions.length; i++) {
        const transactionData = transactions[i];
        
        try {
          // Create the transaction
          const transaction = await this.transactionsService.create(
            this.buildTransactionPayload(transactionData),
            userId,
          );

          savedTransactions.push(transaction);
        } catch (error) {
          this.logger.error(`Error saving transaction ${i + 1}:`, error);
          errors.push(`Transaction ${i + 1}: ${transactionData.description}`);
        }
      }
      
      // Send confirmation message
      let message = `✅ <b>Batch Confirmation Complete!</b>\n\n`;
      message += `💾 Successfully saved: ${savedTransactions.length}/${transactions.length} transactions\n`;
      
      if (errors.length > 0) {
        message += `\n❌ <b>Failed to save:</b>\n`;
        errors.forEach(error => {
          message += `• ${error}\n`;
        });
      }
      
      // Show summary by currency
      const currencyTotals = new Map<string, number>();
      savedTransactions.forEach(t => {
        const existing = currencyTotals.get(t.currency) || 0;
        currencyTotals.set(t.currency, existing + Number(t.amount));
      });
      
      if (currencyTotals.size > 0) {
        message += `\n💰 <b>Totals:</b>\n`;
        for (const [currency, amount] of currencyTotals.entries()) {
          message += `${currency}: ${amount.toFixed(2)}\n`;
        }
      }
      
      await this.sendMessage(chatId, message);
      
      // Clean up batch data
      this.batchTransactions.delete(batchId);
    } catch (error) {
      this.logger.error('Error confirming batch transactions:', error);
      await this.sendMessage(chatId, 'Error saving batch transactions. Please try again.');
    }
  }

  private async reviewBatchTransactions(chatId: number, batchId: string, transactions: ParsedTransaction[], userId: string): Promise<void> {
    let message = `🔍 <b>Review Batch Transactions</b>\n\n`;
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
      
      message += `<b>Transaction ${i + 1}/${transactions.length}</b>\n`;
      message += `${typeEmoji} ${transaction.amount} ${transaction.currency} - ${transaction.description}\n`;
      
      if (transaction.category) {
        message += `📂 Category: ${transaction.category}\n`;
      }
      if (transaction.merchantName) {
        message += `🏪 Merchant: ${transaction.merchantName}\n`;
      }
      
      message += `🎯 Confidence: ${Math.round(transaction.confidence * 100)}%\n\n`;
    }
    
    message += `You can edit individual transactions by typing them again, or proceed with confirmation.`;
    
    const userLanguage = await this.getUserLanguage(chatId.toString());
    const translation = getTelegramTranslation(userLanguage);
    
    await this.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[
          { text: translation.buttons.confirmAll, callback_data: `confirm_batch_${batchId}` },
          { text: translation.buttons.cancelAll, callback_data: `cancel_batch_${batchId}` },
        ]],
      },
    });
  }

  private async cancelBatchTransactions(chatId: number, batchId: string): Promise<void> {
    this.batchTransactions.delete(batchId);
    await this.sendMessage(chatId, '❌ All transactions cancelled.');
  }

  private getContextIcon(type: string): string {
    const icons = {
      personal: '👤',
      family: '👨‍👩‍👧',
      business: '🏢',
      shared_living: '🏠',
      trip: '✈️',
      project: '🚀',
      friends: '👥',
      shared: '🤝',
    };
    return icons[type] || '📁';
  }

  private async handleBotAddedToGroup(chat: TelegramChat, addedByUserId: string): Promise<void> {
    this.logger.log(`Bot added to group: ${chat.title} (${chat.id}) by user ${addedByUserId}`);
    
    // Only start setup for groups, not private chats
    if (chat.type === 'group' || chat.type === 'supergroup') {
      // Check if the user who added the bot is registered
      const userId = await this.getUserFromTelegramId(addedByUserId);
      
      if (!userId) {
        // User is not registered - send registration instructions
        const registrationMessage = `
👋 <b>Welcome to Financy!</b>

To configure this group for expense tracking, you need to have a Financy account first.

<b>Please follow these steps:</b>
1. Visit: ${this.configService.get('FRONTEND_URL', 'https://financy.app')}
2. Create your account
3. Go to Settings → Telegram Integration
4. Link your Telegram account
5. Add the bot to this group again to start configuration

Once you're registered and linked, you'll be able to set up expense tracking for this group! 🚀
        `;
        
        await this.sendMessage(chat.id, registrationMessage);
        return;
      }
      
      // User is registered — offer their existing shared contexts first;
      // the create-new wizard stays one button away.
      this.contextSetup.startSetup(chat.id.toString(), addedByUserId, chat);

      const language = await this.getUserLanguage(userId);
      const translation = getTelegramTranslation(language);
      const linkable = await this.contextDetection.linkableContextsFor(userId);

      if (linkable.length === 0) {
        const welcomeMessage = this.contextSetup.getWelcomeMessage();
        const keyboard = this.contextSetup.getContextTypeKeyboard();
        await this.sendMessage(chat.id, welcomeMessage, { reply_markup: keyboard });
        return;
      }

      const rows = linkable.slice(0, 6).map((context) => [
        { text: `🔗 ${context.name}`.slice(0, 60), callback_data: `setup_link_${context.id}` },
      ]);
      rows.push([{ text: translation.groups.linkNew, callback_data: 'setup_new' }]);

      await this.sendMessage(chat.id, translation.groups.linkIntro, {
        reply_markup: { inline_keyboard: rows },
      });
    }
  }

  private async handleSetupCallback(chatId: number, data: string, userId: string, callbackQueryId: string): Promise<void> {
    const setupState = this.contextSetup.getSetupState(chatId.toString());
    
    if (!setupState) {
      await this.sendMessage(chatId, 'Setup session expired. Please add the bot to the group again to restart setup.');
      await this.answerCallbackQuery(callbackQueryId);
      return;
    }

    if (data.startsWith('setup_link_')) {
      const contextId = data.replace('setup_link_', '');
      const translation = getTelegramTranslation(await this.getUserLanguage(userId));

      // Re-validated at press time: the button proves nothing about who
      // pressed it, and linking a chat is context administration.
      if (!(await this.contextDetection.canLinkContext(userId, contextId))) {
        await this.sendMessage(chatId, translation.groups.linkDenied);
        await this.answerCallbackQuery(callbackQueryId);
        return;
      }

      try {
        const context = await this.contextsService.findOne(contextId, userId);
        const chatInfo = await this.getChatInfo(chatId);
        await this.contextDetection.linkChatToContext(
          chatId.toString(),
          'group',
          contextId,
          chatInfo?.title,
        );
        await this.sendMessage(
          chatId,
          formatTemplate(translation.groups.linked, { name: context.name }),
        );
        this.contextSetup.completeSetup(chatId.toString());
      } catch (error) {
        this.logger.error('Error linking chat to context:', error);
        await this.sendMessage(chatId, 'Error linking this group. Please try again later.');
      }

      await this.answerCallbackQuery(callbackQueryId);
      return;
    }

    if (data === 'setup_new') {
      this.contextSetup.updateSetupState(chatId.toString(), { step: 'type' });

      const welcomeMessage = this.contextSetup.getWelcomeMessage();
      const keyboard = this.contextSetup.getContextTypeKeyboard();
      await this.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
      await this.answerCallbackQuery(callbackQueryId);
      return;
    }

    if (data.startsWith('setup_type_')) {
      const type = data.replace('setup_type_', '');
      if (this.contextSetup.isValidContextType(type)) {
        this.contextSetup.updateSetupState(chatId.toString(), { type, step: 'name' });
        
        const confirmationMessage = this.contextSetup.getTypeConfirmationMessage(type);
        const keyboard = this.contextSetup.getTypeConfirmationKeyboard(type);
        
        await this.sendMessage(chatId, confirmationMessage, { reply_markup: keyboard });
      }
    } else if (data.startsWith('setup_confirm_')) {
      const type = data.replace('setup_confirm_', '');
      await this.proceedToNameSetup(chatId, type);
    } else if (data === 'setup_back_type') {
      this.contextSetup.updateSetupState(chatId.toString(), { step: 'type' });
      
      const welcomeMessage = this.contextSetup.getWelcomeMessage();
      const keyboard = this.contextSetup.getContextTypeKeyboard();
      
      await this.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
    } else if (data.startsWith('setup_name_')) {
      const name = decodeURIComponent(data.replace('setup_name_', ''));
      if (await this.contextsService.isContextNameTaken(name, userId)) {
        await this.sendMessage(
          chatId,
          `You already have a context named "${name}". Please type a different name:`,
        );
      } else {
        this.contextSetup.updateSetupState(chatId.toString(), { name, step: 'permissions' });
        await this.proceedToPermissionsSetup(chatId);
      }
    } else if (data.startsWith('setup_perms_')) {
      const permissions = data.replace('setup_perms_', '') as 'everyone' | 'admins';
      this.contextSetup.updateSetupState(chatId.toString(), { permissions, step: 'currency' });
      await this.proceedToCurrencySetup(chatId);
    } else if (data.startsWith('setup_currency_')) {
      const currency = data.replace('setup_currency_', '');
      await this.completeContextSetup(chatId, currency, userId);
    } else if (data === 'setup_back_name') {
      await this.proceedToNameSetup(chatId, setupState.type);
    } else if (data === 'setup_back_perms') {
      await this.proceedToPermissionsSetup(chatId);
    }

    await this.answerCallbackQuery(callbackQueryId);
  }

  private async proceedToNameSetup(chatId: number, type: string): Promise<void> {
    const chat = await this.getChatInfo(chatId);
    const defaultName = chat?.title || `${type} Context`;
    
    const nameMessage = this.contextSetup.getNameSetupMessage(type, defaultName);
    await this.sendMessage(chatId, nameMessage);
  }

  private async handleContextNameInput(chatId: number, text: string, userId: string): Promise<void> {
    const setupState = this.contextSetup.getSetupState(chatId.toString());
    if (!setupState) return;

    const name = text.trim();
    if (name.length < 1 || name.length > 50) {
      await this.sendMessage(chatId, 'Please enter a name between 1 and 50 characters.');
      return;
    }

    // Two contexts with the same name are indistinguishable everywhere a
    // context is picked — refused here, while renaming costs one message.
    if (await this.contextsService.isContextNameTaken(name, userId)) {
      await this.sendMessage(
        chatId,
        `You already have a context named "${name}". Please type a different name:`,
      );
      return;
    }

    this.contextSetup.updateSetupState(chatId.toString(), { name, step: 'permissions' });
    await this.proceedToPermissionsSetup(chatId);
  }

  private async proceedToPermissionsSetup(chatId: number): Promise<void> {
    const permissionsMessage = this.contextSetup.getPermissionsMessage();
    const keyboard = this.contextSetup.getPermissionsKeyboard();
    
    await this.sendMessage(chatId, permissionsMessage, { reply_markup: keyboard });
  }

  private async proceedToCurrencySetup(chatId: number): Promise<void> {
    const currencyMessage = this.contextSetup.getCurrencyMessage();
    const keyboard = this.contextSetup.getCurrencyKeyboard();
    
    await this.sendMessage(chatId, currencyMessage, { reply_markup: keyboard });
  }

  private async completeContextSetup(chatId: number, currency: string, userId: string): Promise<void> {
    const setupState = this.contextSetup.getSetupState(chatId.toString());
    if (!setupState) return;

    try {
      // Create the context
      const context = await this.contextsService.create({
        name: setupState.name,
        type: setupState.type as any,
        description: `${setupState.type} expenses managed via Telegram`,
      }, userId);

      // Create chat-context mapping with permission settings
      await this.contextDetection.ensureChatContextMapping(
        chatId.toString(),
        'group', // We know it's a group since setup only happens in groups
        context.id,
        setupState.name
      );

      // TODO: Store permission settings in context metadata
      // This will be enhanced later with a proper metadata storage system
      // await this.contextsService.updateContextMetadata(context.id, {
      //   telegramPermissions: setupState.permissions,
      //   defaultCurrency: currency,
      //   configuredBy: userId,
      //   configuredAt: new Date().toISOString()
      // });

      // ContextsService.create already enrolled the creator as OWNER; adding
      // them again violated the unique membership and errored the whole
      // wizard AFTER the context existed — a retry then created a second one.

      // Show completion message
      const completionMessage = this.contextSetup.getCompletionMessage(
        setupState.type,
        setupState.name,
        setupState.permissions,
        currency
      );

      await this.sendMessage(chatId, completionMessage);
      
      // Clean up setup state
      this.contextSetup.completeSetup(chatId.toString());

      this.logger.log(`Context setup completed for chat ${chatId}: ${context.id}`);
    } catch (error) {
      const status = typeof error?.getStatus === 'function' ? error.getStatus() : error?.status;
      if (status === 409) {
        // The name was taken between the name step and this save.
        this.contextSetup.updateSetupState(chatId.toString(), { step: 'name' });
        await this.sendMessage(
          chatId,
          `You already have a context named "${setupState.name}". Please type a different name:`,
        );
        return;
      }

      this.logger.error('Error completing context setup:', error);
      await this.sendMessage(chatId, 'Error setting up context. Please try again later.');
    }
  }

  private async getChatInfo(chatId: number): Promise<{ title?: string } | null> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/getChat?chat_id=${chatId}`)
      );
      return response.data.result;
    } catch (error) {
      this.logger.warn('Could not get chat info:', error.message);
      return null;
    }
  }

  private async getTelegramUsername(chatId: number): Promise<string | undefined> {
    try {
      const chatInfo = await this.getChatInfo(chatId);
      return chatInfo?.['username'];
    } catch (error) {
      this.logger.warn('Could not get telegram username:', error.message);
      return undefined;
    }
  }

}