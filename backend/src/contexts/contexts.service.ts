import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Context, ContextType } from './entities/context.entity';
import { ContextMember, MemberRole, MemberStatus } from './entities/context-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/invite-member.dto';
import { EmailService } from '../email/email.service';
import { buildInvitationEmail } from '../email/templates/invitation.template';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContextsService {
  constructor(
    @InjectRepository(Context)
    private contextsRepository: Repository<Context>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(createContextDto: CreateContextDto, ownerId: string): Promise<Context> {
    await this.assertNameAvailable(createContextDto.name, ownerId);

    const context = this.contextsRepository.create({
      ...createContextDto,
      ownerId,
    });

    const savedContext = await this.contextsRepository.save(context);

    // Automatically add the owner as an active member
    await this.addOwnerAsMember(savedContext.id, ownerId);

    return savedContext;
  }

  /**
   * One creator, one context per name: two active contexts both called
   * "Casa" are indistinguishable everywhere a context is picked, so the name
   * (case- and whitespace-insensitive) must be free among the caller's own
   * active contexts. `excludeId` lets a rename keep its current name.
   */
  private async assertNameAvailable(
    name: string,
    ownerId: string,
    excludeId?: string,
  ): Promise<void> {
    if (await this.isContextNameTaken(name, ownerId, excludeId)) {
      throw new ConflictException(`You already have a context named "${name.trim()}"`);
    }
  }

  /** Public so the bot's setup wizard can refuse a duplicate name early. */
  async isContextNameTaken(name: string, ownerId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.contextsRepository
      .createQueryBuilder('context')
      .where('context.ownerId = :ownerId', { ownerId })
      .andWhere('context.isActive = true')
      .andWhere('LOWER(TRIM(context.name)) = LOWER(TRIM(:name))', { name });

    if (excludeId) {
      queryBuilder.andWhere('context.id != :excludeId', { excludeId });
    }

    return queryBuilder.getExists();
  }

  async findUserContexts(userId: string): Promise<Context[]> {
    const members = await this.contextMembersRepository.find({
      where: { 
        userId,
        status: MemberStatus.ACTIVE 
      },
      relations: ['context'],
    });

    // The caller's role travels with each context so the interface knows which
    // controls to offer without a request per context.
    return members
      .filter((member) => member.context?.isActive)
      .map((member) => {
        member.context.memberRole = member.role;
        return member.context;
      });
  }

  async findOne(id: string, userId: string): Promise<Context> {
    const context = await this.contextsRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });

    if (!context) {
      throw new NotFoundException('Context not found');
    }

    // Check if user has access to this context
    const membership = await this.getUserMembership(id, userId);
    if (!membership || !membership.canViewTransactions()) {
      throw new ForbiddenException('Access denied to this context');
    }

    return context;
  }

  async update(id: string, updateContextDto: UpdateContextDto, userId: string): Promise<Context> {
    const context = await this.findOne(id, userId);
    const membership = await this.getUserMembership(id, userId);

    if (!membership || !membership.canManageContext()) {
      throw new ForbiddenException('Only context owners can update context settings');
    }

    // A rename must not collide with another of the creator's contexts.
    if (updateContextDto.name) {
      await this.assertNameAvailable(updateContextDto.name, context.ownerId, context.id);
    }

    Object.assign(context, updateContextDto);
    return await this.contextsRepository.save(context);
  }

  async remove(id: string, userId: string): Promise<void> {
    const context = await this.findOne(id, userId);
    const membership = await this.getUserMembership(id, userId);

    if (!membership || !membership.canManageContext()) {
      throw new ForbiddenException('Only context owners can delete the context');
    }

    // Soft delete - mark as inactive
    context.isActive = false;
    await this.contextsRepository.save(context);
  }

  async inviteMember(contextId: string, inviteMemberDto: InviteMemberDto, inviterId: string): Promise<ContextMember> {
    const context = await this.findOne(contextId, inviterId);
    const inviterMembership = await this.getUserMembership(contextId, inviterId);

    if (!inviterMembership || !inviterMembership.canManageMembers()) {
      throw new ForbiddenException('You do not have permission to invite members');
    }

    // Find the user to invite
    const userToInvite = await this.usersRepository.findOne({
      where: { email: inviteMemberDto.email },
    });

    if (!userToInvite) {
      throw new NotFoundException('User not found with this email address');
    }

    // Membership rows survive a removal — the status becomes LEFT rather than
    // the row disappearing — so only a live membership is a genuine conflict.
    // Anything else is someone being invited back, which must be allowed.
    const existingMembership = await this.contextMembersRepository.findOne({
      where: { contextId, userId: userToInvite.id },
    });

    if (existingMembership?.status === MemberStatus.ACTIVE) {
      throw new ConflictException('User is already a member of this context');
    }

    if (existingMembership?.status === MemberStatus.INVITED) {
      throw new ConflictException('This user already has a pending invitation');
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days expiry

    // Reuse the previous row when there is one: (contextId, userId) is unique,
    // so a second insert for the same person could never succeed.
    const membership = existingMembership ?? this.contextMembersRepository.create({
      contextId,
      userId: userToInvite.id,
    });

    Object.assign(membership, {
      role: inviteMemberDto.role,
      status: MemberStatus.INVITED,
      invitedById: inviterId,
      inviteMessage: inviteMemberDto.message,
      inviteToken,
      inviteExpiresAt,
      invitedAt: new Date(),
      joinedAt: null,
      leftAt: null,
    });

    const saved = await this.contextMembersRepository.save(membership);

    // Delivery is best effort. When email is not configured — or the provider
    // is having a bad day — the invitation is still valid and the UI falls
    // back to handing the inviter a link to share.
    saved.invitationEmailSent = await this.sendInvitationEmail({
      context,
      inviter: await this.usersRepository.findOne({ where: { id: inviterId } }),
      recipient: userToInvite,
      inviteToken,
      inviteExpiresAt,
      message: inviteMemberDto.message,
    });

    return saved;
  }

  private async sendInvitationEmail(params: {
    context: Context;
    inviter: User | null;
    recipient: User;
    inviteToken: string;
    inviteExpiresAt: Date;
    message?: string;
  }): Promise<boolean> {
    if (!this.emailService.isEnabled()) {
      return false;
    }

    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    const fullName = (user: User | null): string =>
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    return this.emailService.send(
      buildInvitationEmail({
        recipientEmail: params.recipient.email,
        recipientName: fullName(params.recipient) || params.recipient.email,
        inviterName: fullName(params.inviter) || 'A Financy user',
        contextName: params.context.name,
        message: params.message,
        acceptUrl: `${frontendUrl}/invitations/${params.inviteToken}`,
        expiresAt: params.inviteExpiresAt,
        language: params.recipient.language,
      }),
    );
  }

  async acceptInvitation(token: string, userId: string): Promise<ContextMember> {
    const membership = await this.contextMembersRepository.findOne({
      where: { inviteToken: token },
      relations: ['context'],
    });

    if (!membership) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (membership.userId !== userId) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (membership.status !== MemberStatus.INVITED) {
      throw new BadRequestException('Invitation has already been processed');
    }

    if (membership.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Accept the invitation
    membership.status = MemberStatus.ACTIVE;
    membership.joinedAt = new Date();
    membership.inviteToken = null; // Clear the token
    membership.inviteExpiresAt = null;

    return await this.contextMembersRepository.save(membership);
  }

  async updateMemberRole(contextId: string, memberId: string, updateRoleDto: UpdateMemberRoleDto, requesterId: string): Promise<ContextMember> {
    const requesterMembership = await this.getUserMembership(contextId, requesterId);

    if (!requesterMembership || !requesterMembership.canManageMembers()) {
      throw new ForbiddenException('You do not have permission to manage members');
    }

    const targetMembership = await this.contextMembersRepository.findOne({
      where: { id: memberId, contextId },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this context');
    }

    // Prevent removing the last owner
    if (targetMembership.role === MemberRole.OWNER && updateRoleDto.role !== MemberRole.OWNER) {
      const ownerCount = await this.contextMembersRepository.count({
        where: { contextId, role: MemberRole.OWNER, status: MemberStatus.ACTIVE },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner of the context');
      }
    }

    targetMembership.role = updateRoleDto.role;
    return await this.contextMembersRepository.save(targetMembership);
  }

  async removeMember(contextId: string, memberId: string, requesterId: string): Promise<void> {
    const requesterMembership = await this.getUserMembership(contextId, requesterId);

    if (!requesterMembership || !requesterMembership.canManageMembers()) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    const targetMembership = await this.contextMembersRepository.findOne({
      where: { id: memberId, contextId },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this context');
    }

    // Prevent removing the last owner
    if (targetMembership.role === MemberRole.OWNER) {
      const ownerCount = await this.contextMembersRepository.count({
        where: { contextId, role: MemberRole.OWNER, status: MemberStatus.ACTIVE },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner of the context');
      }
    }

    targetMembership.status = MemberStatus.LEFT;
    targetMembership.leftAt = new Date();
    await this.contextMembersRepository.save(targetMembership);
  }

  async leaveContext(contextId: string, userId: string): Promise<void> {
    const membership = await this.getUserMembership(contextId, userId);

    if (!membership) {
      throw new NotFoundException('You are not a member of this context');
    }

    // Prevent the last owner from leaving
    if (membership.role === MemberRole.OWNER) {
      const ownerCount = await this.contextMembersRepository.count({
        where: { contextId, role: MemberRole.OWNER, status: MemberStatus.ACTIVE },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot leave context as the last owner. Transfer ownership first.');
      }
    }

    membership.status = MemberStatus.LEFT;
    membership.leftAt = new Date();
    await this.contextMembersRepository.save(membership);
  }

  async getContextMembers(contextId: string, userId: string): Promise<ContextMember[]> {
    // Verify user has access to this context
    await this.findOne(contextId, userId);

    // Pending invitations belong here too: whoever manages the context needs
    // to see who has been invited and not yet accepted. Only people who left
    // are left out.
    return await this.contextMembersRepository.find({
      where: [
        { contextId, status: MemberStatus.ACTIVE },
        { contextId, status: MemberStatus.INVITED },
      ],
      relations: ['user'],
      order: { role: 'ASC', createdAt: 'ASC' },
    });
  }

  async createDefaultPersonalContext(userId: string): Promise<Context> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    const personalContext = await this.create({
      name: `${user.firstName}'s Personal Budget`,
      description: 'Personal financial tracking',
      type: ContextType.PERSONAL,
    }, userId);

    return personalContext;
  }

  private async addOwnerAsMember(contextId: string, userId: string): Promise<ContextMember> {
    const membership = this.contextMembersRepository.create({
      contextId,
      userId,
      role: MemberRole.OWNER,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
    });

    return await this.contextMembersRepository.save(membership);
  }

  private async getUserMembership(contextId: string, userId: string): Promise<ContextMember | null> {
    return await this.contextMembersRepository.findOne({
      where: { contextId, userId, status: MemberStatus.ACTIVE },
    });
  }
}