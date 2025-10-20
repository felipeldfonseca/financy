import { Injectable, Logger } from '@nestjs/common';
import { ContextType } from '../contexts/entities/context.entity';
import { ContextSetupState, ContextSetupOption, TelegramChat } from './interfaces/telegram.interface';

@Injectable()
export class ContextSetupService {
  private readonly logger = new Logger(ContextSetupService.name);
  private readonly setupStates = new Map<string, ContextSetupState>();

  private readonly contextOptions: ContextSetupOption[] = [
    {
      type: ContextType.FAMILY,
      name: 'Family',
      emoji: '👨‍👩‍👧',
      description: 'Track family expenses and shared household costs'
    },
    {
      type: ContextType.BUSINESS,
      name: 'Business',
      emoji: '🏢',
      description: 'Team expenses, project costs, and business spending'
    },
    {
      type: ContextType.SHARED_LIVING,
      name: 'Shared Living',
      emoji: '🏠',
      description: 'Roommate expenses, shared utilities, and housing costs'
    },
    {
      type: ContextType.TRIP,
      name: 'Trip/Event',
      emoji: '✈️',
      description: 'Travel expenses, vacation costs, or event budgets'
    },
    {
      type: ContextType.FRIENDS,
      name: 'Friends',
      emoji: '👥',
      description: 'Group activities, shared meals, and friend expenses'
    },
    {
      type: ContextType.PROJECT,
      name: 'Project',
      emoji: '🚀',
      description: 'Specific project costs, startup expenses, or initiatives'
    }
  ];

  startSetup(chatId: string, userId: string, chat: TelegramChat): void {
    const setupState: ContextSetupState = {
      chatId,
      userId,
      step: 'type',
      createdAt: new Date(),
    };

    this.setupStates.set(chatId, setupState);
    this.logger.log(`Started context setup for chat ${chatId} by user ${userId}`);

    // Auto-cleanup after 15 minutes
    setTimeout(() => {
      this.setupStates.delete(chatId);
    }, 15 * 60 * 1000);
  }

  getSetupState(chatId: string): ContextSetupState | null {
    return this.setupStates.get(chatId) || null;
  }

  updateSetupState(chatId: string, updates: Partial<ContextSetupState>): void {
    const state = this.setupStates.get(chatId);
    if (state) {
      Object.assign(state, updates);
      this.setupStates.set(chatId, state);
    }
  }

  completeSetup(chatId: string): void {
    this.setupStates.delete(chatId);
  }

  getWelcomeMessage(): string {
    return `
🏦 <b>Welcome to Financy!</b>

I need to know what type of expenses you'll be tracking in this group to set up the right context for your financial data.

Please choose the purpose of this group:
    `;
  }

  getContextTypeKeyboard(): any {
    const keyboard = [];
    
    // Create rows of 2 options each
    for (let i = 0; i < this.contextOptions.length; i += 2) {
      const row = [];
      row.push({
        text: `${this.contextOptions[i].emoji} ${this.contextOptions[i].name}`,
        callback_data: `setup_type_${this.contextOptions[i].type}`
      });
      
      if (i + 1 < this.contextOptions.length) {
        row.push({
          text: `${this.contextOptions[i + 1].emoji} ${this.contextOptions[i + 1].name}`,
          callback_data: `setup_type_${this.contextOptions[i + 1].type}`
        });
      }
      
      keyboard.push(row);
    }

    return { inline_keyboard: keyboard };
  }

  getTypeConfirmationMessage(type: string): string {
    const option = this.contextOptions.find(opt => opt.type === type);
    if (!option) return 'Context type selected.';

    return `
${option.emoji} <b>${option.name} Context</b>

${option.description}

Is this correct?
    `;
  }

  getTypeConfirmationKeyboard(type: string): any {
    return {
      inline_keyboard: [
        [
          { text: '✅ Yes, continue', callback_data: `setup_confirm_${type}` },
          { text: '🔙 Choose different', callback_data: 'setup_back_type' }
        ]
      ]
    };
  }

  getNameSetupMessage(type: string, defaultName: string): string {
    const option = this.contextOptions.find(opt => opt.type === type);
    const emoji = option?.emoji || '📁';

    return `
${emoji} <b>Context Name</b>

What would you like to call this context?

Default: "${defaultName}"

You can type a custom name or use the default:
    `;
  }

  getNameConfirmationKeyboard(name: string): any {
    return {
      inline_keyboard: [
        [
          { text: '✅ Use this name', callback_data: `setup_name_${encodeURIComponent(name)}` }
        ],
        [
          { text: '🔙 Back to type selection', callback_data: 'setup_back_type' }
        ]
      ]
    };
  }

  getPermissionsMessage(): string {
    return `
👥 <b>Transaction Permissions</b>

Who should be able to add transactions in this group?
    `;
  }

  getPermissionsKeyboard(): any {
    return {
      inline_keyboard: [
        [
          { text: '👥 Everyone in group', callback_data: 'setup_perms_everyone' }
        ],
        [
          { text: '👑 Only group admins', callback_data: 'setup_perms_admins' }
        ],
        [
          { text: '🔙 Back to name', callback_data: 'setup_back_name' }
        ]
      ]
    };
  }

  getCurrencyMessage(): string {
    return `
💰 <b>Default Currency</b>

What currency will you primarily use in this group?
    `;
  }

  getCurrencyKeyboard(): any {
    return {
      inline_keyboard: [
        [
          { text: '🇺🇸 USD', callback_data: 'setup_currency_USD' },
          { text: '🇧🇷 BRL', callback_data: 'setup_currency_BRL' }
        ],
        [
          { text: '🇪🇺 EUR', callback_data: 'setup_currency_EUR' },
          { text: '🇬🇧 GBP', callback_data: 'setup_currency_GBP' }
        ],
        [
          { text: '🇨🇦 CAD', callback_data: 'setup_currency_CAD' },
          { text: '🔙 Back to permissions', callback_data: 'setup_back_perms' }
        ]
      ]
    };
  }

  getCompletionMessage(
    type: string,
    name: string,
    permissions: string,
    currency: string
  ): string {
    const option = this.contextOptions.find(opt => opt.type === type);
    const emoji = option?.emoji || '📁';
    const permText = permissions === 'everyone' ? 'All group members' : 'Only group admins';

    return `
✅ <b>Context Setup Complete!</b>

${emoji} <b>Name:</b> ${name}
🏷️ <b>Type:</b> ${option?.name || type}
👥 <b>Permissions:</b> ${permText}
💰 <b>Currency:</b> ${currency}

Your group is ready for expense tracking! 
Try sending: "Spent $50 on groceries"
    `;
  }

  getContextOption(type: string): ContextSetupOption | undefined {
    return this.contextOptions.find(opt => opt.type === type);
  }

  isValidContextType(type: string): boolean {
    return this.contextOptions.some(opt => opt.type === type);
  }
}