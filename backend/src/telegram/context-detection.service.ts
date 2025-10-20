import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatContext } from './entities/chat-context.entity';
import { ContextMember, MemberRole, MemberStatus } from '../contexts/entities/context-member.entity';
import { Context, ContextType } from '../contexts/entities/context.entity';
import { ContextsService } from '../contexts/contexts.service';
import { TelegramMessage, TelegramChat } from './interfaces/telegram.interface';

@Injectable()
export class ContextDetectionService {
  private readonly logger = new Logger(ContextDetectionService.name);

  constructor(
    @InjectRepository(ChatContext)
    private chatContextRepository: Repository<ChatContext>,
    @InjectRepository(ContextMember)
    private contextMemberRepository: Repository<ContextMember>,
    private contextsService: ContextsService,
  ) {}

  async determineContext(message: TelegramMessage, userId: string): Promise<string> {
    const chatId = message.chat.id.toString();
    const chatType = message.chat.type;

    try {
      // Check if we already have a context for this chat
      const existingChatContext = await this.chatContextRepository.findOne({
        where: { chatId, chatType },
        relations: ['context'],
      });

      if (existingChatContext) {
        // Verify user has access to this context
        const hasAccess = await this.checkUserContextAccess(userId, existingChatContext.contextId);
        if (hasAccess) {
          return existingChatContext.contextId;
        }
      }

      // Create new context based on chat type
      if (chatType === 'private') {
        return await this.getOrCreatePersonalContext(userId, chatId);
      } else if (chatType === 'group' || chatType === 'supergroup') {
        return await this.getOrCreateGroupContext(userId, message.chat);
      }

      // Fallback to user's default personal context
      return await this.getOrCreatePersonalContext(userId, chatId);
    } catch (error) {
      this.logger.error('Error determining context:', error);
      // Fallback to user's default personal context
      return await this.getOrCreatePersonalContext(userId, chatId);
    }
  }

  private async getOrCreatePersonalContext(userId: string, chatId: string): Promise<string> {
    try {
      // Look for existing personal context for this user
      const userContexts = await this.contextsService.findUserContexts(userId);
      let personalContext = userContexts.find(ctx => ctx.type === 'personal');

      if (!personalContext) {
        // Create personal context
        personalContext = await this.contextsService.create({
          name: 'Personal',
          type: ContextType.PERSONAL,
          description: 'Personal expenses and income',
        }, userId);
      }

      // Ensure chat-context mapping exists
      await this.ensureChatContextMapping(chatId, 'private', personalContext.id, null);

      return personalContext.id;
    } catch (error) {
      this.logger.error('Error creating personal context:', error);
      throw error;
    }
  }

  private async getOrCreateGroupContext(userId: string, chat: TelegramChat): Promise<string> {
    const chatId = chat.id.toString();
    const chatTitle = chat.title || `Group ${chatId}`;

    try {
      // Check if context already exists for this group
      const existingChatContext = await this.chatContextRepository.findOne({
        where: { chatId, chatType: chat.type },
        relations: ['context'],
      });

      if (existingChatContext) {
        // Add user as member if not already
        await this.ensureUserContextMembership(userId, existingChatContext.contextId);
        return existingChatContext.contextId;
      }

      // Create new context for this group
      const groupContext = await this.contextsService.create({
        name: chatTitle,
        type: chat.type === 'group' ? ContextType.FAMILY : ContextType.SHARED,
        description: `Shared expenses for ${chatTitle}`,
      }, userId);

      // Create chat-context mapping
      await this.ensureChatContextMapping(chatId, chat.type, groupContext.id, chatTitle);

      // Add user as admin (creator)
      await this.addUserToContext(userId, groupContext.id, MemberRole.ADMIN);

      return groupContext.id;
    } catch (error) {
      this.logger.error('Error creating group context:', error);
      throw error;
    }
  }

  async ensureChatContextMapping(
    chatId: string,
    chatType: 'private' | 'group' | 'supergroup' | 'channel',
    contextId: string,
    chatTitle?: string
  ): Promise<void> {
    const existing = await this.chatContextRepository.findOne({
      where: { chatId, chatType },
    });

    if (!existing) {
      const chatContext = this.chatContextRepository.create({
        chatId,
        chatType,
        contextId,
        chatTitle,
      });

      await this.chatContextRepository.save(chatContext);
      this.logger.log(`Created chat-context mapping: ${chatId} -> ${contextId}`);
    }
  }

  private async ensureUserContextMembership(userId: string, contextId: string): Promise<void> {
    const existing = await this.contextMemberRepository.findOne({
      where: { userId, contextId },
    });

    if (!existing) {
      await this.addUserToContext(userId, contextId, MemberRole.MEMBER);
    }
  }

  async addUserToContext(
    userId: string,
    contextId: string,
    role: MemberRole = MemberRole.MEMBER
  ): Promise<void> {
    const contextMember = this.contextMemberRepository.create({
      userId,
      contextId,
      role,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
    });

    await this.contextMemberRepository.save(contextMember);
    this.logger.log(`Added user ${userId} to context ${contextId} as ${role}`);
  }

  async checkUserContextAccess(userId: string, contextId: string): Promise<boolean> {
    const membership = await this.contextMemberRepository.findOne({
      where: { userId, contextId },
    });

    return !!membership && membership.status === MemberStatus.ACTIVE;
  }

  async getContextInfo(contextId: string, userId: string): Promise<{ name: string; type: string; chatTitle?: string }> {
    const context = await this.contextsService.findOne(contextId, userId);
    if (!context) {
      throw new Error('Context not found');
    }

    const chatContext = await this.chatContextRepository.findOne({
      where: { contextId },
    });

    return {
      name: context.name,
      type: context.type,
      chatTitle: chatContext?.chatTitle,
    };
  }

  async getUserContextsForChat(userId: string, chatId: string): Promise<Context[]> {
    // Get all contexts user has access to
    const userContexts = await this.contextsService.findUserContexts(userId);
    
    // If it's a private chat, return all user contexts
    const chatContext = await this.chatContextRepository.findOne({
      where: { chatId: chatId.toString() },
    });

    if (!chatContext || chatContext.chatType === 'private') {
      return userContexts;
    }

    // For group chats, return only the group's context
    return userContexts.filter(ctx => ctx.id === chatContext.contextId);
  }

  async handleBotAddedToGroup(chat: TelegramChat, addedByUserId: string): Promise<string> {
    this.logger.log(`Bot added to group: ${chat.title} (${chat.id}) by user ${addedByUserId}`);
    return await this.getOrCreateGroupContext(addedByUserId, chat);
  }

  async handleBotRemovedFromGroup(chatId: string): Promise<void> {
    this.logger.log(`Bot removed from group: ${chatId}`);
    // Optionally mark the context as inactive or remove the mapping
    // For now, we'll keep the context but could add an 'active' flag
  }
}