# Test Automation Framework
## Financy Automated Testing Infrastructure & CI/CD Integration

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Scope**: Complete test automation pipeline, tools, and continuous integration  

---

## Overview

Financy's test automation framework provides comprehensive automated testing capabilities integrated into the CI/CD pipeline. The framework ensures rapid feedback, consistent quality, and reliable deployments through intelligent test orchestration and parallel execution.

### Automation Objectives
1. **Fast Feedback**: Sub-10 minute CI pipeline for critical path tests
2. **Comprehensive Coverage**: Automated tests for all application layers
3. **Intelligent Execution**: Smart test selection and parallel execution
4. **Quality Gates**: Automated quality checks preventing defect progression
5. **Self-Healing**: Automatic test maintenance and stability improvements

---

## Test Automation Architecture

### Automation Stack Overview
```mermaid
graph TB
    A[Developer Commit] --> B[Pre-commit Hooks]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[API Tests]
    E --> F[UI Tests]
    F --> G[E2E Tests]
    
    H[Test Orchestrator] --> I[Parallel Execution]
    I --> J[Test Results Aggregation]
    J --> K[Quality Gates]
    K --> L[Deployment Pipeline]
    
    M[Test Data Management] --> N[Test Environment Provisioning]
    N --> O[Service Mocking]
    O --> P[Performance Monitoring]
```

### Framework Components
```typescript
interface TestAutomationFramework {
  test_orchestrator: TestOrchestrator;
  execution_engines: ExecutionEngine[];
  test_data_management: TestDataManagement;
  reporting_system: TestReportingSystem;
  quality_gates: QualityGate[];
  infrastructure: TestInfrastructure;
}

interface TestOrchestrator {
  execution_strategy: ExecutionStrategy;
  parallelization: ParallelizationConfig;
  test_selection: TestSelectionStrategy;
  retry_mechanism: RetryConfiguration;
  reporting: ReportingConfiguration;
}

const TEST_AUTOMATION_CONFIG: TestAutomationFramework = {
  test_orchestrator: {
    execution_strategy: 'intelligent_selection',
    parallelization: {
      max_workers: 8,
      test_level_parallelism: true,
      resource_based_allocation: true
    },
    test_selection: {
      strategy: 'impact_based',
      change_detection: 'git_diff_analysis',
      dependency_mapping: true,
      test_prioritization: 'risk_weighted'
    },
    retry_mechanism: {
      max_retries: 3,
      retry_conditions: ['flaky_test', 'infrastructure_error'],
      exponential_backoff: true
    },
    reporting: {
      real_time_updates: true,
      aggregated_results: true,
      trend_analysis: true,
      failure_categorization: true
    }
  },
  execution_engines: [
    {
      engine_type: 'jest',
      test_types: ['unit', 'integration'],
      configuration: {
        parallel: true,
        coverage: true,
        workers: '50%'
      }
    },
    {
      engine_type: 'playwright',
      test_types: ['ui', 'e2e'],
      configuration: {
        browsers: ['chromium', 'firefox', 'webkit'],
        parallel: true,
        retries: 2
      }
    },
    {
      engine_type: 'newman',
      test_types: ['api'],
      configuration: {
        parallel: true,
        environment_variables: true,
        data_files: true
      }
    }
  ],
  test_data_management: {
    strategy: 'data_factory_pattern',
    test_databases: 'containerized',
    data_seeding: 'automated',
    cleanup_strategy: 'after_each_test'
  },
  reporting_system: {
    formats: ['junit', 'html', 'json', 'allure'],
    real_time_dashboard: true,
    slack_notifications: true,
    email_reports: true
  },
  quality_gates: [
    {
      gate_type: 'code_coverage',
      threshold: 80,
      failure_action: 'block_merge'
    },
    {
      gate_type: 'test_pass_rate',
      threshold: 95,
      failure_action: 'block_deployment'
    },
    {
      gate_type: 'performance_regression',
      threshold: 10, // 10% regression
      failure_action: 'notify_team'
    }
  ],
  infrastructure: {
    containerization: 'docker',
    orchestration: 'kubernetes',
    cloud_provider: 'aws',
    monitoring: 'datadog'
  }
};
```

---

## CI/CD Pipeline Integration

### Pipeline Configuration
```yaml
# .github/workflows/ci.yml
name: Financy CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  POSTGRES_VERSION: '15'
  REDIS_VERSION: '7'

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      affected-projects: ${{ steps.affected.outputs.projects }}
      test-matrix: ${{ steps.test-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Detect affected projects
        id: affected
        run: |
          AFFECTED=$(npm run affected:projects --silent)
          echo "projects=$AFFECTED" >> $GITHUB_OUTPUT
      
      - name: Generate test matrix
        id: test-matrix
        run: |
          MATRIX=$(node scripts/generate-test-matrix.js)
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

  lint-and-format:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint:check
      
      - name: Check Prettier formatting
        run: npm run format:check
      
      - name: TypeScript type checking
        run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    needs: setup
    strategy:
      matrix:
        project: ${{ fromJson(needs.setup.outputs.affected-projects) }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --project=${{ matrix.project }}
        env:
          CI: true
          JEST_JUNIT_OUTPUT_DIR: test-results/unit
          JEST_JUNIT_OUTPUT_NAME: ${{ matrix.project }}-results.xml
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-test-results-${{ matrix.project }}
          path: test-results/unit/
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: coverage/${{ matrix.project }}/lcov.info
          flags: unit,${{ matrix.project }}

  integration-tests:
    runs-on: ubuntu-latest
    needs: [setup, unit-tests]
    services:
      postgres:
        image: postgres:${{ env.POSTGRES_VERSION }}
        env:
          POSTGRES_DB: financy_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:${{ env.REDIS_VERSION }}
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: npm run db:setup:test
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/financy_test
          REDIS_URL: redis://localhost:6379
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/financy_test
          REDIS_URL: redis://localhost:6379
          JEST_JUNIT_OUTPUT_DIR: test-results/integration
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: integration-test-results
          path: test-results/integration/

  api-tests:
    runs-on: ubuntu-latest
    needs: [setup, integration-tests]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start application
        run: |
          npm run build
          npm run start:test &
          sleep 30
        env:
          NODE_ENV: test
          PORT: 3001
      
      - name: Wait for application
        run: npx wait-on http://localhost:3001/health
      
      - name: Run API tests
        run: npm run test:api
        env:
          API_BASE_URL: http://localhost:3001
          TEST_USER_EMAIL: test@financy.com
          TEST_USER_PASSWORD: test_password
      
      - name: Upload API test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-test-results
          path: test-results/api/

  ui-tests:
    runs-on: ubuntu-latest
    needs: [setup, api-tests]
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install ${{ matrix.browser }}
      
      - name: Start application
        run: |
          npm run build
          npm run start:test &
          sleep 30
        env:
          NODE_ENV: test
          PORT: 3001
      
      - name: Run UI tests
        run: npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: http://localhost:3001
          CI: true
      
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [setup, ui-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to staging
        run: npm run deploy:staging
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: https://staging.financy.com
          E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
      
      - name: Upload E2E test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-test-results
          path: test-results/e2e/

  quality-gates:
    runs-on: ubuntu-latest
    needs: [lint-and-format, unit-tests, integration-tests, api-tests, ui-tests]
    if: always()
    steps:
      - uses: actions/checkout@v4
      
      - name: Download all test results
        uses: actions/download-artifact@v4
        with:
          path: test-results/
      
      - name: Aggregate test results
        run: node scripts/aggregate-test-results.js
      
      - name: Check quality gates
        run: node scripts/check-quality-gates.js
        env:
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      
      - name: Generate test report
        run: node scripts/generate-test-report.js
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('test-report.md', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

  deploy:
    runs-on: ubuntu-latest
    needs: [quality-gates, e2e-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: npm run deploy:production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          SMOKE_TEST_URL: https://app.financy.com
      
      - name: Notify deployment
        run: node scripts/notify-deployment.js
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Intelligent Test Selection
```typescript
interface TestSelectionEngine {
  change_analyzer: ChangeAnalyzer;
  dependency_mapper: DependencyMapper;
  test_prioritizer: TestPrioritizer;
  execution_optimizer: ExecutionOptimizer;
}

class IntelligentTestSelector {
  constructor(
    private changeAnalyzer: ChangeAnalyzer,
    private dependencyMapper: DependencyMapper,
    private testPrioritizer: TestPrioritizer
  ) {}
  
  async selectTestsForExecution(
    changes: CodeChange[],
    testSuite: TestSuite,
    constraints: ExecutionConstraints
  ): Promise<TestExecutionPlan> {
    
    // Analyze code changes
    const impactAnalysis = await this.changeAnalyzer.analyzeImpact(changes);
    
    // Map dependencies
    const dependencyGraph = await this.dependencyMapper.buildGraph(
      impactAnalysis.affectedModules
    );
    
    // Select affected tests
    const affectedTests = await this.findAffectedTests(
      dependencyGraph,
      testSuite
    );
    
    // Prioritize tests
    const prioritizedTests = await this.testPrioritizer.prioritize(
      affectedTests,
      {
        risk_scores: impactAnalysis.riskScores,
        historical_failures: await this.getHistoricalFailures(),
        execution_time: await this.getExecutionTimes(),
        business_criticality: await this.getBusinessCriticality()
      }
    );
    
    // Create execution plan
    return this.createExecutionPlan(prioritizedTests, constraints);
  }
  
  private async findAffectedTests(
    dependencyGraph: DependencyGraph,
    testSuite: TestSuite
  ): Promise<AffectedTest[]> {
    
    const affectedTests: AffectedTest[] = [];
    
    for (const testFile of testSuite.testFiles) {
      const testDependencies = await this.dependencyMapper.getTestDependencies(testFile);
      
      const isAffected = testDependencies.some(dependency =>
        dependencyGraph.isModuleAffected(dependency)
      );
      
      if (isAffected) {
        const impactLevel = this.calculateImpactLevel(testDependencies, dependencyGraph);
        
        affectedTests.push({
          testFile,
          impactLevel,
          dependencies: testDependencies,
          estimatedExecutionTime: await this.getEstimatedExecutionTime(testFile)
        });
      }
    }
    
    return affectedTests;
  }
  
  private createExecutionPlan(
    prioritizedTests: PrioritizedTest[],
    constraints: ExecutionConstraints
  ): TestExecutionPlan {
    
    const plan: TestExecutionPlan = {
      phases: [],
      totalEstimatedTime: 0,
      parallelization: {
        maxWorkers: constraints.maxWorkers,
        phases: []
      }
    };
    
    // Phase 1: Critical path tests (must pass for early feedback)
    const criticalTests = prioritizedTests.filter(t => t.priority === 'critical');
    if (criticalTests.length > 0) {
      plan.phases.push({
        phase: 'critical_path',
        tests: criticalTests,
        parallelization: Math.min(criticalTests.length, constraints.maxWorkers),
        timeout: constraints.criticalPathTimeout
      });
    }
    
    // Phase 2: High priority tests
    const highPriorityTests = prioritizedTests.filter(t => t.priority === 'high');
    if (highPriorityTests.length > 0) {
      plan.phases.push({
        phase: 'high_priority',
        tests: highPriorityTests,
        parallelization: Math.min(highPriorityTests.length, constraints.maxWorkers),
        timeout: constraints.standardTimeout
      });
    }
    
    // Phase 3: Remaining tests
    const remainingTests = prioritizedTests.filter(t => 
      t.priority !== 'critical' && t.priority !== 'high'
    );
    if (remainingTests.length > 0) {
      plan.phases.push({
        phase: 'comprehensive',
        tests: remainingTests,
        parallelization: Math.min(remainingTests.length, constraints.maxWorkers),
        timeout: constraints.extendedTimeout
      });
    }
    
    plan.totalEstimatedTime = plan.phases.reduce(
      (total, phase) => total + this.calculatePhaseTime(phase),
      0
    );
    
    return plan;
  }
}
```

---

## Test Data Management

### Data Factory Pattern
```typescript
interface TestDataFactory {
  createUser(overrides?: Partial<CreateUserDto>): Promise<User>;
  createContext(userId: string, overrides?: Partial<CreateContextDto>): Promise<Context>;
  createTransaction(contextId: string, overrides?: Partial<CreateTransactionDto>): Promise<Transaction>;
  createBulkTransactions(contextId: string, count: number): Promise<Transaction[]>;
  cleanupTestData(): Promise<void>;
}

class FinancyTestDataFactory implements TestDataFactory {
  constructor(
    private userRepository: UserRepository,
    private contextRepository: ContextRepository,
    private transactionRepository: TransactionRepository,
    private faker: Faker
  ) {}
  
  async createUser(overrides: Partial<CreateUserDto> = {}): Promise<User> {
    const userData: CreateUserDto = {
      email: this.faker.internet.email(),
      full_name: this.faker.person.fullName(),
      password: 'Test123!@#',
      preferred_language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      default_currency: 'BRL',
      ...overrides
    };
    
    const user = await this.userRepository.create(userData);
    
    // Track for cleanup
    this.trackForCleanup('user', user.id);
    
    return user;
  }
  
  async createContext(
    userId: string,
    overrides: Partial<CreateContextDto> = {}
  ): Promise<Context> {
    const contextData: CreateContextDto = {
      name: this.faker.company.name(),
      type: this.faker.helpers.arrayElement(['personal', 'family', 'project']),
      currency_code: 'BRL',
      owner_id: userId,
      settings: {
        auto_categorization_enabled: true,
        default_split_method: 'equal',
        require_approval_for_expenses: false
      },
      ...overrides
    };
    
    const context = await this.contextRepository.create(contextData);
    
    // Track for cleanup
    this.trackForCleanup('context', context.id);
    
    return context;
  }
  
  async createTransaction(
    contextId: string,
    overrides: Partial<CreateTransactionDto> = {}
  ): Promise<Transaction> {
    const transactionData: CreateTransactionDto = {
      amount: parseFloat(this.faker.finance.amount(10, 1000, 2)),
      currency_code: 'BRL',
      description: this.faker.commerce.productName(),
      merchant_name: this.faker.company.name(),
      category_id: this.faker.helpers.arrayElement([
        'cat_food_001',
        'cat_transport_001',
        'cat_entertainment_001',
        'cat_shopping_001'
      ]),
      transaction_date: this.faker.date.recent({ days: 30 }),
      transaction_time: this.faker.date.recent({ days: 1 }).toTimeString().split(' ')[0],
      input_method: 'manual',
      status: 'confirmed',
      ...overrides
    };
    
    const transaction = await this.transactionRepository.create({
      ...transactionData,
      context_id: contextId,
      user_id: await this.getContextOwnerId(contextId)
    });
    
    // Track for cleanup
    this.trackForCleanup('transaction', transaction.id);
    
    return transaction;
  }
  
  async createBulkTransactions(
    contextId: string,
    count: number
  ): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    
    // Create transactions in batches for better performance
    const batchSize = 50;
    const batches = Math.ceil(count / batchSize);
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;
      
      const batchPromises = Array.from({ length: batchCount }, (_, index) => {
        const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - daysAgo);
        
        return this.createTransaction(contextId, {
          transaction_date: baseDate,
          amount: this.generateRealisticAmount(index % 10) // Different amount patterns
        });
      });
      
      const batchTransactions = await Promise.all(batchPromises);
      transactions.push(...batchTransactions);
    }
    
    return transactions;
  }
  
  async createFinancialScenario(
    scenarioName: string,
    config: ScenarioConfig
  ): Promise<FinancialScenario> {
    switch (scenarioName) {
      case 'family_budget_scenario':
        return this.createFamilyBudgetScenario(config);
      case 'business_expense_scenario':
        return this.createBusinessExpenseScenario(config);
      case 'travel_context_scenario':
        return this.createTravelContextScenario(config);
      default:
        throw new Error(`Unknown scenario: ${scenarioName}`);
    }
  }
  
  private async createFamilyBudgetScenario(
    config: ScenarioConfig
  ): Promise<FinancialScenario> {
    // Create family members
    const father = await this.createUser({
      full_name: 'João Silva',
      email: 'joao@example.com'
    });
    
    const mother = await this.createUser({
      full_name: 'Maria Silva',
      email: 'maria@example.com'
    });
    
    // Create family context
    const familyContext = await this.createContext(father.id, {
      name: 'Família Silva',
      type: 'family'
    });
    
    // Add mother as context member
    await this.addContextMember(familyContext.id, mother.id, 'editor');
    
    // Create monthly transactions
    const transactions = await this.createMonthlyTransactions(familyContext.id, {
      income: [
        { amount: 5000, description: 'Salário João', category: 'salary' },
        { amount: 3500, description: 'Salário Maria', category: 'salary' }
      ],
      expenses: [
        { amount: 1200, description: 'Aluguel', category: 'housing', recurring: true },
        { amount: 800, description: 'Supermercado', category: 'groceries', frequency: 'weekly' },
        { amount: 300, description: 'Gasolina', category: 'transport', frequency: 'bi-weekly' }
      ]
    });
    
    return {
      scenario_name: 'family_budget_scenario',
      users: [father, mother],
      contexts: [familyContext],
      transactions,
      expected_outcomes: {
        monthly_balance: 2200,
        top_category: 'housing',
        transaction_count: transactions.length
      }
    };
  }
  
  private generateRealisticAmount(pattern: number): number {
    // Generate amounts based on realistic spending patterns
    const patterns = [
      () => this.faker.number.float({ min: 5, max: 50, precision: 0.01 }), // Coffee, snacks
      () => this.faker.number.float({ min: 20, max: 100, precision: 0.01 }), // Meals
      () => this.faker.number.float({ min: 50, max: 300, precision: 0.01 }), // Groceries
      () => this.faker.number.float({ min: 100, max: 500, precision: 0.01 }), // Utilities
      () => this.faker.number.float({ min: 200, max: 1000, precision: 0.01 }), // Major purchases
      () => this.faker.number.float({ min: 500, max: 2000, precision: 0.01 }), // Rent, large bills
      () => this.faker.number.float({ min: 10, max: 80, precision: 0.01 }), // Transportation
      () => this.faker.number.float({ min: 30, max: 200, precision: 0.01 }), // Entertainment
      () => this.faker.number.float({ min: 15, max: 150, precision: 0.01 }), // Health/pharmacy
      () => this.faker.number.float({ min: 25, max: 300, precision: 0.01 }) // Clothing
    ];
    
    return patterns[pattern]();
  }
  
  private cleanupRegistry: Map<string, string[]> = new Map();
  
  private trackForCleanup(entityType: string, entityId: string): void {
    if (!this.cleanupRegistry.has(entityType)) {
      this.cleanupRegistry.set(entityType, []);
    }
    this.cleanupRegistry.get(entityType)!.push(entityId);
  }
  
  async cleanupTestData(): Promise<void> {
    // Clean up in reverse dependency order
    const cleanupOrder = ['transaction', 'context', 'user'];
    
    for (const entityType of cleanupOrder) {
      const entityIds = this.cleanupRegistry.get(entityType) || [];
      
      if (entityIds.length > 0) {
        await this.cleanupEntities(entityType, entityIds);
        this.cleanupRegistry.set(entityType, []);
      }
    }
  }
  
  private async cleanupEntities(entityType: string, entityIds: string[]): Promise<void> {
    switch (entityType) {
      case 'transaction':
        await this.transactionRepository.deleteMany(entityIds);
        break;
      case 'context':
        await this.contextRepository.deleteMany(entityIds);
        break;
      case 'user':
        await this.userRepository.deleteMany(entityIds);
        break;
    }
  }
}
```

### Test Environment Management
```typescript
interface TestEnvironment {
  environment_id: string;
  environment_type: EnvironmentType;
  provisioning: ProvisioningConfig;
  services: ServiceConfig[];
  data_seeding: DataSeedingConfig;
  monitoring: MonitoringConfig;
}

type EnvironmentType = 'unit' | 'integration' | 'e2e' | 'performance' | 'staging';

class TestEnvironmentManager {
  private environments: Map<string, TestEnvironment> = new Map();
  private containers: Map<string, Container> = new Map();
  
  async provisionEnvironment(
    environmentType: EnvironmentType,
    config?: Partial<TestEnvironment>
  ): Promise<string> {
    
    const environmentId = `${environmentType}_${Date.now()}`;
    
    const environment: TestEnvironment = {
      environment_id: environmentId,
      environment_type: environmentType,
      provisioning: this.getProvisioningConfig(environmentType),
      services: this.getRequiredServices(environmentType),
      data_seeding: this.getDataSeedingConfig(environmentType),
      monitoring: this.getMonitoringConfig(environmentType),
      ...config
    };
    
    // Start required services
    await this.startServices(environment);
    
    // Seed test data
    await this.seedTestData(environment);
    
    // Wait for environment readiness
    await this.waitForReadiness(environment);
    
    this.environments.set(environmentId, environment);
    
    return environmentId;
  }
  
  private async startServices(environment: TestEnvironment): Promise<void> {
    const servicePromises = environment.services.map(async (serviceConfig) => {
      const container = await this.startContainer(serviceConfig);
      this.containers.set(`${environment.environment_id}_${serviceConfig.name}`, container);
      return container;
    });
    
    await Promise.all(servicePromises);
  }
  
  private async startContainer(serviceConfig: ServiceConfig): Promise<Container> {
    const containerOptions = {
      image: serviceConfig.image,
      environment: serviceConfig.environment,
      ports: serviceConfig.ports,
      healthcheck: serviceConfig.healthcheck,
      tmpfs: serviceConfig.tmpfs // For faster test databases
    };
    
    const container = await this.docker.createContainer(containerOptions);
    await container.start();
    
    // Wait for service health check
    await this.waitForServiceHealth(container, serviceConfig.healthcheck);
    
    return container;
  }
  
  async destroyEnvironment(environmentId: string): Promise<void> {
    const environment = this.environments.get(environmentId);
    if (!environment) return;
    
    // Stop and remove containers
    const containerKeys = Array.from(this.containers.keys())
      .filter(key => key.startsWith(environmentId));
    
    const stopPromises = containerKeys.map(async (key) => {
      const container = this.containers.get(key)!;
      await container.stop();
      await container.remove();
      this.containers.delete(key);
    });
    
    await Promise.all(stopPromises);
    
    this.environments.delete(environmentId);
  }
  
  async getEnvironmentUrls(environmentId: string): Promise<EnvironmentUrls> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }
    
    const urls: EnvironmentUrls = {};
    
    for (const service of environment.services) {
      const containerKey = `${environmentId}_${service.name}`;
      const container = this.containers.get(containerKey);
      
      if (container) {
        const containerInfo = await container.inspect();
        const ports = containerInfo.NetworkSettings.Ports;
        
        urls[service.name] = this.buildServiceUrl(service, ports);
      }
    }
    
    return urls;
  }
}
```

This comprehensive test automation framework provides Financy with robust, scalable, and intelligent testing capabilities integrated throughout the development lifecycle, ensuring high-quality software delivery.