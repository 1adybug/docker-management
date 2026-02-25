# syntax=docker.io/docker/dockerfile:1

FROM oven/bun:latest AS base

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json .npmrc* ./
RUN bun install --ignore-scripts --registry=https://registry.npmmirror.com

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone
# 临时的环境变量，仅用于 build 阶段跳过
ENV BETTER_AUTH_SECRET=7a4d08aa943c38b646d15d6398f013bcab9147f009474be97500262142cf18ad
ENV BETTER_AUTH_URL=http://example.com
ENV DEFAULT_EMAIL_DOMAIN=example.com

RUN bunx prisma generate
RUN bun run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1
RUN if ! getent group bun >/dev/null; then groupadd --system --gid 1001 bun; fi
RUN if ! id -u nextjs >/dev/null 2>&1; then useradd --system --uid 1001 --gid bun --create-home nextjs; fi

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:bun /app/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p /app/data && chown -R nextjs:bun /app/data

RUN bun add prisma --registry=https://registry.npmmirror.com --global

# 创建启动脚本，先以 root 执行 prisma db push，然后切换用户运行应用
RUN printf '#!/bin/sh\nchown -R nextjs:bun /app/data\nprisma db push\nexec runuser -u nextjs -- bun run server.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"

# 以 root 启动，脚本内部会修复权限并降权
CMD ["/app/entrypoint.sh"]
