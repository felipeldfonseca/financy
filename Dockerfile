# Railway Dockerfile for Financy Backend
FROM node:20-alpine

# pg_dump for the daily database backup the bot delivers over Telegram.
# Client 16 matches the Railway PostgreSQL instance.
RUN apk add --no-cache postgresql16-client

# Set working directory
WORKDIR /app

# Install dependencies with versions pinned by the root workspace lockfile
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY shared/package.json shared/

RUN npm ci --workspace backend --no-audit --no-fund

# Copy backend source code
COPY backend/ backend/

# Build the application
RUN npm run build --workspace backend

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "backend/dist/src/main.js"]
