# Multi-stage build for Next.js 16
FROM node:24-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Source stage used by both migrator and builder
FROM deps AS source
WORKDIR /app
COPY . .

# Migration runner stage
FROM source AS migrator
ENV NODE_ENV=production
CMD ["npx", "tsx", "migrations/runner.ts", "up"]

# Build the application
FROM source AS builder
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
