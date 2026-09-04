# ====================================================================
# Production Dockerfile for Google Cloud Run (APAC Gen AI Ideathon)
# ====================================================================
# - Multi-stage build for minimal container size and fast cold-starts
# - Native Cloud Run compatibility listening on PORT 8080 (or $PORT)
# - Bundled Express + Vite SPA with Secret Manager integration
# ====================================================================

# Step 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code and configurations
COPY . .

# Build Vite client assets and bundle server.ts -> dist/server.cjs
RUN npm run build

# Step 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for Cloud Run security best practices
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only production dependencies and built artifacts
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Grant ownership to non-root runner
RUN chown -R nodejs:nodejs /app
USER nodejs

# Cloud Run injects the PORT environment variable (default: 8080)
EXPOSE 8080

# Start compiled server
CMD ["node", "dist/server.cjs"]
