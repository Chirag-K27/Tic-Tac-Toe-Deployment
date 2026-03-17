# ──────────────────────────────────────────────
# Multi-stage Dockerfile for Node.js Application
# ──────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --only=production && \
    cp -R node_modules /tmp/node_modules

# Install all deps for build
RUN npm install
COPY . .
RUN npm run build --if-present

# Stage 2: Production
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production dependencies and built app
COPY --from=builder /tmp/node_modules ./node_modules
COPY --from=builder /app .

# Remove unnecessary files
RUN rm -rf tests/ .git/ .github/ .env.example

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "server.js"]
