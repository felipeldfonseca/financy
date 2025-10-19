import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';

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
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string): Promise<Transaction> {
    // Verify user exists and is active
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    // Validate amount is positive
    if (createTransactionDto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }

    // Set default currency if not provided
    if (!createTransactionDto.currency) {
      createTransactionDto.currency = user.defaultCurrency || 'USD';
    }

    // Create transaction
    const transaction = this.transactionsRepository.create({
      ...createTransactionDto,
      userId,
      status: TransactionStatus.PENDING,
    });

    const savedTransaction = await this.transactionsRepository.save(transaction);

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
    const queryBuilder = this.transactionsRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

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
      where: { id, userId },
      relations: ['user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);

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
    const transaction = await this.findOne(id, userId);
    await this.transactionsRepository.remove(transaction);
  }

  async confirmTransaction(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);
    transaction.status = TransactionStatus.CONFIRMED;
    return await this.transactionsRepository.save(transaction);
  }

  async cancelTransaction(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);
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

  async getMerchants(userId: string): Promise<string[]> {
    const result = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.merchantName', 'merchant')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.merchantName IS NOT NULL')
      .getRawMany();

    return result.map(r => r.merchant).filter(Boolean).sort();
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
    const queryBuilder = this.transactionsRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.status != :cancelledStatus', {
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
}