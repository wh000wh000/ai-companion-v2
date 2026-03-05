# 伪春菜 v2 — 项目现状总览

> 最后更新：2026-03-05
> 基线版本：v0.8.5-beta.3（基于 AIRI Fork）
> 开发阶段：12轮蜂群全部完成，进入稳定化阶段

---

## 1. 技术架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          客户端层 (Client Layer)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  stage-web   │  │stage-pocket  │  │stage-tamagot-│               │
│  │  (Vue 3 SPA) │  │(Capacitor/   │  │  chi(Electron│               │
│  │  PWA 支持    │  │   iOS)       │  │  桌面版)     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │ HTTP/SSE        │                  │                       │
│         └────────┬────────┴──────────────────┘                       │
└─────────────────┬───────────────────────────────────────────────────┘
                  │  /api/*  (Vite Dev Proxy → :3002)
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        服务端层 (Server Layer)                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Hono Server (:3002)                       │    │
│  │                                                             │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐  │    │
│  │  │ Auth   │ │ Chat   │ │ Wallet │ │ Trust   │ │Surprise│  │    │
│  │  │(better-│ │(SSE流式│ │(充值/  │ │(签到/   │ │(阈值/  │  │    │
│  │  │ auth)  │ │ 对话)  │ │ 送礼)  │ │ 衰减)   │ │ 冷却)  │  │    │
│  │  └────────┘ └────────┘ └────────┘ └─────────┘ └────────┘  │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐  │    │
│  │  │Payment │ │ TTS    │ │ Memory │ │ Skills  │ │Channel │  │    │
│  │  │(Mock/  │ │(CosyV2 │ │(保存/  │ │(Agent   │ │Sync    │  │    │
│  │  │微信/支 │ │ Lv7+)  │ │ 搜索)  │ │ HTTP)   │ │(绑定)  │  │    │
│  │  │付宝)   │ │        │ │        │ │         │ │        │  │    │
│  │  └────────┘ └────────┘ └────────┘ └─────────┘ └────────┘  │    │
│  │  ┌────────┐ ┌────────┐ ┌─────────────────────┐             │    │
│  │  │  O2O   │ │Proact- │ │  OpenRouter (降级   │             │    │
│  │  │(选品/  │ │ive    │ │  LLM 通道)          │             │    │
│  │  │ 推送)  │ │(主动消│ │                     │             │    │
│  │  │        │ │ 息)    │ │                     │             │    │
│  │  └────────┘ └────────┘ └─────────────────────┘             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                          │                                          │
│              ┌───────────┼───────────┐                              │
│              ▼           ▼           ▼                              │
│  ┌──────────────┐ ┌───────────┐ ┌──────────────┐                   │
│  │  PostgreSQL  │ │ OpenClaw  │ │  OpenRouter   │                   │
│  │  (Drizzle    │ │ Agent     │ │  LLM API      │                   │
│  │   ORM)       │ │(WS JSON-  │ │(Fallback)     │                   │
│  │              │ │  RPC)     │ │               │                   │
│  └──────────────┘ └───────────┘ └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        引擎层 (Engine Layer)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               @ai-companion/soul-engine                      │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ Trust    │ │ Economy  │ │ Surprise │ │ Demo     │       │   │
│  │  │ 信赖引擎 │ │ 经济引擎 │ │ 惊喜引擎 │ │ 体验引擎 │       │   │
│  │  │ 10级体系 │ │ 7档充值  │ │ 确定性   │ │ 7天引导  │       │   │
│  │  │ 衰减+冷却│ │ 4档送礼  │ │ 阈值触发 │ │ 转化漏斗 │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │  ┌──────────┐ ┌──────────┐                                  │   │
│  │  │Appearance│ │ Emotion  │                                  │   │
│  │  │外观等级  │ │ 情感映射 │                                  │   │
│  │  │ 服装解锁 │ │ Live2D   │                                  │   │
│  │  └──────────┘ └──────────┘                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 目录结构说明

### 2.1 应用层 `apps/`

| 目录 | 包名 | 职责 |
|------|------|------|
| `apps/server` | `@proj-airi/server` | Hono 后端服务，14 个路由模块，injeca DI 容器，PostgreSQL + Drizzle ORM |
| `apps/stage-web` | `@proj-airi/stage-web` | Vue 3 SPA 主前端，Pinia 状态管理，PWA 支持，Live2D/VRM 3D 渲染 |
| `apps/stage-tamagotchi` | `@proj-airi/stage-tamagotchi` | Electron 桌面版，含 main/preload/renderer 三层结构 |
| `apps/stage-pocket` | `@proj-airi/stage-pocket` | iOS 移动端（Capacitor），Vue 3 + 原生桥接 |
| `apps/component-calling` | `@proj-airi/component-calling` | AIRI 原有实时音频通话组件 |

### 2.2 核心包 `packages/`

| 目录 | 包名 | 职责 |
|------|------|------|
| `packages/soul-engine` | `@ai-companion/soul-engine` | **核心差异化** -- 信赖/经济/惊喜/Demo/外观/情感 6 大子系统 |
| `packages/core-character` | `@proj-airi/core-character` | AIRI 原有角色核心逻辑 |
| `packages/stage-ui` | `@proj-airi/stage-ui` | 共享 UI 组件库（按钮/对话框/卡片等） |
| `packages/stage-ui-live2d` | `@proj-airi/stage-ui-live2d` | Live2D Cubism 渲染引擎集成 |
| `packages/stage-ui-three` | `@proj-airi/stage-ui-three` | Three.js VRM 模型渲染 |
| `packages/stage-layouts` | `@proj-airi/stage-layouts` | 页面布局组件 |
| `packages/stage-pages` | `@proj-airi/stage-pages` | 共享页面组件 |
| `packages/stage-shared` | `@proj-airi/stage-shared` | 前端共享工具/常量 |
| `packages/server-schema` | `@proj-airi/server-schema` | AIRI 原有 Drizzle 表定义 |
| `packages/server-sdk` | `@proj-airi/server-sdk` | 前端调用后端的 SDK |
| `packages/server-runtime` | `@proj-airi/server-runtime` | 服务端运行时 |
| `packages/server-shared` | `@proj-airi/server-shared` | 服务端共享工具 |
| `packages/i18n` | `@proj-airi/i18n` | 国际化，支持 9 种语言（zh-Hans/zh-Hant/en/ja/ko/fr/es/ru/vi） |
| `packages/memory-pgvector` | `@proj-airi/memory-pgvector` | pgvector 向量记忆（预留） |
| `packages/audio` | `@proj-airi/audio` | 音频处理 |
| `packages/pipelines-audio` | `@proj-airi/pipelines-audio` | 音频管线 |
| `packages/stream-kit` | `@proj-airi/stream-kit` | 流式通信工具包 |
| `packages/ui` | `@proj-airi/ui` | 基础 UI 原子组件 |
| `packages/plugin-sdk` | `@proj-airi/plugin-sdk` | 插件 SDK |
| `packages/plugin-protocol` | `@proj-airi/plugin-protocol` | 插件协议定义 |

### 2.3 OpenClaw 集成 `openclaw/`

| 目录 | 职责 |
|------|------|
| `openclaw/agents/` | 6 个角色人格模板（xiaoxing/xiaonuan/keke/shizhi/bingtang/alie），每个含 SOUL.md |
| `openclaw/skills/` | 8 个 Agent 技能（trust-engine, economy-engine, surprise-engine, memory-manager, memory-search, product-selector, meituan-order, proactive-message） |
| `openclaw/channels/` | 渠道适配器配置（预留） |

### 2.4 其他目录

| 目录 | 职责 |
|------|------|
| `integrations/` | AIRI 原有集成（discord-bot, telegram-bot, vscode, minecraft 等） |
| `services/` | AIRI 原有外部服务 |
| `crates/` | Rust crates（AIRI 原有） |
| `plugins/` | Vite/构建插件 |
| `docs/` | 文档站（VitePress） |
| `scripts/` | 构建脚本 |

---

## 3. 已完成功能清单

### 3.1 灵魂经济引擎 `@ai-companion/soul-engine`

| 功能模块 | 验证状态 | 说明 |
|---------|---------|------|
| 信赖 10 级等级体系 | 已验证 | 阈值 0/100/350/700/1200/2000/3500/6000/10000/16000 |
| 每日签到 + 连续签到加成 | 已验证 | 3天+3, 7天+8, 14天+15, 21天+20, 30天+30（上限50） |
| 信赖衰减（分段累计） | 已验证 | 普通4天宽限/月卡7天，超出后分段加速 |
| 衰减下限 + 动摇状态 | 已验证 | 衰减只掉点数不掉等级 |
| 升级冷却天数 | 已验证 | Lv5:3天, Lv6:5天, Lv7-8:7天, Lv9:14天, Lv10:21天 |
| 充值 7 档（1-648元） | 已验证 | 首充翻倍 |
| 送礼 4 档 | 已验证 | 小心意10/暖暖的50/超爱你200/一辈子520 |
| 零花钱分成 | 已验证 | 普通40%/月卡50%/年卡60% |
| 惊喜确定性阈值触发 | 已验证 | 零概率/零 random |
| 惊喜预算控制 + 冷却 | 已验证 | 月度预算 + 最小间隔天数 |
| Demo 7 天引导 | 已验证 | 每日配置 + 信赖 8 倍率 + 赠金 + Demo 惊喜 |
| 外观等级解锁 | 已验证 | 按信赖等级解锁服装/配饰 |
| 情感->Live2D 映射 | 已验证 | 8 种情感状态映射动作组 + 表情参数 |

**测试覆盖**：559 个 soul-engine 测试用例 + 7 个测试文件（trust/economy/surprise/demo/emotion/appearance/user-journey）

### 3.2 服务端 `apps/server`

| 路由模块 | 端点数 | 验证状态 | 说明 |
|---------|-------|---------|------|
| Auth | 2 | 已验证 | better-auth（Google/GitHub OAuth + 邮箱密码） |
| Characters | ~4 | 已验证 | CRUD + 6 角色模板 |
| Chat | 2 | 已验证 | 双通道 SSE 流式（OpenClaw + OpenRouter fallback） |
| Chats | ~3 | 已验证 | 会话管理 |
| Wallet | 4 | 已验证 | 余额/充值/送礼/交易记录 |
| Trust | 3 | 已验证 | 查询/签到/手动更新 |
| Surprises | 3 | 已验证 | 查询/触发检查/状态更新 |
| Payment | 5 | 部分验证 | 创建订单/微信回调/支付宝回调/查询/Mock支付 |
| TTS | 2 | 部分验证 | 合成(Lv7+门控)/音色列表，CosyVoice API 待配置 |
| Memory | 4 | 已验证 | 保存/搜索/最近/删除 |
| Skills | 11 | 已验证 | 信赖/经济/惊喜/记忆的 Agent HTTP API |
| O2O | 3 | 部分验证 | 智能选品/链接生成/惊喜推送 |
| Proactive | 2 | 已验证 | 主动消息推送/状态查询 |
| Channel Sync | 4 | 已验证 | 绑定/查询/解绑/解析 |
| Providers | ~3 | 已验证 | LLM 提供者管理 |

**总计**：14 个路由模块，50+ API 端点

**数据库表**：12 张（accounts/user/session + characters + chats + wallets + transactions + trust_records + surprises + memories + payment_orders + channel_bindings + providers）

**服务端测试**：131 个测试用例 + 3 个集成测试文件

### 3.3 前端 `apps/stage-web`

| 页面 | 路由 | 验证状态 | 说明 |
|------|------|---------|------|
| 主页 | `/` | 已验证 | Live2D/VRM 角色展示 + 聊天 |
| 登录 | `/auth/login` | 已验证 | OAuth + 邮箱注册 |
| 认证 | `/auth` | 已验证 | 认证入口 |
| 引导 | `/onboarding` | 已验证 | 新手引导流程 |
| 钱包 | `/wallet` | 已验证 | 余额展示 + 零花钱 |
| 充值 | `/wallet/charge` | 已验证 | 7 档充值选择 |
| 交易记录 | `/wallet/history` | 已验证 | 分页加载 |
| 惊喜 | `/surprises` | 已验证 | 惊喜记录 + 筛选 + 反馈 |
| 角色管理 | `/settings/characters` | 已验证 | 创建/编辑/切换角色 |
| 系统设置 | `/settings/system` | 已验证 | 系统配置 |
| 开发者工具 | `/devtools/*` | 已验证 | 音频/性能/手势等调试页面 |

**前端 Store**：7 个（wallet / trust / surprise / demo / background / pwa / devtools-lag）

---

## 4. 已知问题与技术债

### 4.1 架构级别

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| pgvector 未集成 | 中 | `memories` 表中 `embedding` 字段已注释，记忆搜索目前为文本匹配非语义搜索 |
| TTS 仅 Mock 模式 | 中 | CosyVoice API Key 未配置时返回空音频，前端调试可用但无实际语音 |
| 支付仅 Mock 通道 | 中 | 微信/支付宝回调路由已实现但签名验证为占位，仅 Mock 支付可用 |
| Electron 构建需翻墙 | 低 | electron 依赖下载需代理，通过 `--ignore-scripts` 绕过 |

### 4.2 代码级别

| 问题 | 位置 | 说明 |
|------|------|------|
| Skills 路由 MemorySearchSchema 缺少 characterId | `routes/skills.ts:42` | 使用 `as any` 兜底，应更新 Schema |
| 前端 Trust Store sendGift 路由不一致 | `stores/trust.ts:123` | 调用 `/api/trust/gift` 但路由实际在 `/api/wallet/gift` |
| OpenClaw stub 连接地址 | `app.ts:299` | 未配置时使用 `ws://localhost:0`，会产生告警日志 |
| 缺少请求超时配置 | 全局 | OpenRouter / CosyVoice 外部 API 调用缺少超时设置 |
| 交易幂等键未持久化 | `services/economy.ts` | 幂等检查依赖内存 Map，服务重启后失效 |

### 4.3 测试缺口

| 区域 | 说明 |
|------|------|
| 前端组件测试 | 无 Vue 组件单元测试 |
| E2E 测试 | 无自动化端到端测试 |
| 支付回调测试 | 微信/支付宝回调签名验证无测试覆盖 |
| WebSocket 测试 | ws-push 推送功能无自动化测试 |

---

## 5. 环境依赖

### 5.1 运行时要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | v24.13.0 (当前) | 需 v18+ |
| pnpm | 10.30.3 | 通过 corepack 管理，bash 中需用 `corepack pnpm` |
| PostgreSQL | 15+ | Drizzle ORM 管理 Schema |
| TypeScript | ~5.9.3 | |

### 5.2 构建工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Vite | ^7.3.1 (web) / ^8.0.0-beta.15 (catalog) | 前端构建 |
| tsdown | ^0.20.3 | soul-engine 打包（.mjs + .d.mts） |
| turbo | ^2.8.11 | monorepo 构建编排 |
| Drizzle Kit | ^0.31.9 | 数据库迁移工具 |

### 5.3 外部服务

| 服务 | 必选 | 环境变量 | 说明 |
|------|------|---------|------|
| PostgreSQL | 是 | `DATABASE_URL` | 主数据库 |
| OpenClaw | 否 | `OPENCLAW_URL` + `OPENCLAW_TOKEN` | Agent 平台（NAS 192.168.3.196:3000） |
| OpenRouter | 否 | `OPENROUTER_API_KEY` | 降级 LLM 通道 |
| CosyVoice V2 | 否 | `COSYVOICE_API_KEY` | TTS 语音合成（阿里云 DashScope） |
| Google OAuth | 否 | `AUTH_GOOGLE_CLIENT_ID/SECRET` | 第三方登录 |
| GitHub OAuth | 否 | `AUTH_GITHUB_CLIENT_ID/SECRET` | 第三方登录 |

---

## 6. 启动步骤

### 6.1 前置条件

```bash
# 1. 确保 Node.js >= 18 已安装
node -v

# 2. 启用 corepack（pnpm 通过 corepack 管理）
corepack enable

# 3. 准备 PostgreSQL 数据库
# 创建数据库（如 ai_companion_dev）
createdb ai_companion_dev
```

### 6.2 安装依赖

```bash
cd ai-companion-v2

# 安装依赖（跳过 electron 二进制下载）
corepack pnpm install --ignore-scripts
```

### 6.3 配置环境变量

```bash
# 创建服务端环境文件
cp apps/server/.env apps/server/.env.local  # 如有模板

# 必填项：
# DATABASE_URL=postgresql://user:pass@localhost:5432/ai_companion_dev

# 可选项（按需配置）：
# PORT=3002
# OPENCLAW_URL=ws://192.168.3.196:3000
# OPENCLAW_TOKEN=your-gateway-token
# OPENROUTER_API_KEY=your-openrouter-key
# COSYVOICE_API_KEY=your-cosyvoice-key
# AUTH_GOOGLE_CLIENT_ID=xxx
# AUTH_GOOGLE_CLIENT_SECRET=xxx
```

### 6.4 构建核心包

```bash
# 构建 soul-engine（其他包依赖此包）
corepack pnpm -F @ai-companion/soul-engine build

# 构建所有 packages
corepack pnpm build:packages
```

### 6.5 推送数据库 Schema

```bash
cd apps/server
corepack pnpm run apply:env -- drizzle-kit push
```

### 6.6 启动开发服务器

```bash
# 终端 1：启动后端
corepack pnpm dev:server
# → 监听 http://localhost:3002

# 终端 2：启动前端
corepack pnpm dev:web
# → 监听 http://localhost:5173（Vite 自动代理 /api → :3002）
```

### 6.7 验证启动

```bash
# 健康检查
curl http://localhost:3002/health
# 期望：{"status":"ok"}

# 前端
# 浏览器打开 http://localhost:5173
```

### 6.8 运行测试

```bash
# 全量测试
corepack pnpm test:run

# 仅 soul-engine 测试
corepack pnpm -F @ai-companion/soul-engine test
```
