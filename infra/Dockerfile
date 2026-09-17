# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS manifests
COPY package.json pnpm-lock.yaml ./

FROM manifests AS deps
RUN --mount=type=cache,id=turnos-pnpm-store,target=/pnpm/store,sharing=shared \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store

FROM manifests AS prod-deps
RUN --mount=type=cache,id=turnos-pnpm-store,target=/pnpm/store,sharing=shared \
    pnpm install --frozen-lockfile --prod --ignore-scripts --store-dir=/pnpm/store

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BASE_URL=https://turnos.andiko.cloud
ARG NEXT_PUBLIC_CAP_HOST=https://cap.andiko.cloud
ARG NEXT_PUBLIC_CAP_SITE_KEY=
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_CAP_HOST=$NEXT_PUBLIC_CAP_HOST
ENV NEXT_PUBLIC_CAP_SITE_KEY=$NEXT_PUBLIC_CAP_SITE_KEY
# Placeholders for Zod / module init during `next build` — runtime uses Swarm secrets.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV AUTH_SECRET=build-time-placeholder-not-used-at-runtime
ENV AUTH_URL=https://turnos.andiko.cloud
RUN --mount=type=cache,id=turnos-next-cache,target=/app/.next/cache,sharing=locked \
    pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache wget \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/infra/docker-entrypoint.sh ./infra/docker-entrypoint.sh
RUN chmod +x ./infra/docker-entrypoint.sh

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/modules ./src/modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/infra/docker-entrypoint.sh"]
CMD ["node", "server.js"]
