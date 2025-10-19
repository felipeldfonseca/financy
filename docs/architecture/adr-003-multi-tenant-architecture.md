# ADR-003: Multi-Tenant Architecture

**Status**: Proposed  
**Date**: 2025-10-18  
**Deciders**: Architecture Team, Security Team  
**Technical Story**: Design multi-tenant architecture for financial context isolation  

## Context

Financy requires a multi-tenant architecture that supports:
- Complete data isolation between financial contexts
- Performance at scale with millions of transactions
- Security compliance for financial data
- Flexible collaboration within contexts
- Cost-effective resource utilization

### Key Requirements
- **Data Isolation**: Complete separation between different financial contexts
- **Performance**: No significant overhead from multi-tenancy
- **Security**: Defense against cross-tenant data access
- **Scalability**: Support for 100K+ contexts with varying sizes
- **Compliance**: Meet financial data privacy regulations
- **Operational Simplicity**: Minimize operational complexity

### Multi-Tenancy Models Considered

#### 1. Database per Tenant
- **Implementation**: Separate database for each context
- **Isolation**: Complete physical separation
- **Performance**: Excellent per-tenant performance
- **Cost**: High operational overhead, expensive at scale
- **Complexity**: Complex backup, monitoring, migrations

#### 2. Schema per Tenant  
- **Implementation**: Separate schema within shared database
- **Isolation**: Good logical separation
- **Performance**: Good, with schema-level resource control
- **Cost**: Moderate operational overhead
- **Complexity**: Complex migrations, schema management

#### 3. Row-Level Multi-Tenancy (Chosen)
- **Implementation**: Shared tables with tenant identifier column
- **Isolation**: Application-enforced with database policies
- **Performance**: Excellent with proper indexing
- **Cost**: Most cost-effective, shared resources
- **Complexity**: Moderate, requires careful access control

## Decision

### Primary Architecture: Row-Level Multi-Tenancy with Context-Based Isolation

#### Core Design Principles
1. **Context as Tenant Unit**: Each financial context acts as a tenant boundary
2. **Row-Level Security**: Database-level enforcement of data isolation
3. **Application-Level Guards**: Multiple layers of access control
4. **Audit Everything**: Complete audit trail for cross-context access attempts
5. **Fail Secure**: Default deny for all cross-context operations

#### Implementation Strategy

##### Database Schema Design
```sql
-- Every table includes context_id for tenant isolation
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    context_id UUID NOT NULL,  -- Tenant identifier
    user_id UUID NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    -- ... other fields
    
    -- Indexes optimized for multi-tenant queries
    INDEX idx_transactions_context_date (context_id, transaction_date),
    INDEX idx_transactions_context_user (context_id, user_id)
);

-- Row-Level Security policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY context_isolation ON transactions
    FOR ALL TO application_role
    USING (context_id = ANY(current_context_ids()));
```

##### Application Architecture
```typescript
// Context-aware service base class
abstract class ContextAwareService {
  protected async validateContextAccess(
    userId: string, 
    contextId: string
  ): Promise<boolean> {
    const membership = await this.contextMemberService.getMembership(
      userId, 
      contextId
    );
    return membership?.status === 'active';
  }
  
  protected async getUserContexts(userId: string): Promise<string[]> {
    return this.contextMemberService.getUserContextIds(userId);
  }
}

// Transaction service with multi-tenant enforcement
class TransactionService extends ContextAwareService {
  async createTransaction(
    userId: string, 
    contextId: string, 
    data: CreateTransactionDto
  ): Promise<Transaction> {
    // Validate context access
    await this.validateContextAccess(userId, contextId);
    
    // Enforce context_id in all queries
    return this.transactionRepository.create({
      ...data,
      context_id: contextId,
      user_id: userId
    });
  }
  
  async getTransactions(
    userId: string, 
    contextId: string
  ): Promise<Transaction[]> {
    await this.validateContextAccess(userId, contextId);
    
    return this.transactionRepository.find({
      where: { context_id: contextId },
      // Additional security: double-check user access
      order: { transaction_date: 'DESC' }
    });
  }
}
```

### Context Isolation Implementation

#### Access Control Matrix
```typescript
interface ContextPermissions {
  context_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: Permission[];
  granted_at: Date;
  expires_at?: Date;
}

// Permission checking middleware
class ContextPermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user, params } = request;
    const { contextId } = params;
    
    // Check if user has access to this context
    const hasAccess = await this.contextService.userHasAccess(
      user.id, 
      contextId
    );
    
    if (!hasAccess) {
      // Log security violation
      this.auditService.logSecurityViolation({
        user_id: user.id,
        attempted_context_id: contextId,
        action: 'unauthorized_access_attempt',
        ip_address: request.ip,
        user_agent: request.get('User-Agent')
      });
      
      throw new ForbiddenException('Access denied to context');
    }
    
    return true;
  }
}
```

#### Database Connection Strategy
```typescript
// Context-aware database connection
class ContextAwareRepository<T> {
  constructor(
    private repository: Repository<T>,
    private contextService: ContextService
  ) {}
  
  async find(
    userId: string, 
    contextId: string, 
    options?: FindOptions<T>
  ): Promise<T[]> {
    // Validate context access
    await this.contextService.validateAccess(userId, contextId);
    
    // Inject context filter into all queries
    const contextFilter = { context_id: contextId };
    const whereClause = options?.where 
      ? { ...options.where, ...contextFilter }
      : contextFilter;
    
    return this.repository.find({
      ...options,
      where: whereClause
    });
  }
  
  async create(
    userId: string, 
    contextId: string, 
    data: DeepPartial<T>
  ): Promise<T> {
    await this.contextService.validateAccess(userId, contextId);
    
    // Force context_id to prevent privilege escalation
    const entityData = {
      ...data,
      context_id: contextId
    } as DeepPartial<T>;
    
    return this.repository.save(entityData);
  }
}
```

### Performance Optimization for Multi-Tenancy

#### Indexing Strategy
```sql
-- Composite indexes with context_id as leading column
CREATE INDEX idx_transactions_context_date 
    ON transactions(context_id, transaction_date DESC);

CREATE INDEX idx_transactions_context_category 
    ON transactions(context_id, category_id) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_context_amount 
    ON transactions(context_id, amount DESC) 
    WHERE deleted_at IS NULL;

-- Partial indexes for specific tenant patterns
CREATE INDEX idx_large_contexts 
    ON transactions(context_id, created_at) 
    WHERE context_id IN (
        SELECT context_id FROM context_stats 
        WHERE transaction_count > 10000
    );
```

#### Query Optimization
```typescript
// Optimized query patterns for multi-tenant data
class AnalyticsService {
  async getMonthlySpending(
    userId: string, 
    contextId: string, 
    month: Date
  ): Promise<CategorySpending[]> {
    // Validate access
    await this.contextService.validateAccess(userId, contextId);
    
    // Use materialized view for performance
    return this.db.query(`
      SELECT 
        category_id,
        category_name,
        SUM(amount_in_context_currency) as total_amount,
        COUNT(*) as transaction_count
      FROM monthly_spending_by_context_materialized
      WHERE context_id = $1 
        AND month_bucket = $2
      GROUP BY category_id, category_name
      ORDER BY total_amount DESC
    `, [contextId, month]);
  }
}
```

#### Caching Strategy
```typescript
// Context-aware caching
class ContextAwareCache {
  private redis: Redis;
  
  async get<T>(
    userId: string, 
    contextId: string, 
    key: string
  ): Promise<T | null> {
    await this.contextService.validateAccess(userId, contextId);
    
    const contextKey = `ctx:${contextId}:${key}`;
    const cached = await this.redis.get(contextKey);
    
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(
    userId: string, 
    contextId: string, 
    key: string, 
    value: any, 
    ttlSeconds = 3600
  ): Promise<void> {
    await this.contextService.validateAccess(userId, contextId);
    
    const contextKey = `ctx:${contextId}:${key}`;
    await this.redis.setex(
      contextKey, 
      ttlSeconds, 
      JSON.stringify(value)
    );
  }
  
  async invalidateContext(contextId: string): Promise<void> {
    const pattern = `ctx:${contextId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Security Implementation

#### Row-Level Security (RLS)
```sql
-- Enable RLS on all multi-tenant tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY context_access_policy ON transactions
    FOR ALL TO application_role
    USING (
        context_id IN (
            SELECT cm.context_id 
            FROM context_members cm 
            WHERE cm.user_id = current_setting('app.current_user_id')::UUID
              AND cm.left_at IS NULL
        )
    );

-- Function to set current user context
CREATE OR REPLACE FUNCTION set_current_user_context(user_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_uuid::text, true);
END;
$$ LANGUAGE plpgsql;
```

#### Application-Level Security
```typescript
// Security interceptor for all multi-tenant operations
@Injectable()
class TenantSecurityInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext, 
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { user, params, body } = request;
    
    // Extract context IDs from request
    const contextIds = this.extractContextIds(params, body);
    
    // Validate all context accesses
    for (const contextId of contextIds) {
      const hasAccess = await this.contextService.userHasAccess(
        user.id, 
        contextId
      );
      
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to context ${contextId}`
        );
      }
    }
    
    // Set database context for RLS
    await this.dbService.setUserContext(user.id);
    
    return next.handle();
  }
  
  private extractContextIds(params: any, body: any): string[] {
    const contextIds: string[] = [];
    
    // Extract from URL parameters
    if (params.contextId) {
      contextIds.push(params.contextId);
    }
    
    // Extract from request body
    if (body.context_id) {
      contextIds.push(body.context_id);
    }
    
    return contextIds;
  }
}
```

### Cross-Context Operations

#### Controlled Data Sharing
```typescript
// Service for controlled cross-context operations
class CrossContextService {
  async shareTransactionToContext(
    userId: string,
    sourceContextId: string,
    targetContextId: string,
    transactionId: string
  ): Promise<Transaction> {
    // Validate access to both contexts
    await this.contextService.validateAccess(userId, sourceContextId);
    await this.contextService.validateAccess(userId, targetContextId);
    
    // Check if user has sharing permissions
    const sourcePermissions = await this.contextService.getUserPermissions(
      userId, 
      sourceContextId
    );
    
    if (!sourcePermissions.includes('share_transactions')) {
      throw new ForbiddenException('No permission to share transactions');
    }
    
    // Get original transaction
    const originalTransaction = await this.transactionService.getTransaction(
      userId, 
      sourceContextId, 
      transactionId
    );
    
    // Create copy in target context
    const sharedTransaction = await this.transactionService.createTransaction(
      userId,
      targetContextId,
      {
        ...originalTransaction,
        description: `[Shared] ${originalTransaction.description}`,
        metadata: {
          ...originalTransaction.metadata,
          shared_from_context: sourceContextId,
          shared_at: new Date(),
          original_transaction_id: transactionId
        }
      }
    );
    
    // Log cross-context operation
    await this.auditService.logCrossContextOperation({
      user_id: userId,
      source_context_id: sourceContextId,
      target_context_id: targetContextId,
      operation: 'transaction_share',
      resource_id: transactionId,
      timestamp: new Date()
    });
    
    return sharedTransaction;
  }
}
```

#### User Context Management
```typescript
// Service to manage user's context memberships
class UserContextService {
  async getUserContexts(userId: string): Promise<ContextMembership[]> {
    return this.contextMemberRepository.find({
      where: { 
        user_id: userId, 
        left_at: IsNull() 
      },
      relations: ['context']
    });
  }
  
  async switchActiveContext(
    userId: string, 
    contextId: string
  ): Promise<void> {
    // Validate access
    const hasAccess = await this.contextService.userHasAccess(
      userId, 
      contextId
    );
    
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to context');
    }
    
    // Update user's active context
    await this.userService.updateActiveContext(userId, contextId);
    
    // Invalidate user's cached permissions
    await this.cacheService.invalidateUserPermissions(userId);
  }
  
  async getContextSwitchHistory(
    userId: string
  ): Promise<ContextSwitchEvent[]> {
    return this.auditService.getContextSwitchHistory(userId);
  }
}
```

## Alternative Approaches Considered

### Database per Tenant
**Pros**:
- Complete physical isolation
- Independent scaling per tenant
- Simple backup and recovery per tenant
- No cross-tenant data leakage risk

**Cons**:
- High operational overhead (100K+ databases)
- Complex schema migrations
- Expensive resource utilization
- Difficult cross-tenant analytics

**Decision**: Rejected due to operational complexity at scale

### Schema per Tenant
**Pros**:
- Good logical isolation
- Shared infrastructure
- Independent schema evolution per tenant
- Better resource utilization than database-per-tenant

**Cons**:
- Complex migration coordination
- Schema management overhead
- PostgreSQL schema limits (performance degrades with many schemas)
- Still difficult cross-tenant operations

**Decision**: Rejected due to PostgreSQL performance limitations with many schemas

### Hybrid Approach (Large Tenants)
**Consideration**: Separate databases for contexts with >100K transactions
**Pros**: Optimized for different tenant sizes
**Cons**: Additional complexity, inconsistent architecture
**Decision**: Keep for future consideration if scale requires it

## Implementation Plan

### Phase 1: Core Multi-Tenancy (Weeks 1-2)
- Implement context-aware repository pattern
- Add context_id to all relevant tables
- Create basic access control middleware
- Set up audit logging infrastructure

### Phase 2: Security Hardening (Weeks 3-4)
- Implement Row-Level Security policies
- Add comprehensive access validation
- Create security violation monitoring
- Set up automated security testing

### Phase 3: Performance Optimization (Weeks 5-6)
- Optimize database indexes for multi-tenant queries
- Implement context-aware caching
- Create materialized views for analytics
- Performance testing and tuning

### Phase 4: Advanced Features (Weeks 7-8)
- Implement controlled cross-context operations
- Add context switching functionality
- Create tenant analytics and monitoring
- Advanced audit and compliance features

## Monitoring and Observability

### Security Monitoring
```typescript
// Security metrics and alerting
class TenantSecurityMonitor {
  async trackContextAccess(
    userId: string, 
    contextId: string, 
    action: string
  ): Promise<void> {
    await this.metricsService.increment('context_access', {
      user_id: userId,
      context_id: contextId,
      action
    });
    
    // Check for suspicious patterns
    const recentAccesses = await this.getRecentContextAccesses(
      userId, 
      '1 hour'
    );
    
    if (recentAccesses.length > 100) {
      await this.alertService.sendSecurityAlert({
        type: 'excessive_context_access',
        user_id: userId,
        access_count: recentAccesses.length,
        time_window: '1 hour'
      });
    }
  }
  
  async detectAnomalousAccess(
    userId: string, 
    contextId: string
  ): Promise<boolean> {
    // Check if user typically accesses this context
    const historicalAccess = await this.getHistoricalContextAccess(
      userId, 
      contextId
    );
    
    // Check time-of-day patterns
    const currentHour = new Date().getHours();
    const typicalHours = historicalAccess.common_access_hours;
    
    return !typicalHours.includes(currentHour);
  }
}
```

### Performance Monitoring
```typescript
// Multi-tenant performance tracking
class TenantPerformanceMonitor {
  async trackQueryPerformance(
    contextId: string, 
    operation: string, 
    duration: number
  ): Promise<void> {
    await this.metricsService.timing('tenant_query_duration', duration, {
      context_id: contextId,
      operation
    });
    
    // Alert on slow queries for specific tenants
    if (duration > 5000) { // 5 seconds
      await this.alertService.sendPerformanceAlert({
        type: 'slow_tenant_query',
        context_id: contextId,
        operation,
        duration
      });
    }
  }
  
  async getContextMetrics(contextId: string): Promise<ContextMetrics> {
    return {
      transaction_count: await this.getTransactionCount(contextId),
      storage_size: await this.getStorageSize(contextId),
      query_performance: await this.getAverageQueryTime(contextId),
      active_users: await this.getActiveUserCount(contextId),
      last_activity: await this.getLastActivity(contextId)
    };
  }
}
```

## Consequences

### Positive Consequences
1. **Cost Efficiency**: Shared infrastructure reduces operational costs
2. **Performance**: Excellent query performance with proper indexing
3. **Scalability**: Can support millions of contexts on shared infrastructure
4. **Operational Simplicity**: Single database to maintain and backup
5. **Feature Development**: Easy to add cross-context features when needed

### Negative Consequences
1. **Security Complexity**: Requires careful implementation to prevent data leakage
2. **Query Complexity**: All queries must include tenant filters
3. **Testing Complexity**: Must test multi-tenant isolation thoroughly
4. **Performance Risk**: Large tenants could impact small tenants
5. **Compliance Risk**: Shared infrastructure may complicate some regulations

### Risk Mitigation
1. **Comprehensive Testing**: Automated tests for tenant isolation
2. **Security Auditing**: Regular security audits and penetration testing
3. **Performance Monitoring**: Real-time monitoring of per-tenant performance
4. **Circuit Breakers**: Prevent large tenants from impacting others
5. **Compliance Documentation**: Detailed documentation for regulatory review

## Success Metrics

### Security Metrics
- Zero cross-tenant data access incidents
- <1% false positive rate for access control
- 100% audit coverage for sensitive operations
- <100ms average access control check time

### Performance Metrics
- <500ms average query response time per tenant
- >99.9% availability per tenant
- <5% performance degradation due to multi-tenancy
- Linear scaling with tenant count

### Operational Metrics
- <1 hour mean time to resolution for tenant issues
- 100% successful tenant data migrations
- <0.1% tenant data corruption incidents
- 24/7 tenant isolation monitoring

## Review and Evolution

### Quarterly Reviews
- Security audit results
- Performance benchmark analysis
- Tenant satisfaction metrics
- Technology evolution assessment

### Evolution Triggers
- >100K transactions per context (consider database-per-tenant)
- >10-second query times (optimization required)
- Regulatory compliance changes
- Security incident requiring architecture changes

This multi-tenant architecture provides secure, scalable, and cost-effective context isolation while maintaining operational simplicity and development velocity.