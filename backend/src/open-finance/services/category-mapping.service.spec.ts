import { CategoryMappingService } from './category-mapping.service';
import { TransactionType } from '../../transactions/entities/transaction.entity';

describe('CategoryMappingService', () => {
  let service: CategoryMappingService;

  beforeEach(() => {
    service = new CategoryMappingService();
  });

  it('maps PIX transfers to transfer/accounts regardless of direction', () => {
    const sent = service.map('Transfer - PIX', 'PIX ENVIADO JOAO', 'DEBIT');
    expect(sent.type).toBe(TransactionType.TRANSFER);
    expect(sent.dashboardCategory).toBe('accounts');

    const received = service.map(null, 'PIX RECEBIDO MARIA', 'CREDIT');
    expect(received.type).toBe(TransactionType.TRANSFER);
    expect(received.dashboardCategory).toBe('accounts');
  });

  it('maps Brazilian statement descriptors with accents', () => {
    const result = service.map(null, 'TRANSFERÊNCIA ENVIADA', 'DEBIT');
    expect(result.type).toBe(TransactionType.TRANSFER);
    expect(result.category).toBe('Account Transfers');
  });

  it('maps credit card bill payments to transfer/debt before generic transfer', () => {
    const result = service.map('Credit card payment', 'PAGAMENTO FATURA CARTAO', 'DEBIT');
    expect(result.type).toBe(TransactionType.TRANSFER);
    expect(result.dashboardCategory).toBe('debt');
  });

  it('maps Pluggy food category to expense/fooddining', () => {
    const result = service.map('Food and drinks', 'RESTAURANTE XYZ', 'DEBIT');
    expect(result.type).toBe(TransactionType.EXPENSE);
    expect(result.category).toBe('Food & Dining');
    expect(result.dashboardCategory).toBe('fooddining');
  });

  it('categorizes by description when the provider category is missing', () => {
    const result = service.map(null, 'UBER *TRIP SAO PAULO', 'DEBIT');
    expect(result.type).toBe(TransactionType.EXPENSE);
    expect(result.dashboardCategory).toBe('transportation');
  });

  it('maps salary credits to income/employment', () => {
    const result = service.map('Salary', 'PAGAMENTO DE SALARIO EMPRESA LTDA', 'CREDIT');
    expect(result.type).toBe(TransactionType.INCOME);
    expect(result.dashboardCategory).toBe('employment');
  });

  it('uses direction to disambiguate ambiguous keywords like interest', () => {
    const paid = service.map('Interest charged', 'JUROS CHEQUE ESPECIAL', 'DEBIT');
    expect(paid.type).toBe(TransactionType.EXPENSE);
    expect(paid.dashboardCategory).toBe('billsfinancial');

    const earned = service.map('Interest income', 'RENDIMENTO POUPANCA', 'CREDIT');
    expect(earned.type).toBe(TransactionType.INCOME);
    expect(earned.dashboardCategory).toBe('investment');
  });

  it('falls back to Other for unknown debits and credits', () => {
    const expense = service.map(null, 'COMPRA ESTABELECIMENTO 123', 'DEBIT');
    expect(expense.type).toBe(TransactionType.EXPENSE);
    expect(expense.category).toBe('Other');
    expect(expense.dashboardCategory).toBe('other');

    const income = service.map(null, 'CREDITO DIVERSO', 'CREDIT');
    expect(income.type).toBe(TransactionType.INCOME);
    expect(income.dashboardCategory).toBe('other');
  });
});
