import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  InputMethod,
} from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { CurrencyService } from '../../currency/currency.service';
import { BankConnection, ConnectionStatus } from '../entities/bank-connection.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { PluggyApiService, PluggyItem, PluggyTransaction } from '../pluggy/pluggy-api.service';
import { CategoryMappingService } from './category-mapping.service';
import { OpenFinanceSyncService } from './open-finance-sync.service';

const mockRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockImplementation(async entity => entity),
  create: jest.fn().mockImplementation(dto => dto),
});

const updatedItem: PluggyItem = {
  id: 'item-1',
  status: 'UPDATED',
  connector: { id: 201, name: 'Pluggy Bank', imageUrl: 'https://img' },
};

const providerAccount = {
  id: 'provider-acc-1',
  itemId: 'item-1',
  type: 'BANK' as const,
  subtype: 'CHECKING_ACCOUNT' as const,
  name: 'Conta Corrente',
  number: '12345-6',
  balance: 1200.5,
  currencyCode: 'BRL',
};

const providerTx = (overrides: Partial<PluggyTransaction> = {}): PluggyTransaction => ({
  id: 'tx-1',
  accountId: 'provider-acc-1',
  date: '2026-08-01T13:45:00.000Z',
  description: 'PIX ENVIADO JOAO',
  amount: -80.5,
  currencyCode: 'BRL',
  category: 'Transfer - PIX',
  type: 'DEBIT',
  status: 'POSTED',
  ...overrides,
});

describe('OpenFinanceSyncService', () => {
  let service: OpenFinanceSyncService;
  let connectionsRepository: ReturnType<typeof mockRepository>;
  let accountsRepository: ReturnType<typeof mockRepository>;
  let transactionsRepository: ReturnType<typeof mockRepository>;
  let usersRepository: ReturnType<typeof mockRepository>;
  let pluggyApi: {
    getItem: jest.Mock;
    getAccounts: jest.Mock;
    getAllTransactions: jest.Mock;
  };
  let currencyService: { convertCurrency: jest.Mock };
  let connection: BankConnection;

  beforeEach(async () => {
    pluggyApi = {
      getItem: jest.fn().mockResolvedValue(updatedItem),
      getAccounts: jest.fn().mockResolvedValue([providerAccount]),
      getAllTransactions: jest.fn().mockResolvedValue([]),
    };
    currencyService = {
      convertCurrency: jest.fn().mockResolvedValue({
        convertedAmount: 16.1,
        exchangeRate: 0.2,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpenFinanceSyncService,
        CategoryMappingService,
        { provide: getRepositoryToken(BankConnection), useFactory: mockRepository },
        { provide: getRepositoryToken(BankAccount), useFactory: mockRepository },
        { provide: getRepositoryToken(Transaction), useFactory: mockRepository },
        { provide: getRepositoryToken(User), useFactory: mockRepository },
        { provide: PluggyApiService, useValue: pluggyApi },
        { provide: CurrencyService, useValue: currencyService },
      ],
    }).compile();

    service = moduleRef.get(OpenFinanceSyncService);
    connectionsRepository = moduleRef.get(getRepositoryToken(BankConnection));
    accountsRepository = moduleRef.get(getRepositoryToken(BankAccount));
    transactionsRepository = moduleRef.get(getRepositoryToken(Transaction));
    usersRepository = moduleRef.get(getRepositoryToken(User));

    connection = {
      id: 'conn-1',
      providerItemId: 'item-1',
      provider: 'pluggy',
      userId: 'user-1',
      contextId: 'ctx-1',
      status: ConnectionStatus.CONNECTED,
    } as BankConnection;

    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      defaultCurrency: 'BRL',
    } as User);
    accountsRepository.save.mockImplementation(async account => ({
      id: 'acc-1',
      ...account,
    }));
  });

  it('imports new transactions as confirmed open_finance entries', async () => {
    pluggyApi.getAllTransactions.mockResolvedValue([providerTx()]);

    const result = await service.syncConnection(connection);

    expect(result.accountsSynced).toBe(1);
    expect(result.transactionsImported).toBe(1);
    expect(result.transactionsSkipped).toBe(0);

    const saved = transactionsRepository.save.mock.calls[0][0];
    expect(saved.providerTransactionId).toBe('tx-1');
    expect(saved.accountId).toBe('acc-1');
    expect(saved.userId).toBe('user-1');
    expect(saved.contextId).toBe('ctx-1');
    expect(saved.status).toBe(TransactionStatus.CONFIRMED);
    expect(saved.inputMethod).toBe(InputMethod.OPEN_FINANCE);
    expect(saved.type).toBe(TransactionType.TRANSFER);
    expect(saved.amount).toBe(80.5); // absolute value; raw sign kept in metadata
    expect(saved.metadata.rawAmount).toBe(-80.5);
  });

  it('skips transactions whose providerTransactionId was already imported', async () => {
    pluggyApi.getAllTransactions.mockResolvedValue([
      providerTx({ id: 'tx-1' }),
      providerTx({ id: 'tx-2', description: 'UBER *TRIP' }),
    ]);
    transactionsRepository.find.mockResolvedValue([
      { providerTransactionId: 'tx-1' },
    ]);

    const result = await service.syncConnection(connection);

    expect(result.transactionsImported).toBe(1);
    expect(result.transactionsSkipped).toBe(1);
    expect(transactionsRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionsRepository.save.mock.calls[0][0].providerTransactionId).toBe('tx-2');
  });

  it('treats a concurrent unique-index violation (23505) as a skip, not a failure', async () => {
    pluggyApi.getAllTransactions.mockResolvedValue([providerTx()]);
    transactionsRepository.save.mockRejectedValueOnce({ code: '23505' });

    const result = await service.syncConnection(connection);

    expect(result.transactionsImported).toBe(0);
    expect(result.transactionsSkipped).toBe(1);
  });

  it('converts amounts when the account currency differs from the user currency', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'user-1', defaultCurrency: 'USD' });
    pluggyApi.getAllTransactions.mockResolvedValue([providerTx()]);

    await service.syncConnection(connection);

    expect(currencyService.convertCurrency).toHaveBeenCalledWith(80.5, 'BRL', 'USD');
    const saved = transactionsRepository.save.mock.calls[0][0];
    expect(saved.amount).toBe(16.1);
    expect(saved.currency).toBe('USD');
    expect(saved.originalAmount).toBe(80.5);
    expect(saved.originalCurrency).toBe('BRL');
    expect(saved.exchangeRate).toBe(0.2);
  });

  it('stores same-currency transactions without calling the FX service', async () => {
    pluggyApi.getAllTransactions.mockResolvedValue([providerTx()]);

    await service.syncConnection(connection);

    expect(currencyService.convertCurrency).not.toHaveBeenCalled();
    const saved = transactionsRepository.save.mock.calls[0][0];
    expect(saved.currency).toBe('BRL');
    expect(saved.exchangeRate).toBe(1.0);
  });

  it('marks the connection and stops when the item is in LOGIN_ERROR', async () => {
    pluggyApi.getItem.mockResolvedValue({
      ...updatedItem,
      status: 'LOGIN_ERROR',
      error: { message: 'Invalid credentials' },
    });

    const result = await service.syncConnection(connection);

    expect(result.status).toBe(ConnectionStatus.LOGIN_ERROR);
    expect(result.accountsSynced).toBe(0);
    expect(pluggyApi.getAccounts).not.toHaveBeenCalled();
    expect(connectionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ConnectionStatus.LOGIN_ERROR,
        lastError: 'Invalid credentials',
      }),
    );
  });

  it('upserts bank accounts with balance from the provider', async () => {
    await service.syncConnection(connection);

    const savedAccount = accountsRepository.save.mock.calls[0][0];
    expect(savedAccount.providerAccountId).toBe('provider-acc-1');
    expect(savedAccount.type).toBe('checking');
    expect(savedAccount.balance).toBe(1200.5);
    expect(savedAccount.currency).toBe('BRL');
  });

  it('bounds incremental syncs with an overlap window but not the first sync', async () => {
    // First sync: no lastSyncedAt → full history (no `from`).
    await service.syncConnection(connection);
    expect(pluggyApi.getAllTransactions).toHaveBeenLastCalledWith('provider-acc-1', undefined);

    // Incremental: from ≈ lastSyncedAt - 7 days.
    connection.lastSyncedAt = new Date('2026-08-20T12:00:00.000Z');
    await service.syncConnection(connection);
    expect(pluggyApi.getAllTransactions).toHaveBeenLastCalledWith('provider-acc-1', '2026-08-13');
  });
});
