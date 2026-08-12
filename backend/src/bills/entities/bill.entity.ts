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
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum BillStatus {
  OPEN = 'open',
  PAID = 'paid',
  CANCELED = 'canceled',
}

/**
 * A payment the user intends to make — an invoice, an installment, a rent due
 * on the 5th. A transaction records money that already moved; a bill records
 * money that is expected to move. The two meet when the bill is paid: a
 * settlement transaction is created in the payer's name and linked here.
 */
@Entity('bills')
@Index('IDX_bills_context_due_date', ['contextId', 'dueDate'])
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  description: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  /** A plain calendar date; hydrated by the driver as 'YYYY-MM-DD'. */
  @Column({ type: 'date' })
  dueDate: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 100, nullable: true })
  dashboardCategory: string;

  @Column({ length: 200, nullable: true })
  merchantName: string;

  @Column({ type: 'enum', enum: BillStatus, default: BillStatus.OPEN })
  status: BillStatus;

  @Column({ type: 'int', nullable: true })
  installmentNumber: number;

  @Column({ type: 'int', nullable: true })
  installmentTotal: number;

  /** Reserved for recurring bills; stored but not yet interpreted. */
  @Column({ length: 100, nullable: true })
  recurrenceRule: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  /**
   * The settlement transaction. SET NULL rather than blocking: deleting the
   * expense afterwards should not be forbidden by the bill that spawned it —
   * the bill keeps its paid status and paidAt either way.
   */
  @Column('uuid', { nullable: true })
  paidTransactionId: string;

  @ManyToOne(() => Transaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paidTransactionId' })
  paidTransaction: Transaction;

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
   * Overdue is derived, never stored: an open bill whose due date has passed.
   * Stored state would go stale at midnight; a derivation cannot. Computed
   * against the server's UTC calendar — clients that know the user's timezone
   * should derive it locally for display.
   */
  @Expose()
  get isOverdue(): boolean {
    if (this.status !== BillStatus.OPEN || !this.dueDate) {
      return false;
    }
    return String(this.dueDate).slice(0, 10) < new Date().toISOString().slice(0, 10);
  }
}
