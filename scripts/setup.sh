#!/bin/bash

# Financy Project Setup Script
echo "🚀 Setting up Financy development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo "🔧 Setting up backend..."
cd backend
if [ ! -f ".env.development" ]; then
    cp .env.example .env.development
    echo "📄 Created backend/.env.development from template"
fi
npm install
cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend
if [ ! -f ".env.development" ]; then
    cp .env.example .env.development
    echo "📄 Created frontend/.env.development from template"
fi
npm install
cd ..

# Setup shared
echo "🔄 Setting up shared types..."
cd shared
npm install
npm run build
cd ..

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your environment variables in backend/.env.development"
echo "2. Start PostgreSQL and Redis services"
echo "3. Run 'npm run dev' to start development servers"
echo ""
echo "🔗 Useful commands:"
echo "  npm run dev          - Start both backend and frontend"
echo "  npm run docker:up    - Start with Docker Compose"
echo "  npm run test         - Run all tests"
echo "  npm run lint         - Check code quality"