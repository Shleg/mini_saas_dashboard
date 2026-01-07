FROM node:20-alpine AS base

# Install postgres client for pg_isready
RUN apk add --no-cache postgresql-client

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint and scripts needed for seed
COPY --chown=nextjs:nodejs docker/entrypoint.sh /entrypoint.sh
COPY --chown=nextjs:nodejs package.json ./
COPY --chown=nextjs:nodejs package-lock.json ./
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs tsconfig.json ./

RUN chmod +x /entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
