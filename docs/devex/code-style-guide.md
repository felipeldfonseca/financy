# Code Style Guide
## Financy Coding Standards & Best Practices

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Target Audience**: All developers contributing to the Financy platform  

---

## Overview

This document establishes coding standards, style guidelines, and best practices for the Financy platform. Consistent code style improves readability, maintainability, and collaboration across the development team.

### Goals
1. **Consistency**: Uniform code style across all projects and teams
2. **Readability**: Code that is easy to read and understand
3. **Maintainability**: Code that is easy to modify and extend
4. **Quality**: High-quality code that follows industry best practices
5. **Productivity**: Automated tooling to enforce standards

---

## Language-Specific Guidelines

### TypeScript/JavaScript Standards

#### 1. Code Formatting & Structure
```typescript
// Prettier configuration (.prettierrc.json)
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}

// ESLint configuration (.eslintrc.json)
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier",
    "plugin:security/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "security/detect-object-injection": "error"
  }
}
```

#### 2. Naming Conventions
```typescript
// Variables and functions - camelCase
const userBalance = 1000.50;
const transactionCount = 25;

// Functions - camelCase, descriptive verbs
function calculateMonthlySpending(transactions: Transaction[]): number {
  return transactions.reduce((total, tx) => total + tx.amount, 0);
}

async function processTransactionPayment(
  transactionId: string,
  paymentMethod: PaymentMethod
): Promise<PaymentResult> {
  // Implementation
}

// Classes - PascalCase
class TransactionProcessor {
  private readonly paymentGateway: PaymentGateway;
  
  constructor(paymentGateway: PaymentGateway) {
    this.paymentGateway = paymentGateway;
  }
}

// Interfaces - PascalCase with descriptive names
interface UserPaymentProfile {
  userId: string;
  defaultPaymentMethod: PaymentMethod;
  billingAddress: Address;
  paymentHistory: Payment[];
}

// Type aliases - PascalCase
type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';
type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP';

// Enums - PascalCase for enum, UPPER_CASE for values
enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  REFUND = 'refund',
}

// Constants - UPPER_SNAKE_CASE
const MAX_TRANSACTION_AMOUNT = 1000000;
const DEFAULT_CURRENCY = 'BRL';
const API_TIMEOUT_MS = 30000;

// Private members - leading underscore
class BankingService {
  private readonly _apiClient: ApiClient;
  private _connectionPool: ConnectionPool;
  
  private async _validateAccount(accountNumber: string): Promise<boolean> {
    // Implementation
  }
}

// File names - kebab-case
transaction-processor.service.ts
user-payment-profile.interface.ts
currency-conversion.util.ts
```

#### 3. Function and Method Design
```typescript
// Function signatures - explicit types
function calculateCompoundInterest(
  principal: number,
  rate: number,
  years: number,
  compoundingFrequency: number = 12
): number {
  return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * years);
}

// Async functions - use async/await
async function processPayment(
  amount: number,
  currency: CurrencyCode,
  paymentMethod: PaymentMethod
): Promise<PaymentResult> {
  try {
    const validatedAmount = await validatePaymentAmount(amount, currency);
    const paymentIntent = await createPaymentIntent(validatedAmount, paymentMethod);
    const result = await executePayment(paymentIntent);
    
    await logPaymentEvent(result);
    return result;
  } catch (error) {
    await logPaymentError(error, { amount, currency, paymentMethod });
    throw new PaymentProcessingError('Payment failed', error);
  }
}

// Pure functions - avoid side effects
function formatCurrency(amount: number, currency: CurrencyCode, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Higher-order functions for reusability
function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): () => Promise<T> {
  return async (): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    throw lastError!;
  };
}

// Function composition
const processTransactionWithRetry = withRetry(
  () => processTransaction(transactionData),
  3,
  2000
);
```

#### 4. Object and Class Design
```typescript
// Interface design - composition over inheritance
interface Identifiable {
  readonly id: string;
}

interface Timestamped {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface Auditable {
  readonly createdBy: string;
  readonly updatedBy: string;
}

// Compose interfaces
interface Transaction extends Identifiable, Timestamped, Auditable {
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly description: string;
  readonly category: TransactionCategory;
  readonly status: TransactionStatus;
}

// Class design - single responsibility
class TransactionValidator {
  validate(transaction: CreateTransactionDto): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!this.isValidAmount(transaction.amount)) {
      errors.push(new ValidationError('Invalid amount', 'amount'));
    }
    
    if (!this.isValidCurrency(transaction.currency)) {
      errors.push(new ValidationError('Invalid currency', 'currency'));
    }
    
    if (!this.isValidDescription(transaction.description)) {
      errors.push(new ValidationError('Invalid description', 'description'));
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  private isValidAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0 && amount <= MAX_TRANSACTION_AMOUNT;
  }
  
  private isValidCurrency(currency: string): boolean {
    return SUPPORTED_CURRENCIES.includes(currency as CurrencyCode);
  }
  
  private isValidDescription(description: string): boolean {
    return typeof description === 'string' && 
           description.trim().length > 0 && 
           description.length <= 500;
  }
}

// Builder pattern for complex objects
class TransactionBuilder {
  private transaction: Partial<Transaction> = {};
  
  withAmount(amount: number): this {
    this.transaction.amount = amount;
    return this;
  }
  
  withCurrency(currency: CurrencyCode): this {
    this.transaction.currency = currency;
    return this;
  }
  
  withDescription(description: string): this {
    this.transaction.description = description.trim();
    return this;
  }
  
  withCategory(category: TransactionCategory): this {
    this.transaction.category = category;
    return this;
  }
  
  build(): Transaction {
    const validator = new TransactionValidator();
    const validationResult = validator.validate(this.transaction as CreateTransactionDto);
    
    if (!validationResult.isValid) {
      throw new ValidationError('Invalid transaction data', validationResult.errors);
    }
    
    return {
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: getCurrentUserId(),
      updatedBy: getCurrentUserId(),
      status: TransactionStatus.PENDING,
      ...this.transaction,
    } as Transaction;
  }
}

// Usage
const transaction = new TransactionBuilder()
  .withAmount(150.75)
  .withCurrency('BRL')
  .withDescription('Grocery shopping at SuperMarket')
  .withCategory(TransactionCategory.GROCERIES)
  .build();
```

#### 5. Error Handling Patterns
```typescript
// Custom error classes
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  
  constructor(
    message: string,
    public readonly field?: string,
    cause?: Error
  ) {
    super(message, cause, { field });
  }
}

class BusinessLogicError extends AppError {
  readonly code = 'BUSINESS_LOGIC_ERROR';
  readonly statusCode = 422;
}

class InsufficientFundsError extends BusinessLogicError {
  readonly code = 'INSUFFICIENT_FUNDS';
  
  constructor(availableAmount: number, requestedAmount: number) {
    super(
      `Insufficient funds: available ${availableAmount}, requested ${requestedAmount}`,
      undefined,
      { availableAmount, requestedAmount }
    );
  }
}

// Result pattern for error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function createResult<T>(data: T): Result<T, never> {
  return { success: true, data };
}

function createError<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage in services
class PaymentService {
  async processPayment(
    amount: number,
    paymentMethod: PaymentMethod
  ): Promise<Result<PaymentResult, PaymentError>> {
    try {
      if (amount <= 0) {
        return createError(new ValidationError('Amount must be positive'));
      }
      
      const account = await this.getAccount(paymentMethod.accountId);
      if (account.balance < amount) {
        return createError(new InsufficientFundsError(account.balance, amount));
      }
      
      const result = await this.executePayment(amount, paymentMethod);
      return createResult(result);
      
    } catch (error) {
      return createError(new PaymentError('Payment processing failed', error));
    }
  }
}

// Error handling in controllers
@Controller('payments')
export class PaymentController {
  @Post()
  async createPayment(@Body() dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const result = await this.paymentService.processPayment(dto.amount, dto.paymentMethod);
    
    if (!result.success) {
      if (result.error instanceof ValidationError) {
        throw new BadRequestException(result.error.message);
      }
      if (result.error instanceof InsufficientFundsError) {
        throw new UnprocessableEntityException(result.error.message);
      }
      throw new InternalServerErrorException('Payment processing failed');
    }
    
    return new PaymentResponseDto(result.data);
  }
}
```

### React/Frontend Guidelines

#### 1. Component Structure
```typescript
// Functional components with TypeScript
interface TransactionListProps {
  transactions: Transaction[];
  onTransactionSelect: (transaction: Transaction) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onTransactionSelect,
  loading = false,
  error,
  className,
}) => {
  // Custom hooks for component logic
  const { filteredTransactions, searchTerm, setSearchTerm } = useTransactionFilter(transactions);
  const { sortedTransactions, sortConfig, handleSort } = useTransactionSort(filteredTransactions);
  
  // Early returns for loading/error states
  if (loading) {
    return <TransactionListSkeleton />;
  }
  
  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }
  
  if (transactions.length === 0) {
    return <EmptyState message="No transactions found" />;
  }
  
  return (
    <div className={clsx('transaction-list', className)}>
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search transactions..."
      />
      
      <div className="transaction-list__content">
        {sortedTransactions.map(transaction => (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            onClick={() => onTransactionSelect(transaction)}
          />
        ))}
      </div>
    </div>
  );
};

// Custom hooks for reusable logic
function useTransactionFilter(transactions: Transaction[]) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) {
      return transactions;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return transactions.filter(transaction =>
      transaction.description.toLowerCase().includes(lowerSearchTerm) ||
      transaction.merchantName?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [transactions, searchTerm]);
  
  return { filteredTransactions, searchTerm, setSearchTerm };
}

// Component composition
interface TransactionListItemProps {
  transaction: Transaction;
  onClick: () => void;
}

const TransactionListItem: React.FC<TransactionListItemProps> = ({ transaction, onClick }) => {
  return (
    <div className="transaction-item" onClick={onClick}>
      <TransactionAmount amount={transaction.amount} currency={transaction.currency} />
      <TransactionDescription description={transaction.description} />
      <TransactionCategory category={transaction.category} />
      <TransactionDate date={transaction.createdAt} />
    </div>
  );
};
```

#### 2. State Management
```typescript
// Zustand store structure
interface TransactionStore {
  // State
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  loading: boolean;
  error: string | null;
  filters: TransactionFilters;
  
  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  
  // Async actions
  fetchTransactions: (contextId: string) => Promise<void>;
  createTransaction: (data: CreateTransactionDto) => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  // Initial state
  transactions: [],
  selectedTransaction: null,
  loading: false,
  error: null,
  filters: {
    startDate: null,
    endDate: null,
    categories: [],
    amountRange: null,
  },
  
  // Sync actions
  setTransactions: transactions => set({ transactions }),
  
  addTransaction: transaction => set(state => ({
    transactions: [transaction, ...state.transactions],
  })),
  
  updateTransaction: (id, updates) => set(state => ({
    transactions: state.transactions.map(tx =>
      tx.id === id ? { ...tx, ...updates } : tx
    ),
  })),
  
  deleteTransaction: id => set(state => ({
    transactions: state.transactions.filter(tx => tx.id !== id),
  })),
  
  setSelectedTransaction: selectedTransaction => set({ selectedTransaction }),
  
  setFilters: filters => set(state => ({
    filters: { ...state.filters, ...filters },
  })),
  
  clearFilters: () => set({
    filters: {
      startDate: null,
      endDate: null,
      categories: [],
      amountRange: null,
    },
  }),
  
  // Async actions
  fetchTransactions: async contextId => {
    set({ loading: true, error: null });
    
    try {
      const response = await transactionApi.getTransactions(contextId);
      set({ transactions: response.data, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        loading: false 
      });
    }
  },
  
  createTransaction: async data => {
    set({ loading: true, error: null });
    
    try {
      const response = await transactionApi.createTransaction(data);
      const newTransaction = response.data;
      
      set(state => ({
        transactions: [newTransaction, ...state.transactions],
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create transaction',
        loading: false,
      });
    }
  },
}));
```

---

## Database & SQL Standards

### Table and Column Naming
```sql
-- Table names - snake_case, plural
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Column names - snake_case
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  context_id UUID NOT NULL REFERENCES financial_contexts(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL,
  description TEXT NOT NULL,
  merchant_name VARCHAR(255),
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  category_id UUID REFERENCES transaction_categories(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX idx_financial_transactions_user_date 
ON financial_transactions(user_id, transaction_date DESC);

CREATE INDEX idx_financial_transactions_context_amount 
ON financial_transactions(context_id, amount DESC);

CREATE INDEX idx_financial_transactions_category 
ON financial_transactions(category_id) 
WHERE category_id IS NOT NULL;
```

### Query Guidelines
```sql
-- Use explicit JOIN syntax
SELECT 
  t.id,
  t.amount,
  t.currency_code,
  t.description,
  c.name AS category_name,
  u.full_name AS user_name
FROM financial_transactions t
INNER JOIN users u ON t.user_id = u.id
LEFT JOIN transaction_categories c ON t.category_id = c.id
WHERE t.context_id = $1
  AND t.transaction_date >= $2
  AND t.transaction_date <= $3
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT 50;

-- Use CTEs for complex queries
WITH monthly_spending AS (
  SELECT 
    DATE_TRUNC('month', transaction_date) AS month,
    SUM(amount) AS total_amount,
    COUNT(*) AS transaction_count
  FROM financial_transactions
  WHERE context_id = $1
    AND transaction_date >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', transaction_date)
),
spending_trends AS (
  SELECT 
    month,
    total_amount,
    transaction_count,
    LAG(total_amount) OVER (ORDER BY month) AS previous_month_amount,
    total_amount - LAG(total_amount) OVER (ORDER BY month) AS month_change
  FROM monthly_spending
)
SELECT 
  month,
  total_amount,
  transaction_count,
  CASE 
    WHEN previous_month_amount IS NULL THEN 0
    ELSE ROUND((month_change / previous_month_amount) * 100, 2)
  END AS change_percentage
FROM spending_trends
ORDER BY month;

-- Use window functions for analytics
SELECT 
  t.id,
  t.amount,
  t.description,
  t.transaction_date,
  SUM(t.amount) OVER (
    PARTITION BY t.context_id 
    ORDER BY t.transaction_date, t.created_at
    ROWS UNBOUNDED PRECEDING
  ) AS running_total,
  ROW_NUMBER() OVER (
    PARTITION BY t.context_id 
    ORDER BY t.amount DESC
  ) AS amount_rank
FROM financial_transactions t
WHERE t.context_id = $1
ORDER BY t.transaction_date DESC;
```

---

## Documentation Standards

### Code Documentation
```typescript
/**
 * Processes financial transactions with AI-powered categorization.
 * 
 * This service handles the complete lifecycle of transaction processing,
 * including validation, categorization, and storage. It integrates with
 * external AI services for intelligent category assignment.
 * 
 * @example
 * ```typescript
 * const processor = new TransactionProcessor(aiService, repository);
 * const result = await processor.process({
 *   amount: 45.99,
 *   currency: 'BRL',
 *   description: 'Coffee shop payment'
 * });
 * ```
 */
export class TransactionProcessor {
  constructor(
    private readonly aiService: AICategorizationService,
    private readonly repository: TransactionRepository,
    private readonly logger: Logger
  ) {}
  
  /**
   * Processes a single transaction with automatic categorization.
   * 
   * @param data - The transaction data to process
   * @param options - Processing options
   * @param options.skipAI - Whether to skip AI categorization
   * @param options.contextHint - Additional context for AI categorization
   * @returns Promise resolving to the processed transaction
   * 
   * @throws {ValidationError} When transaction data is invalid
   * @throws {AIServiceError} When AI categorization fails
   * @throws {DatabaseError} When transaction storage fails
   * 
   * @example
   * ```typescript
   * const transaction = await processor.process({
   *   amount: 150.00,
   *   currency: 'BRL',
   *   description: 'Grocery shopping'
   * }, {
   *   contextHint: 'weekly_shopping'
   * });
   * ```
   */
  async process(
    data: TransactionData,
    options: ProcessingOptions = {}
  ): Promise<ProcessedTransaction> {
    // Implementation with detailed comments for complex logic
  }
  
  /**
   * Calculates the confidence score for AI categorization.
   * 
   * The confidence score is based on multiple factors:
   * - Pattern matching accuracy
   * - Historical categorization data
   * - Context similarity
   * 
   * @param description - Transaction description
   * @param suggestedCategory - AI-suggested category
   * @param historicalData - User's historical categorization patterns
   * @returns Confidence score between 0 and 1
   * 
   * @internal This method is used internally by the AI service
   */
  private calculateConfidenceScore(
    description: string,
    suggestedCategory: Category,
    historicalData: HistoricalPattern[]
  ): number {
    // Complex algorithm implementation with step-by-step comments
  }
}
```

### API Documentation
```typescript
/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     summary: Create a new financial transaction
 *     description: |
 *       Creates a new transaction with automatic AI categorization.
 *       The transaction will be validated and processed asynchronously.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransactionDto'
 *           examples:
 *             grocery_purchase:
 *               summary: Grocery store purchase
 *               value:
 *                 amount: 127.50
 *                 currency_code: "BRL"
 *                 description: "Grocery shopping at SuperMarket"
 *                 merchant_name: "SuperMarket Chain"
 *                 transaction_date: "2025-10-19"
 *             restaurant_bill:
 *               summary: Restaurant payment
 *               value:
 *                 amount: 89.90
 *                 currency_code: "BRL"
 *                 description: "Dinner at Italian restaurant"
 *                 merchant_name: "La Bella Vita"
 *                 transaction_date: "2025-10-19"
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponseDto'
 *       400:
 *         description: Invalid transaction data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Business logic validation failed
 */
@Post()
@ApiOperation({ summary: 'Create a new financial transaction' })
@ApiResponse({ status: 201, type: TransactionResponseDto })
async createTransaction(
  @Body() dto: CreateTransactionDto,
  @CurrentUser() user: User
): Promise<TransactionResponseDto> {
  // Implementation
}
```

---

## Configuration & Tooling

### Development Tools Configuration

#### 1. VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.rulers": [100],
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "eslint.workingDirectories": ["apps/api", "apps/web"],
  "prettier.configPath": ".prettierrc.json"
}

// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json"
  ]
}
```

#### 2. Package.json Scripts
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "style:check": "npm run lint && npm run format:check && npm run type-check",
    "style:fix": "npm run lint:fix && npm run format",
    "pre-commit": "npm run style:check && npm run test:affected"
  }
}
```

#### 3. Git Hooks Configuration
```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 Running pre-commit checks..."

# Check if there are staged files
if git diff --cached --name-only | grep -qE '\.(ts|tsx|js|jsx)$'; then
  echo "📝 Checking code style..."
  npm run lint:check
  
  echo "🎨 Checking code formatting..."
  npm run format:check
  
  echo "🔧 Type checking..."
  npm run type-check
  
  echo "🧪 Running tests for changed files..."
  npm run test:affected
else
  echo "ℹ️ No TypeScript/JavaScript files staged for commit"
fi

echo "✅ Pre-commit checks completed!"
```

This comprehensive code style guide ensures consistent, maintainable, and high-quality code across the Financy platform while providing automated tooling to enforce these standards.