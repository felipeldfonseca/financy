import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Context } from '../../contexts/entities/context.entity';

export enum GoalStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum GoalType {
  /** A finish line: reach targetAmount, optionally by targetDate. */
  TARGET = 'target',
  /** A habit: deposit monthlyTarget every month, indefinitely. */
  RECURRING = 'recurring',
}

/**
 * A savings goal: money being put aside on purpose — a trip, an emergency
 * fund. currentAmount is the running sum of its contributions, kept
 * denormalized (and incremented atomically) so listing goals never needs an
 * aggregate; the contributions themselves are the audit trail of who saved
 * what, which in a shared context is half the point.
 */
@Entity('goals')
@Index('IDX_goals_context', ['contextId'])
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  // An event goal races towards this; a monthly habit may not have one at
  // all — its measure is the month, not a finish line.
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  targetAmount: number;

  @Column({ type: 'enum', enum: GoalType, default: GoalType.TARGET })
  goalType: GoalType;

  /** The habit's monthly deposit target; null for event goals. */
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  monthlyTarget: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  /** Optional deadline; a goal without one is simply open-ended. */
  @Column({ type: 'date', nullable: true })
  targetDate: string;

  @Column({ length: 7, nullable: true })
  color: string;

  // 'achieved' is deliberately not a status: it is derived, so it can never
  // go stale when a contribution lands or is removed.
  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.ACTIVE })
  status: GoalStatus;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  contextId: string;

  @ManyToOne(() => Context, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contextId' })
  context: Context;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Sum of this month's contributions, attached by the service for monthly
   * habits — the number their progress bar measures. Not persisted: it
   * describes the current month, not the goal.
   */
  monthContributed?: number;

  @Expose()
  get isAchieved(): boolean {
    // A habit without a finish line is never "done" — that is the point.
    if (this.targetAmount == null) {
      return false;
    }
    return Number(this.currentAmount) >= Number(this.targetAmount);
  }
}
