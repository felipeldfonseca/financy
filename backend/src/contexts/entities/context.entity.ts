import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContextMember } from './context-member.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum ContextType {
  PERSONAL = 'personal',
  FAMILY = 'family',
  BUSINESS = 'business',
  SHARED_LIVING = 'shared_living',
  TRIP = 'trip',
  PROJECT = 'project',
  FRIENDS = 'friends',
  SHARED = 'shared',
}

export enum ContextVisibility {
  PRIVATE = 'private',
  INVITE_ONLY = 'invite_only',
  PUBLIC = 'public',
}

@Entity('contexts')
export class Context {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ContextType,
    default: ContextType.PERSONAL,
  })
  type: ContextType;

  @Column({
    type: 'enum',
    enum: ContextVisibility,
    default: ContextVisibility.INVITE_ONLY,
  })
  visibility: ContextVisibility;

  @Column({ length: 3, default: 'USD' })
  defaultCurrency: string;

  @Column({ length: 50, nullable: true })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 7, nullable: true })
  color: string; // Hex color for UI

  @Column({ length: 50, nullable: true })
  icon: string; // Icon identifier for UI

  // Owner relationship
  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  // Members relationship
  @OneToMany(() => ContextMember, member => member.context, { cascade: true })
  members: ContextMember[];

  // Transactions relationship
  @OneToMany(() => Transaction, transaction => transaction.context)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setDefaults() {
    if (!this.color) {
      // Generate a random color for the context
      const colors = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#303f9f'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    if (!this.icon) {
      // Default icons based on context type
      const iconMap = {
        [ContextType.PERSONAL]: 'person',
        [ContextType.FAMILY]: 'family_restroom',
        [ContextType.BUSINESS]: 'business',
        [ContextType.SHARED_LIVING]: 'home',
        [ContextType.TRIP]: 'flight',
        [ContextType.PROJECT]: 'engineering',
        [ContextType.FRIENDS]: 'people',
        [ContextType.SHARED]: 'group',
      };
      this.icon = iconMap[this.type] || 'folder';
    }
  }
}