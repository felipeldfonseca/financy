# MVP Development Guide
## Financy Platform Step-by-Step Development Roadmap

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Target Audience**: Development team, product managers, and project leads  

---

## Overview

This document provides a comprehensive, step-by-step guide for developing the Financy MVP from initial setup through deployment and beta launch. Each phase includes detailed instructions, deliverables, dependencies, and success criteria to ensure consistent progress toward MVP completion.

### MVP Scope Definition
The Financy MVP includes:
- **Core Transaction Management**: Entry, categorization, and basic analytics
- **Telegram Integration**: Primary messaging platform for transaction input
- **Multi-Context Support**: Personal and shared financial contexts
- **Basic AI Features**: Auto-categorization and simple insights
- **Web Dashboard**: Transaction viewing, categorization, and basic reports
- **User Management**: Registration, authentication, and basic profiles

### Development Philosophy
- **Iterative Development**: Build in small, testable increments
- **User-Centric**: Validate each feature with real user scenarios
- **Quality First**: Comprehensive testing at every step
- **Documentation Driven**: Maintain documentation alongside code
- **Feedback Loops**: Regular stakeholder reviews and adjustments

---

## Phase 0: Project Foundation (Week 1-2)

### Objective
Establish development environment, team processes, and technical foundation for MVP development.

### Week 1: Environment Setup & Team Alignment

#### Day 1-2: Repository & Infrastructure Setup
**Tasks**:
1. **Repository Structure Creation**
   ```bash
   mkdir financy-mvp && cd financy-mvp
   git init
   
   # Create monorepo structure
   mkdir -p {backend,frontend,mobile,shared,docs,scripts,tests}
   mkdir -p backend/{src,tests,migrations,seeds}
   mkdir -p frontend/{src,public,tests}
   mkdir -p shared/{types,utils,constants}
   ```

2. **Backend Foundation** (Node.js + NestJS)
   ```bash
   cd backend
   npm init -y
   npm install @nestjs/core @nestjs/common @nestjs/platform-express
   npm install @nestjs/typeorm typeorm pg
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt
   npm install @nestjs/config class-validator class-transformer
   npm install bcryptjs uuid
   
   # Dev dependencies
   npm install -D @nestjs/cli @nestjs/testing
   npm install -D typescript @types/node ts-node nodemon
   npm install -D jest @types/jest ts-jest supertest
   npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   npm install -D prettier eslint-config-prettier eslint-plugin-prettier
   ```

3. **Database Setup** (PostgreSQL + Docker)
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: financy_dev
         POSTGRES_USER: financy_user
         POSTGRES_PASSWORD: financy_pass
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
   
   volumes:
     postgres_data:
   ```

4. **Environment Configuration**
   ```bash
   # Create .env files
   touch backend/.env.development
   touch backend/.env.test
   touch backend/.env.production
   ```

**Environment Variables Setup**:
```env
# backend/.env.development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=financy_dev
DATABASE_USER=financy_user
DATABASE_PASSWORD=financy_pass

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/webhooks/telegram

OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key

NODE_ENV=development
PORT=3000
```

**Deliverables**:
- [x] Repository structure created and documented
- [x] Development environment configured and tested
- [x] Database and Redis containers running
- [x] Environment variables configured
- [x] Basic NestJS application bootstrapped

#### Day 3-4: Core Architecture Setup

**Tasks**:
1. **Backend Architecture Foundation**
   ```typescript
   // backend/src/main.ts
   import { NestFactory } from '@nestjs/core';
   import { ValidationPipe } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { AppModule } from './app.module';
   
   async function bootstrap() {
     const app = await NestFactory.create(AppModule);
     
     app.useGlobalPipes(new ValidationPipe({
       whitelist: true,
       forbidNonWhitelisted: true,
       transform: true,
     }));
     
     app.enableCors({
       origin: process.env.FRONTEND_URL || 'http://localhost:3001',
       credentials: true,
     });
     
     const configService = app.get(ConfigService);
     const port = configService.get('PORT') || 3000;
     
     await app.listen(port);
     console.log(`Application running on port ${port}`);
   }
   
   bootstrap();
   ```

2. **Core Module Structure**
   ```typescript
   // backend/src/app.module.ts
   import { Module } from '@nestjs/common';
   import { ConfigModule } from '@nestjs/config';
   import { TypeOrmModule } from '@nestjs/typeorm';
   import { AuthModule } from './auth/auth.module';
   import { UsersModule } from './users/users.module';
   import { ContextsModule } from './contexts/contexts.module';
   import { TransactionsModule } from './transactions/transactions.module';
   import { TelegramModule } from './telegram/telegram.module';
   import { DatabaseConfig } from './config/database.config';
   
   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
       }),
       TypeOrmModule.forRootAsync({
         useClass: DatabaseConfig,
       }),
       AuthModule,
       UsersModule,
       ContextsModule,
       TransactionsModule,
       TelegramModule,
     ],
   })
   export class AppModule {}
   ```

3. **Database Configuration**
   ```typescript
   // backend/src/config/database.config.ts
   import { Injectable } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
   import { User } from '../users/entities/user.entity';
   import { Context } from '../contexts/entities/context.entity';
   import { Transaction } from '../transactions/entities/transaction.entity';
   
   @Injectable()
   export class DatabaseConfig implements TypeOrmOptionsFactory {
     constructor(private configService: ConfigService) {}
   
     createTypeOrmOptions(): TypeOrmModuleOptions {
       return {
         type: 'postgres',
         host: this.configService.get('DATABASE_HOST'),
         port: this.configService.get('DATABASE_PORT'),
         username: this.configService.get('DATABASE_USER'),
         password: this.configService.get('DATABASE_PASSWORD'),
         database: this.configService.get('DATABASE_NAME'),
         entities: [User, Context, Transaction],
         migrations: ['dist/migrations/*{.ts,.js}'],
         synchronize: this.configService.get('NODE_ENV') === 'development',
         logging: this.configService.get('NODE_ENV') === 'development',
       };
     }
   }
   ```

**Deliverables**:
- [x] NestJS application structure established
- [x] Database connection configured and tested
- [x] Core modules scaffolded
- [x] Configuration management implemented
- [x] Development server running successfully

#### Day 5: Frontend Foundation Setup

**Tasks**:
1. **React Application Setup**
   ```bash
   cd frontend
   npx create-react-app . --template typescript
   
   # Install additional dependencies
   npm install @mui/material @emotion/react @emotion/styled
   npm install @mui/icons-material @mui/lab
   npm install react-router-dom @types/react-router-dom
   npm install axios react-query
   npm install @hookform/resolvers react-hook-form yup
   npm install recharts date-fns
   
   # Dev dependencies
   npm install -D @testing-library/jest-dom
   npm install -D @testing-library/react @testing-library/user-event
   ```

2. **Frontend Architecture Setup**
   ```typescript
   // frontend/src/App.tsx
   import React from 'react';
   import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
   import { ThemeProvider, createTheme } from '@mui/material/styles';
   import { CssBaseline } from '@mui/material';
   import { QueryClient, QueryClientProvider } from 'react-query';
   import { AuthProvider } from './contexts/AuthContext';
   import { Layout } from './components/Layout';
   import { LoginPage } from './pages/LoginPage';
   import { DashboardPage } from './pages/DashboardPage';
   import { TransactionsPage } from './pages/TransactionsPage';
   
   const theme = createTheme({
     palette: {
       primary: {
         main: '#1976d2',
       },
       secondary: {
         main: '#dc004e',
       },
     },
   });
   
   const queryClient = new QueryClient();
   
   function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <ThemeProvider theme={theme}>
           <CssBaseline />
           <AuthProvider>
             <Router>
               <Layout>
                 <Routes>
                   <Route path="/login" element={<LoginPage />} />
                   <Route path="/dashboard" element={<DashboardPage />} />
                   <Route path="/transactions" element={<TransactionsPage />} />
                   <Route path="/" element={<DashboardPage />} />
                 </Routes>
               </Layout>
             </Router>
           </AuthProvider>
         </ThemeProvider>
       </QueryClientProvider>
     );
   }
   
   export default App;
   ```

**Deliverables**:
- [x] React application created and configured
- [x] Material-UI theme and components setup
- [x] Routing structure implemented
- [x] State management foundation established
- [x] Frontend development server running

### Week 2: Team Processes & Planning

#### Day 6-7: Development Workflow Setup

**Tasks**:
1. **Git Workflow Configuration**
   ```bash
   # Create .gitignore
   echo "node_modules/
   .env*
   dist/
   build/
   *.log
   .DS_Store
   coverage/
   .nyc_output/" > .gitignore
   
   # Setup branch protection and workflow
   git checkout -b develop
   git checkout -b feature/initial-setup
   ```

2. **Code Quality Tools**
   ```json
   // package.json scripts
   {
     "scripts": {
       "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
       "dev:backend": "cd backend && npm run start:dev",
       "dev:frontend": "cd frontend && npm start",
       "test": "npm run test:backend && npm run test:frontend",
       "test:backend": "cd backend && npm run test",
       "test:frontend": "cd frontend && npm test",
       "lint": "npm run lint:backend && npm run lint:frontend",
       "lint:backend": "cd backend && npm run lint",
       "lint:frontend": "cd frontend && npm run lint",
       "build": "npm run build:backend && npm run build:frontend",
       "build:backend": "cd backend && npm run build",
       "build:frontend": "cd frontend && npm run build"
     }
   }
   ```

3. **Testing Framework Setup**
   ```typescript
   // backend/test/app.e2e-spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import { INestApplication } from '@nestjs/common';
   import * as request from 'supertest';
   import { AppModule } from '../src/app.module';
   
   describe('AppController (e2e)', () => {
     let app: INestApplication;
   
     beforeEach(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();
   
       app = moduleFixture.createNestApplication();
       await app.init();
     });
   
     it('/health (GET)', () => {
       return request(app.getHttpServer())
         .get('/health')
         .expect(200);
     });
   });
   ```

**Deliverables**:
- [x] Git workflow and branching strategy documented
- [x] Code quality tools configured (ESLint, Prettier)
- [x] Testing framework setup and validated
- [x] CI/CD pipeline foundation prepared
- [x] Development scripts and automation configured

#### Day 8-10: Database Schema Implementation

**Tasks**:
1. **Core Entity Definitions**
   ```typescript
   // backend/src/users/entities/user.entity.ts
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
   import { Exclude } from 'class-transformer';
   import { Context } from '../../contexts/entities/context.entity';
   import { Transaction } from '../../transactions/entities/transaction.entity';
   
   @Entity('users')
   export class User {
     @PrimaryGeneratedColumn('uuid')
     id: string;
   
     @Column({ unique: true })
     email: string;
   
     @Column()
     fullName: string;
   
     @Column()
     @Exclude()
     password: string;
   
     @Column({ nullable: true })
     telegramId: string;
   
     @Column({ default: 'pt-BR' })
     language: string;
   
     @Column({ default: 'America/Sao_Paulo' })
     timezone: string;
   
     @Column({ default: 'BRL' })
     defaultCurrency: string;
   
     @Column({ default: true })
     isActive: boolean;
   
     @CreateDateColumn()
     createdAt: Date;
   
     @UpdateDateColumn()
     updatedAt: Date;
   
     @OneToMany(() => Context, context => context.owner)
     ownedContexts: Context[];
   
     @OneToMany(() => Transaction, transaction => transaction.user)
     transactions: Transaction[];
   }
   ```

   ```typescript
   // backend/src/contexts/entities/context.entity.ts
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
   import { User } from '../../users/entities/user.entity';
   import { Transaction } from '../../transactions/entities/transaction.entity';
   import { ContextMember } from './context-member.entity';
   
   export enum ContextType {
     PERSONAL = 'personal',
     FAMILY = 'family',
     PROJECT = 'project',
     BUSINESS = 'business',
   }
   
   @Entity('contexts')
   export class Context {
     @PrimaryGeneratedColumn('uuid')
     id: string;
   
     @Column()
     name: string;
   
     @Column({ nullable: true })
     description: string;
   
     @Column({
       type: 'enum',
       enum: ContextType,
       default: ContextType.PERSONAL,
     })
     type: ContextType;
   
     @Column({ default: 'BRL' })
     currency: string;
   
     @Column({ default: true })
     isActive: boolean;
   
     @ManyToOne(() => User, user => user.ownedContexts)
     @JoinColumn({ name: 'ownerId' })
     owner: User;
   
     @Column()
     ownerId: string;
   
     @CreateDateColumn()
     createdAt: Date;
   
     @UpdateDateColumn()
     updatedAt: Date;
   
     @OneToMany(() => Transaction, transaction => transaction.context)
     transactions: Transaction[];
   
     @OneToMany(() => ContextMember, member => member.context)
     members: ContextMember[];
   }
   ```

2. **Transaction Entity Implementation**
   ```typescript
   // backend/src/transactions/entities/transaction.entity.ts
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
   import { User } from '../../users/entities/user.entity';
   import { Context } from '../../contexts/entities/context.entity';
   
   export enum TransactionType {
     EXPENSE = 'expense',
     INCOME = 'income',
     TRANSFER = 'transfer',
   }
   
   export enum TransactionStatus {
     PENDING = 'pending',
     CONFIRMED = 'confirmed',
     CANCELLED = 'cancelled',
   }
   
   export enum InputMethod {
     MANUAL = 'manual',
     TELEGRAM = 'telegram',
     VOICE = 'voice',
     OCR = 'ocr',
   }
   
   @Entity('transactions')
   export class Transaction {
     @PrimaryGeneratedColumn('uuid')
     id: string;
   
     @Column('decimal', { precision: 12, scale: 2 })
     amount: number;
   
     @Column()
     description: string;
   
     @Column({
       type: 'enum',
       enum: TransactionType,
       default: TransactionType.EXPENSE,
     })
     type: TransactionType;
   
     @Column({ nullable: true })
     category: string;
   
     @Column({ default: 'BRL' })
     currency: string;
   
     @Column({ type: 'date' })
     date: Date;
   
     @Column({ nullable: true })
     time: string;
   
     @Column({ nullable: true })
     merchantName: string;
   
     @Column({ nullable: true })
     location: string;
   
     @Column({
       type: 'enum',
       enum: TransactionStatus,
       default: TransactionStatus.PENDING,
     })
     status: TransactionStatus;
   
     @Column({
       type: 'enum',
       enum: InputMethod,
       default: InputMethod.MANUAL,
     })
     inputMethod: InputMethod;
   
     @Column({ type: 'json', nullable: true })
     metadata: any;
   
     @ManyToOne(() => User, user => user.transactions)
     @JoinColumn({ name: 'userId' })
     user: User;
   
     @Column()
     userId: string;
   
     @ManyToOne(() => Context, context => context.transactions)
     @JoinColumn({ name: 'contextId' })
     context: Context;
   
     @Column()
     contextId: string;
   
     @CreateDateColumn()
     createdAt: Date;
   
     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

**Deliverables**:
- [x] All core entities defined and documented
- [x] Database migrations created and tested
- [x] Entity relationships properly configured
- [x] Database schema validated against requirements
- [x] Seed data prepared for development

**Success Criteria for Phase 0**:
- [x] Development environment fully operational
- [x] Team processes documented and implemented
- [x] Core architecture decisions made and documented
- [x] Database schema implemented and tested
- [x] Foundation code quality metrics met (>90% test coverage)
- [x] All team members can run the application locally

**✅ PHASE 0 COMPLETED** - *October 19, 2025*

All foundation work has been completed successfully:
- Full monorepo structure with backend (NestJS), frontend (React), and shared packages
- Docker development environment with PostgreSQL and Redis
- Complete project documentation and MVP development guide
- TypeScript configuration across all packages
- Environment configuration for development
- Initial commit pushed to GitHub repository
- Ready to begin Phase 1: Core User Management

---

## Phase 1: Core User Management (Week 3-4)

### Objective
Implement user registration, authentication, and basic profile management functionality.

### Week 3: Authentication System

#### Day 11-13: User Registration & Authentication

**Tasks**:
1. **User Service Implementation**
   ```typescript
   // backend/src/users/users.service.ts
   import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import * as bcrypt from 'bcryptjs';
   import { User } from './entities/user.entity';
   import { CreateUserDto } from './dto/create-user.dto';
   import { UpdateUserDto } from './dto/update-user.dto';
   
   @Injectable()
   export class UsersService {
     constructor(
       @InjectRepository(User)
       private usersRepository: Repository<User>,
     ) {}
   
     async create(createUserDto: CreateUserDto): Promise<User> {
       const existingUser = await this.usersRepository.findOne({
         where: { email: createUserDto.email }
       });
   
       if (existingUser) {
         throw new ConflictException('User with this email already exists');
       }
   
       const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
       
       const user = this.usersRepository.create({
         ...createUserDto,
         password: hashedPassword,
       });
   
       return await this.usersRepository.save(user);
     }
   
     async findByEmail(email: string): Promise<User | null> {
       return await this.usersRepository.findOne({
         where: { email },
         select: ['id', 'email', 'password', 'fullName', 'isActive']
       });
     }
   
     async findById(id: string): Promise<User | null> {
       return await this.usersRepository.findOne({
         where: { id },
         relations: ['ownedContexts']
       });
     }
   
     async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
       return await bcrypt.compare(plainPassword, hashedPassword);
     }
   }
   ```

2. **DTOs and Validation**
   ```typescript
   // backend/src/users/dto/create-user.dto.ts
   import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
   
   export class CreateUserDto {
     @IsEmail()
     email: string;
   
     @IsString()
     @MinLength(2)
     @MaxLength(100)
     fullName: string;
   
     @IsString()
     @MinLength(8)
     @MaxLength(128)
     password: string;
   
     @IsOptional()
     @IsString()
     telegramId?: string;
   
     @IsOptional()
     @IsString()
     language?: string;
   
     @IsOptional()
     @IsString()
     timezone?: string;
   
     @IsOptional()
     @IsString()
     defaultCurrency?: string;
   }
   ```

3. **JWT Authentication Strategy**
   ```typescript
   // backend/src/auth/auth.service.ts
   import { Injectable, UnauthorizedException } from '@nestjs/common';
   import { JwtService } from '@nestjs/jwt';
   import { UsersService } from '../users/users.service';
   import { LoginDto } from './dto/login.dto';
   import { RegisterDto } from './dto/register.dto';
   
   export interface JwtPayload {
     sub: string;
     email: string;
     iat?: number;
     exp?: number;
   }
   
   @Injectable()
   export class AuthService {
     constructor(
       private usersService: UsersService,
       private jwtService: JwtService,
     ) {}
   
     async register(registerDto: RegisterDto) {
       const user = await this.usersService.create(registerDto);
       const payload: JwtPayload = { sub: user.id, email: user.email };
       
       return {
         user: {
           id: user.id,
           email: user.email,
           fullName: user.fullName,
         },
         access_token: this.jwtService.sign(payload),
       };
     }
   
     async login(loginDto: LoginDto) {
       const user = await this.usersService.findByEmail(loginDto.email);
       
       if (!user || !user.isActive) {
         throw new UnauthorizedException('Invalid credentials');
       }
   
       const isPasswordValid = await this.usersService.validatePassword(
         loginDto.password,
         user.password
       );
   
       if (!isPasswordValid) {
         throw new UnauthorizedException('Invalid credentials');
       }
   
       const payload: JwtPayload = { sub: user.id, email: user.email };
       
       return {
         user: {
           id: user.id,
           email: user.email,
           fullName: user.fullName,
         },
         access_token: this.jwtService.sign(payload),
       };
     }
   
     async validateUser(payload: JwtPayload) {
       const user = await this.usersService.findById(payload.sub);
       
       if (!user || !user.isActive) {
         throw new UnauthorizedException('Invalid token');
       }
   
       return user;
     }
   }
   ```

**Deliverables**:
- [ ] User entity and repository implemented
- [ ] Registration endpoint with validation
- [ ] Login endpoint with JWT token generation
- [ ] Password hashing and validation
- [ ] Basic user profile endpoints

#### Day 14-15: JWT Strategy & Guards Implementation

**Tasks**:
1. **JWT Strategy Configuration**
   ```typescript
   // backend/src/auth/strategies/jwt.strategy.ts
   import { Injectable, UnauthorizedException } from '@nestjs/common';
   import { PassportStrategy } from '@nestjs/passport';
   import { ExtractJwt, Strategy } from 'passport-jwt';
   import { ConfigService } from '@nestjs/config';
   import { AuthService, JwtPayload } from '../auth.service';
   
   @Injectable()
   export class JwtStrategy extends PassportStrategy(Strategy) {
     constructor(
       private configService: ConfigService,
       private authService: AuthService,
     ) {
       super({
         jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
         ignoreExpiration: false,
         secretOrKey: configService.get('JWT_SECRET'),
       });
     }
   
     async validate(payload: JwtPayload) {
       try {
         return await this.authService.validateUser(payload);
       } catch (error) {
         throw new UnauthorizedException('Invalid token');
       }
     }
   }
   ```

2. **Authentication Guards**
   ```typescript
   // backend/src/auth/guards/jwt-auth.guard.ts
   import { Injectable, ExecutionContext } from '@nestjs/common';
   import { AuthGuard } from '@nestjs/passport';
   import { Reflector } from '@nestjs/core';
   import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
   
   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {
     constructor(private reflector: Reflector) {
       super();
     }
   
     canActivate(context: ExecutionContext) {
       const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
       ]);
       
       if (isPublic) {
         return true;
       }
       
       return super.canActivate(context);
     }
   }
   ```

3. **Auth Controller Implementation**
   ```typescript
   // backend/src/auth/auth.controller.ts
   import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
   import { AuthService } from './auth.service';
   import { LoginDto } from './dto/login.dto';
   import { RegisterDto } from './dto/register.dto';
   import { Public } from './decorators/public.decorator';
   import { JwtAuthGuard } from './guards/jwt-auth.guard';
   
   @Controller('auth')
   export class AuthController {
     constructor(private authService: AuthService) {}
   
     @Public()
     @Post('register')
     async register(@Body() registerDto: RegisterDto) {
       return await this.authService.register(registerDto);
     }
   
     @Public()
     @HttpCode(HttpStatus.OK)
     @Post('login')
     async login(@Body() loginDto: LoginDto) {
       return await this.authService.login(loginDto);
     }
   
     @UseGuards(JwtAuthGuard)
     @Get('profile')
     async getProfile(@Request() req) {
       return {
         id: req.user.id,
         email: req.user.email,
         fullName: req.user.fullName,
         language: req.user.language,
         timezone: req.user.timezone,
         defaultCurrency: req.user.defaultCurrency,
       };
     }
   
     @Public()
     @Post('refresh')
     async refresh(@Body() body: { refresh_token: string }) {
       // Implement refresh token logic
       return { message: 'Refresh token endpoint' };
     }
   }
   ```

### Week 4: Frontend Authentication Integration

#### Day 16-18: React Authentication Context

**Tasks**:
1. **Authentication Context Setup**
   ```typescript
   // frontend/src/contexts/AuthContext.tsx
   import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
   import { authApi } from '../services/authApi';
   
   interface User {
     id: string;
     email: string;
     fullName: string;
     language: string;
     timezone: string;
     defaultCurrency: string;
   }
   
   interface AuthState {
     user: User | null;
     token: string | null;
     isLoading: boolean;
     isAuthenticated: boolean;
   }
   
   type AuthAction =
     | { type: 'LOGIN_START' }
     | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
     | { type: 'LOGIN_FAILURE' }
     | { type: 'LOGOUT' }
     | { type: 'SET_LOADING'; payload: boolean };
   
   const AuthContext = createContext<{
     state: AuthState;
     login: (email: string, password: string) => Promise<void>;
     register: (userData: RegisterData) => Promise<void>;
     logout: () => void;
   } | null>(null);
   
   const authReducer = (state: AuthState, action: AuthAction): AuthState => {
     switch (action.type) {
       case 'LOGIN_START':
         return { ...state, isLoading: true };
       case 'LOGIN_SUCCESS':
         return {
           ...state,
           isLoading: false,
           isAuthenticated: true,
           user: action.payload.user,
           token: action.payload.token,
         };
       case 'LOGIN_FAILURE':
         return {
           ...state,
           isLoading: false,
           isAuthenticated: false,
           user: null,
           token: null,
         };
       case 'LOGOUT':
         return {
           ...state,
           isAuthenticated: false,
           user: null,
           token: null,
         };
       case 'SET_LOADING':
         return { ...state, isLoading: action.payload };
       default:
         return state;
     }
   };
   
   export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
     const [state, dispatch] = useReducer(authReducer, {
       user: null,
       token: localStorage.getItem('token'),
       isLoading: false,
       isAuthenticated: false,
     });
   
     useEffect(() => {
       const token = localStorage.getItem('token');
       if (token) {
         // Validate token and get user profile
         validateToken(token);
       }
     }, []);
   
     const validateToken = async (token: string) => {
       try {
         dispatch({ type: 'SET_LOADING', payload: true });
         const user = await authApi.getProfile(token);
         dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
       } catch (error) {
         localStorage.removeItem('token');
         dispatch({ type: 'LOGIN_FAILURE' });
       }
     };
   
     const login = async (email: string, password: string) => {
       try {
         dispatch({ type: 'LOGIN_START' });
         const response = await authApi.login(email, password);
         localStorage.setItem('token', response.access_token);
         dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.user, token: response.access_token } });
       } catch (error) {
         dispatch({ type: 'LOGIN_FAILURE' });
         throw error;
       }
     };
   
     const register = async (userData: RegisterData) => {
       try {
         dispatch({ type: 'LOGIN_START' });
         const response = await authApi.register(userData);
         localStorage.setItem('token', response.access_token);
         dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.user, token: response.access_token } });
       } catch (error) {
         dispatch({ type: 'LOGIN_FAILURE' });
         throw error;
       }
     };
   
     const logout = () => {
       localStorage.removeItem('token');
       dispatch({ type: 'LOGOUT' });
     };
   
     return (
       <AuthContext.Provider value={{ state, login, register, logout }}>
         {children}
       </AuthContext.Provider>
     );
   };
   
   export const useAuth = () => {
     const context = useContext(AuthContext);
     if (!context) {
       throw new Error('useAuth must be used within an AuthProvider');
     }
     return context;
   };
   ```

2. **Authentication API Service**
   ```typescript
   // frontend/src/services/authApi.ts
   import axios from 'axios';
   
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
   
   const api = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       'Content-Type': 'application/json',
     },
   });
   
   api.interceptors.request.use((config) => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   
   api.interceptors.response.use(
     (response) => response,
     (error) => {
       if (error.response?.status === 401) {
         localStorage.removeItem('token');
         window.location.href = '/login';
       }
       return Promise.reject(error);
     }
   );
   
   export const authApi = {
     async login(email: string, password: string) {
       const response = await api.post('/auth/login', { email, password });
       return response.data;
     },
   
     async register(userData: RegisterData) {
       const response = await api.post('/auth/register', userData);
       return response.data;
     },
   
     async getProfile(token: string) {
       const response = await api.get('/auth/profile', {
         headers: { Authorization: `Bearer ${token}` }
       });
       return response.data;
     },
   
     async refreshToken(refreshToken: string) {
       const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
       return response.data;
     },
   };
   
   export default api;
   ```

3. **Login/Register Components**
   ```typescript
   // frontend/src/pages/LoginPage.tsx
   import React, { useState } from 'react';
   import { useNavigate, Link } from 'react-router-dom';
   import { useForm } from 'react-hook-form';
   import { yupResolver } from '@hookform/resolvers/yup';
   import * as yup from 'yup';
   import {
     Container,
     Paper,
     TextField,
     Button,
     Typography,
     Box,
     Alert,
     Tab,
     Tabs,
   } from '@mui/material';
   import { useAuth } from '../contexts/AuthContext';
   
   const loginSchema = yup.object({
     email: yup.string().email('Invalid email').required('Email is required'),
     password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
   });
   
   const registerSchema = yup.object({
     email: yup.string().email('Invalid email').required('Email is required'),
     fullName: yup.string().min(2, 'Name must be at least 2 characters').required('Full name is required'),
     password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
     confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password is required'),
   });
   
   export const LoginPage: React.FC = () => {
     const [tab, setTab] = useState(0);
     const [error, setError] = useState('');
     const { login, register } = useAuth();
     const navigate = useNavigate();
   
     const loginForm = useForm({
       resolver: yupResolver(loginSchema),
     });
   
     const registerForm = useForm({
       resolver: yupResolver(registerSchema),
     });
   
     const handleLogin = async (data: { email: string; password: string }) => {
       try {
         setError('');
         await login(data.email, data.password);
         navigate('/dashboard');
       } catch (err: any) {
         setError(err.response?.data?.message || 'Login failed');
       }
     };
   
     const handleRegister = async (data: any) => {
       try {
         setError('');
         await register({
           email: data.email,
           fullName: data.fullName,
           password: data.password,
         });
         navigate('/dashboard');
       } catch (err: any) {
         setError(err.response?.data?.message || 'Registration failed');
       }
     };
   
     return (
       <Container maxWidth="sm">
         <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
             <Typography variant="h4" align="center" gutterBottom>
               Financy
             </Typography>
             
             <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
               <Tab label="Login" />
               <Tab label="Register" />
             </Tabs>
   
             {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
   
             {tab === 0 ? (
               <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                 <TextField
                   {...loginForm.register('email')}
                   label="Email"
                   fullWidth
                   margin="normal"
                   error={!!loginForm.formState.errors.email}
                   helperText={loginForm.formState.errors.email?.message}
                 />
                 <TextField
                   {...loginForm.register('password')}
                   label="Password"
                   type="password"
                   fullWidth
                   margin="normal"
                   error={!!loginForm.formState.errors.password}
                   helperText={loginForm.formState.errors.password?.message}
                 />
                 <Button
                   type="submit"
                   fullWidth
                   variant="contained"
                   sx={{ mt: 3, mb: 2 }}
                   disabled={loginForm.formState.isSubmitting}
                 >
                   {loginForm.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                 </Button>
               </form>
             ) : (
               <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                 <TextField
                   {...registerForm.register('fullName')}
                   label="Full Name"
                   fullWidth
                   margin="normal"
                   error={!!registerForm.formState.errors.fullName}
                   helperText={registerForm.formState.errors.fullName?.message}
                 />
                 <TextField
                   {...registerForm.register('email')}
                   label="Email"
                   fullWidth
                   margin="normal"
                   error={!!registerForm.formState.errors.email}
                   helperText={registerForm.formState.errors.email?.message}
                 />
                 <TextField
                   {...registerForm.register('password')}
                   label="Password"
                   type="password"
                   fullWidth
                   margin="normal"
                   error={!!registerForm.formState.errors.password}
                   helperText={registerForm.formState.errors.password?.message}
                 />
                 <TextField
                   {...registerForm.register('confirmPassword')}
                   label="Confirm Password"
                   type="password"
                   fullWidth
                   margin="normal"
                   error={!!registerForm.formState.errors.confirmPassword}
                   helperText={registerForm.formState.errors.confirmPassword?.message}
                 />
                 <Button
                   type="submit"
                   fullWidth
                   variant="contained"
                   sx={{ mt: 3, mb: 2 }}
                   disabled={registerForm.formState.isSubmitting}
                 >
                   {registerForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                 </Button>
               </form>
             )}
           </Paper>
         </Box>
       </Container>
     );
   };
   ```

**Deliverables**:
- [ ] JWT strategy and guards implemented
- [ ] Authentication endpoints tested and documented
- [ ] React authentication context functional
- [ ] Login/register pages implemented
- [ ] Token management and refresh logic
- [ ] Protected route implementation

**Success Criteria for Phase 1**:
- [ ] Users can successfully register and login
- [ ] JWT tokens are properly generated and validated
- [ ] Frontend authentication flow works end-to-end
- [ ] Protected routes require authentication
- [ ] User profile management functional
- [ ] All authentication tests passing (>95% coverage)

---

## Phase 2: Context Management System (Week 5-6)

### Objective
Implement multi-tenant context system for personal and shared financial management.

### Week 5: Context CRUD Operations

#### Day 19-21: Context Entity & Service Implementation

**Tasks**:
1. **Context Service Development**
   ```typescript
   // backend/src/contexts/contexts.service.ts
   import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { Context, ContextType } from './entities/context.entity';
   import { ContextMember } from './entities/context-member.entity';
   import { User } from '../users/entities/user.entity';
   import { CreateContextDto } from './dto/create-context.dto';
   import { UpdateContextDto } from './dto/update-context.dto';
   import { InviteMemberDto } from './dto/invite-member.dto';
   
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
   
       // Create default personal context if it's the user's first context
       if (createContextDto.type === ContextType.PERSONAL) {
         await this.createDefaultPersonalContext(ownerId, savedContext.id);
       }
   
       return savedContext;
     }
   
     async findUserContexts(userId: string): Promise<Context[]> {
       // Find contexts where user is owner or member
       const ownedContexts = await this.contextsRepository.find({
         where: { ownerId: userId, isActive: true },
         relations: ['members', 'members.user'],
         order: { createdAt: 'ASC' },
       });
   
       const memberContexts = await this.contextsRepository
         .createQueryBuilder('context')
         .leftJoinAndSelect('context.members', 'member')
         .leftJoinAndSelect('context.owner', 'owner')
         .where('member.userId = :userId AND context.isActive = :isActive', {
           userId,
           isActive: true,
         })
         .getMany();
   
       // Combine and deduplicate
       const allContexts = [...ownedContexts];
       memberContexts.forEach(context => {
         if (!allContexts.find(c => c.id === context.id)) {
           allContexts.push(context);
         }
       });
   
       return allContexts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
     }
   
     async findOne(id: string, userId: string): Promise<Context> {
       const context = await this.contextsRepository.findOne({
         where: { id, isActive: true },
         relations: ['members', 'members.user', 'owner'],
       });
   
       if (!context) {
         throw new NotFoundException('Context not found');
       }
   
       // Check if user has access to this context
       const hasAccess = context.ownerId === userId || 
         context.members.some(member => member.userId === userId);
   
       if (!hasAccess) {
         throw new ForbiddenException('Access denied to this context');
       }
   
       return context;
     }
   
     async update(id: string, updateContextDto: UpdateContextDto, userId: string): Promise<Context> {
       const context = await this.findOne(id, userId);
   
       // Only owner can update context
       if (context.ownerId !== userId) {
         throw new ForbiddenException('Only context owner can update context');
       }
   
       Object.assign(context, updateContextDto);
       return await this.contextsRepository.save(context);
     }
   
     async inviteMember(contextId: string, inviteMemberDto: InviteMemberDto, ownerId: string): Promise<ContextMember> {
       const context = await this.findOne(contextId, ownerId);
   
       if (context.ownerId !== ownerId) {
         throw new ForbiddenException('Only context owner can invite members');
       }
   
       // Find user to invite
       const userToInvite = await this.usersRepository.findOne({
         where: { email: inviteMemberDto.email },
       });
   
       if (!userToInvite) {
         throw new NotFoundException('User not found');
       }
   
       // Check if user is already a member
       const existingMember = await this.contextMembersRepository.findOne({
         where: { contextId, userId: userToInvite.id },
       });
   
       if (existingMember) {
         throw new ForbiddenException('User is already a member of this context');
       }
   
       const member = this.contextMembersRepository.create({
         contextId,
         userId: userToInvite.id,
         role: inviteMemberDto.role,
         permissions: inviteMemberDto.permissions,
       });
   
       return await this.contextMembersRepository.save(member);
     }
   
     private async createDefaultPersonalContext(userId: string, contextId: string): Promise<void> {
       // Additional setup for personal contexts if needed
       // e.g., default categories, settings, etc.
     }
   }
   ```

2. **Context Member Entity**
   ```typescript
   // backend/src/contexts/entities/context-member.entity.ts
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
   import { Context } from './context.entity';
   import { User } from '../../users/entities/user.entity';
   
   export enum ContextRole {
     OWNER = 'owner',
     ADMIN = 'admin',
     EDITOR = 'editor',
     VIEWER = 'viewer',
   }
   
   export interface ContextPermissions {
     canAddTransactions: boolean;
     canEditTransactions: boolean;
     canDeleteTransactions: boolean;
     canInviteMembers: boolean;
     canManageCategories: boolean;
     canViewReports: boolean;
     canExportData: boolean;
   }
   
   @Entity('context_members')
   export class ContextMember {
     @PrimaryGeneratedColumn('uuid')
     id: string;
   
     @Column({
       type: 'enum',
       enum: ContextRole,
       default: ContextRole.VIEWER,
     })
     role: ContextRole;
   
     @Column({ type: 'json' })
     permissions: ContextPermissions;
   
     @Column({ default: true })
     isActive: boolean;
   
     @ManyToOne(() => Context, context => context.members)
     @JoinColumn({ name: 'contextId' })
     context: Context;
   
     @Column()
     contextId: string;
   
     @ManyToOne(() => User)
     @JoinColumn({ name: 'userId' })
     user: User;
   
     @Column()
     userId: string;
   
     @CreateDateColumn()
     joinedAt: Date;
   }
   ```

**Deliverables**:
- [ ] Context CRUD operations implemented
- [ ] Context member management system
- [ ] Permission-based access control
- [ ] Context sharing and invitation logic
- [ ] Database relationships configured

#### Day 22-24: Context Controller & DTOs

**Tasks**:
1. **Context Controller Implementation**
   ```typescript
   // backend/src/contexts/contexts.controller.ts
   import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
   import { ContextsService } from './contexts.service';
   import { CreateContextDto } from './dto/create-context.dto';
   import { UpdateContextDto } from './dto/update-context.dto';
   import { InviteMemberDto } from './dto/invite-member.dto';
   import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
   
   @Controller('contexts')
   @UseGuards(JwtAuthGuard)
   export class ContextsController {
     constructor(private readonly contextsService: ContextsService) {}
   
     @Post()
     async create(@Body() createContextDto: CreateContextDto, @Request() req) {
       return await this.contextsService.create(createContextDto, req.user.id);
     }
   
     @Get()
     async findAll(@Request() req) {
       return await this.contextsService.findUserContexts(req.user.id);
     }
   
     @Get(':id')
     async findOne(@Param('id') id: string, @Request() req) {
       return await this.contextsService.findOne(id, req.user.id);
     }
   
     @Patch(':id')
     async update(@Param('id') id: string, @Body() updateContextDto: UpdateContextDto, @Request() req) {
       return await this.contextsService.update(id, updateContextDto, req.user.id);
     }
   
     @Post(':id/invite')
     async inviteMember(@Param('id') id: string, @Body() inviteMemberDto: InviteMemberDto, @Request() req) {
       return await this.contextsService.inviteMember(id, inviteMemberDto, req.user.id);
     }
   
     @Delete(':id/members/:memberId')
     async removeMember(@Param('id') contextId: string, @Param('memberId') memberId: string, @Request() req) {
       return await this.contextsService.removeMember(contextId, memberId, req.user.id);
     }
   }
   ```

2. **Context DTOs**
   ```typescript
   // backend/src/contexts/dto/create-context.dto.ts
   import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
   import { ContextType } from '../entities/context.entity';
   
   export class CreateContextDto {
     @IsString()
     @MinLength(2)
     @MaxLength(100)
     name: string;
   
     @IsOptional()
     @IsString()
     @MaxLength(500)
     description?: string;
   
     @IsEnum(ContextType)
     type: ContextType;
   
     @IsOptional()
     @IsString()
     currency?: string;
   }
   
   // backend/src/contexts/dto/invite-member.dto.ts
   import { IsEmail, IsEnum, IsObject } from 'class-validator';
   import { ContextRole, ContextPermissions } from '../entities/context-member.entity';
   
   export class InviteMemberDto {
     @IsEmail()
     email: string;
   
     @IsEnum(ContextRole)
     role: ContextRole;
   
     @IsObject()
     permissions: ContextPermissions;
   }
   ```

### Week 6: Frontend Context Management

#### Day 25-27: Context Management UI

**Tasks**:
1. **Context Context & API Service**
   ```typescript
   // frontend/src/contexts/ContextContext.tsx
   import React, { createContext, useContext, useReducer, ReactNode } from 'react';
   import { contextApi } from '../services/contextApi';
   
   interface Context {
     id: string;
     name: string;
     description?: string;
     type: 'personal' | 'family' | 'project' | 'business';
     currency: string;
     isActive: boolean;
     ownerId: string;
     members: ContextMember[];
     createdAt: string;
   }
   
   interface ContextMember {
     id: string;
     role: 'owner' | 'admin' | 'editor' | 'viewer';
     permissions: ContextPermissions;
     user: {
       id: string;
       email: string;
       fullName: string;
     };
   }
   
   interface ContextState {
     contexts: Context[];
     activeContext: Context | null;
     isLoading: boolean;
   }
   
   type ContextAction =
     | { type: 'SET_LOADING'; payload: boolean }
     | { type: 'SET_CONTEXTS'; payload: Context[] }
     | { type: 'SET_ACTIVE_CONTEXT'; payload: Context }
     | { type: 'ADD_CONTEXT'; payload: Context }
     | { type: 'UPDATE_CONTEXT'; payload: Context }
     | { type: 'REMOVE_CONTEXT'; payload: string };
   
   const ContextContext = createContext<{
     state: ContextState;
     createContext: (contextData: CreateContextData) => Promise<Context>;
     updateContext: (id: string, updateData: UpdateContextData) => Promise<Context>;
     inviteMember: (contextId: string, memberData: InviteMemberData) => Promise<void>;
     setActiveContext: (context: Context) => void;
     refreshContexts: () => Promise<void>;
   } | null>(null);
   
   const contextReducer = (state: ContextState, action: ContextAction): ContextState => {
     switch (action.type) {
       case 'SET_LOADING':
         return { ...state, isLoading: action.payload };
       case 'SET_CONTEXTS':
         return { ...state, contexts: action.payload, isLoading: false };
       case 'SET_ACTIVE_CONTEXT':
         return { ...state, activeContext: action.payload };
       case 'ADD_CONTEXT':
         return { ...state, contexts: [...state.contexts, action.payload] };
       case 'UPDATE_CONTEXT':
         return {
           ...state,
           contexts: state.contexts.map(c => c.id === action.payload.id ? action.payload : c),
           activeContext: state.activeContext?.id === action.payload.id ? action.payload : state.activeContext
         };
       case 'REMOVE_CONTEXT':
         return {
           ...state,
           contexts: state.contexts.filter(c => c.id !== action.payload),
           activeContext: state.activeContext?.id === action.payload ? null : state.activeContext
         };
       default:
         return state;
     }
   };
   
   export const ContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
     const [state, dispatch] = useReducer(contextReducer, {
       contexts: [],
       activeContext: null,
       isLoading: false,
     });
   
     const createContext = async (contextData: CreateContextData): Promise<Context> => {
       const newContext = await contextApi.create(contextData);
       dispatch({ type: 'ADD_CONTEXT', payload: newContext });
       return newContext;
     };
   
     const updateContext = async (id: string, updateData: UpdateContextData): Promise<Context> => {
       const updatedContext = await contextApi.update(id, updateData);
       dispatch({ type: 'UPDATE_CONTEXT', payload: updatedContext });
       return updatedContext;
     };
   
     const inviteMember = async (contextId: string, memberData: InviteMemberData): Promise<void> => {
       await contextApi.inviteMember(contextId, memberData);
       await refreshContexts();
     };
   
     const setActiveContext = (context: Context) => {
       dispatch({ type: 'SET_ACTIVE_CONTEXT', payload: context });
       localStorage.setItem('activeContextId', context.id);
     };
   
     const refreshContexts = async () => {
       try {
         dispatch({ type: 'SET_LOADING', payload: true });
         const contexts = await contextApi.getAll();
         dispatch({ type: 'SET_CONTEXTS', payload: contexts });
         
         // Set active context if none selected
         if (!state.activeContext && contexts.length > 0) {
           const savedContextId = localStorage.getItem('activeContextId');
           const activeContext = contexts.find(c => c.id === savedContextId) || contexts[0];
           setActiveContext(activeContext);
         }
       } catch (error) {
         dispatch({ type: 'SET_LOADING', payload: false });
         throw error;
       }
     };
   
     return (
       <ContextContext.Provider value={{
         state,
         createContext,
         updateContext,
         inviteMember,
         setActiveContext,
         refreshContexts,
       }}>
         {children}
       </ContextContext.Provider>
     );
   };
   
   export const useContexts = () => {
     const context = useContext(ContextContext);
     if (!context) {
       throw new Error('useContexts must be used within a ContextProvider');
     }
     return context;
   };
   ```

2. **Context Management Components**
   ```typescript
   // frontend/src/components/contexts/ContextSelector.tsx
   import React, { useState } from 'react';
   import {
     FormControl,
     InputLabel,
     Select,
     MenuItem,
     Button,
     Box,
     Chip,
     Typography,
   } from '@mui/material';
   import { Add as AddIcon, Group as GroupIcon, Person as PersonIcon } from '@mui/icons-material';
   import { useContexts } from '../../contexts/ContextContext';
   import { CreateContextDialog } from './CreateContextDialog';
   
   export const ContextSelector: React.FC = () => {
     const { state, setActiveContext } = useContexts();
     const [createDialogOpen, setCreateDialogOpen] = useState(false);
   
     const getContextIcon = (type: string) => {
       switch (type) {
         case 'personal':
           return <PersonIcon fontSize="small" />;
         case 'family':
         case 'project':
         case 'business':
           return <GroupIcon fontSize="small" />;
         default:
           return <PersonIcon fontSize="small" />;
       }
     };
   
     const getContextColor = (type: string) => {
       switch (type) {
         case 'personal':
           return 'primary';
         case 'family':
           return 'secondary';
         case 'project':
           return 'info';
         case 'business':
           return 'success';
         default:
           return 'default';
       }
     };
   
     return (
       <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
         <FormControl size="small" sx={{ minWidth: 200 }}>
           <InputLabel>Active Context</InputLabel>
           <Select
             value={state.activeContext?.id || ''}
             onChange={(e) => {
               const context = state.contexts.find(c => c.id === e.target.value);
               if (context) setActiveContext(context);
             }}
             label="Active Context"
           >
             {state.contexts.map((context) => (
               <MenuItem key={context.id} value={context.id}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   {getContextIcon(context.type)}
                   <Typography variant="body2">{context.name}</Typography>
                   <Chip
                     label={context.type}
                     size="small"
                     color={getContextColor(context.type) as any}
                     variant="outlined"
                   />
                 </Box>
               </MenuItem>
             ))}
           </Select>
         </FormControl>
   
         <Button
           variant="outlined"
           startIcon={<AddIcon />}
           onClick={() => setCreateDialogOpen(true)}
           size="small"
         >
           New Context
         </Button>
   
         <CreateContextDialog
           open={createDialogOpen}
           onClose={() => setCreateDialogOpen(false)}
         />
       </Box>
     );
   };
   ```

**Success Criteria for Phase 2**:
- [ ] Context CRUD operations fully functional
- [ ] Multi-tenant data isolation working correctly
- [ ] Permission-based access control implemented
- [ ] Context sharing and collaboration features working
- [ ] Frontend context management UI completed
- [ ] Context switching functionality operational

---

## Phase 3: Transaction Engine (Week 7-8)

### Objective
Implement core transaction management with CRUD operations, categorization, and basic analytics.

### Week 7: Transaction CRUD & Core Features

#### Day 28-30: Transaction Service Implementation

**Tasks**:
1. **Transaction Service Development**
   ```typescript
   // backend/src/transactions/transactions.service.ts
   import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository, Between } from 'typeorm';
   import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
   import { Context } from '../contexts/entities/context.entity';
   import { CreateTransactionDto } from './dto/create-transaction.dto';
   import { UpdateTransactionDto } from './dto/update-transaction.dto';
   import { TransactionFiltersDto } from './dto/transaction-filters.dto';
   
   @Injectable()
   export class TransactionsService {
     constructor(
       @InjectRepository(Transaction)
       private transactionsRepository: Repository<Transaction>,
       @InjectRepository(Context)
       private contextsRepository: Repository<Context>,
     ) {}
   
     async create(createTransactionDto: CreateTransactionDto, userId: string): Promise<Transaction> {
       // Verify user has access to context
       const context = await this.contextsRepository.findOne({
         where: { id: createTransactionDto.contextId },
         relations: ['members'],
       });
   
       if (!context) {
         throw new NotFoundException('Context not found');
       }
   
       const hasAccess = context.ownerId === userId || 
         context.members.some(member => member.userId === userId && member.permissions.canAddTransactions);
   
       if (!hasAccess) {
         throw new ForbiddenException('No permission to add transactions to this context');
       }
   
       const transaction = this.transactionsRepository.create({
         ...createTransactionDto,
         userId,
         status: TransactionStatus.PENDING,
       });
   
       const savedTransaction = await this.transactionsRepository.save(transaction);
   
       // Trigger auto-categorization if no category provided
       if (!createTransactionDto.category) {
         this.triggerAutoCategorization(savedTransaction.id);
       }
   
       return savedTransaction;
     }
   
     async findByContext(contextId: string, filters: TransactionFiltersDto, userId: string): Promise<{
       transactions: Transaction[];
       total: number;
       summary: TransactionSummary;
     }> {
       // Verify user has access to context
       await this.verifyContextAccess(contextId, userId);
   
       const queryBuilder = this.transactionsRepository
         .createQueryBuilder('transaction')
         .where('transaction.contextId = :contextId', { contextId });
   
       // Apply filters
       if (filters.startDate && filters.endDate) {
         queryBuilder.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
           startDate: filters.startDate,
           endDate: filters.endDate,
         });
       }
   
       if (filters.type) {
         queryBuilder.andWhere('transaction.type = :type', { type: filters.type });
       }
   
       if (filters.category) {
         queryBuilder.andWhere('transaction.category = :category', { category: filters.category });
       }
   
       if (filters.status) {
         queryBuilder.andWhere('transaction.status = :status', { status: filters.status });
       }
   
       if (filters.minAmount !== undefined) {
         queryBuilder.andWhere('transaction.amount >= :minAmount', { minAmount: filters.minAmount });
       }
   
       if (filters.maxAmount !== undefined) {
         queryBuilder.andWhere('transaction.amount <= :maxAmount', { maxAmount: filters.maxAmount });
       }
   
       // Get total count
       const total = await queryBuilder.getCount();
   
       // Apply pagination
       const page = filters.page || 1;
       const limit = filters.limit || 20;
       const offset = (page - 1) * limit;
   
       const transactions = await queryBuilder
         .orderBy('transaction.date', 'DESC')
         .addOrderBy('transaction.createdAt', 'DESC')
         .skip(offset)
         .take(limit)
         .getMany();
   
       // Calculate summary
       const summary = await this.calculateTransactionSummary(contextId, filters);
   
       return { transactions, total, summary };
     }
   
     async findOne(id: string, userId: string): Promise<Transaction> {
       const transaction = await this.transactionsRepository.findOne({
         where: { id },
         relations: ['context'],
       });
   
       if (!transaction) {
         throw new NotFoundException('Transaction not found');
       }
   
       await this.verifyContextAccess(transaction.contextId, userId);
       return transaction;
     }
   
     async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string): Promise<Transaction> {
       const transaction = await this.findOne(id, userId);
   
       // Verify user has edit permissions
       const context = await this.contextsRepository.findOne({
         where: { id: transaction.contextId },
         relations: ['members'],
       });
   
       const hasEditPermission = context.ownerId === userId || 
         context.members.some(member => member.userId === userId && member.permissions.canEditTransactions);
   
       if (!hasEditPermission) {
         throw new ForbiddenException('No permission to edit transactions in this context');
       }
   
       Object.assign(transaction, updateTransactionDto);
       return await this.transactionsRepository.save(transaction);
     }
   
     async remove(id: string, userId: string): Promise<void> {
       const transaction = await this.findOne(id, userId);
   
       // Verify user has delete permissions
       const context = await this.contextsRepository.findOne({
         where: { id: transaction.contextId },
         relations: ['members'],
       });
   
       const hasDeletePermission = context.ownerId === userId || 
         context.members.some(member => member.userId === userId && member.permissions.canDeleteTransactions);
   
       if (!hasDeletePermission) {
         throw new ForbiddenException('No permission to delete transactions in this context');
       }
   
       await this.transactionsRepository.remove(transaction);
     }
   
     async getCategories(contextId: string, userId: string): Promise<CategorySummary[]> {
       await this.verifyContextAccess(contextId, userId);
   
       return await this.transactionsRepository
         .createQueryBuilder('transaction')
         .select('transaction.category', 'category')
         .addSelect('COUNT(*)', 'count')
         .addSelect('SUM(transaction.amount)', 'total')
         .addSelect('AVG(transaction.amount)', 'average')
         .where('transaction.contextId = :contextId', { contextId })
         .andWhere('transaction.category IS NOT NULL')
         .groupBy('transaction.category')
         .orderBy('count', 'DESC')
         .getRawMany();
     }
   
     private async verifyContextAccess(contextId: string, userId: string): Promise<void> {
       const context = await this.contextsRepository.findOne({
         where: { id: contextId },
         relations: ['members'],
       });
   
       if (!context) {
         throw new NotFoundException('Context not found');
       }
   
       const hasAccess = context.ownerId === userId || 
         context.members.some(member => member.userId === userId);
   
       if (!hasAccess) {
         throw new ForbiddenException('Access denied to this context');
       }
     }
   
     private async calculateTransactionSummary(contextId: string, filters: TransactionFiltersDto): Promise<TransactionSummary> {
       const queryBuilder = this.transactionsRepository
         .createQueryBuilder('transaction')
         .where('transaction.contextId = :contextId', { contextId });
   
       // Apply same filters as main query
       if (filters.startDate && filters.endDate) {
         queryBuilder.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
           startDate: filters.startDate,
           endDate: filters.endDate,
         });
       }
   
       const result = await queryBuilder
         .select('transaction.type', 'type')
         .addSelect('SUM(transaction.amount)', 'total')
         .addSelect('COUNT(*)', 'count')
         .groupBy('transaction.type')
         .getRawMany();
   
       const summary = {
         totalIncome: 0,
         totalExpenses: 0,
         totalTransactions: 0,
         netAmount: 0,
       };
   
       result.forEach(item => {
         if (item.type === TransactionType.INCOME) {
           summary.totalIncome = parseFloat(item.total) || 0;
         } else if (item.type === TransactionType.EXPENSE) {
           summary.totalExpenses = parseFloat(item.total) || 0;
         }
         summary.totalTransactions += parseInt(item.count) || 0;
       });
   
       summary.netAmount = summary.totalIncome - summary.totalExpenses;
       return summary;
     }
   
     private async triggerAutoCategorization(transactionId: string): Promise<void> {
       // Queue auto-categorization job
       // This will be implemented in the AI processing phase
       console.log(`Triggering auto-categorization for transaction ${transactionId}`);
     }
   }
   
   interface TransactionSummary {
     totalIncome: number;
     totalExpenses: number;
     totalTransactions: number;
     netAmount: number;
   }
   
   interface CategorySummary {
     category: string;
     count: number;
     total: number;
     average: number;
   }
   ```

2. **Transaction DTOs Implementation**
   ```typescript
   // backend/src/transactions/dto/create-transaction.dto.ts
   import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min, Max } from 'class-validator';
   import { TransactionType, InputMethod } from '../entities/transaction.entity';
   
   export class CreateTransactionDto {
     @IsNumber()
     @Min(0.01)
     @Max(999999999.99)
     amount: number;
   
     @IsString()
     description: string;
   
     @IsEnum(TransactionType)
     type: TransactionType;
   
     @IsOptional()
     @IsString()
     category?: string;
   
     @IsString()
     currency: string;
   
     @IsDateString()
     date: string;
   
     @IsOptional()
     @IsString()
     time?: string;
   
     @IsOptional()
     @IsString()
     merchantName?: string;
   
     @IsOptional()
     @IsString()
     location?: string;
   
     @IsEnum(InputMethod)
     inputMethod: InputMethod;
   
     @IsString()
     contextId: string;
   
     @IsOptional()
     metadata?: any;
   }
   ```

3. **Transaction Controller**
   ```typescript
   // backend/src/transactions/transactions.controller.ts
   import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
   import { TransactionsService } from './transactions.service';
   import { CreateTransactionDto } from './dto/create-transaction.dto';
   import { UpdateTransactionDto } from './dto/update-transaction.dto';
   import { TransactionFiltersDto } from './dto/transaction-filters.dto';
   import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
   
   @Controller('transactions')
   @UseGuards(JwtAuthGuard)
   export class TransactionsController {
     constructor(private readonly transactionsService: TransactionsService) {}
   
     @Post()
     async create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
       return await this.transactionsService.create(createTransactionDto, req.user.id);
     }
   
     @Get('context/:contextId')
     async findByContext(
       @Param('contextId') contextId: string,
       @Query() filters: TransactionFiltersDto,
       @Request() req
     ) {
       return await this.transactionsService.findByContext(contextId, filters, req.user.id);
     }
   
     @Get('context/:contextId/categories')
     async getCategories(@Param('contextId') contextId: string, @Request() req) {
       return await this.transactionsService.getCategories(contextId, req.user.id);
     }
   
     @Get(':id')
     async findOne(@Param('id') id: string, @Request() req) {
       return await this.transactionsService.findOne(id, req.user.id);
     }
   
     @Patch(':id')
     async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto, @Request() req) {
       return await this.transactionsService.update(id, updateTransactionDto, req.user.id);
     }
   
     @Delete(':id')
     async remove(@Param('id') id: string, @Request() req) {
       await this.transactionsService.remove(id, req.user.id);
       return { message: 'Transaction deleted successfully' };
     }
   }
   ```

### Week 8: Frontend Transaction Management

#### Day 31-33: Transaction UI Components

**Tasks**:
1. **Transaction List Component**
   ```typescript
   // frontend/src/components/transactions/TransactionList.tsx
   import React, { useState, useEffect } from 'react';
   import {
     Paper,
     Table,
     TableBody,
     TableCell,
     TableContainer,
     TableHead,
     TableRow,
     TablePagination,
     Chip,
     IconButton,
     Typography,
     Box,
     TextField,
     MenuItem,
     Button,
   } from '@mui/material';
   import { Edit as EditIcon, Delete as DeleteIcon, FilterList as FilterIcon } from '@mui/icons-material';
   import { format } from 'date-fns';
   import { useTransactions } from '../../contexts/TransactionContext';
   import { useContexts } from '../../contexts/ContextContext';
   
   export const TransactionList: React.FC = () => {
     const { state: contextState } = useContexts();
     const { state, loadTransactions, deleteTransaction } = useTransactions();
     const [page, setPage] = useState(0);
     const [rowsPerPage, setRowsPerPage] = useState(20);
     const [filters, setFilters] = useState({
       type: '',
       category: '',
       startDate: '',
       endDate: '',
       minAmount: '',
       maxAmount: '',
     });
   
     useEffect(() => {
       if (contextState.activeContext) {
         loadTransactions(contextState.activeContext.id, {
           page: page + 1,
           limit: rowsPerPage,
           ...filters,
         });
       }
     }, [contextState.activeContext, page, rowsPerPage, filters]);
   
     const handleChangePage = (event: unknown, newPage: number) => {
       setPage(newPage);
     };
   
     const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
       setRowsPerPage(parseInt(event.target.value, 10));
       setPage(0);
     };
   
     const handleDelete = async (id: string) => {
       if (window.confirm('Are you sure you want to delete this transaction?')) {
         await deleteTransaction(id);
       }
     };
   
     const formatCurrency = (amount: number, currency: string) => {
       return new Intl.NumberFormat('pt-BR', {
         style: 'currency',
         currency: currency,
       }).format(amount);
     };
   
     const getTypeColor = (type: string) => {
       switch (type) {
         case 'income':
           return 'success';
         case 'expense':
           return 'error';
         case 'transfer':
           return 'info';
         default:
           return 'default';
       }
     };
   
     return (
       <Paper sx={{ width: '100%', overflow: 'hidden' }}>
         {/* Filter Section */}
         <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
           <Typography variant="h6" gutterBottom>
             Transactions
           </Typography>
           <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
             <TextField
               select
               label="Type"
               value={filters.type}
               onChange={(e) => setFilters({ ...filters, type: e.target.value })}
               size="small"
               sx={{ minWidth: 120 }}
             >
               <MenuItem value="">All</MenuItem>
               <MenuItem value="income">Income</MenuItem>
               <MenuItem value="expense">Expense</MenuItem>
               <MenuItem value="transfer">Transfer</MenuItem>
             </TextField>
             <TextField
               label="Start Date"
               type="date"
               value={filters.startDate}
               onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
               size="small"
               InputLabelProps={{ shrink: true }}
             />
             <TextField
               label="End Date"
               type="date"
               value={filters.endDate}
               onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
               size="small"
               InputLabelProps={{ shrink: true }}
             />
             <TextField
               label="Min Amount"
               type="number"
               value={filters.minAmount}
               onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
               size="small"
               sx={{ width: 120 }}
             />
             <TextField
               label="Max Amount"
               type="number"
               value={filters.maxAmount}
               onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
               size="small"
               sx={{ width: 120 }}
             />
           </Box>
         </Box>
   
         {/* Summary Section */}
         {state.summary && (
           <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
             <Box sx={{ display: 'flex', gap: 4 }}>
               <Typography variant="body2">
                 Total Income: <strong style={{ color: 'green' }}>
                   {formatCurrency(state.summary.totalIncome, contextState.activeContext?.currency || 'BRL')}
                 </strong>
               </Typography>
               <Typography variant="body2">
                 Total Expenses: <strong style={{ color: 'red' }}>
                   {formatCurrency(state.summary.totalExpenses, contextState.activeContext?.currency || 'BRL')}
                 </strong>
               </Typography>
               <Typography variant="body2">
                 Net Amount: <strong style={{ color: state.summary.netAmount >= 0 ? 'green' : 'red' }}>
                   {formatCurrency(state.summary.netAmount, contextState.activeContext?.currency || 'BRL')}
                 </strong>
               </Typography>
               <Typography variant="body2">
                 Total Transactions: <strong>{state.summary.totalTransactions}</strong>
               </Typography>
             </Box>
           </Box>
         )}
   
         <TableContainer sx={{ maxHeight: 440 }}>
           <Table stickyHeader>
             <TableHead>
               <TableRow>
                 <TableCell>Date</TableCell>
                 <TableCell>Description</TableCell>
                 <TableCell>Category</TableCell>
                 <TableCell>Type</TableCell>
                 <TableCell align="right">Amount</TableCell>
                 <TableCell>Status</TableCell>
                 <TableCell align="center">Actions</TableCell>
               </TableRow>
             </TableHead>
             <TableBody>
               {state.transactions.map((transaction) => (
                 <TableRow hover key={transaction.id}>
                   <TableCell>
                     {format(new Date(transaction.date), 'dd/MM/yyyy')}
                   </TableCell>
                   <TableCell>
                     <Typography variant="body2">{transaction.description}</Typography>
                     {transaction.merchantName && (
                       <Typography variant="caption" color="text.secondary">
                         {transaction.merchantName}
                       </Typography>
                     )}
                   </TableCell>
                   <TableCell>
                     {transaction.category && (
                       <Chip label={transaction.category} size="small" variant="outlined" />
                     )}
                   </TableCell>
                   <TableCell>
                     <Chip
                       label={transaction.type}
                       size="small"
                       color={getTypeColor(transaction.type) as any}
                     />
                   </TableCell>
                   <TableCell align="right">
                     <Typography
                       variant="body2"
                       color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                       fontWeight="medium"
                     >
                       {formatCurrency(transaction.amount, transaction.currency)}
                     </Typography>
                   </TableCell>
                   <TableCell>
                     <Chip
                       label={transaction.status}
                       size="small"
                       color={transaction.status === 'confirmed' ? 'success' : 'warning'}
                       variant="outlined"
                     />
                   </TableCell>
                   <TableCell align="center">
                     <IconButton size="small" onClick={() => {/* Edit transaction */}}>
                       <EditIcon fontSize="small" />
                     </IconButton>
                     <IconButton size="small" onClick={() => handleDelete(transaction.id)}>
                       <DeleteIcon fontSize="small" />
                     </IconButton>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </TableContainer>
   
         <TablePagination
           rowsPerPageOptions={[10, 20, 50]}
           component="div"
           count={state.total}
           rowsPerPage={rowsPerPage}
           page={page}
           onPageChange={handleChangePage}
           onRowsPerPageChange={handleChangeRowsPerPage}
         />
       </Paper>
     );
   };
   ```

**Success Criteria for Phase 3**:
- [ ] Transaction CRUD operations fully functional
- [ ] Permission-based transaction access working
- [ ] Transaction filtering and pagination implemented
- [ ] Category management system operational
- [ ] Frontend transaction UI completed
- [ ] Transaction summary calculations accurate

---

## Phase 4: Telegram Integration (Week 9-10)

### Objective
Implement Telegram bot integration for natural language transaction input.

### Week 9: Telegram Bot Setup

#### Day 34-36: Bot Configuration & Webhook

**Tasks**:
1. **Telegram Bot Service Setup**
   ```typescript
   // backend/src/telegram/telegram.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { User } from '../users/entities/user.entity';
   import { TransactionsService } from '../transactions/transactions.service';
   import { TelegramUpdate, TelegramMessage } from './interfaces/telegram.interface';
   import { MessageProcessorService } from './message-processor.service';
   
   @Injectable()
   export class TelegramService {
     private readonly logger = new Logger(TelegramService.name);
     private readonly botToken: string;
     private readonly webhookUrl: string;
   
     constructor(
       private configService: ConfigService,
       @InjectRepository(User)
       private usersRepository: Repository<User>,
       private transactionsService: TransactionsService,
       private messageProcessor: MessageProcessorService,
     ) {
       this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
       this.webhookUrl = this.configService.get('TELEGRAM_WEBHOOK_URL');
     }
   
     async setupWebhook(): Promise<void> {
       try {
         const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             url: this.webhookUrl,
             allowed_updates: ['message', 'callback_query'],
           }),
         });
   
         const result = await response.json();
         this.logger.log('Webhook setup result:', result);
       } catch (error) {
         this.logger.error('Failed to setup webhook:', error);
         throw error;
       }
     }
   
     async processUpdate(update: TelegramUpdate): Promise<void> {
       try {
         if (update.message) {
           await this.processMessage(update.message);
         } else if (update.callback_query) {
           await this.processCallbackQuery(update.callback_query);
         }
       } catch (error) {
         this.logger.error('Error processing update:', error);
         await this.sendMessage(update.message?.chat.id, 'Sorry, I encountered an error processing your message. Please try again.');
       }
     }
   
     private async processMessage(message: TelegramMessage): Promise<void> {
       const chatId = message.chat.id;
       const userId = await this.getUserFromTelegramId(message.from.id.toString());
   
       if (!userId) {
         await this.handleUnregisteredUser(chatId, message.from);
         return;
       }
   
       // Handle different message types
       if (message.text?.startsWith('/')) {
         await this.handleCommand(chatId, message.text, userId);
       } else if (message.voice) {
         await this.handleVoiceMessage(chatId, message.voice, userId);
       } else if (message.photo) {
         await this.handlePhotoMessage(chatId, message.photo, userId);
       } else if (message.text) {
         await this.handleTextMessage(chatId, message.text, userId);
       }
     }
   
     private async handleCommand(chatId: number, command: string, userId: string): Promise<void> {
       const [cmd, ...args] = command.split(' ');
   
       switch (cmd) {
         case '/start':
           await this.sendMessage(chatId, 
             'Welcome to Financy! 🏦\n\n' +
             'You can add transactions by simply typing them:\n' +
             '• "Paid $50 for groceries"\n' +
             '• "Received $1000 salary"\n' +
             '• "Spent R$25 on lunch"\n\n' +
             'Commands:\n' +
             '/contexts - Manage your financial contexts\n' +
             '/summary - View spending summary\n' +
             '/help - Show this help message'
           );
           break;
   
         case '/contexts':
           await this.handleContextsCommand(chatId, userId);
           break;
   
         case '/summary':
           await this.handleSummaryCommand(chatId, userId, args);
           break;
   
         case '/help':
           await this.sendHelpMessage(chatId);
           break;
   
         default:
           await this.sendMessage(chatId, 'Unknown command. Type /help for available commands.');
       }
     }
   
     private async handleTextMessage(chatId: number, text: string, userId: string): Promise<void> {
       try {
         await this.sendMessage(chatId, '🤔 Processing your transaction...');
   
         const processedTransaction = await this.messageProcessor.processTextMessage(text, userId);
   
         if (processedTransaction) {
           const confirmationMessage = this.formatTransactionConfirmation(processedTransaction);
           await this.sendMessage(chatId, confirmationMessage, {
             reply_markup: {
               inline_keyboard: [[
                 { text: '✅ Confirm', callback_data: `confirm_${processedTransaction.tempId}` },
                 { text: '✏️ Edit', callback_data: `edit_${processedTransaction.tempId}` },
                 { text: '❌ Cancel', callback_data: `cancel_${processedTransaction.tempId}` },
               ]],
             },
           });
         } else {
           await this.sendMessage(chatId, 
             'I couldn\'t understand that transaction. Please try a format like:\n' +
             '• "Spent $50 on groceries"\n' +
             '• "Received $1000 salary"\n' +
             '• "Paid R$25 for lunch"'
           );
         }
       } catch (error) {
         this.logger.error('Error processing text message:', error);
         await this.sendMessage(chatId, 'Sorry, I couldn\'t process that transaction. Please try again.');
       }
     }
   
     private async handleVoiceMessage(chatId: number, voice: any, userId: string): Promise<void> {
       try {
         await this.sendMessage(chatId, '🎤 Processing your voice message...');
   
         // Download and process voice message
         const audioText = await this.messageProcessor.processVoiceMessage(voice, userId);
         
         if (audioText) {
           await this.sendMessage(chatId, `I heard: "${audioText}"`);
           await this.handleTextMessage(chatId, audioText, userId);
         } else {
           await this.sendMessage(chatId, 'Sorry, I couldn\'t understand the voice message. Please try again.');
         }
       } catch (error) {
         this.logger.error('Error processing voice message:', error);
         await this.sendMessage(chatId, 'Sorry, I couldn\'t process that voice message.');
       }
     }
   
     private async handlePhotoMessage(chatId: number, photos: any[], userId: string): Promise<void> {
       try {
         await this.sendMessage(chatId, '📷 Processing your receipt...');
   
         // Get the highest resolution photo
         const photo = photos[photos.length - 1];
         const extractedData = await this.messageProcessor.processPhotoMessage(photo, userId);
   
         if (extractedData) {
           const confirmationMessage = this.formatTransactionConfirmation(extractedData);
           await this.sendMessage(chatId, confirmationMessage, {
             reply_markup: {
               inline_keyboard: [[
                 { text: '✅ Confirm', callback_data: `confirm_${extractedData.tempId}` },
                 { text: '✏️ Edit', callback_data: `edit_${extractedData.tempId}` },
                 { text: '❌ Cancel', callback_data: `cancel_${extractedData.tempId}` },
               ]],
             },
           });
         } else {
           await this.sendMessage(chatId, 'Sorry, I couldn\'t extract transaction details from this image. Please try again or enter the transaction manually.');
         }
       } catch (error) {
         this.logger.error('Error processing photo message:', error);
         await this.sendMessage(chatId, 'Sorry, I couldn\'t process that image.');
       }
     }
   
     private async sendMessage(chatId: number, text: string, options?: any): Promise<void> {
       try {
         const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             chat_id: chatId,
             text,
             parse_mode: 'HTML',
             ...options,
           }),
         });
   
         if (!response.ok) {
           throw new Error(`Failed to send message: ${response.statusText}`);
         }
       } catch (error) {
         this.logger.error('Error sending message:', error);
         throw error;
       }
     }
   
     private async getUserFromTelegramId(telegramId: string): Promise<string | null> {
       const user = await this.usersRepository.findOne({
         where: { telegramId },
         select: ['id'],
       });
       return user?.id || null;
     }
   
     private formatTransactionConfirmation(transaction: any): string {
       return `
   💰 <b>Transaction Details</b>
   
   Amount: <b>${transaction.amount} ${transaction.currency}</b>
   Type: <b>${transaction.type}</b>
   Description: <b>${transaction.description}</b>
   ${transaction.category ? `Category: <b>${transaction.category}</b>` : ''}
   Date: <b>${transaction.date}</b>
   ${transaction.merchantName ? `Merchant: <b>${transaction.merchantName}</b>` : ''}
   
   Please confirm this transaction:
       `;
     }
   }
   ```

2. **Message Processor Service**
   ```typescript
   // backend/src/telegram/message-processor.service.ts
   import { Injectable } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { OpenAIService } from '../ai/openai.service';
   import { ContextsService } from '../contexts/contexts.service';
   
   @Injectable()
   export class MessageProcessorService {
     constructor(
       private configService: ConfigService,
       private openaiService: OpenAIService,
       private contextsService: ContextsService,
     ) {}
   
     async processTextMessage(text: string, userId: string): Promise<any> {
       const extractionPrompt = `
         Extract transaction details from this message: "${text}"
         
         Return JSON with these fields:
         {
           "amount": number,
           "currency": "BRL|USD|EUR",
           "type": "income|expense|transfer",
           "description": "string",
           "category": "string or null",
           "merchantName": "string or null",
           "confidence": 0.0-1.0
         }
         
         Examples:
         - "Paid $50 for groceries" → {"amount": 50, "currency": "USD", "type": "expense", "description": "groceries", "category": "Food & Dining", "merchantName": null, "confidence": 0.9}
         - "Received R$1000 salary" → {"amount": 1000, "currency": "BRL", "type": "income", "description": "salary", "category": "Income", "merchantName": null, "confidence": 0.95}
       `;
   
       try {
         const extraction = await this.openaiService.extractTransaction(extractionPrompt);
         
         if (extraction && extraction.confidence > 0.7) {
           // Get user's default context
           const contexts = await this.contextsService.findUserContexts(userId);
           const defaultContext = contexts.find(c => c.type === 'personal') || contexts[0];
           
           return {
             ...extraction,
             contextId: defaultContext?.id,
             date: new Date().toISOString().split('T')[0],
             inputMethod: 'telegram',
             tempId: this.generateTempId(),
           };
         }
         
         return null;
       } catch (error) {
         console.error('Error processing text message:', error);
         return null;
       }
     }
   
     async processVoiceMessage(voice: any, userId: string): Promise<string | null> {
       try {
         // Download voice file from Telegram
         const fileUrl = await this.downloadTelegramFile(voice.file_id);
         
         // Convert voice to text using OpenAI Whisper
         const transcription = await this.openaiService.transcribeAudio(fileUrl);
         
         return transcription;
       } catch (error) {
         console.error('Error processing voice message:', error);
         return null;
       }
     }
   
     async processPhotoMessage(photo: any, userId: string): Promise<any> {
       try {
         // Download photo from Telegram
         const imageUrl = await this.downloadTelegramFile(photo.file_id);
         
         // Extract text using OCR (placeholder for Google Vision integration)
         const ocrText = await this.extractTextFromImage(imageUrl);
         
         if (ocrText) {
           // Process extracted text as transaction
           return await this.processTextMessage(ocrText, userId);
         }
         
         return null;
       } catch (error) {
         console.error('Error processing photo message:', error);
         return null;
       }
     }
   
     private async downloadTelegramFile(fileId: string): Promise<string> {
       const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
       
       // Get file path from Telegram
       const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
       const fileData = await fileResponse.json();
       
       // Return download URL
       return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
     }
   
     private async extractTextFromImage(imageUrl: string): Promise<string | null> {
       // Placeholder for OCR implementation
       // This would integrate with Google Cloud Vision API
       return null;
     }
   
     private generateTempId(): string {
       return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     }
   }
   ```

3. **Webhook Controller**
   ```typescript
   // backend/src/telegram/telegram.controller.ts
   import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
   import { TelegramService } from './telegram.service';
   import { TelegramUpdate } from './interfaces/telegram.interface';
   import { Public } from '../auth/decorators/public.decorator';
   
   @Controller('webhooks')
   export class TelegramController {
     constructor(private readonly telegramService: TelegramService) {}
   
     @Public()
     @Post('telegram')
     @HttpCode(HttpStatus.OK)
     async handleWebhook(@Body() update: TelegramUpdate): Promise<{ ok: boolean }> {
       await this.telegramService.processUpdate(update);
       return { ok: true };
     }
   }
   ```

### Week 10: Advanced Telegram Features

#### Day 37-39: Context Management & Advanced Commands

**Success Criteria for Phase 4**:
- [ ] Telegram bot responds to basic commands
- [ ] Text message processing works correctly
- [ ] Voice message transcription functional
- [ ] Photo/receipt processing implemented
- [ ] User registration flow through Telegram
- [ ] Context switching via Telegram commands

---

## Phase 5: Frontend Dashboard Development (Week 11-12)

### Objective
Build comprehensive dashboard with analytics, charts, and responsive design.

### Week 11: Dashboard Components

#### Day 40-42: Analytics Dashboard

**Tasks**:
1. **Dashboard Overview Component**
   ```typescript
   // frontend/src/pages/DashboardPage.tsx
   import React, { useEffect, useState } from 'react';
   import { Grid, Card, CardContent, Typography, Box, Paper } from '@mui/material';
   import { 
     TrendingUp as TrendingUpIcon,
     TrendingDown as TrendingDownIcon,
     AccountBalance as BalanceIcon,
     Category as CategoryIcon 
   } from '@mui/icons-material';
   import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
   import { useContexts } from '../contexts/ContextContext';
   import { useTransactions } from '../contexts/TransactionContext';
   import { ContextSelector } from '../components/contexts/ContextSelector';
   
   export const DashboardPage: React.FC = () => {
     const { state: contextState } = useContexts();
     const { state: transactionState, loadTransactions } = useTransactions();
     const [analytics, setAnalytics] = useState(null);
   
     useEffect(() => {
       if (contextState.activeContext) {
         loadDashboardData();
       }
     }, [contextState.activeContext]);
   
     const loadDashboardData = async () => {
       if (!contextState.activeContext) return;
       
       // Load last 30 days of transactions
       const endDate = new Date();
       const startDate = new Date();
       startDate.setDate(endDate.getDate() - 30);
       
       await loadTransactions(contextState.activeContext.id, {
         startDate: startDate.toISOString().split('T')[0],
         endDate: endDate.toISOString().split('T')[0],
         limit: 1000,
       });
     };
   
     const formatCurrency = (amount: number) => {
       return new Intl.NumberFormat('pt-BR', {
         style: 'currency',
         currency: contextState.activeContext?.currency || 'BRL',
       }).format(amount);
     };
   
     const prepareChartData = () => {
       if (!transactionState.transactions.length) return [];
       
       const dailyData = {};
       transactionState.transactions.forEach(transaction => {
         const date = transaction.date;
         if (!dailyData[date]) {
           dailyData[date] = { date, income: 0, expenses: 0 };
         }
         
         if (transaction.type === 'income') {
           dailyData[date].income += transaction.amount;
         } else if (transaction.type === 'expense') {
           dailyData[date].expenses += transaction.amount;
         }
       });
       
       return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
     };
   
     const prepareCategoryData = () => {
       const categoryTotals = {};
       transactionState.transactions
         .filter(t => t.type === 'expense' && t.category)
         .forEach(transaction => {
           const category = transaction.category;
           categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
         });
       
       return Object.entries(categoryTotals)
         .map(([name, value]) => ({ name, value }))
         .sort((a, b) => b.value - a.value)
         .slice(0, 8);
     };
   
     const chartData = prepareChartData();
     const categoryData = prepareCategoryData();
     const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#00c49f', '#ffbb28'];
   
     return (
       <Box sx={{ p: 3 }}>
         <Typography variant="h4" gutterBottom>
           Financial Dashboard
         </Typography>
         
         <ContextSelector />
   
         {/* Summary Cards */}
         <Grid container spacing={3} sx={{ mb: 4 }}>
           <Grid item xs={12} sm={6} md={3}>
             <Card>
               <CardContent>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                   <TrendingUpIcon color="success" sx={{ mr: 2 }} />
                   <Box>
                     <Typography color="text.secondary" gutterBottom>
                       Total Income
                     </Typography>
                     <Typography variant="h5" component="div" color="success.main">
                       {formatCurrency(transactionState.summary?.totalIncome || 0)}
                     </Typography>
                   </Box>
                 </Box>
               </CardContent>
             </Card>
           </Grid>
           
           <Grid item xs={12} sm={6} md={3}>
             <Card>
               <CardContent>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                   <TrendingDownIcon color="error" sx={{ mr: 2 }} />
                   <Box>
                     <Typography color="text.secondary" gutterBottom>
                       Total Expenses
                     </Typography>
                     <Typography variant="h5" component="div" color="error.main">
                       {formatCurrency(transactionState.summary?.totalExpenses || 0)}
                     </Typography>
                   </Box>
                 </Box>
               </CardContent>
             </Card>
           </Grid>
           
           <Grid item xs={12} sm={6} md={3}>
             <Card>
               <CardContent>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                   <BalanceIcon color="primary" sx={{ mr: 2 }} />
                   <Box>
                     <Typography color="text.secondary" gutterBottom>
                       Net Amount
                     </Typography>
                     <Typography 
                       variant="h5" 
                       component="div"
                       color={(transactionState.summary?.netAmount || 0) >= 0 ? 'success.main' : 'error.main'}
                     >
                       {formatCurrency(transactionState.summary?.netAmount || 0)}
                     </Typography>
                   </Box>
                 </Box>
               </CardContent>
             </Card>
           </Grid>
           
           <Grid item xs={12} sm={6} md={3}>
             <Card>
               <CardContent>
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                   <CategoryIcon color="info" sx={{ mr: 2 }} />
                   <Box>
                     <Typography color="text.secondary" gutterBottom>
                       Transactions
                     </Typography>
                     <Typography variant="h5" component="div">
                       {transactionState.summary?.totalTransactions || 0}
                     </Typography>
                   </Box>
                 </Box>
               </CardContent>
             </Card>
           </Grid>
         </Grid>
   
         {/* Charts */}
         <Grid container spacing={3}>
           <Grid item xs={12} md={8}>
             <Paper sx={{ p: 3, height: 400 }}>
               <Typography variant="h6" gutterBottom>
                 Income vs Expenses Trend
               </Typography>
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="date" />
                   <YAxis />
                   <Tooltip formatter={(value) => formatCurrency(value)} />
                   <Line type="monotone" dataKey="income" stroke="#4caf50" strokeWidth={2} />
                   <Line type="monotone" dataKey="expenses" stroke="#f44336" strokeWidth={2} />
                 </LineChart>
               </ResponsiveContainer>
             </Paper>
           </Grid>
           
           <Grid item xs={12} md={4}>
             <Paper sx={{ p: 3, height: 400 }}>
               <Typography variant="h6" gutterBottom>
                 Expenses by Category
               </Typography>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%"
                     cy="50%"
                     outerRadius={80}
                     fill="#8884d8"
                     dataKey="value"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   >
                     {categoryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value) => formatCurrency(value)} />
                 </PieChart>
               </ResponsiveContainer>
             </Paper>
           </Grid>
         </Grid>
       </Box>
     );
   };
   ```

**Success Criteria for Phase 5**:
- [ ] Dashboard displays financial overview correctly
- [ ] Charts render transaction trends accurately
- [ ] Category breakdown visualization working
- [ ] Responsive design for mobile devices
- [ ] Context switching updates dashboard data
- [ ] Performance optimized for large datasets

---

## Phase 6: AI & Analytics Integration (Week 13-14)

### Objective
Implement AI-powered auto-categorization and financial insights generation.

### Week 13: OpenAI Integration

#### Day 43-45: Auto-Categorization Service

**Tasks**:
1. **OpenAI Service Implementation**
   ```typescript
   // backend/src/ai/openai.service.ts
   import { Injectable } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   
   @Injectable()
   export class OpenAIService {
     private readonly apiKey: string;
     private readonly baseUrl = 'https://api.openai.com/v1';
   
     constructor(private configService: ConfigService) {
       this.apiKey = this.configService.get('OPENAI_API_KEY');
     }
   
     async categorizeTransaction(description: string, amount: number, merchantName?: string): Promise<{
       category: string;
       confidence: number;
       reasoning: string;
     }> {
       const prompt = `Categorize this financial transaction:
   
   Description: ${description}
   Amount: ${amount}
   Merchant: ${merchantName || 'Unknown'}
   
   Choose the most appropriate category from:
   - Food & Dining
   - Transportation
   - Shopping
   - Entertainment
   - Bills & Utilities
   - Healthcare
   - Education
   - Travel
   - Income
   - Business
   - Investment
   - Other
   
   Respond with JSON: {"category": "category_name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;
   
       try {
         const response = await fetch(`${this.baseUrl}/chat/completions`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${this.apiKey}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             model: 'gpt-3.5-turbo',
             messages: [{ role: 'user', content: prompt }],
             temperature: 0.1,
             max_tokens: 150,
           }),
         });
   
         const data = await response.json();
         const content = data.choices[0].message.content;
         
         try {
           return JSON.parse(content);
         } catch {
           return {
             category: 'Other',
             confidence: 0.5,
             reasoning: 'Failed to parse AI response',
           };
         }
       } catch (error) {
         console.error('OpenAI categorization error:', error);
         return {
           category: 'Other',
           confidence: 0.0,
           reasoning: 'API error',
         };
       }
     }
   
     async generateInsights(transactions: any[]): Promise<{
       insights: string[];
       recommendations: string[];
       trends: any[];
     }> {
       const summary = this.analyzeTransactions(transactions);
       
       const prompt = `Analyze these financial patterns and provide insights:
   
   Total Income: ${summary.totalIncome}
   Total Expenses: ${summary.totalExpenses}
   Top Categories: ${summary.topCategories.join(', ')}
   Monthly Trend: ${summary.trend}
   
   Provide 3-5 actionable insights and recommendations in JSON format:
   {"insights": ["insight1", "insight2"], "recommendations": ["rec1", "rec2"]}`;
   
       try {
         const response = await fetch(`${this.baseUrl}/chat/completions`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${this.apiKey}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             model: 'gpt-3.5-turbo',
             messages: [{ role: 'user', content: prompt }],
             temperature: 0.3,
             max_tokens: 300,
           }),
         });
   
         const data = await response.json();
         const content = data.choices[0].message.content;
         const parsed = JSON.parse(content);
         
         return {
           ...parsed,
           trends: summary.trends,
         };
       } catch (error) {
         console.error('OpenAI insights error:', error);
         return {
           insights: ['Unable to generate insights at this time.'],
           recommendations: ['Please ensure you have sufficient transaction data.'],
           trends: [],
         };
       }
     }
   
     async transcribeAudio(audioUrl: string): Promise<string | null> {
       try {
         // Download audio file
         const audioResponse = await fetch(audioUrl);
         const audioBuffer = await audioResponse.arrayBuffer();
         
         // Create form data for Whisper API
         const formData = new FormData();
         formData.append('file', new Blob([audioBuffer]), 'audio.ogg');
         formData.append('model', 'whisper-1');
         formData.append('language', 'pt');
   
         const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${this.apiKey}`,
           },
           body: formData,
         });
   
         const data = await response.json();
         return data.text || null;
       } catch (error) {
         console.error('Whisper transcription error:', error);
         return null;
       }
     }
   
     private analyzeTransactions(transactions: any[]) {
       const totalIncome = transactions
         .filter(t => t.type === 'income')
         .reduce((sum, t) => sum + t.amount, 0);
       
       const totalExpenses = transactions
         .filter(t => t.type === 'expense')
         .reduce((sum, t) => sum + t.amount, 0);
       
       const categoryTotals = {};
       transactions
         .filter(t => t.type === 'expense' && t.category)
         .forEach(t => {
           categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
         });
       
       const topCategories = Object.entries(categoryTotals)
         .sort(([,a], [,b]) => b - a)
         .slice(0, 3)
         .map(([category]) => category);
       
       return {
         totalIncome,
         totalExpenses,
         topCategories,
         trend: totalIncome > totalExpenses ? 'positive' : 'negative',
         trends: this.calculateTrends(transactions),
       };
     }
   
     private calculateTrends(transactions: any[]) {
       // Calculate weekly trends
       const weeklyData = {};
       transactions.forEach(t => {
         const week = this.getWeekKey(new Date(t.date));
         if (!weeklyData[week]) {
           weeklyData[week] = { income: 0, expenses: 0 };
         }
         
         if (t.type === 'income') {
           weeklyData[week].income += t.amount;
         } else if (t.type === 'expense') {
           weeklyData[week].expenses += t.amount;
         }
       });
       
       return Object.entries(weeklyData)
         .map(([week, data]) => ({ week, ...data }))
         .sort((a, b) => a.week.localeCompare(b.week));
     }
   
     private getWeekKey(date: Date): string {
       const year = date.getFullYear();
       const week = Math.ceil(date.getDate() / 7);
       const month = date.getMonth() + 1;
       return `${year}-${month.toString().padStart(2, '0')}-W${week}`;
     }
   }
   ```

**Success Criteria for Phase 6**:
- [ ] Auto-categorization working with >80% accuracy
- [ ] Financial insights generation functional
- [ ] Voice transcription working correctly
- [ ] AI processing performance optimized
- [ ] Error handling for AI service failures
- [ ] Cost optimization for API usage

---

## Phase 7: Testing & Quality Assurance (Week 15-16)

### Objective
Implement comprehensive testing strategy covering unit, integration, and E2E tests.

### Week 15: Backend Testing

#### Day 46-48: Unit & Integration Tests

**Tasks**:
1. **Transaction Service Tests**
   ```typescript
   // backend/src/transactions/transactions.service.spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import { getRepositoryToken } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { TransactionsService } from './transactions.service';
   import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
   import { Context } from '../contexts/entities/context.entity';
   
   describe('TransactionsService', () => {
     let service: TransactionsService;
     let transactionRepository: Repository<Transaction>;
     let contextRepository: Repository<Context>;
   
     const mockTransaction = {
       id: '1',
       amount: 100,
       description: 'Test transaction',
       type: TransactionType.EXPENSE,
       userId: 'user1',
       contextId: 'context1',
       status: TransactionStatus.PENDING,
     };
   
     const mockContext = {
       id: 'context1',
       name: 'Test Context',
       ownerId: 'user1',
       members: [],
     };
   
     beforeEach(async () => {
       const module: TestingModule = await Test.createTestingModule({
         providers: [
           TransactionsService,
           {
             provide: getRepositoryToken(Transaction),
             useValue: {
               create: jest.fn().mockReturnValue(mockTransaction),
               save: jest.fn().mockResolvedValue(mockTransaction),
               findOne: jest.fn().mockResolvedValue(mockTransaction),
               remove: jest.fn().mockResolvedValue(undefined),
               createQueryBuilder: jest.fn().mockReturnValue({
                 where: jest.fn().mockReturnThis(),
                 andWhere: jest.fn().mockReturnThis(),
                 orderBy: jest.fn().mockReturnThis(),
                 skip: jest.fn().mockReturnThis(),
                 take: jest.fn().mockReturnThis(),
                 getMany: jest.fn().mockResolvedValue([mockTransaction]),
                 getCount: jest.fn().mockResolvedValue(1),
               }),
             },
           },
           {
             provide: getRepositoryToken(Context),
             useValue: {
               findOne: jest.fn().mockResolvedValue(mockContext),
             },
           },
         ],
       }).compile();
   
       service = module.get<TransactionsService>(TransactionsService);
       transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
       contextRepository = module.get<Repository<Context>>(getRepositoryToken(Context));
     });
   
     describe('create', () => {
       it('should create a transaction successfully', async () => {
         const createDto = {
           amount: 100,
           description: 'Test transaction',
           type: TransactionType.EXPENSE,
           contextId: 'context1',
           currency: 'BRL',
           date: '2023-01-01',
           inputMethod: 'manual',
         };
   
         const result = await service.create(createDto, 'user1');
   
         expect(result).toEqual(mockTransaction);
         expect(transactionRepository.create).toHaveBeenCalledWith({
           ...createDto,
           userId: 'user1',
           status: TransactionStatus.PENDING,
         });
       });
   
       it('should throw error if context not found', async () => {
         jest.spyOn(contextRepository, 'findOne').mockResolvedValue(null);
   
         const createDto = {
           amount: 100,
           description: 'Test transaction',
           type: TransactionType.EXPENSE,
           contextId: 'nonexistent',
           currency: 'BRL',
           date: '2023-01-01',
           inputMethod: 'manual',
         };
   
         await expect(service.create(createDto, 'user1')).rejects.toThrow('Context not found');
       });
     });
   
     describe('findByContext', () => {
       it('should return transactions with summary', async () => {
         const filters = { page: 1, limit: 20 };
         
         const result = await service.findByContext('context1', filters, 'user1');
   
         expect(result).toHaveProperty('transactions');
         expect(result).toHaveProperty('total');
         expect(result).toHaveProperty('summary');
       });
     });
   });
   ```

2. **E2E API Tests**
   ```typescript
   // backend/test/transactions.e2e-spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import { INestApplication } from '@nestjs/common';
   import * as request from 'supertest';
   import { AppModule } from '../src/app.module';
   import { getRepositoryToken } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { User } from '../src/users/entities/user.entity';
   import { Context } from '../src/contexts/entities/context.entity';
   
   describe('TransactionsController (e2e)', () => {
     let app: INestApplication;
     let userRepository: Repository<User>;
     let contextRepository: Repository<Context>;
     let authToken: string;
     let testUser: User;
     let testContext: Context;
   
     beforeAll(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();
   
       app = moduleFixture.createNestApplication();
       userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
       contextRepository = moduleFixture.get<Repository<Context>>(getRepositoryToken(Context));
       
       await app.init();
   
       // Create test user and context
       testUser = await userRepository.save({
         email: 'test@example.com',
         fullName: 'Test User',
         password: 'hashedpassword',
       });
   
       testContext = await contextRepository.save({
         name: 'Test Context',
         type: 'personal',
         ownerId: testUser.id,
       });
   
       // Get auth token
       const loginResponse = await request(app.getHttpServer())
         .post('/auth/login')
         .send({
           email: 'test@example.com',
           password: 'testpassword',
         });
       
       authToken = loginResponse.body.access_token;
     });
   
     afterAll(async () => {
       await app.close();
     });
   
     describe('/transactions (POST)', () => {
       it('should create a transaction', () => {
         return request(app.getHttpServer())
           .post('/transactions')
           .set('Authorization', `Bearer ${authToken}`)
           .send({
             amount: 50.00,
             description: 'Test expense',
             type: 'expense',
             contextId: testContext.id,
             currency: 'BRL',
             date: '2023-01-01',
             inputMethod: 'manual',
           })
           .expect(201)
           .expect((res) => {
             expect(res.body).toHaveProperty('id');
             expect(res.body.amount).toBe(50);
             expect(res.body.description).toBe('Test expense');
           });
       });
   
       it('should require authentication', () => {
         return request(app.getHttpServer())
           .post('/transactions')
           .send({
             amount: 50.00,
             description: 'Test expense',
             type: 'expense',
             contextId: testContext.id,
             currency: 'BRL',
             date: '2023-01-01',
             inputMethod: 'manual',
           })
           .expect(401);
       });
     });
   
     describe('/transactions/context/:contextId (GET)', () => {
       it('should return transactions for context', () => {
         return request(app.getHttpServer())
           .get(`/transactions/context/${testContext.id}`)
           .set('Authorization', `Bearer ${authToken}`)
           .expect(200)
           .expect((res) => {
             expect(res.body).toHaveProperty('transactions');
             expect(res.body).toHaveProperty('total');
             expect(res.body).toHaveProperty('summary');
           });
       });
     });
   });
   ```

**Success Criteria for Phase 7**:
- [ ] >90% code coverage for all services
- [ ] All critical paths covered by integration tests
- [ ] E2E tests covering main user journeys
- [ ] Performance tests validate response times
- [ ] Security tests verify authentication/authorization
- [ ] All tests pass in CI/CD pipeline

---

## Phase 8: Deployment & Beta Launch (Week 17-18)

### Objective
Deploy MVP to production environment and launch beta testing program.

### Week 17: Production Deployment

#### Day 49-51: Docker & AWS Setup

**Tasks**:
1. **Docker Configuration**
   ```dockerfile
   # backend/Dockerfile
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   FROM node:18-alpine AS production
   
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/package*.json ./
   
   EXPOSE 3000
   CMD ["node", "dist/main"]
   ```

   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=${DATABASE_URL}
         - JWT_SECRET=${JWT_SECRET}
         - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
         - OPENAI_API_KEY=${OPENAI_API_KEY}
       depends_on:
         - postgres
         - redis
   
     frontend:
       build: ./frontend
       ports:
         - "80:80"
       environment:
         - REACT_APP_API_URL=${API_URL}
   
     postgres:
       image: postgres:15
       environment:
         - POSTGRES_DB=${DB_NAME}
         - POSTGRES_USER=${DB_USER}
         - POSTGRES_PASSWORD=${DB_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     redis:
       image: redis:7-alpine
       volumes:
         - redis_data:/data
   
   volumes:
     postgres_data:
     redis_data:
   ```

**Week 18: Beta Launch**

#### Day 52-54: Monitoring & Launch

**Tasks**:
1. **Production Monitoring Setup**
2. **Beta User Onboarding Process**
3. **Feedback Collection Implementation**
4. **Performance Monitoring & Alerting**
5. **Documentation Finalization**

**Final Success Criteria**:
- [ ] MVP deployed to production environment
- [ ] All core features functional in production
- [ ] Monitoring and alerting systems operational
- [ ] Beta testing program launched successfully
- [ ] Initial user feedback collected and analyzed
- [ ] Post-launch support processes established

---

## Conclusion

This comprehensive 18-week MVP development guide provides detailed, step-by-step instructions for building the Financy platform from foundation to beta launch. Each phase includes specific code examples, architectural decisions, testing strategies, and success criteria to ensure consistent progress toward a production-ready financial management platform.

The guide emphasizes iterative development, continuous testing, and user feedback integration to deliver a robust MVP that validates the core value proposition while maintaining high code quality and security standards.