# syntax=docker/dockerfile:1
#
# 后端镜像：三阶段（deps → build → runtime）
# 数据库是 SQLite，数据文件放在 /data 卷里，容器重建不丢

ARG NODE_VERSION=22
ARG PNPM_VERSION=10

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
ARG PNPM_VERSION
# Prisma 在 musl 上需要 openssl 判断引擎
RUN apk add --no-cache openssl
RUN npm i -g pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ARG PNPM_VERSION
RUN apk add --no-cache openssl
RUN npm i -g pnpm@${PNPM_VERSION}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ARG PNPM_VERSION
RUN apk add --no-cache openssl tini && npm i -g pnpm@${PNPM_VERSION}

ENV NODE_ENV=production \
    PORT=4200 \
    TZ=Asia/Shanghai

# SQLite 数据目录：挂卷后由 Docker 从这里初始化属主
RUN mkdir -p /data && chown -R node:node /data

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 4200

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]