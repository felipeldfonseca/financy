# Financy

A conversational financial assistant that transforms natural language messages (text, voice, images) sent via messaging platforms (Telegram/WhatsApp) into structured financial transactions.

## Features

- 🤖 **Conversational Interface**: Natural language transaction entry via Telegram bot
- 🏦 **Multi-Context Management**: Personal, family, and project financial contexts
- 🤝 **Collaboration**: Shared contexts with role-based permissions
- 🧠 **AI-Powered**: Automatic categorization and financial insights
- 🎤 **Voice Input**: Speech-to-text transaction entry
- 📷 **Receipt OCR**: Extract transaction data from receipt photos
- 📊 **Analytics**: Comprehensive dashboard with charts and insights
- 💱 **Multi-Currency**: Support for multiple currencies with real-time conversion

## Project Status

This project is currently in **development phase**. The MVP is being built following the comprehensive documentation in the `/docs` folder.

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:felipeldfonseca/financy.git
   cd financy
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Environment setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env.development
   cp frontend/.env.example frontend/.env.development
   
   # Edit environment files with your configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API server on http://localhost:3000
   - Frontend React app on http://localhost:3001

### Docker Setup (Alternative)

```bash
# Build and start all services
npm run docker:up

# Stop all services
npm run docker:down
```

## Project Structure

```
financy/
├── backend/           # NestJS API server
├── frontend/          # React web application
├── mobile/            # React Native app (future)
├── shared/            # Shared TypeScript types and utilities
├── docs/              # Comprehensive project documentation
├── scripts/           # Build and deployment scripts
└── tests/             # End-to-end tests
```

## Development

### Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend for production
- `npm run test` - Run all tests
- `npm run lint` - Run linting on all projects
- `npm run lint:fix` - Fix linting issues automatically

### Technology Stack

**Backend:**
- NestJS (Node.js framework)
- TypeORM (Database ORM)
- PostgreSQL (Primary database)
- Redis (Caching and sessions)
- JWT (Authentication)

**Frontend:**
- React 18
- TypeScript
- Material-UI (MUI)
- React Query (Data fetching)
- React Router (Navigation)
- Recharts (Data visualization)

**AI & Integrations:**
- OpenAI API (GPT-3.5/4 for categorization and insights)
- OpenAI Whisper (Speech-to-text)
- Telegram Bot API
- Google Cloud Vision (OCR - planned)

## Documentation

Comprehensive documentation is available in the `/docs` folder:

- [MVP Development Guide](docs/mvp-development-guide.md) - Step-by-step development roadmap
- [Architecture](docs/architecture/) - Technical architecture and ADRs
- [API Specifications](docs/integrations/api-specifications.md) - API documentation
- [Security](docs/security/) - Security policies and compliance
- [Testing Strategy](docs/testing/testing-strategy.md) - Testing approach

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our [Contributing Guide](docs/devex/development-workflow.md) for detailed information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- 📧 Email: support@financy.com
- 💬 Issues: [GitHub Issues](https://github.com/felipeldfonseca/financy/issues)
- 📖 Documentation: [Project Docs](docs/)

## Roadmap

- **MVP-1**: Telegram integration, basic categorization, simple dashboard
- **MVP-2**: OCR support, subscription detection, multi-currency
- **v1.0**: WhatsApp integration, advanced permissions, budget projections
- **v1.5**: Bank integrations, transaction reconciliation

See the full [roadmap](docs/product/roadmap.md) for detailed milestones.