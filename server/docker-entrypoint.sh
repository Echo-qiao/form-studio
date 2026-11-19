#!/bin/sh
# 启动流程：同步表结构 →（可选）写演示数据 → exec 交给 node
set -e

echo "[entrypoint] 同步数据库结构 ..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

if [ "$SEED_ON_START" = "1" ]; then
  echo "[entrypoint] 检查/写入演示数据 ..."
  ./node_modules/.bin/tsx prisma/seed.ts || echo "[entrypoint] 种子失败，继续启动"
fi

echo "[entrypoint] 启动服务 ..."
exec "$@"