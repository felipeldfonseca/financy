# Financy MVP Development Guide

## Overview
Financy is a comprehensive financial tracking application that supports multi-user contexts, multi-currency transactions, and intelligent Telegram bot integration.

## Architecture

### Core Modules
- **Auth Module**: JWT-based authentication system
- **Users Module**: User management and profiles
- **Transactions Module**: Transaction CRUD operations with advanced filtering
- **Contexts Module**: Multi-user financial contexts (personal, family, business, etc.)
- **Currency Module**: Multi-currency support with real-time exchange rates
- **Telegram Module**: Intelligent transaction processing via Telegram bot

### Database Schema
- **Users**: User profiles with Telegram integration
- **Transactions**: Financial transactions with context association
- **Contexts**: Shared financial spaces with member management
- **Context Members**: User roles and permissions within contexts
- **Chat Contexts**: Telegram chat to context mapping

## Development Progress

### ✅ Phase 1: Core Backend Infrastructure (COMPLETED)
- [x] NestJS application setup with TypeORM
- [x] PostgreSQL database configuration
- [x] JWT authentication system
- [x] Basic CRUD operations for users and transactions
- [x] Docker containerization
- [x] API documentation with Swagger

### ✅ Phase 2: Multi-User Context System (COMPLETED)
- [x] Context entity design (personal, family, business, etc.)
- [x] Context member management with roles and permissions
- [x] Context-aware transaction operations
- [x] User invitation and management system
- [x] Advanced transaction filtering and pagination

### ✅ Phase 3: Multi-Currency Support (COMPLETED)
- [x] Currency service with real-time exchange rates
- [x] Automatic currency conversion for transactions
- [x] User currency preferences
- [x] Transaction display with original and converted amounts
- [x] Exchange rate tracking and metadata

### ✅ Phase 4: Telegram Integration (COMPLETED)
- [x] Telegram bot infrastructure with webhook support
- [x] Natural language transaction processing with OpenRouter AI
- [x] Multi-tier AI fallback system (Primary → Secondary → Tertiary → Regex)
- [x] Voice message transcription and processing
- [x] Receipt photo OCR with computer vision
- [x] Interactive confirmation system with inline keyboards
- [x] Context-aware transaction creation
- [x] User account linking between Telegram and web app
- [x] Group chat support with context management
- [x] Automated context setup wizard
- [x] Permission-based transaction access in groups

### ✅ Phase 5: Multi-Transaction Support (COMPLETED - LATEST)
- [x] **Enhanced Text Processing**: Multiple transactions from single message
- [x] **Batch Photo Processing**: Multiple receipt photos in one message
- [x] **Voice Multi-Transaction**: Voice messages with multiple transactions
- [x] **Multi-Currency Batch**: Different currencies in single batch
- [x] **Smart Confirmation**: Unified interface for single/multiple transactions
- [x] **Batch Operations**: Confirm all, review, or cancel batches
- [x] **Error Resilience**: Partial failure handling in batches
- [x] **Currency Grouping**: Summary totals by currency type

#### Multi-Transaction Features:
- **Text Input Examples**:
  - `"Coffee $5 and gas $40"` → 2 transactions (USD)
  - `"Spent €15 on lunch, then €8 parking, got €200 freelance"` → 3 transactions (EUR)
  - `"Bought coffee for $5 and spent R$1000 on university"` → 2 transactions (USD + BRL)

- **Batch Processing**:
  - Multiple receipt photos processed individually
  - Voice messages transcribed and parsed for multiple transactions  
  - Intelligent confidence filtering (>60% threshold)
  - Automatic currency conversion per transaction
  - Context assignment preserved across all transactions

- **User Experience**:
  - Single vs. multiple transaction flows
  - Currency-grouped confirmation summaries
  - Individual transaction review capability
  - Batch confirmation with success/failure reporting

## Current Technical Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI
- **File Upload**: Multer for receipt processing
- **Currency**: Real-time exchange rate integration
- **AI Processing**: OpenRouter multi-model fallback system

### Telegram Integration
- **Bot Framework**: Telegram Bot API with webhooks
- **NLP**: OpenRouter AI models (DeepSeek, Qwen, Gemini)
- **OCR**: Computer vision models for receipt processing
- **Voice**: Whisper models for audio transcription
- **Multi-Transaction**: Array-based processing pipeline

### AI Model Hierarchy
1. **Primary**: `deepseek/deepseek-chat-v3.1:free`
2. **Secondary**: `qwen/qwen3-coder:free`  
3. **Tertiary**: `google/gemini-2.5-flash-lite`
4. **Fallback**: Regex-based parsing

## Key Features Implemented

### 🤖 Intelligent Transaction Processing
- Multi-model AI fallback system for reliability
- Natural language understanding with high accuracy
- Context-aware transaction categorization
- Multi-currency detection and conversion
- **NEW**: Multi-transaction extraction from single input

### 👥 Multi-User Context Management
- Flexible context types (personal, family, business, shared living, trips, projects)
- Role-based permissions (owner, admin, member, viewer)
- Automatic context detection for Telegram chats
- In-chat context configuration wizard

### 💱 Multi-Currency Support
- Real-time exchange rate conversion
- Original amount preservation
- User currency preferences
- Transaction display with conversion info
- **NEW**: Mixed currency batch processing

### 📱 Telegram Bot Capabilities
- Text message transaction parsing
- Voice message transcription and processing
- Receipt photo OCR and data extraction
- Interactive confirmation workflows
- Group chat integration
- Account linking system
- **NEW**: Batch transaction confirmation interface

### 🔄 Multi-Transaction Processing
- **Text**: Parse multiple transactions from natural language
- **Voice**: Transcribe and extract multiple transactions from audio
- **Photos**: Process multiple receipt images simultaneously
- **Confirmation**: Smart single vs. batch confirmation flows
- **Currencies**: Handle mixed currencies in single batch
- **Error Handling**: Graceful partial failure management

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh

### Users
- `GET /users/profile` - Get user profile
- `PATCH /users/profile` - Update user profile
- `POST /users/link-telegram` - Generate Telegram linking token

### Transactions
- `GET /transactions` - List transactions with filtering
- `POST /transactions` - Create transaction
- `PATCH /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /transactions/categories` - Get user categories
- `GET /transactions/merchants` - Get user merchants

### Contexts
- `GET /contexts` - List user contexts
- `POST /contexts` - Create context
- `PATCH /contexts/:id` - Update context
- `DELETE /contexts/:id` - Delete context
- `POST /contexts/:id/invite` - Invite user to context
- `POST /contexts/:id/join` - Join context via invitation

### Telegram
- `POST /telegram/webhook` - Telegram webhook endpoint

## Next Development Phases

### 🎯 Immediate Priorities
1. **Frontend Development** - React/Next.js web application
2. **User Experience Polish** - Advanced confirmation flows
3. **Performance Optimization** - Database indexing and caching
4. **Testing Coverage** - Comprehensive test suite

### 🚀 Future Enhancements
1. **Advanced Analytics** - Spending insights and reporting
2. **Budget Management** - Budget creation and tracking
3. **Recurring Transactions** - Automated recurring payments
4. **Integration APIs** - Bank account linking
5. **Mobile App** - Native mobile applications
6. **Export/Import** - Data portability features

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/financy

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook

# OpenRouter AI
OPENROUTER_API_KEY=your-openrouter-key
PRIMARY_MODEL=deepseek/deepseek-chat-v3.1:free
SECONDARY_MODEL=qwen/qwen3-coder:free
TERTIARY_MODEL=google/gemini-2.5-flash-lite

# Currency
EXCHANGE_RATE_API_KEY=your-exchange-rate-key

# Application
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

## Development Status: MVP READY 🎉

The backend MVP is **feature-complete** with:
- ✅ Multi-user financial contexts
- ✅ Multi-currency transaction processing
- ✅ Intelligent Telegram bot integration
- ✅ **Multi-transaction batch processing**
- ✅ Voice and photo transaction input
- ✅ Context-aware operations
- ✅ Robust error handling and fallbacks

**Ready for:** Frontend development, production deployment, and user testing.

**Latest Achievement:** Complete multi-transaction support enabling users to process multiple transactions with different currencies in a single input across all channels (text, voice, photos).