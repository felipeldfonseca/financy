import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BankConnection } from './bank-connection.entity';

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  UNKNOWN = 'unknown',
}

@Entity('bank_accounts')
@Unique(['connectionId', 'providerAccountId'])
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BankConnection, connection => connection.accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'connectionId' })
  connection: BankConnection;

  @Column()
  connectionId: string;

  // Aggregator-side account id (Pluggy: account.id)
  @Column()
  providerAccountId: string;

  @Column({
    type: 'enum',
    enum: BankAccountType,
    default: BankAccountType.UNKNOWN,
  })
  type: BankAccountType;

  @Column({ nullable: true })
  name: string;

  // Only the masked number/last digits as returned by the provider — never
  // full account credentials or numbers beyond what the API already masks.
  @Column({ nullable: true })
  maskedNumber: string;

  @Column({ default: 'BRL' })
  currency: string;

  // Balance as reported by the provider; never derived by summing transactions.
  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  balance: number;

  @Column({ type: 'timestamp', nullable: true })
  balanceUpdatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
