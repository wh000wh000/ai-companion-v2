#!/bin/bash
# 伪春菜 开发环境启动脚本
# 用法: bash scripts/dev-start.sh
#
# 启动顺序:
# 1. PostgreSQL (docker-compose)
# 2. 等待数据库 ready
# 3. Server (tsx --watch)
# 4. Frontend (vite)

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
FRONTEND_DIR="$ROOT_DIR/apps/stage-web"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[dev-start]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

cleanup() {
  log "正在关闭服务..."
  kill $SERVER_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  log "服务已关闭"
}
trap cleanup EXIT INT TERM

# ─── 1. 启动 PostgreSQL ──────────────────────────────
log "启动 PostgreSQL (docker-compose)..."
cd "$SERVER_DIR"
docker compose up -d db
ok "PostgreSQL 容器已启动"

# ─── 2. 等待数据库 Ready ─────────────────────────────
log "等待数据库就绪..."
MAX_RETRIES=30
RETRY=0
until docker compose exec -T db pg_isready -U postgres -d postgres > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    err "数据库在 ${MAX_RETRIES} 次重试后仍未就绪"
  fi
  echo -n "."
  sleep 1
done
echo ""
ok "数据库已就绪 (${RETRY}s)"

# ─── 3. 推送数据库 Schema ────────────────────────────
log "推送数据库 Schema (drizzle-kit push)..."
cd "$SERVER_DIR"
corepack pnpm run db:push || warn "db:push 失败，可能 schema 已是最新"

# ─── 4. 启动 Server ─────────────────────────────────
log "启动 Server (端口 3002)..."
cd "$SERVER_DIR"
# 直接使用 dotenvx 加载 .env，避免嵌套 pnpm PATH 问题
./node_modules/.bin/dotenvx run -f .env -- ./node_modules/.bin/tsx --watch src/app.ts &
SERVER_PID=$!
ok "Server 已启动 (PID: $SERVER_PID)"

# 等待 Server 就绪
log "等待 Server 就绪..."
RETRY=0
until curl -sf http://localhost:3002/health > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    warn "Server 健康检查超时，继续启动前端..."
    break
  fi
  echo -n "."
  sleep 1
done
echo ""
if [ $RETRY -lt $MAX_RETRIES ]; then
  ok "Server 已就绪 (${RETRY}s)"
fi

# ─── 5. 启动 Frontend ───────────────────────────────
log "启动 Frontend (Vite)..."
cd "$FRONTEND_DIR"
./node_modules/.bin/vite --host &
FRONTEND_PID=$!
ok "Frontend 已启动 (PID: $FRONTEND_PID)"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  伪春菜 开发环境已启动${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  Server:   ${CYAN}http://localhost:3002${NC}"
echo -e "  Frontend: ${CYAN}http://localhost:5173${NC} (如被占用会自动切换)"
echo -e "  数据库:    ${CYAN}localhost:5435${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  按 ${YELLOW}Ctrl+C${NC} 停止所有服务"
echo ""

# 等待子进程
wait
