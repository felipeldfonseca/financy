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

@Injectable()
export class ContextsService {
  constructor(
    @InjectRepository(Context)
    private contextsRepository: Repository<Context>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createContextDto: CreateContextDto, ownerId: string): Promise<Context> {
    const context = this.contextsRepository.create({
      ...createContextDto,
      ownerId,
    });

    const savedContext = await this.contextsRepository.save(context);

    // Automatically add the owner as an active member
    await this.addOwnerAsMember(savedContext.id, ownerId);

    return savedContext;
  }

  async findUserContexts(userId: string): Promise<Context[]> {
    const members = await this.contextMembersRepository.find({
      where: { 
        userId,
        status: MemberStatus.ACTIVE 
      },
      relations: ['context'],
    });

    return members.map(member => member.context).filter(context => context.isActive);
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

    // Check if user is already a member
    const existingMembership = await this.contextMembersRepository.findOne({
      where: { contextId, userId: userToInvite.id },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this context');
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days expiry

    const membership = this.contextMembersRepository.create({
      contextId,
      userId: userToInvite.id,
      role: inviteMemberDto.role,
      status: MemberStatus.INVITED,
      invitedById: inviterId,
      inviteMessage: inviteMemberDto.message,
      inviteToken,
      inviteExpiresAt,
      invitedAt: new Date(),
    });

    return await this.contextMembersRepository.save(membership);
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

    return await this.contextMembersRepository.find({
      where: { contextId, status: MemberStatus.ACTIVE },
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