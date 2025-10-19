# ADR-002: Database Schema Design

**Status**: Proposed  
**Date**: 2025-10-18  
**Deciders**: Architecture Team, Data Team  
**Technical Story**: Design database schema for multi-tenant financial data management  

## Context

Financy requires a database schema that supports:
- Multi-tenant architecture with complete data isolation
- Complex financial relationships (transactions, subscriptions, installments)
- High-performance analytics and reporting
- Audit trails for financial data compliance
- Flexible categorization and tagging systems
- Multi-currency and internationalization support

### Key Requirements
- **Data Isolation**: Complete separation between user contexts
- **Performance**: Sub-second queries for dashboard analytics
- **Scalability**: Support for millions of transactions
- **Auditability**: Complete change tracking for financial data
- **Flexibility**: Extensible schema for future features
- **Consistency**: ACID compliance for financial operations

## Decision

### Primary Database: PostgreSQL with TimescaleDB Extension

#### Schema Design Philosophy
1. **Multi-Tenant by Row**: Every table includes `context_id` for data isolation
2. **Event Sourcing**: Immutable transaction records with state changes tracked
3. **Temporal Design**: Full audit trail with effective dating
4. **Normalized Structure**: Third normal form with strategic denormalization
5. **JSON Flexibility**: JSON columns for extensible metadata

### Core Schema Structure

#### Identity and Access Management
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    telegram_user_id BIGINT UNIQUE,
    whatsapp_user_id VARCHAR(100),
    full_name VARCHAR(255),
    preferred_language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

CREATE INDEX idx_users_telegram ON users(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE INDEX idx_users_whatsapp ON users(whatsapp_user_id) WHERE whatsapp_user_id IS NOT NULL;
```

#### Context Management
```sql
-- Contexts (financial spaces)
CREATE TABLE contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('personal', 'family', 'project', 'travel')),
    owner_id UUID NOT NULL REFERENCES users(id),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BRL',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    
    -- Business rules
    CONSTRAINT valid_currency CHECK (currency_code ~ '^[A-Z]{3}$')
);

-- Context membership and permissions
CREATE TABLE context_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- Business rules
    UNIQUE(context_id, user_id),
    CHECK ((left_at IS NULL) OR (left_at > joined_at))
);

CREATE INDEX idx_context_members_context ON context_members(context_id) WHERE left_at IS NULL;
CREATE INDEX idx_context_members_user ON context_members(user_id) WHERE left_at IS NULL;
```

#### Financial Data Core
```sql
-- Transaction categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules
    UNIQUE(context_id, name),
    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Transactions (core financial data)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Financial data
    amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    amount_in_context_currency DECIMAL(15,2) NOT NULL,
    exchange_rate DECIMAL(10,6),
    
    -- Transaction details
    description TEXT NOT NULL,
    merchant_name VARCHAR(255),
    category_id UUID REFERENCES categories(id),
    transaction_date DATE NOT NULL,
    
    -- Processing metadata
    input_method VARCHAR(20) NOT NULL CHECK (input_method IN ('text', 'voice', 'image', 'manual')),
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    processing_metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Business rules
    CHECK (amount != 0),
    CHECK (currency_code ~ '^[A-Z]{3}$'),
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- High-performance indexes for common queries
CREATE INDEX idx_transactions_context_date ON transactions(context_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_category ON transactions(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_amount ON transactions(context_id, amount DESC) WHERE deleted_at IS NULL;
```

#### Subscription and Recurring Payments
```sql
-- Contracts (subscriptions and installments)
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'installment')),
    
    -- Contract details
    vendor_name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    
    -- Subscription-specific fields
    billing_cycle VARCHAR(20), -- 'monthly', 'yearly', 'weekly'
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    
    -- Installment-specific fields
    total_installments INTEGER,
    remaining_installments INTEGER,
    installment_number INTEGER,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
    detection_confidence DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules
    CHECK (amount > 0),
    CHECK (currency_code ~ '^[A-Z]{3}$'),
    CHECK ((type = 'subscription' AND billing_cycle IS NOT NULL) OR (type = 'installment' AND total_installments IS NOT NULL))
);

-- Link transactions to contracts
CREATE TABLE contract_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    
    UNIQUE(contract_id, transaction_id)
);
```

#### Shared Expense Management
```sql
-- Transaction splits for shared expenses
CREATE TABLE transaction_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    split_method VARCHAR(20) NOT NULL CHECK (split_method IN ('equal', 'amount', 'percentage')),
    percentage DECIMAL(5,2), -- For percentage splits
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules
    CHECK (amount >= 0),
    CHECK (currency_code ~ '^[A-Z]{3}$'),
    CHECK ((split_method = 'percentage' AND percentage IS NOT NULL) OR (split_method != 'percentage'))
);

-- Settlement records for shared expense reconciliation
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed')),
    settlement_date DATE,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (amount > 0),
    CHECK (from_user_id != to_user_id)
);
```

#### Audit and Processing Tracking
```sql
-- Comprehensive audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    context_id UUID, -- For context-scoped operations
    user_id UUID REFERENCES users(id),
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message processing jobs
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    context_id UUID REFERENCES contexts(id),
    message_id VARCHAR(255), -- External message ID from platform
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('telegram', 'whatsapp', 'web')),
    
    -- Processing details
    input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('text', 'voice', 'image')),
    input_content TEXT,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    
    -- Results
    extracted_data JSONB,
    confidence_scores JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    CHECK ((processing_status = 'completed' AND completed_at IS NOT NULL) OR (processing_status != 'completed'))
);

CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, processing_status);
CREATE INDEX idx_processing_jobs_context_date ON processing_jobs(context_id, created_at DESC);
```

### TimescaleDB Hypertables for Analytics

```sql
-- Convert transactions to hypertable for time-series optimization
SELECT create_hypertable('transactions', 'created_at', chunk_time_interval => INTERVAL '1 month');

-- Continuous aggregates for common analytics queries
CREATE MATERIALIZED VIEW monthly_spending_by_context
WITH (timescaledb.continuous) AS
SELECT 
    context_id,
    time_bucket(INTERVAL '1 month', transaction_date) AS month,
    COUNT(*) as transaction_count,
    SUM(amount_in_context_currency) as total_amount,
    AVG(amount_in_context_currency) as avg_amount
FROM transactions 
WHERE deleted_at IS NULL
GROUP BY context_id, month;

CREATE MATERIALIZED VIEW daily_category_spending
WITH (timescaledb.continuous) AS
SELECT 
    context_id,
    category_id,
    time_bucket(INTERVAL '1 day', transaction_date) AS day,
    COUNT(*) as transaction_count,
    SUM(amount_in_context_currency) as total_amount
FROM transactions 
WHERE deleted_at IS NULL AND category_id IS NOT NULL
GROUP BY context_id, category_id, day;
```

## Alternative Approaches Considered

### 1. Database per Tenant
```sql
-- Separate database for each context
CREATE DATABASE financy_context_12345;
```
**Pros**: Complete isolation, independent scaling
**Cons**: Operational complexity, cross-context analytics impossible
**Decision**: Rejected due to operational overhead

### 2. Schema per Tenant
```sql
-- Separate schema for each context
CREATE SCHEMA context_12345;
CREATE TABLE context_12345.transactions (...);
```
**Pros**: Good isolation, shared infrastructure
**Cons**: Complex migrations, query complexity
**Decision**: Rejected due to migration complexity

### 3. NoSQL (MongoDB)
```javascript
// Document-based storage
{
  _id: ObjectId,
  context_id: "12345",
  transactions: [...],
  categories: [...]
}
```
**Pros**: Flexible schema, horizontal scaling
**Cons**: Complex financial queries, ACID limitations
**Decision**: Rejected due to financial data consistency requirements

## Implementation Strategy

### Phase 1: Core Schema (Week 1-2)
- Implement user and context management tables
- Set up basic transaction schema
- Configure audit logging
- Add essential indexes

### Phase 2: Financial Features (Week 3-4)
- Add category and tagging system
- Implement subscription and installment tracking
- Set up currency conversion handling
- Add transaction splitting

### Phase 3: Analytics Optimization (Week 5-6)
- Configure TimescaleDB hypertables
- Create continuous aggregates
- Optimize query performance
- Add reporting views

### Phase 4: Advanced Features (Week 7-8)
- Implement settlement system
- Add advanced audit capabilities
- Create data export functions
- Performance tuning and optimization

## Data Migration Strategy

### Migration Scripts
```sql
-- Version management
CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    migration_sql TEXT
);

-- Example migration
INSERT INTO schema_migrations (version, migration_sql) VALUES 
('001_initial_schema', 'CREATE TABLE users ...');
```

### Backwards Compatibility
- All schema changes must be backwards compatible
- Use feature flags for gradual rollout
- Maintain old columns during transition periods
- Automated rollback procedures for failed migrations

## Performance Considerations

### Query Optimization
```sql
-- Partition large tables by context_id for better performance
CREATE TABLE transactions_partitioned (
    LIKE transactions INCLUDING ALL
) PARTITION BY HASH (context_id);

-- Create partitions
CREATE TABLE transactions_p0 PARTITION OF transactions_partitioned
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

### Index Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_transactions_context_date_category 
    ON transactions(context_id, transaction_date DESC, category_id) 
    WHERE deleted_at IS NULL;

-- Partial indexes for specific use cases
CREATE INDEX idx_transactions_high_amount 
    ON transactions(context_id, amount DESC) 
    WHERE amount > 1000 AND deleted_at IS NULL;
```

## Security Considerations

### Row-Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for context isolation
CREATE POLICY context_isolation ON transactions
    FOR ALL TO application_role
    USING (context_id IN (
        SELECT context_id FROM context_members 
        WHERE user_id = current_setting('app.current_user_id')::UUID
        AND left_at IS NULL
    ));
```

### Data Encryption
```sql
-- Encrypt sensitive fields
ALTER TABLE users ADD COLUMN encrypted_ssn BYTEA;

-- Use application-level encryption for PII
-- Encryption handled by application layer with KMS
```

## Monitoring and Maintenance

### Health Checks
```sql
-- Database health monitoring
CREATE VIEW system_health AS
SELECT 
    'transaction_count' as metric,
    COUNT(*) as value,
    NOW() as measured_at
FROM transactions
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Cleanup Procedures
```sql
-- Automated cleanup of old audit logs
DELETE FROM audit_log 
WHERE created_at < NOW() - INTERVAL '2 years';

-- Archive old processing jobs
DELETE FROM processing_jobs 
WHERE completed_at < NOW() - INTERVAL '6 months'
AND processing_status IN ('completed', 'failed');
```

## Consequences

### Positive Consequences
1. **Strong Consistency**: ACID compliance ensures financial data integrity
2. **Performance**: Optimized for common query patterns with proper indexing
3. **Scalability**: TimescaleDB provides excellent time-series performance
4. **Auditability**: Complete audit trail for compliance requirements
5. **Flexibility**: JSON columns allow schema evolution without migrations

### Negative Consequences
1. **Complexity**: Multi-tenant design adds query complexity
2. **Storage Overhead**: Audit trails and soft deletes increase storage requirements
3. **Migration Complexity**: Schema changes require careful coordination
4. **Query Performance**: Cross-context analytics may require special handling

### Risk Mitigation
1. **Performance Monitoring**: Continuous query performance monitoring
2. **Automated Testing**: Comprehensive database test suite
3. **Migration Testing**: All migrations tested in staging environment
4. **Backup Strategy**: Point-in-time recovery and cross-region backups

## Related ADRs
- [ADR-001: Technology Stack](./adr-001-technology-stack.md)
- [ADR-003: Multi-Tenant Architecture](./adr-003-multi-tenant-architecture.md)
- [ADR-006: Data Privacy and Compliance](./adr-006-data-privacy.md)