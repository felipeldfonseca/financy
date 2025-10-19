# Developer Onboarding Guide
## Financy Development Environment Setup & Getting Started

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Target Audience**: New developers joining the Financy team  

---

## Welcome to Financy! 🎉

This guide will help you set up your development environment and understand our development workflows, coding standards, and team practices. By the end of this guide, you'll be ready to contribute to the Financy platform.

### What You'll Learn
1. **Development Environment Setup**: Tools, dependencies, and local environment configuration
2. **Project Structure**: Understanding the codebase organization and architecture
3. **Development Workflow**: Git workflow, code reviews, and deployment process
4. **Coding Standards**: Style guides, best practices, and quality gates
5. **Testing Practices**: How to write and run tests effectively
6. **Team Collaboration**: Communication channels, meetings, and knowledge sharing

---

## Prerequisites & System Requirements

### Required Software
```bash
# Essential tools
Node.js >= 18.0.0
npm >= 9.0.0
Git >= 2.30.0
Docker >= 20.10.0
Docker Compose >= 2.0.0

# Recommended tools
PostgreSQL >= 15.0
Redis >= 7.0
VS Code or preferred IDE

# Optional but helpful
nvm (Node Version Manager)
TablePlus or pgAdmin (database GUI)
Postman or Insomnia (API testing)
```

### System Requirements
- **Operating System**: macOS, Linux, or Windows with WSL2
- **RAM**: Minimum 8GB (16GB recommended for AI development)
- **Storage**: At least 20GB free space
- **Network**: Stable internet connection for dependencies and services

---

## Development Environment Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/financy/financy-platform.git
cd financy-platform

# Set up your Git configuration
git config user.name "Your Name"
git config user.email "your.email@financy.com"

# Install pre-commit hooks
npm run setup:hooks

# Create your feature branch
git checkout -b feature/your-name-setup
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit the environment file with your local settings
# Key variables to configure:
```

```env
# .env.local example configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://financy_dev:dev_password@localhost:5432/financy_dev
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_REFRESH_SECRET=your-refresh-secret-key

# External Services (Development keys)
OPENAI_API_KEY=your-openai-api-key
GOOGLE_CLOUD_VISION_API_KEY=your-google-vision-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# AWS Configuration (LocalStack for development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566

# Email Service (MailHog for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Feature Flags
ENABLE_AI_CATEGORIZATION=true
ENABLE_VOICE_PROCESSING=true
ENABLE_REAL_TIME_NOTIFICATIONS=true

# Logging
LOG_LEVEL=debug
LOG_FORMAT=dev

# Development Tools
ENABLE_DEBUG_ROUTES=true
ENABLE_API_DOCS=true
ENABLE_PROFILING=false
```

### 3. Local Services Setup
```bash
# Start required services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps

# Check service health
npm run health:check
```

### 4. Database Setup
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed:dev

# Verify database setup
npm run db:verify
```

### 5. Application Startup
```bash
# Install all dependencies
npm run install:all

# Build the application
npm run build

# Start development server with hot reload
npm run dev

# Verify application is running
curl http://localhost:3000/health
```

---

## Project Structure Overview

### Repository Organization
```
financy-platform/
├── apps/                          # Application modules
│   ├── api/                       # Main API server
│   ├── web/                       # Web application
│   ├── mobile/                    # React Native mobile app
│   └── admin/                     # Admin dashboard
├── packages/                      # Shared libraries
│   ├── shared/                    # Common utilities
│   ├── database/                  # Database schemas and migrations
│   ├── ai-services/               # AI/ML processing
│   └── notification-service/      # Notification handling
├── tools/                         # Development tools and scripts
│   ├── scripts/                   # Build and deployment scripts
│   ├── generators/                # Code generators
│   └── config/                    # Configuration files
├── docs/                          # Documentation
├── infrastructure/                # Infrastructure as Code
├── tests/                         # End-to-end and integration tests
└── .github/                       # GitHub workflows and templates
```

### Core Application Structure
```
apps/api/src/
├── modules/                       # Feature modules
│   ├── auth/                      # Authentication & authorization
│   ├── users/                     # User management
│   ├── contexts/                  # Financial contexts
│   ├── transactions/              # Transaction processing
│   ├── ai/                        # AI categorization and insights
│   ├── analytics/                 # Financial analytics
│   ├── notifications/             # Notification system
│   └── integrations/              # External integrations
├── shared/                        # Shared application code
│   ├── guards/                    # Route guards and authentication
│   ├── interceptors/              # Request/response interceptors
│   ├── pipes/                     # Validation pipes
│   ├── filters/                   # Exception filters
│   └── decorators/                # Custom decorators
├── config/                        # Application configuration
├── database/                      # Database related code
│   ├── migrations/                # Database migrations
│   ├── seeds/                     # Data seeding
│   └── entities/                  # Database entities
└── main.ts                        # Application entry point
```

### Key Concepts & Architecture Patterns

#### 1. Module-Based Architecture
```typescript
// Example module structure
@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    AuthModule,
    CacheModule
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    TransactionRepository,
    TransactionValidator,
    AICategorizationService
  ],
  exports: [TransactionService]
})
export class TransactionModule {}
```

#### 2. Domain-Driven Design (DDD)
```typescript
// Domain entity example
export class Transaction {
  constructor(
    public readonly id: TransactionId,
    public readonly contextId: ContextId,
    public readonly userId: UserId,
    public amount: Money,
    public description: string,
    public category: Category,
    public readonly createdAt: Date
  ) {}
  
  // Domain logic methods
  public categorize(category: Category, confidence: number): void {
    this.category = category;
    this.categoryConfidence = confidence;
    this.markAsProcessed();
  }
  
  public split(splits: TransactionSplit[]): void {
    this.validateSplits(splits);
    this.splits = splits;
    this.type = TransactionType.SPLIT;
  }
}
```

#### 3. CQRS Pattern for Complex Operations
```typescript
// Command example
export class CreateTransactionCommand {
  constructor(
    public readonly contextId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly description: string
  ) {}
}

// Query example
export class GetMonthlySpendingQuery {
  constructor(
    public readonly contextId: string,
    public readonly month: string,
    public readonly year: number
  ) {}
}
```

---

## Development Workflow

### Git Workflow
We use a modified Git Flow with the following branches:

```bash
main          # Production-ready code
develop       # Integration branch for features
feature/*     # Feature development
hotfix/*      # Production hotfixes
release/*     # Release preparation
```

#### Creating a Feature Branch
```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/JIRA-123-add-voice-transaction-processing

# Work on your feature...
git add .
git commit -m "feat: add voice transaction processing endpoint

- Implement Whisper API integration
- Add audio file validation
- Create transaction extraction logic
- Add comprehensive tests

Closes: JIRA-123"

# Push and create pull request
git push origin feature/JIRA-123-add-voice-transaction-processing
```

#### Commit Message Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>
# 
# <body>
#
# <footer>

# Examples:
feat(transactions): add voice processing capability
fix(auth): resolve JWT token expiration handling
docs(api): update endpoint documentation
test(analytics): add integration tests for monthly reports
refactor(ai): optimize categorization algorithm
perf(database): improve query performance for large datasets
```

### Code Review Process

#### 1. Pull Request Creation
```markdown
## PR Template

### Description
Brief description of the changes and why they're needed.

### Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Performance testing (if applicable)

### Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is documented
- [ ] No console.log or debug statements
- [ ] Database migrations included (if applicable)
- [ ] Environment variables documented

### Screenshots/Videos
(If applicable)

### Related Issues
Closes: JIRA-123
Related: JIRA-456
```

#### 2. Review Guidelines
- **Code Quality**: Clean, readable, and well-documented code
- **Testing**: Adequate test coverage (>80% for new code)
- **Performance**: No performance regressions
- **Security**: No security vulnerabilities introduced
- **Documentation**: Code is properly documented

#### 3. Approval Process
- Minimum 2 approvals required
- At least 1 approval from a senior developer
- All CI checks must pass
- No merge conflicts

### Local Development Commands

#### Essential Commands
```bash
# Development server
npm run dev                    # Start development server with hot reload
npm run dev:debug             # Start with debugging enabled
npm run dev:inspect           # Start with Node.js inspector

# Testing
npm run test                  # Run all tests
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests
npm run test:e2e             # Run end-to-end tests
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Generate coverage report

# Code Quality
npm run lint                 # Run ESLint
npm run lint:fix            # Fix ESLint issues automatically
npm run format              # Format code with Prettier
npm run type-check          # TypeScript type checking

# Database
npm run db:migrate          # Run database migrations
npm run db:migrate:rollback # Rollback last migration
npm run db:seed             # Seed database with test data
npm run db:reset            # Reset database (migrate + seed)
npm run db:studio           # Open database GUI

# Build
npm run build               # Build for production
npm run build:analyze       # Analyze bundle size
npm run build:docker        # Build Docker image

# Utilities
npm run clean               # Clean build artifacts
npm run deps:check          # Check for outdated dependencies
npm run security:check      # Security vulnerability scan
```

#### Development Helpers
```bash
# Generate new module
npm run generate:module transactions

# Generate new controller
npm run generate:controller transactions

# Generate new service
npm run generate:service ai-categorization

# Generate database migration
npm run generate:migration add-transaction-splits

# Generate API documentation
npm run docs:generate

# Performance profiling
npm run profile:start       # Start CPU profiling
npm run profile:stop        # Stop and analyze profile
```

---

## Coding Standards & Best Practices

### TypeScript Style Guide

#### 1. Naming Conventions
```typescript
// Interfaces and types - PascalCase
interface UserProfile {
  userId: string;
  displayName: string;
}

type TransactionStatus = 'pending' | 'confirmed' | 'failed';

// Classes - PascalCase
class TransactionService {
  // Private members - leading underscore
  private readonly _repository: TransactionRepository;
  
  // Methods - camelCase
  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    // Implementation
  }
}

// Constants - UPPER_SNAKE_CASE
const MAX_TRANSACTION_AMOUNT = 1000000;
const DEFAULT_CURRENCY_CODE = 'BRL';

// Enums - PascalCase
enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}
```

#### 2. Function and Method Patterns
```typescript
// Use explicit return types
function calculateTotalSpending(transactions: Transaction[]): number {
  return transactions.reduce((total, tx) => total + tx.amount, 0);
}

// Use async/await instead of promises
async function processTransaction(data: TransactionData): Promise<ProcessedTransaction> {
  try {
    const validated = await this.validateTransaction(data);
    const categorized = await this.categorizeTransaction(validated);
    return await this.saveTransaction(categorized);
  } catch (error) {
    this.logger.error('Transaction processing failed', { error, data });
    throw new TransactionProcessingError('Failed to process transaction', error);
  }
}

// Use proper error handling
class TransactionService {
  async findById(id: string): Promise<Transaction> {
    if (!id) {
      throw new InvalidArgumentError('Transaction ID is required');
    }
    
    const transaction = await this.repository.findById(id);
    if (!transaction) {
      throw new NotFoundError(`Transaction with ID ${id} not found`);
    }
    
    return transaction;
  }
}
```

#### 3. Data Validation & DTOs
```typescript
// Input validation with class-validator
export class CreateTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  amount: number;
  
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency_code: string;
  
  @IsString()
  @Length(1, 500)
  @Transform(({ value }) => value.trim())
  description: string;
  
  @IsOptional()
  @IsString()
  @Length(1, 200)
  merchant_name?: string;
  
  @IsDateString()
  transaction_date: string;
}

// Response DTOs for API consistency
export class TransactionResponseDto {
  @Expose()
  id: string;
  
  @Expose()
  amount: number;
  
  @Expose()
  currency_code: string;
  
  @Expose()
  description: string;
  
  @Expose()
  @Transform(({ value }) => value.toISOString())
  created_at: Date;
  
  // Exclude sensitive data
  @Exclude()
  internal_notes: string;
}
```

### Database Best Practices

#### 1. Entity Design
```typescript
@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;
  
  @Column('char', { length: 3 })
  currency_code: string;
  
  @Column('varchar', { length: 500 })
  description: string;
  
  @Column('varchar', { length: 200, nullable: true })
  merchant_name: string | null;
  
  @Column('date')
  transaction_date: Date;
  
  @CreateDateColumn()
  created_at: Date;
  
  @UpdateDateColumn()
  updated_at: Date;
  
  // Relationships
  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  
  @ManyToOne(() => ContextEntity, { eager: false })
  @JoinColumn({ name: 'context_id' })
  context: ContextEntity;
  
  // Indexes for performance
  @Index(['context_id', 'transaction_date'])
  @Index(['user_id', 'created_at'])
  @Index(['amount']) // For financial queries
}
```

#### 2. Repository Patterns
```typescript
@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repository: Repository<TransactionEntity>,
    private readonly logger: Logger
  ) {}
  
  async findByContextAndDateRange(
    contextId: string,
    startDate: Date,
    endDate: Date,
    options: FindOptions = {}
  ): Promise<Transaction[]> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('transaction')
        .where('transaction.context_id = :contextId', { contextId })
        .andWhere('transaction.transaction_date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .orderBy('transaction.transaction_date', 'DESC');
      
      if (options.limit) {
        queryBuilder.limit(options.limit);
      }
      
      if (options.offset) {
        queryBuilder.offset(options.offset);
      }
      
      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error('Failed to find transactions by context and date range', {
        contextId,
        startDate,
        endDate,
        error
      });
      throw new DatabaseError('Failed to retrieve transactions', error);
    }
  }
  
  async getSpendingByCategory(
    contextId: string,
    period: DateRange
  ): Promise<CategorySpending[]> {
    const query = `
      SELECT 
        c.id as category_id,
        c.name as category_name,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.context_id = $1
        AND t.transaction_date BETWEEN $2 AND $3
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
    `;
    
    return await this.repository.query(query, [
      contextId,
      period.startDate,
      period.endDate
    ]);
  }
}
```

### Error Handling Patterns

#### 1. Custom Exception Classes
```typescript
// Base exception class
export abstract class AppException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific exceptions
export class ValidationError extends AppException {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class NotFoundError extends AppException {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class BusinessLogicError extends AppException {
  readonly code = 'BUSINESS_LOGIC_ERROR';
  readonly statusCode = 422;
}

// Financial domain exceptions
export class InsufficientFundsError extends BusinessLogicError {
  readonly code = 'INSUFFICIENT_FUNDS';
  
  constructor(availableAmount: number, requestedAmount: number) {
    super(
      `Insufficient funds: available ${availableAmount}, requested ${requestedAmount}`,
      undefined,
      { availableAmount, requestedAmount }
    );
  }
}
```

#### 2. Global Exception Filter
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}
  
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;
    
    if (exception instanceof AppException) {
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.context;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      code = typeof errorResponse === 'object' ? errorResponse['error'] : 'HTTP_EXCEPTION';
      message = exception.message;
    }
    
    // Log error for monitoring
    this.logger.error('Exception caught by global filter', {
      exception: exception instanceof Error ? exception.message : exception,
      stack: exception instanceof Error ? exception.stack : undefined,
      request: {
        method: request.method,
        url: request.url,
        user: request.user?.id
      },
      response: { status, code, message }
    });
    
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url
      }
    });
  }
}
```

This comprehensive developer onboarding guide provides new team members with everything they need to get started contributing to the Financy platform effectively.