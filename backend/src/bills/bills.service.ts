import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill, BillStatus } from './entities/bill.entity';
import { User } from '../users/entities/user.entity';
import { ContextMember, MemberStatus } from '../contexts/entities/context-member.entity';
import { Transaction, TransactionType, InputMethod } from '../transactions/entities/transaction.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillFiltersDto } from './dto/bill-filters.dto';
import { PayBillDto } from './dto/pay-bill.dto';

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(Bill)
    private billsRepository: Repository<Bill>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    private transactionsService: TransactionsService,
  ) {}

  async create(dto: CreateBillDto, userId: string): Promise<Bill> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    let contextId = dto.contextId;
    if (contextId) {
      const membership = await this.membershipIn(contextId, userId);
      if (!membership || !membership.canEditTransactions()) {
        throw new ForbiddenException('You do not have permission to create bills in this context');
      }
    } else {
      contextId = await this.transactionsService.getOrCreateDefaultContext(userId);
    }

    this.assertInstallmentsConsistent(dto.installmentNumber, dto.installmentTotal);

    const bill = this.billsRepository.create({
      ...dto,
      dueDate: dto.dueDate.slice(0, 10),
      currency: dto.currency || user.defaultCurrency || 'USD',
      contextId,
      userId,
    });

    return this.billsRepository.save(bill);
  }

  async findAll(userId: string, filters: BillFiltersDto): Promise<Bill[]> {
    const queryBuilder = this.billsRepository.createQueryBuilder('bill');

    // Same scope rule as transactions: by default what the caller created,
    // and the whole context — for members — when one is asked for.
    if (filters.contextId) {
      const membership = await this.membershipIn(filters.contextId, userId);
      if (!membership || !membership.canViewTransactions()) {
        throw new ForbiddenException('You do not have access to this context');
      }
      queryBuilder.where('bill.contextId = :contextId', { contextId: filters.contextId });
    } else {
      queryBuilder.where('bill.userId = :userId', { userId });
    }

    const status = filters.status ?? BillStatus.OPEN;
    if (status !== 'all') {
      queryBuilder.andWhere('bill.status = :status', { status });
    }

    if (filters.month) {
      const [year, month] = filters.month.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      queryBuilder.andWhere('bill.dueDate BETWEEN :start AND :end', {
        start: `${filters.month}-01`,
        end: `${filters.month}-${String(lastDay).padStart(2, '0')}`,
      });
    }

    // Soonest obligation first — the order a "what do I owe" list is read in.
    return queryBuilder
      .orderBy('bill.dueDate', 'ASC')
      .addOrderBy('bill.createdAt', 'ASC')
      .getMany();
  }

  async findOne(id: string, userId: string): Promise<Bill> {
    const bill = await this.billsRepository.findOne({ where: { id } });

    if (!bill || !(await this.canRead(bill, userId))) {
      throw new NotFoundException('Bill not found');
    }

    return bill;
  }

  async update(id: string, dto: UpdateBillDto, userId: string): Promise<Bill> {
    const bill = await this.findForMutation(id, userId);

    if (dto.installmentNumber !== undefined || dto.installmentTotal !== undefined) {
      this.assertInstallmentsConsistent(
        dto.installmentNumber ?? bill.installmentNumber,
        dto.installmentTotal ?? bill.installmentTotal,
      );
    }

    // Leaving 'paid' (a reopen, or a cancel) clears the settlement link but
    // deliberately keeps the transaction: money that moved stays recorded
    // until the user removes the expense themselves.
    if (dto.status && dto.status !== bill.status && bill.status === BillStatus.PAID) {
      bill.paidAt = null;
      bill.paidTransactionId = null;
    }

    Object.assign(bill, dto, dto.dueDate ? { dueDate: dto.dueDate.slice(0, 10) } : {});

    return this.billsRepository.save(bill);
  }

  async remove(id: string, userId: string): Promise<void> {
    const bill = await this.findForMutation(id, userId);
    await this.billsRepository.remove(bill);
  }

  /**
   * Settles a bill: records a settlement expense in the payer's name — in a
   * shared context whoever actually paid is the one the expense belongs to —
   * and links it to the bill.
   */
  async pay(
    id: string,
    dto: PayBillDto,
    userId: string,
  ): Promise<{ bill: Bill; transaction: Transaction }> {
    const bill = await this.findPayable(id, userId);

    if (bill.status !== BillStatus.OPEN) {
      throw new ConflictException('Only an open bill can be paid');
    }

    const transaction = await this.transactionsService.create(
      {
        amount: dto.amount ?? Number(bill.amount),
        description: bill.description,
        type: TransactionType.EXPENSE,
        // Without a category the transaction would fall into the legacy
        // auto-categorizer; pin both tiers to what the bill already knows.
        category: bill.category ?? bill.dashboardCategory ?? 'other',
        dashboardCategory: bill.dashboardCategory ?? 'other',
        currency: bill.currency,
        date: (dto.paidDate ?? new Date().toISOString()).slice(0, 10),
        merchantName: bill.merchantName ?? undefined,
        inputMethod: InputMethod.MANUAL,
        metadata: { billId: bill.id },
      },
      userId,
      bill.contextId,
    );

    // Optimistic flip: only one settlement may win. If another member paid
    // between our read and this update, roll our expense back and say so.
    const flip = await this.billsRepository.update(
      { id: bill.id, status: BillStatus.OPEN },
      { status: BillStatus.PAID, paidAt: new Date(), paidTransactionId: transaction.id },
    );

    if (!flip.affected) {
      await this.transactionsService.remove(transaction.id, userId).catch(() => undefined);
      throw new ConflictException('This bill has already been paid');
    }

    const paid = await this.billsRepository.findOne({ where: { id: bill.id } });
    return { bill: paid, transaction };
  }

  private membershipIn(contextId: string, userId: string): Promise<ContextMember | null> {
    return this.contextMembersRepository.findOne({
      where: { contextId, userId, status: MemberStatus.ACTIVE },
    });
  }

  private async canRead(bill: Bill, userId: string): Promise<boolean> {
    if (bill.userId === userId) {
      return true;
    }

    const membership = await this.membershipIn(bill.contextId, userId);
    return Boolean(membership?.canViewTransactions());
  }

  /**
   * A bill the caller may edit or delete: their own, or anyone's if they
   * administer the context — the same rule transactions follow.
   */
  private async findForMutation(id: string, userId: string): Promise<Bill> {
    const bill = await this.billsRepository.findOne({ where: { id } });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.userId === userId) {
      return bill;
    }

    const membership = await this.membershipIn(bill.contextId, userId);

    if (membership?.canModerateTransactions()) {
      return bill;
    }

    if (membership?.canViewTransactions()) {
      throw new ForbiddenException(
        'Only the member who created this bill, or a context owner or admin, can change it',
      );
    }

    throw new NotFoundException('Bill not found');
  }

  /**
   * Paying is wider than editing: any member who can record expenses in the
   * context may settle any of its bills — in a household, whoever pays, pays.
   * The settlement then lands in that member's own name.
   */
  private async findPayable(id: string, userId: string): Promise<Bill> {
    const bill = await this.billsRepository.findOne({ where: { id } });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.userId === userId) {
      return bill;
    }

    const membership = await this.membershipIn(bill.contextId, userId);

    if (membership?.canEditTransactions()) {
      return bill;
    }

    if (membership?.canViewTransactions()) {
      throw new ForbiddenException('Only members who can record expenses may pay a bill');
    }

    throw new NotFoundException('Bill not found');
  }

  private assertInstallmentsConsistent(
    installmentNumber?: number | null,
    installmentTotal?: number | null,
  ): void {
    if ((installmentNumber == null) !== (installmentTotal == null)) {
      throw new BadRequestException(
        'installmentNumber and installmentTotal must be provided together',
      );
    }

    if (installmentNumber != null && installmentTotal != null && installmentNumber > installmentTotal) {
      throw new BadRequestException('installmentNumber cannot exceed installmentTotal');
    }
  }
}
