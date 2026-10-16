# SmartSoko Node.js API Server - Production Dockerfile
# Multi-stage build for smaller production image

# ── Build stage ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./
COPY tailwind.config.js ./

# Install dependencies (including dev for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build CSS assets
RUN npm run build:css

# ── Production stage ──
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/config ./config
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/tailwind.config.js ./

# Copy ecosystem config for PM2
COPY ecosystem.config.js ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nextjs:nodejs logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start with PM2 for clustering and auto-restart
CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]