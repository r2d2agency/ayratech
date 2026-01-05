# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies just in case
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies with verbose logging and ignoring scripts to avoid permission issues
RUN npm install --verbose --ignore-scripts --legacy-peer-deps

# Install NestJS CLI globally to ensure 'nest' command is available
RUN npm install -g @nestjs/cli

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy built assets and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
