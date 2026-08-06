# Railway Dockerfile for Financy Backend
FROM node:18-alpine

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
