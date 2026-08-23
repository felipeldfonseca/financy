import { Injectable } from '@nestjs/common';
import { TransactionType } from '../../transactions/entities/transaction.entity';

export interface MappedCategory {
  type: TransactionType;
  category: string;
  dashboardCategory: string;
}

interface CategoryRule {
  keywords: string[];
  category: string;
  dashboardCategory: string;
}

// Rules are matched against Pluggy's category names (English taxonomy, e.g.
// "Food and drinks", "Transfer - PIX") plus the transaction description as a
// fallback, normalized to lowercase. dashboardCategory values must stay inside
// VALID_DASHBOARD_CATEGORIES (transactions/constants/categories.constants.ts).

const TRANSFER_RULES: CategoryRule[] = [
  {
    keywords: ['credit card payment', 'card payment', 'pagamento de fatura', 'pagamento fatura'],
    category: 'Debt Payments',
    dashboardCategory: 'debt',
  },
  {
    keywords: ['loan', 'financing', 'emprestimo', 'financiamento', 'consorcio'],
    category: 'Debt Payments',
    dashboardCategory: 'debt',
  },
  {
    keywords: ['transfer', 'pix', 'ted', 'doc', 'transferencia', 'same person'],
    category: 'Account Transfers',
    dashboardCategory: 'accounts',
  },
];

const EXPENSE_RULES: CategoryRule[] = [
  {
    keywords: ['food', 'drink', 'restaurant', 'grocer', 'supermarket', 'delivery', 'ifood', 'padaria', 'mercado', 'lanchonete', 'restaurante'],
    category: 'Food & Dining',
    dashboardCategory: 'fooddining',
  },
  {
    keywords: ['transport', 'uber', 'taxi', '99app', 'fuel', 'gas station', 'parking', 'toll', 'bus', 'metro', 'combustivel', 'posto', 'estacionamento', 'pedagio'],
    category: 'Transportation',
    dashboardCategory: 'transportation',
  },
  {
    keywords: ['housing', 'rent', 'mortgage', 'condominium', 'aluguel', 'condominio', 'imobiliaria'],
    category: 'Housing',
    dashboardCategory: 'housing',
  },
  {
    keywords: ['utilities', 'electricity', 'energy', 'water', 'internet', 'phone', 'telecom', 'bank fees', 'fees', 'tax', 'interest', 'insurance', 'luz', 'agua', 'telefone', 'tarifa', 'juros', 'seguro', 'imposto'],
    category: 'Bills & Utilities',
    dashboardCategory: 'billsfinancial',
  },
  {
    keywords: ['health', 'pharmac', 'hospital', 'doctor', 'dentist', 'gym', 'fitness', 'farmacia', 'saude', 'academia', 'medico'],
    category: 'Health & Fitness',
    dashboardCategory: 'healthfitness',
  },
  {
    keywords: ['travel', 'hotel', 'airline', 'airbnb', 'viagem', 'passagem', 'hospedagem'],
    category: 'Travel & Lifestyle',
    dashboardCategory: 'travellifestyle',
  },
  {
    keywords: ['shopping', 'entertainment', 'leisure', 'stream', 'subscription', 'games', 'cinema', 'education', 'course', 'assinatura', 'compras', 'lazer', 'educacao', 'curso'],
    category: 'Entertainment & Shopping',
    dashboardCategory: 'entertainmentshopping',
  },
];

const INCOME_RULES: CategoryRule[] = [
  {
    keywords: ['salary', 'payroll', 'wage', 'salario', 'folha', 'pagamento de salario', 'proventos'],
    category: 'Salary',
    dashboardCategory: 'employment',
  },
  {
    keywords: ['investment', 'dividend', 'interest', 'yield', 'redemption', 'rendimento', 'dividendo', 'resgate', 'investimento'],
    category: 'Investment Income',
    dashboardCategory: 'investment',
  },
  {
    keywords: ['government', 'benefit', 'inss', 'fgts', 'beneficio', 'auxilio', 'restituicao'],
    category: 'Government Benefits',
    dashboardCategory: 'governmentbenefits',
  },
];

@Injectable()
export class CategoryMappingService {
  /**
   * Maps a provider transaction to Financy's category model.
   * `direction` comes from the provider's DEBIT/CREDIT flag, which is more
   * reliable than the amount sign (sign conventions differ between bank and
   * credit-card accounts).
   */
  map(
    providerCategory: string | null | undefined,
    description: string,
    direction: 'DEBIT' | 'CREDIT',
  ): MappedCategory {
    const haystack = this.normalize(`${providerCategory || ''} ${description || ''}`);

    const transferMatch = this.match(TRANSFER_RULES, haystack);
    if (transferMatch) {
      return { type: TransactionType.TRANSFER, ...transferMatch };
    }

    if (direction === 'CREDIT') {
      const incomeMatch = this.match(INCOME_RULES, haystack);
      return {
        type: TransactionType.INCOME,
        category: incomeMatch?.category || 'Other Income',
        dashboardCategory: incomeMatch?.dashboardCategory || 'other',
      };
    }

    const expenseMatch = this.match(EXPENSE_RULES, haystack);
    return {
      type: TransactionType.EXPENSE,
      category: expenseMatch?.category || 'Other',
      dashboardCategory: expenseMatch?.dashboardCategory || 'other',
    };
  }

  private match(
    rules: CategoryRule[],
    haystack: string,
  ): Omit<CategoryRule, 'keywords'> | null {
    for (const rule of rules) {
      if (rule.keywords.some(keyword => haystack.includes(keyword))) {
        return { category: rule.category, dashboardCategory: rule.dashboardCategory };
      }
    }
    return null;
  }

  private normalize(text: string): string {
    // Lowercase and strip accents so "Transferência" matches "transferencia".
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
