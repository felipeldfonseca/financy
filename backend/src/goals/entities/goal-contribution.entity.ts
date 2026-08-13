import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Goal } from './goal.entity';

export enum ContributionKind {
  /** Money actually put aside — what the month bar measures. */
  DEPOSIT = 'deposit',
  /** A ± correction of the balance (yield, loss, recount); never a deposit. */
  ADJUSTMENT = 'adjustment',
}

/**
 * One deposit towards a goal, in the name of whoever made it — the same
 * principle as bill settlements: in a household, whoever saves, saves.
 * Deleting a goal takes its trail with it.
 */
@Entity('goal_contributions')
@Index('IDX_goal_contributions_goal', ['goalId'])
export class GoalContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Negative only for adjustments: a deposit is always money in.
  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ContributionKind, default: ContributionKind.DEPOSIT })
  kind: ContributionKind;

  /** Why the balance was adjusted — "rendimento de julho", "saque". */
  @Column({ length: 300, nullable: true })
  note: string;

  /** Calendar date of the deposit; hydrated as 'YYYY-MM-DD'. */
  @Column({ type: 'date' })
  date: string;

  @Column('uuid')
  goalId: string;

  @ManyToOne(() => Goal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: Goal;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
