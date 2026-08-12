import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Bill, BillStatus } from '../bills/entities/bill.entity';
import { ContextMember, MemberStatus } from '../contexts/entities/context-member.entity';
import { TelegramService } from './telegram.service';
import { getTelegramTranslation, formatTemplate } from './translations';

/**
 * The reminder the mockup promised: on the morning a bill falls due — or the
 * first morning after it was registered already overdue — everyone who could
 * pay it gets a private bot message with a settle button. reminderSentAt makes
 * the job idempotent: one reminder per bill, ever, however often the process
 * restarts. Single-instance deployment assumed (no distributed lock).
 */
@Injectable()
export class BillReminderService {
  private readonly logger = new Logger(BillReminderService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Bill)
    private billsRepository: Repository<Bill>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    private telegramService: TelegramService,
  ) {}

  // 12:00 UTC = 09:00 in Brasília, where the bot's users wake up.
  @Cron('0 12 * * *')
  async remindDueBills(): Promise<void> {
    if (!this.configService.get('TELEGRAM_BOT_TOKEN')) {
      return; // no bot, nobody to talk through
    }

    try {
      const sent = await this.run(new Date());
      if (sent > 0) {
        this.logger.log(`Sent ${sent} bill reminder(s)`);
      }
    } catch (error) {
      this.logger.error('Bill reminder run failed:', error);
    }
  }

  /** Separated from the cron trigger so tests can run a cycle directly. */
  async run(now: Date): Promise<number> {
    const today = now.toISOString().slice(0, 10);

    const dueBills = await this.billsRepository.find({
      where: {
        status: BillStatus.OPEN,
        reminderSentAt: IsNull(),
        dueDate: LessThanOrEqual(today),
      },
      order: { dueDate: 'ASC' },
    });

    let sentCount = 0;

    for (const bill of dueBills) {
      const recipients = await this.recipientsFor(bill);
      let delivered = false;

      for (const member of recipients) {
        try {
          await this.sendReminder(bill, member, today);
          delivered = true;
          sentCount += 1;
        } catch (error) {
          this.logger.warn(
            `Could not deliver reminder for bill ${bill.id} to member ${member.userId}: ${error.message}`,
          );
        }
      }

      // Marked only after a real delivery: a bill whose members have no
      // Telegram linked yet stays eligible, so the reminder arrives the
      // morning after they link.
      if (delivered) {
        await this.billsRepository.update(bill.id, { reminderSentAt: now });
      }
    }

    return sentCount;
  }

  /**
   * Whoever could settle it hears about it: every active member of the bill's
   * context who can record expenses and has Telegram linked — in a household,
   * both partners get the nudge.
   */
  private async recipientsFor(bill: Bill): Promise<ContextMember[]> {
    const memberships = await this.contextMembersRepository.find({
      where: { contextId: bill.contextId, status: MemberStatus.ACTIVE },
    });

    return memberships.filter(
      (member) => member.canEditTransactions() && member.user?.telegramUserId,
    );
  }

  private async sendReminder(bill: Bill, member: ContextMember, today: string): Promise<void> {
    const language = member.user?.language || 'en';
    const translation = getTelegramTranslation(language);
    const dueDateIso = String(bill.dueDate).slice(0, 10);
    const overdue = dueDateIso < today;

    const template = overdue ? translation.bills.reminderOverdue : translation.bills.reminderDueToday;
    const text =
      formatTemplate(template, {
        description: bill.description,
        amount: this.telegramService.formatMoneyForChat(Number(bill.amount), bill.currency, language),
        date: this.telegramService.formatDateForChat(dueDateIso, language),
      }) + `\n\n${translation.bills.reminderHint}`;

    // A private chat's id is the user's own Telegram id.
    await this.telegramService.sendChatMessage(Number(member.user.telegramUserId), text, {
      reply_markup: {
        inline_keyboard: [[
          { text: translation.buttons.alreadyPaid, callback_data: `remindpay_${bill.id}` },
        ]],
      },
    });
  }
}
