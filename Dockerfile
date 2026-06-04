# syntax=docker/dockerfile:1

############################
# 1. Install dependencies  #
############################
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat helps some native deps on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

############################
# 2. Build the app         #
############################
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN npm run build
# Bundle the migration runner into a single self-contained JS file so the
# runtime image needs no extra node_modules for migrations.
RUN npx esbuild scripts/migrate.ts \
  --bundle --platform=node --format=cjs --outfile=dist-migrate.cjs

############################
# 3. Runtime image         #
############################
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone server output. (No public/ dir in this project.)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration assets: SQL files + the bundled runner.
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/dist-migrate.cjs ./dist-migrate.cjs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Apply pending migrations (idempotent), then start the server.
CMD ["sh", "-c", "node dist-migrate.cjs && node server.js"]
