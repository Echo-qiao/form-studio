# syntax=docker/dockerfile:1
#
# 前端镜像：Vite 构建静态文件，Nginx 托管并反代 /api

ARG NODE_VERSION=22
ARG PNPM_VERSION=10
ARG NGINX_VERSION=1.27-alpine

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ARG PNPM_VERSION
RUN npm i -g pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com
COPY . .
RUN pnpm build

FROM nginx:${NGINX_VERSION} AS runtime
ENV TZ=Asia/Shanghai
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80