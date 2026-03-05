FROM node:24-alpine

WORKDIR /app

RUN corepack enable

# ── 1. 包管理配置 ──────────────────────────────────────────
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches/ ./patches/

# ── 2. 应用 + 内部依赖包 ──────────────────────────────────
COPY apps/server apps/server
COPY packages/server-schema packages/server-schema
COPY packages/soul-engine packages/soul-engine

# ── 3. 角色 SOUL.md 数据（seed 脚本需要） ─────────────────
COPY openclaw/ openclaw/

# ── 4. 安装依赖 ───────────────────────────────────────────
# https://docs.railway.com/guides/dockerfiles#cache-mounts
# --mount=type=cache,id=s/<service id>-<target path>,target=<target path>
RUN --mount=type=cache,id=s/fec8bf0d-37e0-4283-8202-5f1bd7e6cd0e-/root/.pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --ignore-scripts

# ── 5. 构建内部包 ─────────────────────────────────────────
RUN pnpm -F @proj-airi/server-schema run build
RUN pnpm -F @ai-companion/soul-engine run build

EXPOSE 3000

CMD ["pnpm", "-F", "@proj-airi/server", "start"]
