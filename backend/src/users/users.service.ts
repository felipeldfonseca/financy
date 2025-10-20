import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UsersService {
  private readonly linkingTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const user = this.usersRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);

    // Return user without sensitive data
    return plainToClass(UserResponseDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true }
    });
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findByTelegramId(telegramUserId: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { telegramUserId, isActive: true }
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user properties
    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);

    return plainToClass(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async verifyEmail(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailVerifiedAt = new Date();
    const updatedUser = await this.usersRepository.save(user);

    return plainToClass(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new BadRequestException('Password validation failed');
    }
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate current password
    const isCurrentPasswordValid = await this.validatePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.usersRepository.update(id, {
      password: hashedNewPassword,
    });
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.update(id, {
      isActive: false,
    });
  }

  async generateTelegramLinkingToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has Telegram linked
    if (user.telegramUserId) {
      throw new ConflictException('Telegram account is already linked to this user');
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token with user ID and expiration
    this.linkingTokens.set(token, { userId, expiresAt });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return { token, expiresAt };
  }

  async linkTelegramWithToken(token: string, telegramUserId: string, telegramUsername?: string): Promise<UserResponseDto> {
    // Get token info
    const tokenInfo = this.linkingTokens.get(token);
    
    if (!tokenInfo) {
      throw new BadRequestException('Invalid or expired linking token');
    }

    // Check if token is expired
    if (new Date() > tokenInfo.expiresAt) {
      this.linkingTokens.delete(token);
      throw new BadRequestException('Linking token has expired');
    }

    // Check if telegram account is already linked to another user
    const existingUser = await this.usersRepository.findOne({
      where: { telegramUserId }
    });

    if (existingUser) {
      throw new ConflictException('Telegram account is already linked to another user');
    }

    // Get the user
    const user = await this.usersRepository.findOne({
      where: { id: tokenInfo.userId, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Link Telegram account
    user.telegramUserId = telegramUserId;
    if (telegramUsername) {
      user.telegramUsername = telegramUsername;
    }

    const updatedUser = await this.usersRepository.save(user);

    // Remove used token
    this.linkingTokens.delete(token);

    return plainToClass(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async linkTelegramAccount(id: string, telegramUserId: string, telegramUsername?: string): Promise<UserResponseDto> {
    // Check if telegram account is already linked to another user
    const existingUser = await this.usersRepository.findOne({
      where: { telegramUserId }
    });

    if (existingUser && existingUser.id !== id) {
      throw new ConflictException('Telegram account is already linked to another user');
    }

    const user = await this.usersRepository.findOne({
      where: { id, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.telegramUserId = telegramUserId;
    if (telegramUsername) {
      user.telegramUsername = telegramUsername;
    }

    const updatedUser = await this.usersRepository.save(user);

    return plainToClass(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async unlinkTelegramAccount(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.telegramUserId = null;
    user.telegramUsername = null;

    const updatedUser = await this.usersRepository.save(user);

    return plainToClass(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    
    for (const [token, tokenInfo] of this.linkingTokens.entries()) {
      if (now > tokenInfo.expiresAt) {
        this.linkingTokens.delete(token);
      }
    }
  }
}