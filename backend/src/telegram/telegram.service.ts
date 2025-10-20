import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { User } from '../users/entities/user.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { ContextsService } from '../contexts/contexts.service';
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
import { MemberRole } from '../contexts/entities/context-member.entity';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly webhookUrl: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private transactionsService: TransactionsService,
    private contextsService: ContextsService,
    private messageProcessor: MessageProcessorService,
    private contextDetection: ContextDetectionService,
    private contextSetup: ContextSetupService,
  ) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.webhookUrl = this.configService.get('TELEGRAM_WEBHOOK_URL');
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async onModuleInit() {
    if (this.botToken) {
      await this.setupWebhook();
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured. Telegram integration disabled.');
    }
  }

  async setupWebhook(): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/setWebhook`, {
          url: this.webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
        })
      );

      if (response.data.ok) {
        this.logger.log('Telegram webhook setup successfully');
      } else {
        this.logger.error('Failed to setup webhook:', response.data);
      }
    } catch (error) {
      this.logger.error('Error setting up webhook:', error.message);
    }
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      this.logger.debug('Processing update:', JSON.stringify(update, null, 2));

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
      await this.handleCommand(chatId, message.text, userId);
    } else if (message.voice) {
      await this.handleVoiceMessage(chatId, message.voice, userId);
    } else if (message.photo && message.photo.length > 0) {
      await this.handlePhotoMessage(chatId, message.photo, userId);
    } else if (message.text) {
      await this.handleTextMessage(chatId, message.text, userId, message);
    } else {
      await this.sendMessage(chatId, 'I can process text messages, voice messages, and photos. Please try one of those!');
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

  private async handleCommand(chatId: number, command: string, userId: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case '/start':
        await this.sendWelcomeMessage(chatId);
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
        await this.handleLinkCommand(chatId, userId, args);
        break;

      default:
        await this.sendMessage(chatId, '🤔 Unknown command. Type /help for available commands.');
    }
  }

  private async handleTextMessage(chatId: number, text: string, userId: string, message?: TelegramMessage): Promise<void> {
    try {
      // Check if user can add transactions in this context
      if (message && (message.chat.type === 'group' || message.chat.type === 'supergroup')) {
        const canAddTransaction = await this.checkUserTransactionPermission(chatId, userId);
        if (!canAddTransaction) {
          await this.sendMessage(chatId, 'You don\'t have permission to add transactions in this group. Please contact a group admin.');
          return;
        }
      }

      await this.sendMessage(chatId, '🤔 Processing your transaction...');

      // Determine context for this message
      let contextId: string | null = null;
      let defaultCurrency = 'USD'; // fallback default
      if (message) {
        try {
          contextId = await this.contextDetection.determineContext(message, userId);
          if (contextId) {
            // Get context default currency if available
            const context = await this.contextDetection.getContextInfo(contextId, userId);
            // For now, we'll use USD as default since we don't store currency in context metadata yet
            // TODO: Retrieve from context metadata when implemented
            defaultCurrency = 'USD';
          }
        } catch (error) {
          this.logger.warn('Could not determine context, using default:', error.message);
        }
      }

      const parsedTransaction = await this.messageProcessor.processTextMessage(text, userId, defaultCurrency);

      if (parsedTransaction && parsedTransaction.confidence > 0.6) {
        // Store context info with the transaction
        if (contextId) {
          parsedTransaction.contextId = contextId;
        }

        const confirmationMessage = await this.formatTransactionConfirmation(parsedTransaction, userId);
        await this.sendMessage(chatId, confirmationMessage, {
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirm', callback_data: `confirm_${parsedTransaction.tempId}` },
              { text: '✏️ Edit', callback_data: `edit_${parsedTransaction.tempId}` },
              { text: '❌ Cancel', callback_data: `cancel_${parsedTransaction.tempId}` },
            ]],
          },
        });
      } else {
        await this.sendMessage(chatId, 
          '🤷‍♀️ I couldn\'t understand that transaction. Please try a format like:\n\n' +
          '• "Spent $50 on groceries"\n' +
          '• "Received $1000 salary"\n' +
          '• "Paid R$25 for lunch at McDonald\'s"\n' +
          '• "Got €200 from freelance work"'
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
      await this.sendMessage(chatId, '📷 Processing your receipt...');

      // Get the highest resolution photo
      const photo = photos[photos.length - 1];
      const extractedData = await this.messageProcessor.processPhotoMessage(photo, userId);

      if (extractedData && extractedData.confidence > 0.6) {
        const confirmationMessage = await this.formatTransactionConfirmation(extractedData, userId);
        await this.sendMessage(chatId, confirmationMessage, {
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirm', callback_data: `confirm_${extractedData.tempId}` },
              { text: '✏️ Edit', callback_data: `edit_${extractedData.tempId}` },
              { text: '❌ Cancel', callback_data: `cancel_${extractedData.tempId}` },
            ]],
          },
        });
      } else {
        await this.sendMessage(chatId, 'Sorry, I couldn\'t extract transaction details from this image. Please try again or enter the transaction manually.');
      }
    } catch (error) {
      this.logger.error('Error processing photo message:', error);
      await this.sendMessage(chatId, 'Sorry, I couldn\'t process that image.');
    }
  }

  private async sendWelcomeMessage(chatId: number): Promise<void> {
    const message = `
🏦 <b>Welcome to Financy!</b>

I'm your personal financial assistant. Here's what I can do:

💰 <b>Track Transactions</b>
Just tell me what you spent or earned:
• "Paid $50 for groceries"
• "Received $1000 salary"
• "Spent R$25 on lunch"

🎤 <b>Voice Messages</b>
Send me a voice message with your transaction

📷 <b>Receipt Photos</b>
Take a photo of your receipt and I'll extract the details

📊 <b>Commands</b>
/contexts - Manage your financial contexts
/summary - View your spending summary
/help - Show this help message

Let's start tracking your finances! 🚀
    `;

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

  private async handleLinkCommand(chatId: number, userId: string, args: string[]): Promise<void> {
    // This would be used to link a Telegram account to a web account
    // For now, we'll provide instructions
    const message = `
🔗 <b>Link Your Account</b>

To link your Telegram account with the web app:
1. Log in to the Financy web app
2. Go to Settings → Telegram Integration  
3. Copy the linking token
4. Send: /link YOUR_TOKEN_HERE

This will sync your transactions between Telegram and the web app.
    `;

    await this.sendMessage(chatId, message);
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

  private async confirmTransaction(chatId: number, tempId: string, userId: string): Promise<void> {
    try {
      const transactionData = await this.messageProcessor.getStoredTransaction(tempId);
      
      if (!transactionData) {
        await this.sendMessage(chatId, 'Transaction data expired. Please try again.');
        return;
      }

      // Create the transaction
      const transaction = await this.transactionsService.create({
        amount: transactionData.amount,
        description: transactionData.description,
        type: transactionData.type as any,
        currency: transactionData.currency,
        category: transactionData.category,
        merchantName: transactionData.merchantName,
        date: new Date().toISOString(),
        contextId: transactionData.contextId,
      }, userId);

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

  private async formatTransactionConfirmation(transaction: ParsedTransaction, userId: string): Promise<string> {
    const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
    const confidenceBar = '█'.repeat(Math.floor(transaction.confidence * 10)) + '░'.repeat(10 - Math.floor(transaction.confidence * 10));
    
    let contextInfo = '';
    if (transaction.contextId) {
      try {
        const context = await this.contextDetection.getContextInfo(transaction.contextId, userId);
        const contextEmoji = this.getContextIcon(context.type);
        contextInfo = `${contextEmoji} <b>Context:</b> ${context.name}\n`;
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

    return `
${typeEmoji} <b>Transaction Detected</b>

💵 <b>Amount:</b> ${amountDisplay}
📝 <b>Description:</b> ${transaction.description}
🏷️ <b>Type:</b> ${transaction.type}
${transaction.category ? `📂 <b>Category:</b> ${transaction.category}\n` : ''}${transaction.merchantName ? `🏪 <b>Merchant:</b> ${transaction.merchantName}\n` : ''}${contextInfo}
🎯 <b>Confidence:</b> ${Math.round(transaction.confidence * 100)}% ${confidenceBar}

Please confirm this transaction:
    `;
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
      
      // User is registered - start context setup
      this.contextSetup.startSetup(chat.id.toString(), addedByUserId, chat);
      
      const welcomeMessage = this.contextSetup.getWelcomeMessage();
      const keyboard = this.contextSetup.getContextTypeKeyboard();
      
      await this.sendMessage(chat.id, welcomeMessage, { reply_markup: keyboard });
    }
  }

  private async handleSetupCallback(chatId: number, data: string, userId: string, callbackQueryId: string): Promise<void> {
    const setupState = this.contextSetup.getSetupState(chatId.toString());
    
    if (!setupState) {
      await this.sendMessage(chatId, 'Setup session expired. Please add the bot to the group again to restart setup.');
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
      this.contextSetup.updateSetupState(chatId.toString(), { name, step: 'permissions' });
      await this.proceedToPermissionsSetup(chatId);
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

      // Add creator as admin
      await this.contextDetection.addUserToContext(userId, context.id, MemberRole.ADMIN);

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

  private async checkUserTransactionPermission(chatId: number, userId: string): Promise<boolean> {
    try {
      // First, check if user is registered
      if (!userId) {
        return false;
      }

      // Get the context for this chat
      const chatContext = await this.contextDetection.getUserContextsForChat(userId, chatId.toString());
      if (!chatContext || chatContext.length === 0) {
        return false;
      }

      const context = chatContext[0];
      
      // Check if context has permission settings in metadata
      // For now, we'll assume if user has any access to the context, they can add transactions
      // Later this could be enhanced with the metadata-based permission system
      const hasAccess = await this.contextDetection.checkUserContextAccess(userId, context.id);
      
      return hasAccess;
    } catch (error) {
      this.logger.error('Error checking user transaction permission:', error);
      return false;
    }
  }
}