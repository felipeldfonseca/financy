import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return await this.usersService.findById(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.update(req.user.id, updateUserDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Post('link-telegram')
  @ApiOperation({ summary: 'Link Telegram account' })
  @ApiResponse({ status: 200, description: 'Telegram account linked successfully' })
  async linkTelegram(
    @Request() req,
    @Body() linkTelegramDto: { telegramUserId: string; telegramUsername?: string },
  ): Promise<UserResponseDto> {
    return await this.usersService.linkTelegramAccount(
      req.user.id,
      linkTelegramDto.telegramUserId,
      linkTelegramDto.telegramUsername,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.usersService.findById(id);
  }
}