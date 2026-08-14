import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Goal, GoalStatus, GoalType } from '../goals/entities/goal.entity';
import { GoalsService } from '../goals/goals.service';
import { ContextMember, MemberStatus } from '../contexts/entities/context-member.entity';
import { TelegramService } from './telegram.service';
import { getTelegramTranslation, formatTemplate } from './translations';

/**
 * The month-end nudge for monthly habits: in the last five days of the
 * month, anyone who could deposit hears — once — about a habit that has not
 * hit its monthly target yet, with a button that records exactly what is
 * missing. monthReminderSentAt scopes the idempotency to the month: a value
 * from an older month means "not reminded yet this month". Single-instance
 * deployment assumed, like the bill reminder.
 */
@Injectable()
export class GoalReminderService {
  private readonly logger = new Logger(GoalReminderService.name);

  /** The reminder window opens this many days before the month ends. */
  private static readonly WINDOW_DAYS = 5;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    private goalsService: GoalsService,
    private telegramService: TelegramService,
  ) {}

  // 12:00 UTC = 09:00 in Brasília, same morning slot as the bill reminders.
  @Cron('0 12 * * *')
  async remindMonthEndGoals(): Promise<void> {
    if (!this.configService.get('TELEGRAM_BOT_TOKEN')) {
      return; // no bot, nobody to talk through
    }

    try {
      const sent = await this.run(new Date());
      if (sent > 0) {
        this.logger.log(`Sent ${sent} goal month-end reminder(s)`);
      }
    } catch (error) {
      this.logger.error('Goal reminder run failed:', error);
    }
  }

  /** Separated from the cron trigger so tests can run a cycle directly. */
  async run(now: Date): Promise<number> {
    if (!this.inMonthEndWindow(now)) {
      return 0;
    }

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const habits = await this.goalsRepository
      .createQueryBuilder('goal')
      .where('goal.status = :status', { status: GoalStatus.ACTIVE })
      .andWhere('goal.goalType = :goalType', { goalType: GoalType.RECURRING })
      .andWhere('goal.monthlyTarget IS NOT NULL')
      .andWhere(
        new Brackets((scope) => {
          scope
            .where('goal.monthReminderSentAt IS NULL')
            .orWhere('goal.monthReminderSentAt < :monthStart', { monthStart });
        }),
      )
      .getMany();

    if (habits.length === 0) {
      return 0;
    }

    const deposits = await this.goalsService.monthDepositsFor(
      habits.map((goal) => goal.id),
      now,
    );

    let sentCount = 0;

    for (const goal of habits) {
      const contributed = deposits.get(goal.id) ?? 0;
      const missing = Number(goal.monthlyTarget) - contributed;
      if (missing <= 0) {
        continue; // month already closed by real deposits — nothing to nudge
      }

      const recipients = await this.recipientsFor(goal);
      let delivered = false;

      for (const member of recipients) {
        try {
          await this.sendReminder(goal, member, contributed, missing, now);
          delivered = true;
          sentCount += 1;
        } catch (error) {
          this.logger.warn(
            `Could not deliver goal reminder for ${goal.id} to member ${member.userId}: ${error.message}`,
          );
        }
      }

      // Marked only after a real delivery, so a habit whose members have no
      // Telegram linked yet stays eligible for the rest of the window.
      if (delivered) {
        await this.goalsRepository.update(goal.id, { monthReminderSentAt: now });
      }
    }

    return sentCount;
  }

  /** True in the last WINDOW_DAYS calendar days of `now`'s month (UTC). */
  private inMonthEndWindow(now: Date): boolean {
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    return now.getUTCDate() > lastDay - GoalReminderService.WINDOW_DAYS;
  }

  /**
   * Whoever could deposit hears about it: every active member of the goal's
   * context who can record expenses and has Telegram linked — the same
   * audience the bill reminders address.
   */
  private async recipientsFor(goal: Goal): Promise<ContextMember[]> {
    const memberships = await this.contextMembersRepository.find({
      where: { contextId: goal.contextId, status: MemberStatus.ACTIVE },
    });

    return memberships.filter(
      (member) => member.canEditTransactions() && member.user?.telegramUserId,
    );
  }

  private async sendReminder(
    goal: Goal,
    member: ContextMember,
    contributed: number,
    missing: number,
    now: Date,
  ): Promise<void> {
    const language = member.user?.language || 'en';
    const translation = getTelegramTranslation(language);

    const text =
      formatTemplate(translation.goals.reminder, {
        name: goal.name,
        missing: this.telegramService.formatMoneyForChat(missing, goal.currency, language),
        month: this.telegramService.formatMonthName(language, now),
        current: this.telegramService.formatMoneyForChat(contributed, goal.currency, language),
        target: this.telegramService.formatMoneyForChat(
          Number(goal.monthlyTarget),
          goal.currency,
          language,
        ),
      }) + `\n\n${translation.goals.reminderHint}`;

    const buttonLabel = formatTemplate(translation.goals.registerMissing, {
      amount: this.telegramService.formatMoneyForChat(missing, goal.currency, language),
    });

    // A private chat's id is the user's own Telegram id.
    await this.telegramService.sendChatMessage(Number(member.user.telegramUserId), text, {
      reply_markup: {
        inline_keyboard: [[
          { text: buttonLabel.slice(0, 60), callback_data: `goalremind_${goal.id}` },
        ]],
      },
    });
  }
}
