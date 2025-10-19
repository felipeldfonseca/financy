import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContextsService } from './contexts.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('contexts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contexts')
export class ContextsController {
  constructor(private readonly contextsService: ContextsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new context' })
  @ApiResponse({ status: 201, description: 'Context created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createContextDto: CreateContextDto, @Request() req) {
    return await this.contextsService.create(createContextDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contexts for the current user' })
  @ApiResponse({ status: 200, description: 'User contexts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findUserContexts(@Request() req) {
    return await this.contextsService.findUserContexts(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific context by ID' })
  @ApiResponse({ status: 200, description: 'Context retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.contextsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a context' })
  @ApiResponse({ status: 200, description: 'Context updated successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  @ApiResponse({ status: 403, description: 'Access denied - only owners can update' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateContextDto: UpdateContextDto,
    @Request() req,
  ) {
    return await this.contextsService.update(id, updateContextDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a context' })
  @ApiResponse({ status: 204, description: 'Context deleted successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  @ApiResponse({ status: 403, description: 'Access denied - only owners can delete' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Request() req) {
    return await this.contextsService.remove(id, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a context' })
  @ApiResponse({ status: 200, description: 'Context members retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMembers(@Param('id') id: string, @Request() req) {
    return await this.contextsService.getContextMembers(id, req.user.id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a user to join the context' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 404, description: 'Context or user not found' })
  @ApiResponse({ status: 403, description: 'Access denied - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Request() req,
  ) {
    return await this.contextsService.inviteMember(id, inviteMemberDto, req.user.id);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept a context invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 404, description: 'Invalid invitation token' })
  @ApiResponse({ status: 403, description: 'Invitation not for this user' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async acceptInvitation(@Param('token') token: string, @Request() req) {
    return await this.contextsService.acceptInvitation(token, req.user.id);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update a member\'s role in the context' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 404, description: 'Context or member not found' })
  @ApiResponse({ status: 403, description: 'Access denied - insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req,
  ) {
    return await this.contextsService.updateMemberRole(id, memberId, updateRoleDto, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the context' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Context or member not found' })
  @ApiResponse({ status: 403, description: 'Access denied - insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return await this.contextsService.removeMember(id, memberId, req.user.id);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a context' })
  @ApiResponse({ status: 204, description: 'Successfully left the context' })
  @ApiResponse({ status: 404, description: 'Context not found or not a member' })
  @ApiResponse({ status: 400, description: 'Cannot leave as last owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async leaveContext(@Param('id') id: string, @Request() req) {
    return await this.contextsService.leaveContext(id, req.user.id);
  }
}