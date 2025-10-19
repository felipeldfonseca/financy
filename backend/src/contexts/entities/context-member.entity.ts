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
import { User } from '../../users/entities/user.entity';
import { Context } from './context.entity';

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  LEFT = 'left',
}

@Entity('context_members')
@Unique(['contextId', 'userId']) // Prevent duplicate memberships
export class ContextMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MemberRole,
    default: MemberRole.MEMBER,
  })
  role: MemberRole;

  @Column({
    type: 'enum',
    enum: MemberStatus,
    default: MemberStatus.INVITED,
  })
  status: MemberStatus;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  invitedAt: Date;

  @Column('uuid', { nullable: true })
  invitedById: string; // Who invited this member

  @Column({ length: 500, nullable: true })
  inviteMessage: string;

  @Column({ length: 100, nullable: true })
  inviteToken: string; // Token for invitation acceptance

  @Column({ type: 'timestamp', nullable: true })
  inviteExpiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, boolean>; // Custom permissions override

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>; // Member-specific settings

  // Context relationship
  @Column('uuid')
  contextId: string;

  @ManyToOne(() => Context, context => context.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contextId' })
  context: Context;

  // User relationship
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Invited by relationship
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods for permission checking
  canManageMembers(): boolean {
    return this.role === MemberRole.OWNER || this.role === MemberRole.ADMIN;
  }

  canEditTransactions(): boolean {
    return this.status === MemberStatus.ACTIVE && 
           this.role !== MemberRole.VIEWER;
  }

  canViewTransactions(): boolean {
    return this.status === MemberStatus.ACTIVE;
  }

  canManageContext(): boolean {
    return this.role === MemberRole.OWNER;
  }

  isActive(): boolean {
    return this.status === MemberStatus.ACTIVE;
  }
}