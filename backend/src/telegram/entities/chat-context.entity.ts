import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Context } from '../../contexts/entities/context.entity';

@Entity('chat_contexts')
@Index(['chatId', 'chatType'])
export class ChatContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', name: 'chat_id' })
  chatId: string;

  @Column({ type: 'varchar', length: 20, name: 'chat_type' })
  chatType: 'private' | 'group' | 'supergroup' | 'channel';

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'chat_title' })
  chatTitle?: string;

  @Column({ type: 'uuid', name: 'context_id' })
  contextId: string;

  @ManyToOne(() => Context, { onDelete: 'CASCADE' })
  context: Context;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}