# ══════════════════════════════════════════════════════════════════
# AI-MULIAWAN FINAL GOD VERSION v6.0 — Docker Production Image
# Multi-stage build for minimal image size
# ══════════════════════════════════════════════════════════════════

# ─── BUILD STAGE ──────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files first (layer caching)
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production --silent && \
    npm cache clean --force

# ─── PRODUCTION STAGE ─────────────────────────────────────────────
FROM node:18-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aimuliawan -u 1001

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder --chown=aimuliawan:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=aimuliawan:nodejs . .

# Remove files that should not be in container
RUN rm -f .env .env.example *.sh && \
    rm -rf .git .gitignore

# Security hardening
RUN chmod -R 755 /app && \
    chmod 644 /app/package.json

# Switch to non-root user
USER aimuliawan

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Start command
CMD ["node", "server.js"]

# ─── METADATA ─────────────────────────────────────────────────────
LABEL maintainer="HARI MULIAWAN, S.Mat" \
      version="6.0.0" \
      description="AI-MULIAWAN FINAL GOD VERSION" \
      org.opencontainers.image.title="AI-MULIAWAN GOD" \
      org.opencontainers.image.version="6.0.0" \
      org.opencontainers.image.vendor="HARI MULIAWAN, S.Mat"
