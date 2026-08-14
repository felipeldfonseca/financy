import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Goal, GoalStatus, GoalType, GrowthRatePeriod } from './entities/goal.entity';
import { GoalContribution, ContributionKind } from './entities/goal-contribution.entity';
import { User } from '../users/entities/user.entity';
import { ContextMember, MemberStatus } from '../contexts/entities/context-member.entity';
import { TransactionsService } from '../transactions/transactions.service';
import {
  CreateGoalDto,
  UpdateGoalDto,
  GoalFiltersDto,
  ContributeDto,
  AdjustBalanceDto,
} from './dto/goal.dtos';

/**
 * Savings goals follow the exact permission grammar bills established:
 * members who can record expenses can create goals and contribute to them —
 * each contribution in the contributor's own name — while editing or removing
 * a goal stays with its author or a context owner/admin.
 */
@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(GoalContribution)
    private contributionsRepository: Repository<GoalContribution>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    private transactionsService: TransactionsService,
  ) {}

  async create(dto: CreateGoalDto, userId: string): Promise<Goal> {
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
        throw new ForbiddenException('You do not have permission to create goals in this context');
      }
    } else {
      contextId = await this.transactionsService.getOrCreateDefaultContext(userId);
    }

    const goalType = dto.goalType ?? GoalType.TARGET;
    this.assertAmountsMatchType(goalType, dto.targetAmount, dto.monthlyTarget);
    this.assertGrowthRateFitsPeriod(
      dto.expectedGrowthRate,
      dto.growthRatePeriod ?? GrowthRatePeriod.YEARLY,
    );

    const goal = this.goalsRepository.create({
      ...dto,
      goalType,
      targetDate: dto.targetDate ? dto.targetDate.slice(0, 10) : null,
      currency: dto.currency || user.defaultCurrency || 'USD',
      contextId,
      userId,
    });

    return this.goalsRepository.save(goal);
  }

  async findAll(userId: string, filters: GoalFiltersDto): Promise<Goal[]> {
    const queryBuilder = this.goalsRepository.createQueryBuilder('goal');

    if (filters.contextId) {
      const membership = await this.membershipIn(filters.contextId, userId);
      if (!membership || !membership.canViewTransactions()) {
        throw new ForbiddenException('You do not have access to this context');
      }
      queryBuilder.where('goal.contextId = :contextId', { contextId: filters.contextId });
    } else {
      queryBuilder.where('goal.userId = :userId', { userId });
    }

    const status = filters.status ?? GoalStatus.ACTIVE;
    if (status !== 'all') {
      queryBuilder.andWhere('goal.status = :status', { status });
    }

    const goals = await queryBuilder.orderBy('goal.createdAt', 'ASC').getMany();
    return this.attachMonthProgress(goals);
  }

  async findOne(id: string, userId: string): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({ where: { id } });

    if (!goal || !(await this.canRead(goal, userId))) {
      throw new NotFoundException('Goal not found');
    }

    const [withProgress] = await this.attachMonthProgress([goal]);
    return withProgress;
  }

  /**
   * Every active goal the user could deposit into from a chat message:
   * their own, plus any in contexts where they can record expenses — the
   * mirror of the bills settlement scope.
   */
  async findOpenForContribution(userId: string): Promise<Goal[]> {
    const memberships = await this.contextMembersRepository.find({
      where: { userId, status: MemberStatus.ACTIVE },
    });
    const contributableContextIds = memberships
      .filter((membership) => membership.canEditTransactions())
      .map((membership) => membership.contextId);

    const queryBuilder = this.goalsRepository
      .createQueryBuilder('goal')
      .where('goal.status = :status', { status: GoalStatus.ACTIVE });

    queryBuilder.andWhere(
      new Brackets((scope) => {
        scope.where('goal.userId = :userId', { userId });
        if (contributableContextIds.length > 0) {
          scope.orWhere('goal.contextId IN (:...contributableContextIds)', {
            contributableContextIds,
          });
        }
      }),
    );

    const goals = await queryBuilder.orderBy('goal.createdAt', 'ASC').getMany();
    return this.attachMonthProgress(goals);
  }

  async update(id: string, dto: UpdateGoalDto, userId: string): Promise<Goal> {
    const goal = await this.findForMutation(id, userId);

    Object.assign(goal, dto, dto.targetDate ? { targetDate: dto.targetDate.slice(0, 10) } : {});
    this.assertAmountsMatchType(goal.goalType, goal.targetAmount, goal.monthlyTarget);
    this.assertGrowthRateFitsPeriod(goal.expectedGrowthRate, goal.growthRatePeriod);

    const saved = await this.goalsRepository.save(goal);
    const [withProgress] = await this.attachMonthProgress([saved]);
    return withProgress;
  }

  async remove(id: string, userId: string): Promise<void> {
    const goal = await this.findForMutation(id, userId);
    await this.goalsRepository.remove(goal);
  }

  /**
   * A deposit towards the goal, in the depositor's own name. The running
   * total is incremented atomically so two simultaneous savers never lose
   * each other's money.
   */
  async contribute(
    goalId: string,
    dto: ContributeDto,
    userId: string,
  ): Promise<{ goal: Goal; contribution: GoalContribution }> {
    const goal = await this.findContributable(goalId, userId);

    if (goal.status !== GoalStatus.ACTIVE) {
      throw new ConflictException('Only an active goal accepts contributions');
    }

    const contribution = await this.contributionsRepository.save(
      this.contributionsRepository.create({
        goalId: goal.id,
        userId,
        amount: dto.amount,
        kind: ContributionKind.DEPOSIT,
        date: (dto.date ?? new Date().toISOString()).slice(0, 10),
      }),
    );

    await this.goalsRepository.increment({ id: goal.id }, 'currentAmount', dto.amount);

    const updated = await this.goalsRepository.findOne({ where: { id: goal.id } });
    const [withProgress] = await this.attachMonthProgress([updated]);
    return { goal: withProgress, contribution };
  }

  /**
   * A ± correction of the balance — yield that landed, a loss, a recount.
   * It joins the trail marked as an adjustment (so the month bar ignores it)
   * and may never push the balance below zero: the guard and the arithmetic
   * are one atomic statement, so two simultaneous corrections cannot
   * conspire into a negative pot.
   */
  async adjust(
    goalId: string,
    dto: AdjustBalanceDto,
    userId: string,
  ): Promise<{ goal: Goal; contribution: GoalContribution }> {
    const goal = await this.findContributable(goalId, userId);

    if (goal.status !== GoalStatus.ACTIVE) {
      throw new ConflictException('Only an active goal accepts adjustments');
    }
    if (!dto.amount) {
      throw new BadRequestException('An adjustment of zero changes nothing');
    }

    if (!(await this.applyBalanceDelta(goal.id, dto.amount))) {
      throw new ConflictException('This adjustment would make the goal balance negative');
    }

    let contribution: GoalContribution;
    try {
      contribution = await this.contributionsRepository.save(
        this.contributionsRepository.create({
          goalId: goal.id,
          userId,
          amount: dto.amount,
          kind: ContributionKind.ADJUSTMENT,
          note: dto.note ?? null,
          date: (dto.date ?? new Date().toISOString()).slice(0, 10),
        }),
      );
    } catch (error) {
      // The balance moved but the trail entry did not land: put it back.
      await this.applyBalanceDelta(goal.id, -dto.amount);
      throw error;
    }

    const updated = await this.goalsRepository.findOne({ where: { id: goal.id } });
    const [withProgress] = await this.attachMonthProgress([updated]);
    return { goal: withProgress, contribution };
  }

  /** The trail, newest first, with who saved each amount. */
  async listContributions(goalId: string, userId: string): Promise<GoalContribution[]> {
    await this.findOne(goalId, userId); // read permission gate

    return this.contributionsRepository
      .createQueryBuilder('contribution')
      .where('contribution.goalId = :goalId', { goalId })
      .leftJoin('contribution.user', 'author')
      .addSelect(['author.id', 'author.firstName', 'author.lastName'])
      .orderBy('contribution.date', 'DESC')
      .addOrderBy('contribution.createdAt', 'DESC')
      .getMany();
  }

  /** Undo a deposit: its author, or a context owner/admin tidying up. */
  async removeContribution(goalId: string, contributionId: string, userId: string): Promise<void> {
    const goal = await this.findOne(goalId, userId);

    const contribution = await this.contributionsRepository.findOne({
      where: { id: contributionId, goalId: goal.id },
    });
    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    if (contribution.userId !== userId) {
      const membership = await this.membershipIn(goal.contextId, userId);
      if (!membership?.canModerateTransactions()) {
        throw new ForbiddenException(
          'Only the member who made this contribution, or a context owner or admin, can remove it',
        );
      }
    }

    // With negative adjustments in the trail, undoing a deposit can strand
    // the balance below zero — same atomic guard as adjusting.
    if (!(await this.applyBalanceDelta(goal.id, -Number(contribution.amount)))) {
      throw new ConflictException('Removing this entry would make the goal balance negative');
    }

    const deleted = await this.contributionsRepository.delete({ id: contribution.id });
    if (!deleted.affected) {
      // A concurrent undo beat us to the row and already took the amount out;
      // give ours back so the balance is subtracted exactly once.
      await this.applyBalanceDelta(goal.id, Number(contribution.amount));
      throw new NotFoundException('Contribution not found');
    }
  }

  /**
   * currentAmount += delta, refused (false) if the result would be negative.
   * Guard and update are a single statement — no read-then-write window.
   */
  private async applyBalanceDelta(goalId: string, delta: number): Promise<boolean> {
    const result = await this.goalsRepository
      .createQueryBuilder()
      .update(Goal)
      .set({ currentAmount: () => '"currentAmount" + :delta' })
      .where('id = :id AND "currentAmount" + :delta >= 0', { id: goalId, delta })
      .execute();
    return Boolean(result.affected);
  }

  /**
   * An event goal without a finish line, or a habit without its monthly
   * deposit, is a goal that cannot be measured — refused at the door.
   */
  private assertAmountsMatchType(
    goalType: GoalType,
    targetAmount?: number | null,
    monthlyTarget?: number | null,
  ): void {
    if (goalType === GoalType.TARGET && targetAmount == null) {
      throw new BadRequestException('An event goal needs a target amount');
    }
    if (goalType === GoalType.RECURRING && monthlyTarget == null) {
      throw new BadRequestException('A monthly habit needs a monthly target');
    }
  }

  /**
   * The DTO caps the rate at 500% for either period; a rate quoted per
   * month gets the tighter ceiling only the merged state can check.
   */
  private assertGrowthRateFitsPeriod(
    rate?: number | null,
    period?: GrowthRatePeriod,
  ): void {
    if (rate != null && period === GrowthRatePeriod.MONTHLY && Number(rate) > 50) {
      throw new BadRequestException('A monthly growth rate must be at most 50% a.m.');
    }
  }

  /**
   * The current month's deposits, summed per habit — what its progress bar
   * measures, reset by the calendar rather than by any stored state.
   */
  private async attachMonthProgress(goals: Goal[]): Promise<Goal[]> {
    const habits = goals.filter((goal) => goal.goalType === GoalType.RECURRING);
    if (habits.length === 0) {
      return goals;
    }

    const totals = await this.monthDepositsFor(
      habits.map((goal) => goal.id),
      new Date(),
    );
    habits.forEach((goal) => {
      goal.monthContributed = totals.get(goal.id) ?? 0;
    });

    return goals;
  }

  /**
   * Deposits summed per goal for the calendar month `now` falls in.
   * Adjustments move the total, never the month bar: the habit is about
   * money deliberately put aside, not about the market's mood. Public so
   * the month-end reminder can measure any month it is asked about.
   */
  async monthDepositsFor(goalIds: string[], now: Date): Promise<Map<string, number>> {
    if (goalIds.length === 0) {
      return new Map();
    }

    const month = now.toISOString().slice(0, 7);
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

    const rows = await this.contributionsRepository
      .createQueryBuilder('contribution')
      .select('contribution.goalId', 'goalId')
      .addSelect('SUM(contribution.amount)', 'total')
      .where('contribution.goalId IN (:...goalIds)', { goalIds })
      .andWhere('contribution.kind = :kind', { kind: ContributionKind.DEPOSIT })
      .andWhere('contribution.date BETWEEN :start AND :end', {
        start: `${month}-01`,
        end: `${month}-${String(lastDay).padStart(2, '0')}`,
      })
      .groupBy('contribution.goalId')
      .getRawMany();

    return new Map(rows.map((row) => [row.goalId, Number(row.total)]));
  }

  private membershipIn(contextId: string, userId: string): Promise<ContextMember | null> {
    return this.contextMembersRepository.findOne({
      where: { contextId, userId, status: MemberStatus.ACTIVE },
    });
  }

  private async canRead(goal: Goal, userId: string): Promise<boolean> {
    if (goal.userId === userId) {
      return true;
    }
    const membership = await this.membershipIn(goal.contextId, userId);
    return Boolean(membership?.canViewTransactions());
  }

  private async findForMutation(id: string, userId: string): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId === userId) {
      return goal;
    }

    const membership = await this.membershipIn(goal.contextId, userId);
    if (membership?.canModerateTransactions()) {
      return goal;
    }
    if (membership?.canViewTransactions()) {
      throw new ForbiddenException(
        'Only the member who created this goal, or a context owner or admin, can change it',
      );
    }
    throw new NotFoundException('Goal not found');
  }

  /** Saving is wider than editing: any member who records expenses may deposit. */
  private async findContributable(id: string, userId: string): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId === userId) {
      return goal;
    }

    const membership = await this.membershipIn(goal.contextId, userId);
    if (membership?.canEditTransactions()) {
      return goal;
    }
    if (membership?.canViewTransactions()) {
      throw new ForbiddenException('Only members who can record expenses may contribute');
    }
    throw new NotFoundException('Goal not found');
  }
}
