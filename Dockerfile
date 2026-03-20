# syntax=docker.io/docker/dockerfile:1

FROM node:lts-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends -o Acquire::Retries=3 openssl \
    && rm -rf /var/lib/apt/lists/*

FROM docker:cli AS docker_cli
FROM docker/compose-bin:latest AS docker_compose

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
RUN npm install --registry=https://registry.npmmirror.com

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

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends -o Acquire::Retries=3 gosu \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid nodejs --create-home nextjs

COPY --from=docker_cli /usr/local/bin/docker /usr/local/bin/docker
RUN mkdir -p /usr/libexec/docker/cli-plugins
COPY --from=docker_compose /docker-compose /usr/libexec/docker/cli-plugins/docker-compose
RUN chmod +x /usr/local/bin/docker /usr/libexec/docker/cli-plugins/docker-compose

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules/prisma/package.json ./prisma-package.json
RUN find /app/node_modules/7zip-bin -type f -name 7za -exec chmod +x {} \;
RUN mkdir -p /app/data /app/projects && chown -R nextjs:nodejs /app/data /app/projects

RUN npm install -g "prisma@$(node -p "require('./prisma-package.json').version")" --registry=https://registry.npmmirror.com \
    && rm ./prisma-package.json

# 创建启动脚本，先以 root 执行 prisma db push，然后切换用户运行应用
RUN printf '#!/bin/sh\nset -eu\nmkdir -p /app/data /app/projects\nchown -R nextjs:nodejs /app/data /app/projects\nchmod -R u+rwX,g+rwX /app/data /app/projects\nif [ -S /var/run/docker.sock ]; then\n    docker_gid=$(stat -c "%%g" /var/run/docker.sock)\n    docker_group=$(getent group "${docker_gid}" | cut -d: -f1 || true)\n    if [ -z "${docker_group}" ]; then\n        docker_group=dockerhost\n        groupadd --system --gid "${docker_gid}" "${docker_group}"\n    fi\n    usermod -aG "${docker_group}" nextjs\nfi\nprisma db push\nchown -R nextjs:nodejs /app/data /app/projects\nchmod -R u+rwX,g+rwX /app/data /app/projects\nexec gosu nextjs node server.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"

# 以 root 启动，脚本内部会修复权限并降权
CMD ["/app/entrypoint.sh"]
