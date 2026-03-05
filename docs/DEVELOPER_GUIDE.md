# 伪春菜 v2 — 开发者指南

> 面向新加入的开发者，帮助你在 5 分钟内启动项目并理解代码结构。

---

## 1. 快速上手（5 分钟启动）

### 1.1 前置要求

- **Node.js** >= 18（当前环境：v24.13.0）
- **pnpm** 10.30.3（通过 corepack 管理，无需手动安装）
- **PostgreSQL** >= 15
- **Git**

### 1.2 克隆与安装

```bash
# 克隆项目
git clone <repository-url> ai-companion-v2
cd ai-companion-v2

# 启用 corepack（自动管理 pnpm 版本）
corepack enable

# 安装依赖（跳过 Electron 二进制下载，避免网络问题）
corepack pnpm install --ignore-scripts
```

### 1.3 配置环境

```bash
# 创建数据库
createdb ai_companion_dev

# 在 apps/server/ 下创建 .env.local 文件
cat > apps/server/.env.local << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/ai_companion_dev
PORT=3002
EOF
```

> 其他可选环境变量参见 `apps/server/src/libs/env.ts` 中的 `EnvSchema`。

### 1.4 构建与启动

```bash
# 构建核心引擎（其他包依赖此包）
corepack pnpm -F @ai-companion/soul-engine build

# 构建所有 packages
corepack pnpm build:packages

# 推送数据库 Schema
cd apps/server && corepack pnpm run apply:env -- drizzle-kit push && cd ../..

# 启动后端（终端 1）
corepack pnpm dev:server
# → http://localhost:3002

# 启动前端（终端 2）
corepack pnpm dev:web
# → http://localhost:5173
```

### 1.5 验证

```bash
# 后端健康检查
curl http://localhost:3002/health
# → {"status":"ok"}

# 打开浏览器访问 http://localhost:5173
```

---

## 2. 项目结构导航

### 2.1 你应该关注的目录

```
ai-companion-v2/
├── packages/soul-engine/       # [核心] 灵魂经济引擎
│   ├── src/
│   │   ├── trust/calculator.ts    # 信赖计算（签到/衰减/升级）
│   │   ├── economy/engine.ts      # 经济引擎（充值/送礼/零花钱）
│   │   ├── surprise/engine.ts     # 惊喜引擎（阈值触发/预算/冷却）
│   │   ├── demo/manager.ts        # Demo 模式（7天引导）
│   │   ├── appearance/            # 外观等级解锁
│   │   ├── emotion/               # 情感->Live2D映射
│   │   ├── types/                 # 类型定义 + 配置常量
│   │   └── index.ts               # 统一导出
│   └── tests/                     # 测试文件（559 用例）
│
├── apps/server/                # [核心] Hono 后端
│   └── src/
│       ├── app.ts                 # 入口：DI 容器 + 路由注册
│       ├── routes/                # 14 个路由模块
│       │   ├── wallet.ts          #   充值/送礼/交易记录
│       │   ├── trust.ts           #   签到/信赖查询
│       │   ├── chat.ts            #   双通道流式对话
│       │   ├── surprises.ts       #   惊喜管理
│       │   ├── payment.ts         #   支付订单
│       │   ├── tts.ts             #   语音合成
│       │   ├── memory.ts          #   记忆管理
│       │   ├── skills.ts          #   Agent Skills API
│       │   ├── o2o.ts             #   O2O 选品
│       │   ├── proactive.ts       #   主动推送
│       │   ├── channel-sync.ts    #   多渠道同步
│       │   ├── characters.ts      #   角色管理
│       │   ├── chats.ts           #   会话管理
│       │   └── providers.ts       #   LLM 提供者
│       ├── services/              # 业务服务层（13 个服务）
│       ├── schemas/               # Drizzle 表定义（12 张表）
│       ├── middlewares/           # 中间件（auth/rate-limit/openclaw-fallback）
│       ├── libs/                  # 工具库（db/env/auth/ws-push）
│       └── api/                   # Valibot 校验 Schema
│
├── apps/stage-web/             # [核心] Vue 3 前端
│   └── src/
│       ├── pages/                 # 文件路由页面
│       │   ├── index.vue          #   主页（Live2D + 聊天）
│       │   ├── auth/              #   登录/注册
│       │   ├── wallet/            #   钱包/充值/交易记录
│       │   ├── surprises/         #   惊喜记录
│       │   ├── onboarding/        #   新手引导
│       │   ├── settings/          #   角色管理 + 系统设置
│       │   └── devtools/          #   开发者调试工具
│       └── stores/                # Pinia 状态管理
│           ├── wallet.ts          #   钱包状态
│           ├── trust.ts           #   信赖状态
│           ├── surprise.ts        #   惊喜状态
│           ├── demo.ts            #   Demo 模式
│           └── pwa.ts             #   PWA 更新
│
├── openclaw/                   # OpenClaw Agent 配置
│   ├── agents/                    # 6 角色人格（SOUL.md）
│   └── skills/                    # 8 个 Agent 技能定义
│
└── docs/                       # 文档
    ├── TRUTH_TABLE.md             # 权威数值真值表
    ├── ROADMAP_v3.md              # 路线图
    ├── SWARM_PLAN.md              # 蜂群执行计划
    ├── API_REFERENCE.md           # API 文档
    └── SECURITY_AUDIT.md          # 安全审计
```

### 2.2 关键依赖关系

```
@ai-companion/soul-engine
    ↑ 被引用
    ├── apps/server（后端使用引擎计算逻辑）
    └── apps/stage-web（前端使用 Demo 管理器 + 类型）

@proj-airi/server-schema（AIRI 原有表）
    ↑ 被引用
    └── apps/server（accounts/session 表来自此包）

apps/server 自有 schemas/（扩展表）
    └── wallets, trust_records, surprises, transactions,
        memories, payment_orders, channel_bindings
```

---

## 3. 开发约定

### 3.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 新增包 | `@ai-companion/xxx` | `@ai-companion/soul-engine` |
| AIRI 原有包 | 保持 `@proj-airi/xxx` | `@proj-airi/stage-ui` |
| 数据库表 | snake_case | `trust_records`, `payment_orders` |
| 数据库 PK | text + nanoid | `id: text('id').$defaultFn(() => nanoid())` |
| 服务工厂 | `createXxxService()` | `createTrustService(db)` |
| 路由工厂 | `createXxxRoutes()` | `createWalletRoutes(economyService)` |
| 前端 Store | `useXxxStore` | `useTrustStore` |
| Valibot Schema | PascalCase + `Schema` 后缀 | `ChargeSchema`, `GiftSchema` |

### 3.2 代码风格

- **Lint**: moeru-lint（基于 @antfu/eslint-config）
- **格式化**: 通过 nano-staged 在 pre-commit 自动运行
- **TypeScript**: strict mode，`verbatimModuleSyntax` 启用
- **Import**: 使用 `type` 关键字导入类型（`import type { xxx }`)

### 3.3 后端开发约定

```typescript
// 1. 服务使用工厂模式
export function createXxxService(db: DrizzleDB) {
  return {
    async doSomething(params: XxxParams): Promise<XxxResult> {
      // 金额操作必须使用事务
      return db.transaction(async (tx) => {
        // SELECT FOR UPDATE 保证一致性
      })
    }
  }
}
export type XxxService = ReturnType<typeof createXxxService>

// 2. 路由使用 Valibot 校验
const XxxSchema = object({
  field: pipe(string(), nonEmpty()),
})

// 3. DI 使用 injeca
const xxxService = injeca.provide('services:xxx', {
  dependsOn: { db },
  build: ({ dependsOn }) => createXxxService(dependsOn.db),
})
```

### 3.4 引擎开发约定

```typescript
// 1. 所有数值修改必须先更新 docs/TRUTH_TABLE.md
// 2. 惊喜系统：零概率、零 random —— 仅确定性阈值触发
// 3. 情感状态不含 angry/sad —— 不惩罚用户
// 4. 信赖衰减只掉点数不掉等级
```

### 3.5 提交规范

- 使用 simple-git-hooks + nano-staged 自动 lint
- 提交前确保 `corepack pnpm build:packages` 无错误
- 提交前确保 `corepack pnpm test:run` 全绿

---

## 4. 常见问题排查

### Q1: `pnpm: command not found`

pnpm 通过 corepack 管理，不在 PATH 中。始终使用 `corepack pnpm` 替代 `pnpm`。

```bash
corepack enable
corepack pnpm install
```

### Q2: Electron 下载失败

Electron 二进制下载需要网络代理。开发时可跳过：

```bash
corepack pnpm install --ignore-scripts
```

仅在需要构建桌面版时才需要下载 Electron。

### Q3: soul-engine 导入报错 "Cannot find module"

soul-engine 需要先构建才能被其他包引用：

```bash
corepack pnpm -F @ai-companion/soul-engine build
```

构建后会生成 `dist/` 目录，包含 `.mjs` 和 `.d.mts` 文件。

### Q4: 数据库连接失败

确保 PostgreSQL 正在运行，且 `DATABASE_URL` 配置正确：

```bash
# 检查 PostgreSQL 状态
pg_isready

# 检查连接字符串
# 格式：postgresql://user:password@host:port/database
```

### Q5: 前端 API 请求 404

前端通过 Vite Dev Server 代理 `/api` 请求到后端 `:3002`。确保：

1. 后端已启动在 3002 端口
2. 检查 `apps/stage-web/vite.config.ts` 中的 proxy 配置

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3002',
    changeOrigin: true,
  },
}
```

### Q6: 端口 3000 被占用

端口 3000 可能被 OpenClaw 服务占用。后端默认使用 3002，前端默认使用 5173。如需修改：

- 后端端口：修改 `.env.local` 中的 `PORT`
- 前端端口：`corepack pnpm dev:web -- --port 8080`

### Q7: 类型检查报错

```bash
# 全量类型检查
corepack pnpm typecheck

# 单包类型检查
corepack pnpm -F @ai-companion/soul-engine typecheck
```

### Q8: 环境变量不生效

服务端使用 `@dotenvx/dotenvx` 管理环境变量，优先级为：

1. `.env.local`（最高，被 gitignore）
2. `.env`（基础配置）
3. 系统环境变量

---

## 5. 测试运行方法

### 5.1 全量测试

```bash
# 运行所有测试（soul-engine + server + 其他包）
corepack pnpm test:run

# 带覆盖率
corepack pnpm test
```

### 5.2 单包测试

```bash
# soul-engine 测试（559 用例）
corepack pnpm -F @ai-companion/soul-engine test

# soul-engine watch 模式
corepack pnpm -F @ai-companion/soul-engine test:watch
```

### 5.3 测试文件说明

**soul-engine 测试** (`packages/soul-engine/tests/`):

| 文件 | 覆盖范围 |
|------|---------|
| `trust.test.ts` | 签到/衰减/等级/冷却/动摇 |
| `economy.test.ts` | 充值/送礼/零花钱/限额 |
| `surprise.test.ts` | 阈值触发/预算/冷却/类型选择 |
| `demo.test.ts` | 7天引导/赠金/惊喜/转化 |
| `emotion.test.ts` | 8种情感映射/Live2D参数 |
| `appearance.test.ts` | 外观等级/服装解锁 |
| `user-journey.test.ts` | 完整用户旅程端到端 |

**server 测试** (`apps/server/src/__tests__/`):

| 文件 | 覆盖范围 |
|------|---------|
| `truth-table-consistency.test.ts` | 引擎常量与 TRUTH_TABLE 一致性 |
| `api-integration.test.ts` | API 端点集成测试 |
| `openclaw-stability.test.ts` | OpenClaw 连接稳定性 |

### 5.4 Vitest 配置

测试项目在根目录 `vitest.config.ts` 中配置：

```typescript
export default defineConfig({
  test: {
    projects: [
      'apps/server',
      'apps/stage-tamagotchi',
      'packages/stage-ui',
      'packages/plugin-sdk',
      'packages/vite-plugin-warpdrive',
      'packages/audio-pipelines-transcribe',
      'packages/server-runtime',
      'packages/soul-engine',  // 核心测试项目
    ],
  },
})
```

---

## 6. 调试技巧

### 6.1 后端调试

**日志系统**：使用 `@guiiai/logg`，输出 Pretty 格式：

```typescript
import { useLogger } from '@guiiai/logg'
const logger = useLogger('my-module').useGlobalConfig()
logger.log('message')
logger.withFields({ key: 'value' }).log('structured log')
logger.withError(err).error('error occurred')
```

**API 错误处理**：自定义 `ApiError` 类，统一返回格式：

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

**数据库调试**：
```bash
# 查看 Drizzle 生成的 SQL
# 在 drizzle.config.ts 中启用 logger

# 直接查询数据库
psql ai_companion_dev -c "SELECT * FROM wallets LIMIT 5"
```

### 6.2 前端调试

**Vue DevTools**：已集成 `vite-plugin-vue-devtools`，开发模式自动启用。

**Pinia DevTools**：可在 Vue DevTools 中查看所有 Store 状态。

**前端 DevTools 页面**：项目内置多个调试页面：
- `/devtools/audio-record` — 音频录制调试
- `/devtools/performance-playground` — 性能测试
- `/devtools/model-driver-mediapipe` — MediaPipe 驱动调试
- `/devtools/gesture-circle` — 手势识别

**网络调试**：
```bash
# 查看后端所有注册路由
# 后端启动日志会输出所有路由

# 测试 API
curl -X POST http://localhost:3002/api/trust/checkin \
  -H "Content-Type: application/json" \
  -d '{"characterId":"test-char-id"}'
```

### 6.3 OpenClaw 调试

```bash
# 检查 OpenClaw 连接状态
curl http://localhost:3002/api/chat/status

# 期望响应：
# {
#   "channel": "openclaw" | "fallback",
#   "openclaw": { "connected": true/false, "shouldFallback": true/false }
# }
```

### 6.4 soul-engine 调试

```typescript
// 在测试中直接调用引擎函数
import { calculateDailyTrust, determineTrustLevel } from '@ai-companion/soul-engine'

// 快速验证数值
const trust = calculateDailyTrust({
  checkedInToday: true,
  streakDays: 7,
  isMonthlyCard: false,
  isPaused: false,
  todayChatRounds: 10,
  todayMaxSessionRounds: 10,
  deepChatRewardedToday: false,
  sharedMoodToday: false,
  dailyTasksCompleted: 0,
  todayGiftTrust: 0,
  hasDoubleCard: false,
  isDemo: false,
})
console.log(`Daily trust: ${trust}`)
```

---

## 附录 A: 环境变量完整列表

| 变量名 | 必选 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | 是 | - | PostgreSQL 连接字符串 |
| `PORT` | 否 | `3002` | 后端监听端口 |
| `API_SERVER_URL` | 否 | `http://localhost:3002` | 后端 URL |
| `OPENCLAW_URL` | 否 | - | OpenClaw WebSocket URL |
| `OPENCLAW_TOKEN` | 否 | - | OpenClaw Gateway Token |
| `OPENROUTER_API_KEY` | 否 | - | OpenRouter LLM API Key |
| `OPENROUTER_BASE_URL` | 否 | `https://openrouter.ai/api/v1` | OpenRouter API 地址 |
| `OPENROUTER_MODEL` | 否 | `anthropic/claude-sonnet-4` | 默认 LLM 模型 |
| `COSYVOICE_API_KEY` | 否 | - | CosyVoice TTS API Key |
| `COSYVOICE_API_URL` | 否 | 阿里云 DashScope | CosyVoice API 地址 |
| `AUTH_GOOGLE_CLIENT_ID` | 否 | `not-configured` | Google OAuth Client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | 否 | `not-configured` | Google OAuth Secret |
| `AUTH_GITHUB_CLIENT_ID` | 否 | `not-configured` | GitHub OAuth Client ID |
| `AUTH_GITHUB_CLIENT_SECRET` | 否 | `not-configured` | GitHub OAuth Secret |

---

## 附录 B: 常用命令速查

```bash
# ── 安装与构建 ──
corepack pnpm install --ignore-scripts     # 安装依赖
corepack pnpm build:packages               # 构建所有 packages
corepack pnpm -F @ai-companion/soul-engine build  # 构建引擎

# ── 开发启动 ──
corepack pnpm dev:server                   # 后端 dev
corepack pnpm dev:web                      # 前端 dev
corepack pnpm dev:apps                     # 所有 apps 并行 dev

# ── 测试 ──
corepack pnpm test:run                     # 全量测试
corepack pnpm -F @ai-companion/soul-engine test  # 引擎测试

# ── 代码质量 ──
corepack pnpm lint                         # ESLint 检查
corepack pnpm lint:fix                     # ESLint 自动修复
corepack pnpm typecheck                    # TypeScript 类型检查

# ── 数据库 ──
cd apps/server
corepack pnpm run apply:env -- drizzle-kit push       # 推送 Schema
corepack pnpm run apply:env -- drizzle-kit generate    # 生成迁移

# ── 杂项 ──
corepack pnpm knip                         # 检查未使用的代码
corepack pnpm up                           # 更新依赖
```
