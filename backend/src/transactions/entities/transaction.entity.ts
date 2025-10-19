import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum InputMethod {
  MANUAL = 'manual',
  TELEGRAM = 'telegram',
  VOICE = 'voice',
  OCR = 'ocr',
  API = 'api',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time', nullable: true })
  time: string;

  @Column({ nullable: true })
  merchantName: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: InputMethod,
    default: InputMethod.MANUAL,
  })
  inputMethod: InputMethod;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  originalText: string;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ nullable: true })
  recurringPattern: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  exchangeRate: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  originalAmount: number;

  @Column({ nullable: true })
  originalCurrency: string;

  @ManyToOne(() => User, user => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setDefaults() {
    if (!this.date) {
      this.date = new Date();
    }
    if (!this.time) {
      this.time = new Date().toTimeString().slice(0, 8);
    }
  }
}