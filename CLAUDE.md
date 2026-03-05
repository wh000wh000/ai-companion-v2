# 伪春菜 v2 — 项目指令

## 项目概述
基于AIRI Fork的伪春菜平台，核心差异化为灵魂经济系统。
技术栈：Vue 3 + Hono + Drizzle + PostgreSQL + Electron + Capacitor

## 权威文档
- `docs/TRUTH_TABLE.md` — 唯一权威数值真值表，所有代码实现以此为准
- `docs/ROADMAP_v3.md` — 12轮蜂群执行路线图
- `docs/SWARM_PLAN.md` — 每轮蜂群节点详细计划
- `docs/ROUND_STATUS.md` — 进度追踪

## 核心包
- `packages/soul-engine/` — 灵魂经济引擎（信赖/经济/惊喜/Demo）
  - 411测试全绿，TRUTH_TABLE数值对齐验证
  - 使用tsdown构建，输出ESM (.mjs + .d.mts)

## 开发规范

### 命名约定
- 包名：`@ai-companion/xxx`（原AIRI包保持`@proj-airi/xxx`）
- 新Schema使用text PK + nanoid（遵循AIRI约定）
- 新Service使用createXxxService工厂模式 + injeca DI

### 构建
- `corepack pnpm install --ignore-scripts` — 安装依赖（跳过electron下载）
- `corepack pnpm -F @ai-companion/soul-engine build` — 构建soul-engine
- `corepack pnpm -F @ai-companion/soul-engine test` — 运行测试

### 重要约束
- 金额相关操作必须使用PostgreSQL事务 + SELECT FOR UPDATE
- 惊喜系统零概率/零random — 仅确定性阈值触发
- 情感状态不含angry/sad — 不惩罚用户
- 信赖衰减只掉点数不掉等级
- 所有数值修改必须先更新TRUTH_TABLE.md

### 蜂群执行原则
- 每轮启动前：读取 SWARM_PLAN.md 对应Round
- 每轮结束后：更新 ROUND_STATUS.md
- 质量门禁：pnpm build零错误 + pnpm test全绿 + 新API有zod校验
- 失败立停：任何门禁不通过不进入下一轮

### OpenClaw集成（Round 7+）
- 运行在NAS 192.168.3.196:3000
- WebSocket JSON-RPC协议（非REST）
- Skill=Prompt注入模式（Agent通过curl调用引擎HTTP API）
- 需要Gateway Token + Device Pairing

## 文件结构
```
ai-companion-v2/
├── packages/
│   ├── soul-engine/          # 我们的核心差异化
│   ├── core-character/       # AIRI原有
│   ├── stage-ui-live2d/      # AIRI Live2D
│   ├── server-schema/        # Drizzle表（Round 2扩展）
│   └── ...
├── apps/
│   ├── server/               # Hono服务端（Round 2扩展）
│   ├── stage-web/            # Vue 3 SPA（Round 3+扩展）
│   ├── stage-tamagotchi/     # Electron桌面
│   └── stage-pocket/         # iOS Capacitor
├── docs/
│   ├── TRUTH_TABLE.md        # 权威数值
│   ├── ROADMAP_v3.md         # 路线图
│   ├── SWARM_PLAN.md         # 蜂群计划
│   └── ROUND_STATUS.md       # 进度追踪
└── CLAUDE.md                 # 本文件
```
