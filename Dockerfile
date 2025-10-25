# Railway Dockerfile for Financy Backend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files for dependency installation
COPY backend/package*.json ./

# Install all dependencies (needed for build)
RUN npm install

# Copy backend source code
COPY backend/ ./

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]