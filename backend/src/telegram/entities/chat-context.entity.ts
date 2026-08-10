import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Context } from '../../contexts/entities/context.entity';

@Entity('chat_contexts')
// Named explicitly so the entity and the migration agree; without a name
// TypeORM expects a generated hash the migration does not create.
@Index('IDX_chat_contexts_chat_id_chat_type', ['chatId', 'chatType'])
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

  // Without an explicit join column the relation would generate a second,
  // redundant "contextId" column alongside the "context_id" above.
  @ManyToOne(() => Context, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'context_id' })
  context: Context;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}