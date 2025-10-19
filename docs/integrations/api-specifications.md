# API Specifications
## Financy REST API Documentation

**Version**: 1.0  
**Last Updated**: 2025-10-18  
**Base URL**: `https://api.financy.com/v1`  
**Authentication**: JWT Bearer Token  

---

## API Overview

The Financy API provides programmatic access to all financial data and operations. The API follows REST principles with JSON request/response formats, comprehensive error handling, and robust authentication.

### API Design Principles
1. **RESTful Architecture**: Resource-based URLs with HTTP verbs
2. **Consistent Response Format**: Standardized response structure across all endpoints
3. **Comprehensive Error Handling**: Detailed error messages with context
4. **Pagination**: Cursor-based pagination for large datasets
5. **Rate Limiting**: Per-user and per-endpoint rate limits
6. **Versioning**: URL-based versioning with backward compatibility

### Authentication
All API requests require authentication via JWT Bearer token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2025-10-18T14:30:00Z",
    "request_id": "req_abc123",
    "api_version": "1.0",
    "processing_time_ms": 150
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONTEXT_ACCESS",
    "message": "User does not have access to the specified context",
    "details": {
      "context_id": "ctx_123456",
      "user_id": "usr_789012",
      "required_permission": "read_transactions"
    }
  },
  "metadata": {
    "timestamp": "2025-10-18T14:30:00Z",
    "request_id": "req_abc123",
    "api_version": "1.0"
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [
    // Array of resources
  ],
  "pagination": {
    "has_next": true,
    "has_previous": false,
    "next_cursor": "cursor_xyz789",
    "previous_cursor": null,
    "total_count": 1250,
    "page_size": 50
  },
  "metadata": {
    "timestamp": "2025-10-18T14:30:00Z",
    "request_id": "req_abc123",
    "api_version": "1.0"
  }
}
```

---

## Authentication Endpoints

### POST /auth/login
Authenticate user and obtain JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "platform": "web"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "rt_abc123def456...",
    "expires_in": 3600,
    "token_type": "Bearer",
    "user": {
      "id": "usr_123456",
      "email": "user@example.com",
      "full_name": "João Silva",
      "preferred_language": "pt-BR",
      "default_currency": "BRL"
    }
  }
}
```

### POST /auth/refresh
Refresh expired access token

**Request Body:**
```json
{
  "refresh_token": "rt_abc123def456..."
}
```

### POST /auth/logout
Invalidate current session

**Headers:** `Authorization: Bearer <token>`

---

## User Management Endpoints

### GET /users/me
Get current user profile

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "email": "user@example.com",
    "full_name": "João Silva",
    "preferred_language": "pt-BR",
    "timezone": "America/Sao_Paulo",
    "default_currency": "BRL",
    "notification_preferences": {
      "email_enabled": true,
      "push_enabled": true,
      "quiet_hours": {
        "start": "22:00",
        "end": "07:00"
      }
    },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-10-18T14:30:00Z"
  }
}
```

### PATCH /users/me
Update user profile

**Request Body:**
```json
{
  "full_name": "João Silva Santos",
  "preferred_language": "en-US",
  "notification_preferences": {
    "email_enabled": false,
    "quiet_hours": {
      "start": "23:00",
      "end": "06:00"
    }
  }
}
```

---

## Context Management Endpoints

### GET /contexts
List user's financial contexts

**Query Parameters:**
- `type` (optional): Filter by context type (`personal`, `family`, `project`, `travel`)
- `archived` (optional): Include archived contexts (`true`/`false`, default: `false`)
- `limit` (optional): Number of results (max 100, default 20)
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ctx_123456",
      "name": "Família Silva",
      "type": "family",
      "currency_code": "BRL",
      "owner_id": "usr_123456",
      "member_count": 3,
      "transaction_count": 450,
      "last_activity": "2025-10-18T12:15:00Z",
      "created_at": "2025-01-15T10:30:00Z",
      "user_role": "owner",
      "user_permissions": ["read", "write", "manage_members", "manage_settings"]
    }
  ],
  "pagination": {
    "has_next": false,
    "total_count": 3
  }
}
```

### POST /contexts
Create new financial context

**Request Body:**
```json
{
  "name": "Viagem Europa 2025",
  "type": "travel",
  "currency_code": "EUR",
  "settings": {
    "auto_categorization_enabled": true,
    "default_split_method": "equal",
    "require_approval_for_expenses": false
  }
}
```

### GET /contexts/{context_id}
Get context details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ctx_123456",
    "name": "Família Silva",
    "type": "family",
    "currency_code": "BRL",
    "timezone": "America/Sao_Paulo",
    "owner_id": "usr_123456",
    "settings": {
      "auto_categorization_enabled": true,
      "default_split_method": "equal",
      "require_approval_for_expenses": false,
      "expense_approval_threshold": {
        "amount": 1000.00,
        "currency": "BRL"
      }
    },
    "members": [
      {
        "user_id": "usr_123456",
        "role": "owner",
        "display_name": "João Silva",
        "joined_at": "2025-01-15T10:30:00Z"
      },
      {
        "user_id": "usr_789012",
        "role": "editor",
        "display_name": "Maria Silva",
        "joined_at": "2025-01-16T09:15:00Z"
      }
    ],
    "statistics": {
      "total_transactions": 450,
      "current_month_amount": 3250.75,
      "last_transaction_date": "2025-10-18T12:15:00Z"
    },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-10-10T16:45:00Z"
  }
}
```

### PATCH /contexts/{context_id}
Update context settings

**Request Body:**
```json
{
  "name": "Nova Família Silva",
  "settings": {
    "require_approval_for_expenses": true,
    "expense_approval_threshold": {
      "amount": 500.00,
      "currency": "BRL"
    }
  }
}
```

### DELETE /contexts/{context_id}
Archive context (soft delete)

---

## Transaction Management Endpoints

### GET /contexts/{context_id}/transactions
List transactions for a context

**Query Parameters:**
- `start_date` (optional): Filter transactions from date (ISO 8601)
- `end_date` (optional): Filter transactions to date (ISO 8601)
- `category_id` (optional): Filter by category ID
- `user_id` (optional): Filter by user who created transaction
- `min_amount` (optional): Minimum transaction amount
- `max_amount` (optional): Maximum transaction amount
- `search` (optional): Search in description and merchant name
- `limit` (optional): Number of results (max 100, default 20)
- `cursor` (optional): Pagination cursor
- `sort` (optional): Sort order (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_abc123",
      "context_id": "ctx_123456",
      "user_id": "usr_123456",
      "amount": 45.50,
      "currency_code": "BRL",
      "amount_in_context_currency": 45.50,
      "description": "Almoço no restaurante japonês",
      "merchant_name": "Sushi Bar Yamamoto",
      "category": {
        "id": "cat_food001",
        "name": "Alimentação",
        "icon": "🍽️",
        "color": "#FF6B6B"
      },
      "transaction_date": "2025-10-18",
      "transaction_time": "12:30:00",
      "input_method": "voice",
      "confidence_score": 0.92,
      "status": "confirmed",
      "tags": ["business", "lunch"],
      "notes": "Almoço de negócios com cliente",
      "splits": [
        {
          "user_id": "usr_123456",
          "amount": 45.50,
          "status": "confirmed"
        }
      ],
      "attachments": [
        {
          "id": "att_receipt001",
          "filename": "receipt_20251018.jpg",
          "type": "receipt",
          "url": "https://cdn.financy.com/receipts/att_receipt001.jpg"
        }
      ],
      "created_at": "2025-10-18T12:35:00Z",
      "updated_at": "2025-10-18T12:35:00Z"
    }
  ],
  "pagination": {
    "has_next": true,
    "next_cursor": "cursor_xyz789",
    "total_count": 1250
  }
}
```

### POST /contexts/{context_id}/transactions
Create new transaction

**Request Body:**
```json
{
  "amount": 75.80,
  "currency_code": "BRL",
  "description": "Supermercado Extra",
  "merchant_name": "Extra Supermercados",
  "category_id": "cat_grocery001",
  "transaction_date": "2025-10-18",
  "transaction_time": "19:45:00",
  "payment_method": "credit_card",
  "tags": ["groceries", "family"],
  "notes": "Compras da semana",
  "splits": [
    {
      "user_id": "usr_123456",
      "amount": 37.90
    },
    {
      "user_id": "usr_789012",
      "amount": 37.90
    }
  ]
}
```

### GET /contexts/{context_id}/transactions/{transaction_id}
Get transaction details

### PATCH /contexts/{context_id}/transactions/{transaction_id}
Update transaction

**Request Body:**
```json
{
  "description": "Supermercado Extra - Compras mensais",
  "category_id": "cat_grocery002",
  "notes": "Incluiu produtos de limpeza",
  "tags": ["groceries", "family", "cleaning"]
}
```

### DELETE /contexts/{context_id}/transactions/{transaction_id}
Delete transaction (soft delete)

---

## Category Management Endpoints

### GET /contexts/{context_id}/categories
List categories for a context

**Query Parameters:**
- `parent_id` (optional): Filter by parent category
- `is_income` (optional): Filter income vs expense categories
- `include_system` (optional): Include system-defined categories

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_food001",
      "name": "Alimentação",
      "full_path": "Alimentação",
      "parent_id": null,
      "icon": "🍽️",
      "color": "#FF6B6B",
      "is_system": true,
      "is_income": false,
      "transaction_count": 85,
      "total_amount": 2450.75,
      "last_used_at": "2025-10-18T12:30:00Z",
      "children": [
        {
          "id": "cat_restaurant001",
          "name": "Restaurantes",
          "full_path": "Alimentação > Restaurantes",
          "parent_id": "cat_food001",
          "icon": "🍽️",
          "color": "#FF6B6B",
          "transaction_count": 45,
          "total_amount": 1250.30
        }
      ]
    }
  ]
}
```

### POST /contexts/{context_id}/categories
Create new category

**Request Body:**
```json
{
  "name": "Delivery",
  "parent_id": "cat_food001",
  "icon": "🚚",
  "color": "#4ECDC4",
  "auto_classification_rules": [
    {
      "rule_type": "keyword",
      "pattern": "ifood|uber eats|delivery",
      "confidence_weight": 0.9
    }
  ]
}
```

---

## Analytics Endpoints

### GET /contexts/{context_id}/analytics/summary
Get financial summary for context

**Query Parameters:**
- `period` (optional): `current_month`, `last_month`, `current_year`, `last_year`, `custom`
- `start_date` (optional): Start date for custom period
- `end_date` (optional): End date for custom period
- `currency` (optional): Currency for conversion (defaults to context currency)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-31",
      "display_name": "Outubro 2025"
    },
    "summary": {
      "total_income": 8500.00,
      "total_expenses": 6750.45,
      "net_amount": 1749.55,
      "transaction_count": 127,
      "average_transaction": 53.15,
      "currency": "BRL"
    },
    "category_breakdown": [
      {
        "category_id": "cat_food001",
        "category_name": "Alimentação",
        "amount": 1850.75,
        "percentage": 27.4,
        "transaction_count": 45,
        "color": "#FF6B6B"
      }
    ],
    "daily_trend": [
      {
        "date": "2025-10-01",
        "income": 0.00,
        "expenses": 125.50,
        "net": -125.50
      }
    ],
    "budget_comparison": {
      "budgeted_amount": 7000.00,
      "actual_amount": 6750.45,
      "variance": 249.55,
      "percentage_used": 96.4
    }
  }
}
```

### GET /contexts/{context_id}/analytics/trends
Get spending trends analysis

**Query Parameters:**
- `metric` (required): `spending`, `income`, `categories`, `merchants`
- `period` (optional): `daily`, `weekly`, `monthly`, `yearly`
- `duration` (optional): Number of periods to include (default 12)

**Response:**
```json
{
  "success": true,
  "data": {
    "metric": "spending",
    "period": "monthly",
    "currency": "BRL",
    "data_points": [
      {
        "period": "2025-01",
        "value": 5850.75,
        "transaction_count": 98,
        "change_from_previous": 15.2
      }
    ],
    "insights": [
      {
        "type": "trend",
        "message": "Gastos aumentaram 15% comparado ao mês anterior",
        "confidence": 0.85
      },
      {
        "type": "pattern",
        "message": "Maior gasto em alimentação nas sextas-feiras",
        "confidence": 0.92
      }
    ]
  }
}
```

### GET /contexts/{context_id}/analytics/budget
Get budget analysis

---

## Subscription Management Endpoints

### GET /contexts/{context_id}/subscriptions
List active subscriptions

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sub_netflix001",
      "vendor_name": "Netflix",
      "description": "Streaming subscription",
      "amount": 45.90,
      "currency_code": "BRL",
      "billing_cycle": "monthly",
      "start_date": "2025-01-15",
      "next_billing_date": "2025-11-15",
      "status": "active",
      "detection_confidence": 0.95,
      "category": {
        "id": "cat_entertainment001",
        "name": "Entretenimento"
      },
      "recent_transactions": [
        {
          "id": "txn_netflix_oct",
          "amount": 45.90,
          "transaction_date": "2025-10-15"
        }
      ],
      "projected_annual_cost": 550.80,
      "created_at": "2025-01-20T14:30:00Z"
    }
  ]
}
```

### POST /contexts/{context_id}/subscriptions/{subscription_id}/pause
Pause subscription tracking

### POST /contexts/{context_id}/subscriptions/{subscription_id}/cancel
Cancel subscription tracking

---

## Export Endpoints

### POST /contexts/{context_id}/exports
Create data export

**Request Body:**
```json
{
  "format": "csv",
  "start_date": "2025-01-01",
  "end_date": "2025-10-31",
  "include_categories": ["transactions", "subscriptions", "splits"],
  "filters": {
    "category_ids": ["cat_food001", "cat_transport001"],
    "min_amount": 10.00
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "exp_abc123",
    "status": "processing",
    "estimated_completion": "2025-10-18T14:35:00Z",
    "download_url": null,
    "expires_at": null
  }
}
```

### GET /exports/{export_id}
Get export status and download URL

---

## Webhook Endpoints

### POST /webhooks
Register webhook endpoint

**Request Body:**
```json
{
  "url": "https://your-app.com/financy-webhook",
  "events": ["transaction.created", "transaction.updated", "subscription.detected"],
  "context_ids": ["ctx_123456"],
  "secret": "webhook_secret_key"
}
```

### GET /webhooks
List registered webhooks

### DELETE /webhooks/{webhook_id}
Delete webhook

---

## Error Codes

### Authentication Errors (401)
- `INVALID_TOKEN`: JWT token is invalid or expired
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_CREDENTIALS`: Email/password combination is incorrect
- `ACCOUNT_DEACTIVATED`: User account has been deactivated

### Authorization Errors (403)
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `CONTEXT_ACCESS_DENIED`: User cannot access the specified context
- `RESOURCE_FORBIDDEN`: Operation not allowed on this resource

### Client Errors (400)
- `INVALID_REQUEST_FORMAT`: Request body format is invalid
- `VALIDATION_ERROR`: Request data failed validation
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_PARAMETER_VALUE`: Parameter value is invalid

### Resource Errors (404)
- `CONTEXT_NOT_FOUND`: Specified context does not exist
- `TRANSACTION_NOT_FOUND`: Specified transaction does not exist
- `USER_NOT_FOUND`: Specified user does not exist

### Rate Limiting (429)
- `RATE_LIMIT_EXCEEDED`: Too many requests from client
- `QUOTA_EXCEEDED`: API quota has been exceeded

### Server Errors (500)
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: External service is unavailable
- `DATABASE_ERROR`: Database operation failed

---

## Rate Limiting

### Rate Limit Headers
All API responses include rate limiting headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1634567890
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint
- **Authentication**: 10 requests per minute
- **Read Operations**: 1000 requests per hour
- **Write Operations**: 500 requests per hour
- **Export Operations**: 10 requests per hour
- **Analytics**: 100 requests per hour

### Rate Limiting Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "details": {
      "limit": 1000,
      "window_seconds": 3600,
      "retry_after": 60
    }
  }
}
```

---

## SDK and Libraries

### Official SDKs
- **JavaScript/TypeScript**: `@financy/javascript-sdk`
- **Python**: `financy-python`
- **PHP**: `financy/php-sdk`
- **Java**: `com.financy:financy-java`

### Usage Example (JavaScript)
```javascript
import { FinancyClient } from '@financy/javascript-sdk';

const financy = new FinancyClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.financy.com/v1'
});

// Get user contexts
const contexts = await financy.contexts.list();

// Create transaction
const transaction = await financy.transactions.create('ctx_123456', {
  amount: 45.50,
  currency_code: 'BRL',
  description: 'Coffee with client',
  category_id: 'cat_food001'
});

// Get monthly summary
const summary = await financy.analytics.getSummary('ctx_123456', {
  period: 'current_month'
});
```

This comprehensive API specification provides complete programmatic access to all Financy functionality with robust authentication, error handling, and developer-friendly design patterns.