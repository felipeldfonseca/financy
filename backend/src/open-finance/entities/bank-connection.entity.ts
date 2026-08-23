import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Context } from '../../contexts/entities/context.entity';
import { BankAccount } from './bank-account.entity';

export enum ConnectionProvider {
  PLUGGY = 'pluggy',
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  UPDATING = 'updating',
  LOGIN_ERROR = 'login_error',
  CONSENT_EXPIRED = 'consent_expired',
  ERROR = 'error',
}

@Entity('bank_connections')
export class BankConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ConnectionProvider,
    default: ConnectionProvider.PLUGGY,
  })
  provider: ConnectionProvider;

  // Aggregator-side id of this connection (Pluggy: itemId)
  @Column({ unique: true })
  providerItemId: string;

  // Aggregator-side connector/institution id (Pluggy: connector.id)
  @Column({ nullable: true })
  institutionId: string;

  @Column({ nullable: true })
  institutionName: string;

  @Column({ nullable: true })
  institutionImageUrl: string;

  @Column({
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.CONNECTED,
  })
  status: ConnectionStatus;

  @Column({ type: 'timestamp', nullable: true })
  consentExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ nullable: true })
  lastError: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Context where synced transactions are filed. Consent is personal by
  // regulation, so the connection itself always belongs to a single user.
  @ManyToOne(() => Context)
  @JoinColumn({ name: 'contextId' })
  context: Context;

  @Column('uuid', { nullable: true })
  contextId: string;

  @OneToMany(() => BankAccount, account => account.connection)
  accounts: BankAccount[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
