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
      // A private chat belongs to whoever the Telegram account is linked to
      // NOW, so it always resolves to that user's own personal context. The
      // stored mapping cannot decide here: it is keyed by chat id, and a
      // private chat keeps its id when the Telegram account is unlinked and
      // relinked to a different Financy user — the stale row would keep
      // aiming the new owner's records at the previous owner's personal
      // context, where their membership check rightly refuses them.
      if (chatType === 'private') {
        return await this.getOrCreatePersonalContext(userId, chatId);
      }

      // Check if we already have a context for this chat
      const existingChatContext = await this.chatContextRepository.findOne({
        where: { chatId, chatType },
        relations: ['context'],
      });

      if (existingChatContext) {
        // A mapped group always answers with its context. Whether a
        // non-member may act there is the permission gate's decision
        // (enrollGroupSender), never a silent side effect of asking.
        return existingChatContext.contextId;
      }

      // Create new context based on chat type
      if (chatType === 'group' || chatType === 'supergroup') {
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
      // The user's OWN personal context — matching any personal context they
      // merely belong to could pick another user's, the same trap the REST
      // default-context resolution (getOrCreateDefaultContext) spells out.
      const userContexts = await this.contextsService.findUserContexts(userId);
      let personalContext = userContexts.find(
        ctx => ctx.type === 'personal' && ctx.ownerId === userId,
      );

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

      // ContextsService.create already enrolled the creator as OWNER — adding
      // them again here violated the unique membership constraint.

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
      return;
    }

    // A private chat follows its Telegram account: when that account is
    // relinked to another Financy user the old row must repoint to the new
    // owner's personal context. Group mappings are left alone — those are
    // managed by their own flows (the setup wizard and explicit linking).
    if (chatType === 'private' && existing.contextId !== contextId) {
      existing.contextId = contextId;
      await this.chatContextRepository.save(existing);
      this.logger.log(`Repointed chat-context mapping: ${chatId} -> ${contextId}`);
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

  /**
   * The single gate for content sent in a group: may this sender record
   * things in the group's context? Members who can edit pass; strangers are
   * enrolled only where the chat's own wizard created the context with that
   * "everyone in the group" promise (autoEnroll) — a chat linked to a
   * pre-existing context never enrolls anyone, joining it takes an invite.
   */
  async enrollGroupSender(
    userId: string,
    chatId: string,
    chatType: 'group' | 'supergroup',
  ): Promise<{ allowed: boolean; reason?: 'no-access' | 'cannot-post'; contextName?: string }> {
    const mapping = await this.chatContextRepository.findOne({
      where: { chatId, chatType },
      relations: ['context'],
    });

    if (!mapping) {
      return { allowed: true }; // unmapped group — the legacy flow may still create its context
    }

    const contextName = mapping.context?.name ?? mapping.chatTitle ?? '';

    const membership = await this.contextMemberRepository.findOne({
      where: { userId, contextId: mapping.contextId },
    });

    if (membership?.status === MemberStatus.ACTIVE) {
      return membership.canEditTransactions()
        ? { allowed: true }
        : { allowed: false, reason: 'cannot-post', contextName };
    }

    // A past or pending membership is never silently resurrected.
    if (!membership && mapping.autoEnroll) {
      await this.addUserToContext(userId, mapping.contextId, MemberRole.MEMBER);
      return { allowed: true };
    }

    return { allowed: false, reason: 'no-access', contextName };
  }

  /**
   * The contexts a chat could be linked to by this user: shared ones (never
   * personal) where they are owner or admin — linking a group is context
   * administration, not something any member does.
   */
  async linkableContextsFor(userId: string): Promise<Context[]> {
    const memberships = await this.contextMemberRepository.find({
      where: { userId, status: MemberStatus.ACTIVE },
      relations: ['context'],
    });

    return memberships
      .filter(
        (membership) =>
          membership.canModerateTransactions() &&
          membership.context &&
          membership.context.type !== ContextType.PERSONAL,
      )
      .map((membership) => membership.context);
  }

  /** Whether this user may link or re-link a chat to the given context. */
  async canLinkContext(userId: string, contextId: string): Promise<boolean> {
    const membership = await this.contextMemberRepository.findOne({
      where: { userId, contextId, status: MemberStatus.ACTIVE },
    });
    return Boolean(membership?.canModerateTransactions());
  }

  /**
   * Points the chat at an existing context, replacing any previous mapping —
   * always with enrollment off: the group linked to real family finances is
   * a window into them, not a door.
   */
  async linkChatToContext(
    chatId: string,
    chatType: 'private' | 'group' | 'supergroup' | 'channel',
    contextId: string,
    chatTitle?: string,
  ): Promise<void> {
    const existing = await this.chatContextRepository.findOne({ where: { chatId, chatType } });

    if (existing) {
      existing.contextId = contextId;
      existing.autoEnroll = false;
      existing.chatTitle = chatTitle ?? existing.chatTitle;
      await this.chatContextRepository.save(existing);
    } else {
      await this.chatContextRepository.save(
        this.chatContextRepository.create({ chatId, chatType, contextId, chatTitle, autoEnroll: false }),
      );
    }

    this.logger.log(`Linked chat ${chatId} to existing context ${contextId}`);
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