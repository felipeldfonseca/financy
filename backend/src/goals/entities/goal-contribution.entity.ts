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

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

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
