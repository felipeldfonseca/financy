import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';

export interface AuthResponse {
  user: UserResponseDto;
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Create user
      const user = await this.usersService.create(registerDto);

      // Generate JWT token
      const payload: JwtPayload = { 
        sub: user.id, 
        email: user.email 
      };
      
      const access_token = this.jwtService.sign(payload);

      // Update last login
      await this.usersService.updateLastLogin(user.id);

      return {
        user,
        access_token,
        token_type: 'Bearer',
        expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new UnauthorizedException('Registration failed');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = { 
      sub: user.id, 
      email: user.email 
    };
    
    const access_token = this.jwtService.sign(payload);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Get user response (without sensitive data)
    const userResponse = await this.usersService.findById(user.id);

    return {
      user: userResponse,
      access_token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  async refreshToken(userId: string): Promise<AuthResponse> {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload: JwtPayload = { 
      sub: user.id, 
      email: user.email 
    };
    
    const access_token = this.jwtService.sign(payload);

    return {
      user,
      access_token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    // In a real application, you might want to implement token blacklisting
    // For now, we'll just return a success message
    // The frontend will handle removing the token from storage
    
    return { message: 'Logged out successfully' };
  }
}