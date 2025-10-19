# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Financy** - a conversational financial assistant that transforms natural language messages (text, voice, images) sent via messaging platforms (Telegram/WhatsApp) into structured financial transactions. The system supports both personal and collaborative financial management (family/groups) with intelligent categorization, subscription tracking, installment management, and automated insights.

## Project Status

This is currently in **planning phase** - the codebase contains documentation and architectural plans but no implementation yet. The project is being designed as a multi-context financial assistant with the following key capabilities:

- **Multi-Context Support**: Personal spaces (private) and shared spaces (family, projects, trips)
- **Natural Language Processing**: Text, voice (ASR), and image (OCR) input processing
- **Intelligent Classification**: Automatic categorization, recurring payment detection, installment tracking
- **Smart Routing**: Context-aware message routing based on chat source
- **Consolidated Insights**: Dashboards, alerts, projections, and automated reporting

## Architecture (Planned)

### Core Components
- **Message Connectors**: Telegram Bot API (MVP), WhatsApp Cloud API (future)
- **Processing Pipeline**: ASR (Whisper), OCR (Tesseract/Google Vision), NLP + Rules
- **Context Router**: Maps chat_id → context_id with multi-tenant isolation
- **Data Storage**: Context-separated collections with temporal indexing
- **Job Scheduler**: Alerts, reminders, periodic summaries, projections
- **Dashboard**: Web interface (Streamlit/Retool for MVP, Next.js for v1)

### Data Model (Planned)
- `contexts`: Multi-tenant spaces with permissions and currency settings
- `transactions`: Financial entries with context isolation and rich metadata
- `contracts`: Subscriptions and installments with lifecycle management
- `alerts`: Scheduled notifications with delivery tracking

### Security & Privacy
- **Context Isolation**: Logical separation by context_id
- **Multi-tenant Architecture**: Secure data segregation
- **Encryption**: In-transit (HTTPS) and at-rest (database)
- **Permission Model**: Role-based access (owner, editor, viewer)

## Development Setup

**Note**: No implementation exists yet. The following structure is planned:

```
/src
  /connectors     # Messaging platform integrations
  /processors     # ASR, OCR, NLP pipeline
  /routers        # Context resolution and routing
  /storage        # Database models and operations
  /schedulers     # Background jobs and alerts
  /dashboards     # Web interface and APIs
/docs             # Architecture and planning documentation
/tests            # Test suites (unit, integration, e2e)
```

## Roadmap

1. **MVP-1**: Telegram integration, basic categorization, simple dashboard
2. **MVP-2**: OCR support, subscription detection, multi-currency
3. **v1.0**: WhatsApp integration, advanced permissions, budget projections
4. **v1.5**: Bank integrations, transaction reconciliation

## Key Design Principles

- **Privacy by Default**: Personal data isolation with collaborative opt-in
- **Context Awareness**: Native understanding of personal vs. group finances
- **Natural Interaction**: Conversational interface with minimal user training
- **Future Projection**: Subscription and installment tracking for cash flow planning
- **Multi-Currency**: Global currency support with automatic conversion

## Documentation References

- `ideia.md`: Detailed product vision and technical architecture
- `docs_planning.txt`: Comprehensive documentation planning checklist covering product strategy, UX, technical architecture, data models, integrations, security, and operational concerns

This project is in active planning phase. Future Claude Code instances should focus on implementing the core MVP features while maintaining the architectural principles outlined in the planning documents.