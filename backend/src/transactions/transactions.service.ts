import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { ContextMember, MemberStatus, MemberRole } from '../contexts/entities/context-member.entity';
import { Context, ContextType } from '../contexts/entities/context.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { CurrencyService } from '../currency/currency.service';
import { VALID_DASHBOARD_CATEGORIES, getValidDashboardCategories } from './constants/categories.constants';

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  categories: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: TransactionSummary;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    @InjectRepository(Context)
    private contextsRepository: Repository<Context>,
    private currencyService: CurrencyService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string, contextId?: string): Promise<Transaction> {
    // Verify user exists and is active
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    // Handle context assignment
    let assignedContextId = contextId;
    if (contextId) {
      // Verify user has access to the specified context
      const membership = await this.contextMembersRepository.findOne({
        where: { 
          contextId, 
          userId, 
          status: MemberStatus.ACTIVE 
        },
      });

      if (!membership || !membership.canEditTransactions()) {
        throw new ForbiddenException('You do not have permission to create transactions in this context');
      }
    } else {
      // If no context specified, use user's default personal context
      assignedContextId = await this.getOrCreateDefaultContext(userId);
    }

    // Validate amount is positive
    if (createTransactionDto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }

    // Set default currency if not provided
    const transactionCurrency = createTransactionDto.currency || user.defaultCurrency || 'USD';
    const userPreferredCurrency = user.defaultCurrency || 'USD';

    // Prepare transaction data
    const transactionData: any = {
      ...createTransactionDto,
      userId,
      contextId: assignedContextId,
      status: TransactionStatus.PENDING,
      currency: userPreferredCurrency, // Always store in user's preferred currency
    };

    // Perform currency conversion if needed
    if (transactionCurrency !== userPreferredCurrency) {
      try {
        const conversion = await this.currencyService.convertCurrency(
          createTransactionDto.amount,
          transactionCurrency,
          userPreferredCurrency
        );

        // Store original currency info
        transactionData.originalCurrency = transactionCurrency;
        transactionData.originalAmount = createTransactionDto.amount;
        transactionData.exchangeRate = conversion.exchangeRate;
        transactionData.amount = conversion.convertedAmount;

        this.logger.log(
          `Converted ${createTransactionDto.amount} ${transactionCurrency} to ${conversion.convertedAmount} ${userPreferredCurrency} @ rate ${conversion.exchangeRate}`
        );
      } catch (error) {
        this.logger.error(`Currency conversion failed: ${error.message}`);
        throw new BadRequestException(
          `Failed to convert from ${transactionCurrency} to ${userPreferredCurrency}. Please try again later.`
        );
      }
    } else {
      // Same currency - no conversion needed
      transactionData.amount = createTransactionDto.amount;
      transactionData.originalCurrency = transactionCurrency;
      transactionData.originalAmount = createTransactionDto.amount;
      transactionData.exchangeRate = 1.0;
    }

    // Create transaction
    const transaction = this.transactionsRepository.create(transactionData);
    const savedTransaction = await this.transactionsRepository.save(transaction) as unknown as Transaction;

    // Auto-categorize if no category provided
    if (!createTransactionDto.category) {
      this.autoCategorizeTransaction(savedTransaction);
    }

    return savedTransaction;
  }

  async findUserTransactions(
    userId: string,
    filters: TransactionFiltersDto,
  ): Promise<PaginatedTransactions> {
    const queryBuilder = this.transactionsRepository.createQueryBuilder('transaction');

    await this.applyScope(queryBuilder, userId, filters);

    // Apply filters
    this.applyFilters(queryBuilder, filters);

    // Apply sorting
    const sortField = filters.sortBy === 'createdAt' ? 'transaction.createdAt' : `transaction.${filters.sortBy}`;
    queryBuilder.orderBy(sortField, filters.sortOrder);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [transactions, total] = await queryBuilder.getManyAndCount();

    // Calculate summary
    const summary = await this.calculateSummary(userId, filters);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    };
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    // Anyone who can see the transaction in a shared context's list must also
    // be able to open it; a 404 is used for the rest so the endpoint does not
    // reveal which ids exist.
    if (!transaction || !(await this.canRead(transaction, userId))) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /** The caller's live membership of the context a transaction belongs to. */
  private async membershipFor(
    transaction: Transaction,
    userId: string,
  ): Promise<ContextMember | null> {
    if (!transaction.contextId) {
      return null;
    }

    return this.contextMembersRepository.findOne({
      where: {
        contextId: transaction.contextId,
        userId,
        status: MemberStatus.ACTIVE,
      },
    });
  }

  private async canRead(transaction: Transaction, userId: string): Promise<boolean> {
    if (transaction.userId === userId) {
      return true;
    }

    const membership = await this.membershipFor(transaction, userId);
    return Boolean(membership?.canViewTransactions());
  }

  /**
   * Resolves a transaction the caller is allowed to change: their own, or
   * anyone's if they administer the context it belongs to. Without this an
   * owner could see a departed member's entries in the shared list but never
   * correct or remove them.
   */
  private async findForMutation(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId === userId) {
      return transaction;
    }

    const membership = await this.membershipFor(transaction, userId);

    if (membership?.canModerateTransactions()) {
      return transaction;
    }

    // Someone who can already see it learns nothing from a clear refusal.
    if (membership?.canViewTransactions()) {
      throw new ForbiddenException(
        'Only the member who recorded this transaction, or a context owner or admin, can change it',
      );
    }

    throw new NotFoundException('Transaction not found');
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    const transaction = await this.findForMutation(id, userId);

    // Validate amount if being updated
    if (updateTransactionDto.amount !== undefined && updateTransactionDto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }

    // Update transaction
    Object.assign(transaction, updateTransactionDto);
    transaction.updatedAt = new Date();

    return await this.transactionsRepository.save(transaction);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findForMutation(id, userId);
    await this.transactionsRepository.remove(transaction);
  }

  async confirmTransaction(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.findForMutation(id, userId);
    transaction.status = TransactionStatus.CONFIRMED;
    return await this.transactionsRepository.save(transaction);
  }

  async cancelTransaction(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.findForMutation(id, userId);
    transaction.status = TransactionStatus.CANCELLED;
    return await this.transactionsRepository.save(transaction);
  }

  async getCategories(userId: string): Promise<string[]> {
    const result = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.category IS NOT NULL')
      .getRawMany();

    return result.map(r => r.category).filter(Boolean).sort();
  }

  async getDashboardCategories(userId: string): Promise<{ [type: string]: string[] }> {
    const result = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.dashboardCategory', 'dashboardCategory')
      .addSelect('transaction.type', 'type')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.dashboardCategory IS NOT NULL')
      .getRawMany();

    // Group by transaction type
    const grouped = result.reduce((acc, item) => {
      const type = item.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      if (!acc[type].includes(item.dashboardCategory)) {
        acc[type].push(item.dashboardCategory);
      }
      return acc;
    }, {});

    // Sort categories within each type
    Object.keys(grouped).forEach(type => {
      grouped[type].sort();
    });

    return grouped;
  }

  getValidDashboardCategoriesForType(transactionType: string): string[] {
    return Array.from(getValidDashboardCategories(transactionType));
  }

  getAllValidDashboardCategories(): typeof VALID_DASHBOARD_CATEGORIES {
    return VALID_DASHBOARD_CATEGORIES;
  }

  async getMerchants(userId: string): Promise<string[]> {
    const result = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.merchantName', 'merchant')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.merchantName IS NOT NULL')
      .getRawMany();

    return result.map(r => r.merchant).filter(Boolean).sort();
  }

  /**
   * Restricts a query to what the caller is allowed to see. By default that is
   * their own transactions; when a shared context is requested it is every
   * transaction recorded in that context, which is the whole point of sharing
   * one — but only for members who are actually part of it.
   */
  private async applyScope(
    queryBuilder: any,
    userId: string,
    filters: TransactionFiltersDto,
  ): Promise<void> {
    if (!filters.contextId) {
      queryBuilder.where('transaction.userId = :userId', { userId });
      return;
    }

    const membership = await this.contextMembersRepository.findOne({
      where: {
        contextId: filters.contextId,
        userId,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!membership || !membership.canViewTransactions()) {
      throw new ForbiddenException('You do not have access to this context');
    }

    queryBuilder.where('transaction.contextId = :contextId', {
      contextId: filters.contextId,
    });

    // In a shared list "whose expense is this?" is the first question, and the
    // answer also decides which rows offer an edit button. Only the naming
    // fields are selected — nothing else about the member is needed here.
    queryBuilder
      .leftJoin('transaction.user', 'author')
      .addSelect(['author.id', 'author.firstName', 'author.lastName']);
  }

  private applyFilters(queryBuilder: any, filters: TransactionFiltersDto): void {
    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('transaction.date >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('transaction.date <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('transaction.status = :status', { status: filters.status });
    }

    if (filters.category) {
      queryBuilder.andWhere('transaction.category = :category', { category: filters.category });
    }

    if (filters.subcategory) {
      queryBuilder.andWhere('transaction.subcategory = :subcategory', {
        subcategory: filters.subcategory,
      });
    }

    if (filters.dashboardCategory) {
      queryBuilder.andWhere('transaction.dashboardCategory = :dashboardCategory', {
        dashboardCategory: filters.dashboardCategory,
      });
    }

    if (filters.currency) {
      queryBuilder.andWhere('transaction.currency = :currency', { currency: filters.currency });
    }

    if (filters.merchantName) {
      queryBuilder.andWhere('transaction.merchantName ILIKE :merchantName', {
        merchantName: `%${filters.merchantName}%`,
      });
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', {
        minAmount: filters.minAmount,
      });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', {
        maxAmount: filters.maxAmount,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(transaction.description ILIKE :search OR transaction.merchantName ILIKE :search OR transaction.notes ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
  }

  private async calculateSummary(
    userId: string,
    filters: TransactionFiltersDto,
  ): Promise<TransactionSummary> {
    const queryBuilder = this.transactionsRepository.createQueryBuilder('transaction');

    await this.applyScope(queryBuilder, userId, filters);

    queryBuilder.andWhere('transaction.status != :cancelledStatus', {
      cancelledStatus: TransactionStatus.CANCELLED,
    });

    this.applyFilters(queryBuilder, filters);

    const transactions = await queryBuilder.getMany();

    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netAmount = totalIncome - totalExpenses;

    // Calculate category breakdown
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      
      categoryMap.set(category, {
        amount: existing.amount + Number(transaction.amount),
        count: existing.count + 1,
      });
    });

    const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    }));

    // Sort categories by amount (descending)
    categories.sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpenses,
      netAmount,
      transactionCount: transactions.length,
      categories,
    };
  }

  private async autoCategorizeTransaction(transaction: Transaction): Promise<void> {
    // Simple auto-categorization logic based on description and merchant
    const description = transaction.description.toLowerCase();
    const merchant = transaction.merchantName?.toLowerCase() || '';

    let category = 'Other';

    // Food & Dining
    if (
      description.includes('restaurant') ||
      description.includes('food') ||
      description.includes('coffee') ||
      merchant.includes('restaurant') ||
      merchant.includes('cafe')
    ) {
      category = 'Food & Dining';
    }
    // Transportation
    else if (
      description.includes('gas') ||
      description.includes('fuel') ||
      description.includes('transport') ||
      description.includes('uber') ||
      description.includes('taxi')
    ) {
      category = 'Transportation';
    }
    // Shopping
    else if (
      description.includes('store') ||
      description.includes('market') ||
      description.includes('shopping') ||
      merchant.includes('store') ||
      merchant.includes('market')
    ) {
      category = 'Shopping';
    }
    // Utilities
    else if (
      description.includes('electric') ||
      description.includes('water') ||
      description.includes('internet') ||
      description.includes('phone')
    ) {
      category = 'Bills & Utilities';
    }

    // Update transaction with category (fire and forget)
    this.transactionsRepository.update(transaction.id, { category }).catch(() => {
      // Ignore errors in auto-categorization
    });
  }

  async reconvertUserTransactions(userId: string, newCurrency: string): Promise<void> {
    this.logger.log(`Reconverting all transactions for user ${userId} to ${newCurrency}`);

    // Get all user transactions
    const transactions = await this.transactionsRepository.find({
      where: { userId },
    });

    this.logger.log(`Found ${transactions.length} transactions to reconvert`);

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Skip if transaction is already in the new currency
        if (transaction.currency === newCurrency) {
          continue;
        }

        const originalAmount = transaction.originalAmount || Number(transaction.amount);
        const originalCurrency = transaction.originalCurrency || transaction.currency;

        // Convert from original currency to new currency
        const conversion = await this.currencyService.convertCurrency(
          originalAmount,
          originalCurrency,
          newCurrency
        );

        // Update transaction
        transaction.currency = newCurrency;
        transaction.amount = conversion.convertedAmount;
        transaction.exchangeRate = conversion.exchangeRate;

        await this.transactionsRepository.save(transaction);

        this.logger.log(
          `Reconverted transaction ${transaction.id}: ${originalAmount} ${originalCurrency} -> ${conversion.convertedAmount} ${newCurrency} @ rate ${conversion.exchangeRate}`
        );
      } catch (error) {
        this.logger.error(`Failed to reconvert transaction ${transaction.id}: ${error.message}`);
        // Continue with other transactions even if one fails
      }
    }

    this.logger.log(`Completed reconversion for user ${userId}`);
  }

  // Public because bills resolve their home context by exactly the same rule;
  // a second implementation would eventually disagree with this one.
  async getOrCreateDefaultContext(userId: string): Promise<string> {
    // The user's own personal context — deliberately not "any context they
    // belong to". Matching any membership would file a transaction the user
    // meant to keep private into a shared context, where every other member
    // would see it.
    const personalContext = await this.contextsRepository.findOne({
      where: {
        ownerId: userId,
        type: ContextType.PERSONAL,
        isActive: true,
      },
    });

    if (personalContext) {
      return personalContext.id;
    }

    // If no context exists, create a default personal context
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create the context
    const context = this.contextsRepository.create({
      name: `${user.firstName}'s Personal Budget`,
      description: 'Personal financial tracking',
      type: ContextType.PERSONAL,
      ownerId: userId,
    });

    const savedContext = await this.contextsRepository.save(context);

    // Add the user as an active member
    const membership = this.contextMembersRepository.create({
      contextId: savedContext.id,
      userId,
      role: MemberRole.OWNER,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
    });

    await this.contextMembersRepository.save(membership);

    return savedContext.id;
  }
}