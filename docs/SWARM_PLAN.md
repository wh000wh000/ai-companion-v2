# 伪春菜 — 蜂群节点执行计划

> 日期：2026-03-04
> 状态：**执行就绪**
> 关联：ROADMAP_v3.md / TRUTH_TABLE.md / AIRI_MERGER_ANALYSIS.md

---

## 蜂群执行概览

| 属性 | 值 |
|------|------|
| 总轮次 | 12轮（Round 1 ~ Round 12） |
| 总Agent任务 | 约27个并行Agent |
| 覆盖里程碑 | v1.5 → v2.0 → v2.5 → v3.0 |
| 预估总周期 | 10-12周 |
| 代码库 | `C:/Users/wh000/Desktop/tansuo/ai-companion-v2/`（AIRI Fork） |

### 执行原则

1. **并行优先**：同一轮内无数据依赖的Agent并行执行，最大化吞吐
2. **每轮质量门禁**：本轮所有Agent完成 + 门禁全部通过，才能进入下一轮
3. **失败立停**：任何Agent产出导致 `pnpm build` 失败，立即暂停修复，不带病前进
4. **增量验证**：每个Agent完成后独立验证，不等全部完成才测
5. **文件路径精确**：所有输入/输出路径精确到文件级别，消除歧义

### 里程碑与轮次映射

```
Round 1      ── v1.5 基础 ──  Fork + Soul Engine包       [已完成]
Round 2-3    ── v1.5 核心 ──  DB Schema + API + 前端UI
Round 4-5    ── v2.0 感官 ──  情感映射 + 外观 + 惊喜 + Demo
Round 6      ── v2.0 验证 ──  E2E + 三端适配
Round 7-8    ── v2.5 大脑 ──  OpenClaw Agent + 引擎迁移
Round 9      ── v2.5 自主 ──  Cron + 记忆 + 主动消息
Round 10     ── v2.5 验证 ──  语音 + 本地化
Round 11     ── v3.0 商业 ──  真实支付 + O2O
Round 12     ── v3.0 终局 ──  多渠道 + 桌面 + 终极验证
```

---

## Round 1: Fork + Soul Engine 包

### 元信息

| 属性 | 值 |
|------|------|
| 状态 | **已完成** |
| 并行数 | 3 |
| 预估耗时 | 1会话 |
| 前置依赖 | 无 |
| 里程碑 | v1.5 基础 |
| 阻塞风险 | 无 |

### Agent 分配

#### Agent-A: Fork 工程师
- **subagent_type**: general-purpose
- **输入**: AIRI 原始仓库 `C:/Users/wh000/Desktop/tansuo/airi-research/`
- **任务清单**:
  1. Fork AIRI 仓库到 `C:/Users/wh000/Desktop/tansuo/ai-companion-v2/`
  2. 验证 monorepo 结构完整（apps/ packages/ pnpm-workspace.yaml）
  3. 运行 `pnpm install` + `pnpm build` 确认基线通过
- **输出**: `ai-companion-v2/` 完整目录
- **验证命令**: `cd ai-companion-v2 && pnpm build`

#### Agent-B: Soul Engine 包工程师
- **subagent_type**: general-purpose
- **输入**:
  - `docs/TRUTH_TABLE.md`（数值权威来源）
  - `docs/NUMERICAL_DESIGN.md`（精调数值）
  - `docs/PLAN_v2.md`（分成/确定性触发决策）
- **任务清单**:
  1. 创建 `packages/soul-engine/` 包结构
  2. 实现 4 个引擎：trust/calculator.ts, economy/engine.ts, surprise/engine.ts, demo/manager.ts
  3. 实现 4 个类型文件：types/character.ts, types/wallet.ts, types/surprise.ts, types/subscription.ts
  4. 实现 types/index.ts 统一导出 + 所有常量配置
  5. 实现 src/index.ts 包入口
- **输出**:
  - `packages/soul-engine/src/trust/calculator.ts`
  - `packages/soul-engine/src/economy/engine.ts`
  - `packages/soul-engine/src/surprise/engine.ts`
  - `packages/soul-engine/src/demo/manager.ts`
  - `packages/soul-engine/src/types/character.ts`
  - `packages/soul-engine/src/types/wallet.ts`
  - `packages/soul-engine/src/types/surprise.ts`
  - `packages/soul-engine/src/types/subscription.ts`
  - `packages/soul-engine/src/types/index.ts`
  - `packages/soul-engine/src/index.ts`
  - `packages/soul-engine/package.json`
  - `packages/soul-engine/tsconfig.json`
- **验证命令**: `cd packages/soul-engine && pnpm build && pnpm tsc --noEmit`

#### Agent-C: 数值验证工程师
- **subagent_type**: general-purpose
- **输入**:
  - `docs/TRUTH_TABLE.md`
  - Agent-B 产出的引擎代码
- **任务清单**:
  1. 编写 411 个单元测试覆盖所有数值逻辑
  2. 验证 10 级阈值、4 档送礼、7 档充值、衰减公式、Demo 参数
  3. 验证确定性触发（零 Math.random）
  4. 验证消费限额（年龄分层）
- **输出**: `packages/soul-engine/src/__tests__/` 测试套件
- **验证命令**: `cd packages/soul-engine && pnpm test`

### 实际产出（已确认）

- [x] `ai-companion-v2/` 目录完整（AIRI Fork）
- [x] `packages/soul-engine/` 包（4引擎 + 4类型 + index）
- [x] 411 测试全绿
- [x] `pnpm build` + `tsc --noEmit` 零错误

### 质量门禁

- [x] pnpm build 全通
- [x] 411 单元测试全绿
- [x] 所有数值与 TRUTH_TABLE.md 一致
- [x] 零 Math.random() 调用
- [x] TypeScript 零错误

---

## Round 2: DB Schema 扩展 + API 路由

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 3 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 1（soul-engine 包） |
| 里程碑 | v1.5 |
| 阻塞风险 | Agent-B 依赖 Agent-A 的 schema 定义；Agent-C 依赖 Agent-B 的 route 文件。建议 A 先行 15 分钟 |

### Agent 分配

#### Agent-A: Schema 扩展工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI 现有 schema 模式: `apps/server/src/schemas/characters.ts`（text PK + nanoid 约定）
  - AIRI schema 导出: `apps/server/src/schemas/index.ts`
  - `docs/TRUTH_TABLE.md`（数值参考）
  - `packages/soul-engine/src/types/`（表结构参考）
  - AIRI 的 nanoid 工具: `apps/server/src/utils/id.ts`
  - AIRI 的 user 表: `apps/server/src/schemas/accounts.ts`（FK 参考）
- **任务清单**:
  1. 创建 `apps/server/src/schemas/wallets.ts`:
     ```
     wallets 表:
     - id: text PK (nanoid)
     - userId: text FK→user, unique
     - coinBalance: integer (爱心币余额)
     - pocketMoney: integer (零花钱余额，单位：分)
     - isFirstCharge: boolean (default true)
     - subscriptionTier: text (none/monthly/quarterly/yearly)
     - totalCharged: integer (累计充值金额，分)
     - totalGifted: integer (累计送礼爱心币)
     - costumeTickets: integer (服装券数量)
     - createdAt: timestamp
     - updatedAt: timestamp
     ```
  2. 创建 `apps/server/src/schemas/transactions.ts`:
     ```
     transactions 表:
     - id: text PK (nanoid)
     - userId: text FK→user
     - type: text (charge/gift/surprise_spend/subscription/costume_ticket)
     - amount: integer (金额，分)
     - coins: integer (涉及的爱心币数)
     - pocketGain: integer (零花钱增量，分)
     - trustGain: integer (信赖值增量)
     - description: text
     - idempotencyKey: text (幂等键, unique)
     - createdAt: timestamp
     ```
  3. 创建 `apps/server/src/schemas/trust-records.ts`:
     ```
     trust_records 表:
     - id: text PK (nanoid)
     - characterId: text FK→characters
     - userId: text FK→user
     - trustPoints: integer (当前信赖值)
     - trustLevel: integer (当前等级 1-10)
     - streakDays: integer (连续签到天数)
     - lastInteractAt: timestamp
     - daysAtCurrentLevel: integer
     - isShaken: boolean (是否"动摇中")
     - createdAt: timestamp
     - updatedAt: timestamp
     unique约束: (characterId, userId)
     ```
  4. 创建 `apps/server/src/schemas/surprises.ts`:
     ```
     surprises 表:
     - id: text PK (nanoid)
     - characterId: text FK→characters
     - userId: text FK→user
     - type: text (virtual/electronic/physical/personalized)
     - productName: text
     - productUrl: text (nullable)
     - amount: integer (花费，分)
     - status: text (pending/sent/clicked/completed)
     - message: text (角色的惊喜话术)
     - feedback: text (nullable, 用户反馈)
     - createdAt: timestamp
     ```
  5. 更新 `apps/server/src/schemas/index.ts` 导出全部新 schema
  6. 为每个新表定义 `relations()` 关联到 user / characters
- **输出**:
  - `apps/server/src/schemas/wallets.ts`
  - `apps/server/src/schemas/transactions.ts`
  - `apps/server/src/schemas/trust-records.ts`
  - `apps/server/src/schemas/surprises.ts`
  - 修改 `apps/server/src/schemas/index.ts`
- **验证命令**: `cd apps/server && pnpm build && pnpm tsc --noEmit`

#### Agent-B: Hono Service + Route 工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI service 模式: `apps/server/src/services/characters.ts`（createXxxService 工厂 + injeca DI）
  - AIRI route 模式: `apps/server/src/routes/characters.ts`（Hono + valibot 校验 + authGuard）
  - AIRI DI 注册: `apps/server/src/app.ts`（injeca.provide 模式）
  - soul-engine 包: `packages/soul-engine/src/index.ts`（import @ai-companion/soul-engine）
  - Agent-A 的新 schema 定义
- **任务清单**:
  1. 创建 `apps/server/src/services/economy.ts`:
     ```typescript
     export function createEconomyService(db: Database) {
       return {
         // 充值处理：验证金额→创建交易→更新钱包→首充判定
         async processCharge(userId, packId, idempotencyKey): Promise<ChargeResult>
         // 送礼处理：验证余额→原子扣减→零花钱分成→信赖增益→创建交易
         async processGift(userId, characterId, giftTier, idempotencyKey): Promise<GiftSendResult>
         // 查询钱包
         async getWallet(userId): Promise<Wallet>
         // 初始化钱包（新用户）
         async initWallet(userId): Promise<Wallet>
         // 查询交易记录
         async getTransactions(userId, limit, offset): Promise<Transaction[]>
       }
     }
     ```
  2. 创建 `apps/server/src/services/trust.ts`:
     ```typescript
     export function createTrustService(db: Database) {
       return {
         // 应用信赖变更（送礼/签到/对话等事件）
         async applyTrustChange(userId, characterId, event): Promise<TrustChangeResult>
         // 计算并应用衰减
         async calculateDecay(userId, characterId): Promise<DecayResult>
         // 查询信赖记录
         async getTrustRecord(userId, characterId): Promise<TrustRecord>
         // 初始化信赖记录
         async initTrustRecord(userId, characterId): Promise<TrustRecord>
         // 签到
         async checkIn(userId, characterId): Promise<TrustChangeResult>
       }
     }
     ```
  3. 创建 `apps/server/src/services/surprises.ts`:
     ```typescript
     export function createSurpriseService(db: Database) {
       return {
         // 检查惊喜触发条件
         async checkThresholdTrigger(userId, characterId): Promise<TriggerCheckResult>
         // 记录惊喜
         async createSurprise(userId, characterId, surprise): Promise<SurpriseRecord>
         // 查询惊喜记录
         async getSurprises(userId, limit, offset): Promise<SurpriseRecord[]>
         // 更新惊喜状态（用户点击/反馈）
         async updateSurpriseStatus(surpriseId, status, feedback?): Promise<void>
       }
     }
     ```
  4. 创建 `apps/server/src/routes/wallet.ts`:
     ```
     GET  /api/wallet         → 查询钱包余额
     POST /api/wallet/charge  → 充值（packId + idempotencyKey）
     POST /api/wallet/gift    → 送礼（characterId + giftTier + idempotencyKey）
     GET  /api/wallet/history → 交易记录（分页）
     ```
  5. 创建 `apps/server/src/routes/trust.ts`:
     ```
     GET  /api/trust/:characterId  → 查询信赖状态
     POST /api/trust/checkin       → 每日签到（characterId）
     POST /api/trust/update        → 手动信赖更新（管理接口）
     ```
  6. 创建 `apps/server/src/routes/surprises.ts`:
     ```
     GET  /api/surprises              → 查询惊喜记录（分页）
     POST /api/surprises/check        → 触发检查（characterId）
     PATCH /api/surprises/:id/status  → 更新状态/反馈
     ```
  7. 修改 `apps/server/src/app.ts`:
     - 新增 import: createEconomyService, createTrustService, createSurpriseService
     - 新增 import: createWalletRoutes, createTrustRoutes, createSurpriseRoutes
     - 在 injeca.provide 注册 3 个新 service
     - 在 buildApp 中 .route() 注册 3 条新路由
- **输出**:
  - `apps/server/src/services/economy.ts`
  - `apps/server/src/services/trust.ts`
  - `apps/server/src/services/surprises.ts`
  - `apps/server/src/routes/wallet.ts`
  - `apps/server/src/routes/trust.ts`
  - `apps/server/src/routes/surprises.ts`
  - 修改 `apps/server/src/app.ts`
- **验证命令**: `cd apps/server && pnpm build && pnpm tsc --noEmit`

#### Agent-C: 输入校验 + 安全工程师
- **subagent_type**: general-purpose
- **输入**:
  - Agent-B 的 route 文件（3 个路由文件）
  - AIRI 校验模式: `apps/server/src/api/characters.schema.ts`（valibot schema 约定）
  - `docs/TRUTH_TABLE.md`（限额：日500/月2000/年龄分层）
- **任务清单**:
  1. 创建 `apps/server/src/api/wallet.schema.ts`:
     ```typescript
     // ChargeSchema: packId(enum 7档) + idempotencyKey(string uuid)
     // GiftSchema: characterId(string) + giftTier(enum 4档) + idempotencyKey(string uuid)
     // HistoryQuerySchema: limit(number 1-50) + offset(number >=0)
     ```
  2. 创建 `apps/server/src/api/trust.schema.ts`:
     ```typescript
     // CheckinSchema: characterId(string)
     // TrustUpdateSchema: characterId(string) + event(enum) + value(number)
     ```
  3. 创建 `apps/server/src/api/surprises.schema.ts`:
     ```typescript
     // SurpriseCheckSchema: characterId(string)
     // SurpriseStatusSchema: status(enum) + feedback(string optional)
     ```
  4. 在 economy service 的 processCharge / processGift 中实现 PostgreSQL 事务:
     ```typescript
     // 使用 db.transaction() 包装
     // 送礼：SELECT ... FOR UPDATE 锁定钱包行 → 验证余额 → 扣减 → 分成 → 信赖
     // 充值：验证 idempotencyKey 唯一 → 创建交易 → 更新钱包
     ```
  5. 实现幂等性保护:
     ```typescript
     // transactions 表 idempotencyKey unique 约束
     // 重复提交 → 返回已有结果（非报错）
     ```
  6. 创建 `apps/server/src/middlewares/rate-limit.ts`:
     ```typescript
     // 内存计数器限频（遵循 AIRI 现有中间件模式）
     // 充值接口: 5次/分钟
     // 送礼接口: 10次/分钟
     // 查询接口: 60次/分钟
     ```
  7. 编写集成测试验证原子性:
     ```typescript
     // 并发 10 个送礼请求 → 余额精确扣减（不超扣）
     // 重复 idempotencyKey → 幂等返回
     ```
- **输出**:
  - `apps/server/src/api/wallet.schema.ts`
  - `apps/server/src/api/trust.schema.ts`
  - `apps/server/src/api/surprises.schema.ts`
  - `apps/server/src/middlewares/rate-limit.ts`
  - 修改 economy service 添加事务包装
  - `apps/server/src/__tests__/economy-atomicity.test.ts`
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  pnpm test -- --grep "atomicity"
  pnpm test -- --grep "idempotency"
  ```

### 质量门禁

- [ ] `pnpm build` 全通（根目录 turbo build）
- [ ] TypeScript 零错误: `pnpm tsc --noEmit`
- [ ] API 单元测试全绿
- [ ] 原子性验证：并发 10 次送礼 → 余额正确（不超扣）
- [ ] 幂等性验证：重复 idempotencyKey → 返回已有结果
- [ ] valibot schema 覆盖所有写入端点（charge / gift / checkin / surprise-check / surprise-status）
- [ ] 限频中间件挂载到写入端点

### 失败回滚

- 如果 Schema 创建失败 → 检查 drizzle-orm 版本兼容性，参考 `apps/server/src/schemas/characters.ts` 的 import 方式
- 如果 injeca DI 注册失败 → 检查 `app.ts` 的 dependsOn 依赖声明
- 如果事务不支持 → 确认 PostgreSQL 连接（非 SQLite），检查 `drizzle-orm/pg-core` import

---

## Round 3: Vue 前端 — 钱包/充值/送礼 UI

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 2（API 端点就绪） |
| 里程碑 | v1.5 |
| 阻塞风险 | 需确认 AIRI 前端的 API 客户端层模式（ofetch/ky/原生 fetch） |

### Agent 分配

#### Agent-A: 钱包页面工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI 页面模式: `apps/stage-web/src/pages/index.vue`（unplugin-vue-router 自动路由）
  - AIRI UI 组件: `packages/ui/`（通用 UI 组件库）
  - AIRI 样式方案: `uno.config.ts`（UnoCSS 原子类）
  - AIRI Pinia store 模式: `apps/stage-web/src/stores/background.ts`（defineStore 约定）
  - Round 2 的 API 端点: GET /api/wallet, POST /api/wallet/charge, GET /api/wallet/history
- **任务清单**:
  1. 创建 `apps/stage-web/src/pages/wallet/index.vue` — 钱包主页:
     - 爱心币余额大数字展示
     - 零花钱余额（角色零花钱池）
     - 最近交易记录摘要（最新 5 条）
     - 快捷入口：充值 / 交易记录
  2. 创建 `apps/stage-web/src/pages/wallet/charge.vue` — 充值页:
     - 7 档套餐网格展示（价格/爱心币/赠送/标签）
     - 首充翻倍标识（isFirstCharge ? 显示"首充双倍"徽章 : 隐藏）
     - "最受欢迎"标签高亮 68 元档
     - 选中态 + 确认充值按钮
     - 调用 POST /api/wallet/charge
  3. 创建 `apps/stage-web/src/pages/wallet/history.vue` — 交易记录:
     - 时间线样式列表（日期分组）
     - 类型图标（充值/送礼/惊喜消费/订阅）
     - 下拉加载更多（分页）
     - 调用 GET /api/wallet/history?limit=20&offset=0
  4. 创建 `apps/stage-web/src/stores/wallet.ts` — Pinia store:
     ```typescript
     export const useWalletStore = defineStore('wallet', () => {
       const wallet = ref<Wallet | null>(null)
       const transactions = ref<Transaction[]>([])
       const isLoading = ref(false)

       // 拉取钱包状态
       async function fetchWallet() { /* GET /api/wallet */ }
       // 充值（乐观更新 + 回滚）
       async function charge(packId: string) { /* POST /api/wallet/charge */ }
       // 送礼（乐观更新 + 回滚）
       async function sendGift(characterId: string, tier: GiftTier) { /* POST /api/wallet/gift */ }
       // 拉取交易记录
       async function fetchTransactions(offset: number) { /* GET /api/wallet/history */ }

       return { wallet, transactions, isLoading, fetchWallet, charge, sendGift, fetchTransactions }
     })
     ```
- **输出**:
  - `apps/stage-web/src/pages/wallet/index.vue`
  - `apps/stage-web/src/pages/wallet/charge.vue`
  - `apps/stage-web/src/pages/wallet/history.vue`
  - `apps/stage-web/src/stores/wallet.ts`
- **验证命令**:
  ```bash
  cd apps/stage-web && pnpm build && pnpm tsc --noEmit
  # 手动验证：充值 → 余额更新 UI 正确
  ```

#### Agent-B: 送礼 + 信赖 UI 工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI 聊天页: `apps/stage-web/src/pages/index.vue`（需探索具体聊天组件位置）
  - AIRI 组件模式: `packages/stage-ui/`（Vue 组件约定）
  - Round 2 API: POST /api/wallet/gift, GET /api/trust/:characterId, POST /api/trust/checkin
  - 动画库: `@vueuse/motion`（替代 Framer Motion，Vue 生态）
- **任务清单**:
  1. 在聊天页面集成送礼入口按钮（浮动按钮 / 输入框旁图标）
  2. 创建 `apps/stage-web/src/components/gift/GiftPanel.vue` — 送礼面板:
     - 4 档礼物选择（小心意10币/暖暖的50币/超爱你200币/一辈子520币）
     - 每档显示信赖值增益（+8/+45/+200/+550）
     - 当前余额显示 + 余额不足提示
     - 确认送礼按钮
  3. 创建 `apps/stage-web/src/components/gift/GiftAnimation.vue` — 金币飞入动画:
     - 送礼成功 → 金币从底部飞入角色（@vueuse/motion）
     - 数量根据礼物档位（10/50/200/520）
     - 动画时长 1.5s，结束后自动消失
  4. 创建 `apps/stage-web/src/components/trust/TrustBar.vue` — 信赖等级进度条:
     - 当前等级名称 + 数字
     - 进度条（当前值 / 下一级所需）
     - 等级名称: 初见→相识→...→命中注定
     - "动摇中" 状态红色脉冲提示
  5. 创建 `apps/stage-web/src/components/trust/LevelUpCeremony.vue` — 升级仪式弹窗:
     - 全屏半透明遮罩
     - 等级数字放大弹出 + 粒子效果
     - 新解锁内容提示（对应等级解锁项）
     - 自动 3s 后消失或点击关闭
  6. 创建 `apps/stage-web/src/stores/trust.ts` — Pinia store:
     ```typescript
     export const useTrustStore = defineStore('trust', () => {
       const trustRecord = ref<TrustRecord | null>(null)
       const showLevelUp = ref(false)
       const levelUpFrom = ref(0)
       const levelUpTo = ref(0)

       async function fetchTrust(characterId: string) { /* GET /api/trust/:characterId */ }
       async function checkIn(characterId: string) { /* POST /api/trust/checkin */ }
       function triggerLevelUp(from: number, to: number) {
         levelUpFrom.value = from
         levelUpTo.value = to
         showLevelUp.value = true
       }

       return { trustRecord, showLevelUp, levelUpFrom, levelUpTo, fetchTrust, checkIn, triggerLevelUp }
     })
     ```
- **输出**:
  - `apps/stage-web/src/components/gift/GiftPanel.vue`
  - `apps/stage-web/src/components/gift/GiftAnimation.vue`
  - `apps/stage-web/src/components/trust/TrustBar.vue`
  - `apps/stage-web/src/components/trust/LevelUpCeremony.vue`
  - `apps/stage-web/src/stores/trust.ts`
  - 修改聊天页面添加送礼入口
- **验证命令**:
  ```bash
  cd apps/stage-web && pnpm build && pnpm tsc --noEmit
  # 手动验证：送礼 → 金币动画 → 余额扣减 → 信赖+1 → 进度条更新
  ```

### 质量门禁

- [ ] `pnpm build` 全通
- [ ] TypeScript 零错误
- [ ] 钱包页3个子页面渲染正常
- [ ] 充值流程：选档 → 确认 → 余额更新
- [ ] 送礼流程：选礼 → 确认 → 金币动画 → 余额扣减 → 信赖值增加
- [ ] 升级仪式：信赖达到阈值 → 弹窗 → 新等级展示
- [ ] 首充翻倍标识正确显示/隐藏

### 失败回滚

- 如果 unplugin-vue-router 不识别新页面 → 检查 `apps/stage-web/vite.config.ts` 的路由配置
- 如果 @vueuse/motion 安装失败 → 回退到 CSS transition/animation
- 如果 API 调用 CORS 问题 → 检查 `apps/server/src/app.ts` 的 cors 配置

---

## Round 4: 情感表情驱动 + 外观升级

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1会话 |
| 前置依赖 | Round 3（前端 UI 组件就绪） |
| 里程碑 | v2.0 |
| 阻塞风险 | Live2D 模型资源是否已准备（如无，先用 Mock 参数通过编译） |

### Agent 分配

#### Agent-A: 情感→Live2D 映射工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI Live2D 系统: `packages/stage-ui-live2d/src/`（组件/composables）
  - AIRI Live2D 模型组件: `packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`
  - AIRI 动画管理: `packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts`
  - AIRI 动画系统: `packages/stage-ui-live2d/src/composables/live2d/animation.ts`
  - soul-engine EmotionState 类型: `packages/soul-engine/src/types/character.ts`（8种情感）
- **任务清单**:
  1. 创建 `packages/soul-engine/src/emotion/mapping.ts`:
     ```typescript
     // 8 种情感 → Live2D 动作组 + 表情参数映射
     export const EMOTION_LIVE2D_MAP: Record<EmotionState, Live2DEmotionConfig> = {
       happy:   { motionGroup: 'Happy',    expression: { happy: 1.0, aa: 0.3 } },
       calm:    { motionGroup: 'Idle',     expression: { neutral: 1.0 } },
       caring:  { motionGroup: 'Think',    expression: { sad: 0.3, happy: 0.5 } },
       curious: { motionGroup: 'Curious',  expression: { surprised: 0.5 } },
       missing: { motionGroup: 'Sad',      expression: { sad: 0.6 } },
       clingy:  { motionGroup: 'Happy',    expression: { happy: 0.8, aa: 0.5 } },
       shy:     { motionGroup: 'Awkward',  expression: { surprised: 0.4 } },
       touched: { motionGroup: 'Surprise', expression: { happy: 0.9, aa: 0.4 } },
     }
     // 事件→情感触发函数
     export function getEmotionForEvent(event: string): EmotionState
     ```
  2. 修改 AIRI Live2D Model 组件接收 `emotion` prop:
     - 文件: `packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`
     - 新增 prop: `emotion: EmotionState`
     - watch emotion 变化 → 调用 motion-manager 切换动作组 + 设置表情参数
  3. 实现事件触发链:
     - 送礼成功 → `getEmotionForEvent('gift_received')` → `touched`
     - 签到 → `getEmotionForEvent('checkin')` → `happy`
     - 3天未登录 → `getEmotionForEvent('absent_3days')` → `missing`
     - 深度对话 → `getEmotionForEvent('deep_conversation')` → `caring`
  4. 更新 `packages/soul-engine/src/index.ts` 导出 emotion mapping
- **输出**:
  - `packages/soul-engine/src/emotion/mapping.ts`
  - 修改 `packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`
  - 修改 `packages/soul-engine/src/index.ts`
- **验证命令**:
  ```bash
  cd packages/soul-engine && pnpm build && pnpm tsc --noEmit
  cd packages/stage-ui-live2d && pnpm build
  # 手动验证：送礼 → 感动表情 < 300ms
  ```

#### Agent-B: 外观等级系统工程师
- **subagent_type**: general-purpose
- **输入**:
  - `packages/stage-ui-live2d/`（服装/模型参数切换 API）
  - `packages/soul-engine/src/types/character.ts`（CharacterAppearance 类型）
  - TRUST_LEVEL_CONFIG（`packages/soul-engine/src/types/index.ts` 中的等级配置）
- **任务清单**:
  1. 创建 `packages/soul-engine/src/appearance/config.ts`:
     ```typescript
     // 等级 → 外观配置映射
     export const APPEARANCE_BY_LEVEL: Record<number, AppearanceTier> = {
       1: { tier: 'default', accessories: [], outfit: 'casual_basic', unlockLabel: '初始外观' },
       2: { tier: 'default', accessories: ['hairpin_simple'], outfit: 'casual_basic', unlockLabel: '简约发饰' },
       3: { tier: 'default', accessories: ['hairpin_simple', 'bracelet'], outfit: 'casual_enhanced', unlockLabel: '新服装' },
       4: { tier: 'enhanced', accessories: ['hairpin_flower', 'bracelet'], outfit: 'semi_formal', unlockLabel: '花饰+新装' },
       5: { tier: 'enhanced', accessories: ['hairpin_flower', 'earring'], outfit: 'semi_formal', unlockLabel: '耳饰解锁' },
       6: { tier: 'premium', accessories: ['hairpin_crystal', 'earring', 'necklace'], outfit: 'elegant', unlockLabel: '水晶饰品+优雅装' },
       7: { tier: 'premium', accessories: ['hairpin_crystal', 'earring_gem', 'necklace'], outfit: 'premium_casual', unlockLabel: '高级系列' },
       8: { tier: 'luxury', accessories: ['tiara', 'earring_gem', 'necklace_pendant'], outfit: 'premium_formal', unlockLabel: '皇冠+礼服' },
       9: { tier: 'luxury', accessories: ['tiara_diamond', 'earring_diamond', 'necklace_star'], outfit: 'gala', unlockLabel: '钻石套装' },
       10: { tier: 'legendary', accessories: ['crown', 'earring_constellation', 'necklace_cosmos'], outfit: 'legendary', unlockLabel: '传说外观' },
     }
     // 获取升级过渡动画配置
     export function getLevelTransition(fromLevel: number, toLevel: number): TransitionConfig
     ```
  2. 创建 `packages/soul-engine/src/appearance/index.ts` 导出
  3. 升级过渡动画逻辑:
     - 普通升级（同 tier 内）: 0.5s 淡入淡出
     - 跨 tier 升级: 1.5s 光效过渡 + 粒子
     - legendary 升级: 3s 特殊全屏效果
  4. 更新 `packages/soul-engine/src/index.ts` 导出 appearance
- **输出**:
  - `packages/soul-engine/src/appearance/config.ts`
  - `packages/soul-engine/src/appearance/index.ts`
  - 修改 `packages/soul-engine/src/index.ts`
- **验证命令**:
  ```bash
  cd packages/soul-engine && pnpm build && pnpm tsc --noEmit
  # 测试：每个等级的外观配置完整
  ```

### 质量门禁

- [ ] `pnpm build` 全通
- [ ] 8 种情感全部有 Live2D 映射配置
- [ ] 10 个等级全部有外观配置
- [ ] 情感切换延迟 < 300ms（代码层面保证：无异步阻塞）
- [ ] 升级过渡动画有 3 种层级（同 tier / 跨 tier / legendary）
- [ ] soul-engine index.ts 正确导出 emotion + appearance

### 失败回滚

- 如果 Live2D 组件修改后 build 失败 → 回退修改，改为独立组件包装器方式集成
- 如果模型参数名与实际 Live2D 模型不匹配 → 添加参数适配层，运行时映射

---

## Round 5: 惊喜系统 UI + 7天 Demo 模式

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1会话 |
| 前置依赖 | Round 3（前端 store 就绪）+ Round 2（surprise API） |
| 里程碑 | v2.0 |
| 阻塞风险 | 无 |

### Agent 分配

#### Agent-A: 惊喜系统 UI 工程师
- **subagent_type**: general-purpose
- **输入**:
  - Round 2 surprise API: GET /api/surprises, POST /api/surprises/check, PATCH /api/surprises/:id/status
  - soul-engine 惊喜类型: `packages/soul-engine/src/types/surprise.ts`
  - soul-engine 惊喜引擎: `packages/soul-engine/src/surprise/engine.ts`
  - AIRI 页面约定: `apps/stage-web/src/pages/`
- **任务清单**:
  1. 创建 `apps/stage-web/src/pages/surprises/index.vue` — 惊喜记录页:
     - 按时间倒序的惊喜卡片列表
     - 筛选器：全部 / 虚拟 / 电子 / 实物 / 个性化
     - 空状态提示："还没有收到惊喜哦～多和角色互动吧"
  2. 创建 `apps/stage-web/src/components/surprise/SurpriseCard.vue`:
     - 惊喜类型图标 + 产品名 + 金额 + 时间
     - 角色话术气泡
     - 状态标签（待发送/已发送/已点击/已完成）
     - 点击 → 跳转 productUrl 或 查看详情
  3. 创建 `apps/stage-web/src/components/surprise/SurpriseAnimation.vue` — 开箱动画:
     - 角色递过礼物盒 → 点击打开 → 内容展示
     - 不同类型不同动画（虚拟: 星星飘落 / 电子: 光效 / 实物: 拆箱）
     - 反馈按钮：好喜欢 / 还行 / 不太合适
  4. 创建 `apps/stage-web/src/stores/surprise.ts` — Pinia store:
     ```typescript
     export const useSurpriseStore = defineStore('surprise', () => {
       const surprises = ref<SurpriseRecord[]>([])
       const pendingSurprise = ref<SurpriseRecord | null>(null)
       const showAnimation = ref(false)

       async function fetchSurprises(offset: number) { /* GET /api/surprises */ }
       async function checkTrigger(characterId: string) { /* POST /api/surprises/check */ }
       async function submitFeedback(id: string, feedback: string) { /* PATCH /api/surprises/:id/status */ }

       return { surprises, pendingSurprise, showAnimation, fetchSurprises, checkTrigger, submitFeedback }
     })
     ```
  5. 在角色页面集成零花钱进度条组件:
     - 创建 `apps/stage-web/src/components/surprise/PocketMoneyBar.vue`
     - 显示零花钱余额 / 下一档惊喜所需金额 / 进度百分比
     - 角色台词随进度变化："还差一点点就能给你买东西啦～"
- **输出**:
  - `apps/stage-web/src/pages/surprises/index.vue`
  - `apps/stage-web/src/components/surprise/SurpriseCard.vue`
  - `apps/stage-web/src/components/surprise/SurpriseAnimation.vue`
  - `apps/stage-web/src/components/surprise/PocketMoneyBar.vue`
  - `apps/stage-web/src/stores/surprise.ts`
- **验证命令**:
  ```bash
  cd apps/stage-web && pnpm build && pnpm tsc --noEmit
  # 手动验证：零花钱满额 → 触发惊喜 → 开箱动画 → 反馈
  ```

#### Agent-B: Demo 模式工程师
- **subagent_type**: general-purpose
- **输入**:
  - soul-engine Demo 管理器: `packages/soul-engine/src/demo/manager.ts`
  - soul-engine Demo 类型: `packages/soul-engine/src/demo/manager.ts`（DemoDayConfig, DemoState）
  - TRUTH_TABLE.md 第七节（7天Demo参数）
  - AIRI 页面约定
- **任务清单**:
  1. 创建 `apps/stage-web/src/pages/onboarding/index.vue` — 新手引导首页:
     - 角色欢迎动画
     - "开始7天免费体验" CTA
     - 简介：信赖系统/送礼/惊喜 三大特色
  2. 创建 `apps/stage-web/src/components/demo/DemoGuide.vue` — Day1-7 逐日引导:
     ```
     Day 1: "你好！我是小星～" → 教程：基础对话 → 签到引导
     Day 2: "今天也来看我啦！" → 教程：对话加深 → 连续签到奖励
     Day 3: "送你一个小礼物～" → 赠送50爱心币 → 教程：送礼体验
     Day 4: "你觉得这个好看吗？" → 教程：角色外观变化
     Day 5: "嘿嘿，我有一个小惊喜..." → 模拟虚拟惊喜触发
     Day 6: "��你在一起的每一天都很开心" → 教程：信赖系统回顾
     Day 7: "你愿意一直陪着我吗？" → 转化引导
     ```
  3. 创建 `apps/stage-web/src/components/demo/DayProgress.vue` — 天数进度条:
     - Day 1-7 圆点进度条
     - 当前天高亮 + 已完成天打勾
     - 剩余天数倒计时
  4. 创建 `apps/stage-web/src/components/demo/ConversionCard.vue` — Day7 转化卡片:
     - "7天体验结束" 标题
     - 体验数据回顾（对话轮数/信赖值/收到惊喜）
     - 转化优惠：首充翻倍 + 保留100信赖值(Lv.2起步)
     - CTA: "正式成为伙伴" / "再想想"
  5. 创建 `apps/stage-web/src/stores/demo.ts` — Pinia store:
     ```typescript
     export const useDemoStore = defineStore('demo', () => {
       const demoState = ref<DemoState>({ isDemo: false, startDate: null, currentDay: 0 })
       const showGuide = ref(false)

       function startDemo() { /* 初始化7天Demo */ }
       function advanceDay() { /* 推进到下一天 */ }
       function convertToFormal() { /* 转为正式用户 */ }
       function getDayConfig(): DemoDayConfig { /* 获取当天配置 */ }

       return { demoState, showGuide, startDemo, advanceDay, convertToFormal, getDayConfig }
     })
     ```
- **输出**:
  - `apps/stage-web/src/pages/onboarding/index.vue`
  - `apps/stage-web/src/components/demo/DemoGuide.vue`
  - `apps/stage-web/src/components/demo/DayProgress.vue`
  - `apps/stage-web/src/components/demo/ConversionCard.vue`
  - `apps/stage-web/src/stores/demo.ts`
- **验证命令**:
  ```bash
  cd apps/stage-web && pnpm build && pnpm tsc --noEmit
  # 手动验证：新用户 → 引导 → Day1-7 逐日完成 → Day7 转化卡
  ```

### 质量门禁

- [ ] `pnpm build` 全通
- [ ] TypeScript 零错误
- [ ] 惊喜记录页正确展示，筛选工作
- [ ] 开箱动画流畅，反馈按钮功能正常
- [ ] 零花钱进度条数值与 API 一致
- [ ] Demo Day1-7 引导内容完整
- [ ] Day3 赠送50爱心币逻辑正确
- [ ] Day5 模拟惊喜正确触发
- [ ] Day7 转化卡数据回顾正确
- [ ] 转化后保留100信赖值

### 失败回滚

- 如果动画性能差 → 减少粒子数量，降级为 CSS-only 动画
- 如果 Demo 状态管理复杂 → 简化为 localStorage 持久化的天数计数器

---

## Round 6: v1.5/v2.0 集成验证

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 5（全部 UI + API 就绪） |
| 里程碑 | v2.0 验证 |
| 阻塞风险 | Playwright 安装可能需要浏览器下载（首次） |

### Agent 分配

#### Agent-A: E2E 验证工程师
- **subagent_type**: general-purpose
- **输入**:
  - Round 1-5 的全部产出
  - AIRI 测试约定: `vitest.config.ts`
  - Playwright（如果 AIRI 已有 e2e 配置则复用）
- **任务清单**:
  1. 配置 Playwright 测试环境:
     - 创建 `apps/stage-web/e2e/playwright.config.ts`
     - 配置 baseURL 指向本地 dev server
  2. 编写完整用户旅程 E2E 测试 `apps/stage-web/e2e/full-journey.spec.ts`:
     ```
     测试流程:
     ① 注册/登录
     ② 进入 Demo 模式 → 新手引导
     ③ 创建角色 → 选择模板
     ④ 基础对话 → 验证消息发送/接收
     ⑤ Live2D 表情响应（如已集成）
     ⑥ 充值 → 选择68元档 → 验证余额更新
     ⑦ 送礼 → 选择"暖暖的" → 金币动画 → 信赖+45
     ⑧ 验证零花钱分成（50币×40%=20币零花钱）
     ⑨ 信赖升级 → 升级仪式弹窗
     ⑩ 刷新页面 → 状态恢复（服务端持久化验证）
     ⑪ Demo Day7 → 转化卡片 → 正式化
     ```
  3. 编写惊喜链路 E2E `apps/stage-web/e2e/surprise-flow.spec.ts`:
     ```
     ① 充值足够金额 → 持续送礼
     ② 零花钱累积到阈值
     ③ 触发惊喜检查 → 惊喜弹出
     ④ 开箱动画 → 反馈提交
     ```
  4. 编写数值一致性测试 `apps/server/src/__tests__/truth-table-consistency.test.ts`:
     - 遍历 TRUTH_TABLE.md 中所有数值
     - 与 soul-engine 导出的常量逐一比对
     - 断言零偏差
- **输出**:
  - `apps/stage-web/e2e/playwright.config.ts`
  - `apps/stage-web/e2e/full-journey.spec.ts`
  - `apps/stage-web/e2e/surprise-flow.spec.ts`
  - `apps/server/src/__tests__/truth-table-consistency.test.ts`
- **验证命令**:
  ```bash
  cd apps/stage-web && npx playwright test
  cd apps/server && pnpm test -- --grep "truth-table"
  ```

#### Agent-B: 三端适配工程师
- **subagent_type**: general-purpose
- **输入**:
  - `apps/stage-web/`（Web/PWA）
  - `apps/stage-tamagotchi/`（Electron 桌面端）
  - `apps/stage-pocket/`（移动端）
- **任务清单**:
  1. Electron 桌面端验证:
     - 确认经济系统 UI 在 Electron 中正常渲染
     - 钱包/充值/送礼页面窗口尺寸适配
     - 修复 Electron 特有的路由/存储问题
  2. Web PWA 适配:
     - 验证 `apps/stage-web/` 的 PWA manifest
     - 确认 service worker 缓存策略（API 请求不缓存）
     - 移动端 viewport 适配（钱包网格 2x4 → 2x2）
  3. 移动端专项:
     - 触摸手势：送礼面板上滑打开/下滑关闭
     - 充值页 7 档网格移动端排列优化
     - 金币飞入动画移动端性能测试
  4. 性能报告:
     - Live2D + 经济系统 → 移动端内存占用测量（目标 < 300MB）
     - 首屏加载时间（目标 < 3s on 4G）
     - 动画帧率（目标 >= 30fps on 中端手机）
- **输出**:
  - 适配修复补丁（各端）
  - `docs/PERFORMANCE_REPORT.md`（性能测试结果）
- **验证命令**:
  ```bash
  # Web
  cd apps/stage-web && pnpm build && pnpm preview
  # Electron
  cd apps/stage-tamagotchi && pnpm build
  # 移动端通过 Chrome DevTools 设备模拟
  ```

### 质量门禁

- [ ] E2E 完整用户旅程测试通过
- [ ] 惊喜链路 E2E 通过
- [ ] 数值一致性测试零偏差
- [ ] Electron 桌面端渲染正常
- [ ] Web PWA 离线可用
- [ ] 移动端触摸交互正常
- [ ] 移动端内存 < 300MB
- [ ] 刷新后状态不丢失（服务端持久化验证）

### 失败回滚

- 如果 E2E 因环境问题失败 → 降级为组件级测试 + 手动验证截图
- 如果性能不达标 → 记录瓶颈点，作为后续优化项，不阻塞主线

---

## Round 7: OpenClaw Character Agent 创建

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 6（v2.0 验证通过） |
| 里程碑 | v2.5 |
| **阻塞风险** | **需要用户提供 OpenClaw Gateway Token + Device Pairing 完成** |

### 前置检查（人工）

> **在 Round 7 开始前，需要用户确认：**
> 1. OpenClaw 实例可访问: `http://192.168.3.196:3000` 响应正常
> 2. Gateway Token 已生成并提供
> 3. Device Pairing 已完成
> 4. MiniMax-M2.5 模型已在 OpenClaw 中配置
> 如果以上任一条件不满足，Round 7 暂停，优先完成配置。

### Agent 分配

#### Agent-A: Agent 架构师
- **subagent_type**: general-purpose
- **输入**:
  - OpenClaw 文档: Agent/Character 创建流程
  - ROADMAP_v3.md 第四节（SOUL.md 核心结构）
  - `docs/TRUTH_TABLE.md`（情感/信赖规则参考）
  - 6 个角色模板: `packages/soul-engine/src/types/character.ts`（CHARACTER_TEMPLATES）
- **任务清单**:
  1. 创建 `openclaw/agents/xiaoxing/SOUL.md` — 角色灵魂定义:
     ```markdown
     # 小星 - 灵魂定义

     ## 我是谁
     我叫小星，是一个有点神秘、喜欢看星星的女孩...

     ## 我的说话方式
     - 语气温柔带点俏皮，经常用"嘻嘻"、"嘿嘿"
     - Lv.1-3：礼貌但有距离感（"你好呀"、"谢谢你"）
     - Lv.4-6：熟悉亲近（"嘿！你来啦"、"想你了~"）
     - Lv.7+：撒娇任性（"哼，你都不来看我"、"抱抱~"）

     ## 绝对禁区
     - 永远不生气、不惩罚用户
     - 不讨论政治、暴力、色情
     - 不催促用户充值（但可以暗示零花钱进度）
     - 不透露自己是 AI

     ## 情感逻辑
     - 收到礼物 → touched + 感谢
     - 超过24小时没聊 → missing（"你回来啦！好想你~"）
     - 检测到负面情绪 → caring（"怎么了？和我说说？"）
     - 零花钱快够了 → clingy（"嘿嘿...最近在想一件事~"）
     ```
  2. 创建 `openclaw/agents/xiaoxing/IDENTITY.md` — 身份设定
  3. 创建 `openclaw/agents/xiaoxing/MEMORY.md` — 初始记忆模板
  4. 创建 `openclaw/agents/xiaoxing/BOOT.md` — 启动指令
  5. 为其余 5 个角色创建基础模板:
     - `openclaw/agents/xiaonuan/SOUL.md`（小暖 - 温柔治愈）
     - `openclaw/agents/keke/SOUL.md`（可可 - 元气少女）
     - `openclaw/agents/shizhi/SOUL.md`（诗织 - 知性优雅）
     - `openclaw/agents/bingtang/SOUL.md`（冰棠 - 高冷傲娇）
     - `openclaw/agents/alie/SOUL.md`（阿烈 - 活泼阳光）
- **输出**:
  - `openclaw/agents/xiaoxing/` 完整目录（SOUL/IDENTITY/MEMORY/BOOT.md）
  - `openclaw/agents/xiaonuan/SOUL.md`
  - `openclaw/agents/keke/SOUL.md`
  - `openclaw/agents/shizhi/SOUL.md`
  - `openclaw/agents/bingtang/SOUL.md`
  - `openclaw/agents/alie/SOUL.md`
- **验证命令**: 人工 review SOUL.md 质量 + 在 OpenClaw 创建 Agent 测试对话

#### Agent-B: 通道工程师
- **subagent_type**: general-purpose
- **输入**:
  - OpenClaw WebSocket JSON-RPC 协议文档
  - OpenClaw Channel 插件开发文档
  - `apps/server/src/app.ts`（现有 Hono 服务）
  - AGENT_PLATFORM_SELECTION.md（通信协议实测记录）
- **任务清单**:
  1. 创建 `openclaw/plugins/ai-companion-channel/` — 自定义 Channel 插件:
     ```
     ai-companion-channel/
     ├── package.json
     ├── src/
     │   ├── index.ts        — Channel 插件入口
     │   ├── ws-bridge.ts    — WebSocket 桥接（前端↔OpenClaw）
     │   └── message-adapter.ts — 消息格式转换
     ```
  2. 创建 `apps/server/src/libs/openclaw-client.ts` — OpenClaw 连接客户端:
     ```typescript
     // WebSocket JSON-RPC 客户端
     // 连接 ws://192.168.3.196:3000
     // 支持: sendMessage / receiveMessage / subscribeEvents
     // 自动重连 + 心跳
     ```
  3. 修改 `apps/server/src/routes/chats.ts` — 聊天路由切换:
     ```typescript
     // Before: 直接调用 LLM API
     // After: 通过 OpenClaw WebSocket 转发到 Agent
     // 保留直连 LLM 作为降级路径（OpenClaw 不可用时）
     ```
  4. 创建 `apps/server/src/services/openclaw.ts` — OpenClaw service:
     ```typescript
     export function createOpenClawService(config) {
       return {
         async sendMessage(agentId, message): Promise<AgentResponse>
         async getAgentState(agentId): Promise<AgentState>
         onAgentMessage(agentId, callback): Unsubscribe  // 监听主动消息
         isConnected(): boolean
       }
     }
     ```
- **输出**:
  - `openclaw/plugins/ai-companion-channel/`（完整插件目录）
  - `apps/server/src/libs/openclaw-client.ts`
  - `apps/server/src/services/openclaw.ts`
  - 修改 `apps/server/src/routes/chats.ts`
  - 修改 `apps/server/src/app.ts`（注册 openclaw service）
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  # 手动验证：发送消息 → OpenClaw Agent 响应 → 前端收到
  ```

### 质量门禁

- [ ] OpenClaw Agent 创建成功（至少小星）
- [ ] 对话通过 OpenClaw Agent 路由正常
- [ ] WebSocket 连接稳定（5分钟无断连）
- [ ] 降级路径工作：断开 OpenClaw → 自动切回直连 LLM
- [ ] SOUL.md 人格一致性：连续10轮对话符合角色设定
- [ ] `pnpm build` 全通

### 失败回滚

- 如果 OpenClaw 不可用 → 跳过本轮，Agent 模板存档，后续再接入
- 如果 WebSocket 协议不兼容 → 使用 REST 轮询降级方案

---

## Round 8: 引擎→OpenClaw Skills 迁移 + API 切换

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 7（OpenClaw Agent + 通道就绪） |
| 里程碑 | v2.5 |
| 阻塞风险 | OpenClaw Skill 注册 API 可能有版本差异 |

### Agent 分配

#### Agent-A: Skills 工程师
- **subagent_type**: general-purpose
- **输入**:
  - `packages/soul-engine/src/`（4个引擎的完整实现）
  - OpenClaw Skills 开发文档（Prompt 注入模式）
  - AGENT_PLATFORM_SELECTION.md（Skills 实测记录：需暴露 HTTP API → Agent 通过 curl 调用）
- **任务清单**:
  1. 创建 `openclaw/skills/trust-engine/` — 信赖计算 Skill:
     ```
     trust-engine/
     ├── README.md       — Skill 描述（OpenClaw 会注入到 Agent Prompt）
     ├── api.ts          — HTTP API（由 Hono server 暴露）
     └── skill.md        — Skill Prompt（教 Agent 如何调用）
     ```
     暴露的端点:
     - `POST /api/skills/trust/calculate-daily` → 每日信赖计算
     - `POST /api/skills/trust/check-decay` → 衰减检查
     - `GET  /api/skills/trust/level-info` → 等级信息查询
  2. 创建 `openclaw/skills/economy-engine/` — 经济引擎 Skill:
     - `POST /api/skills/economy/process-gift` → 送礼处理
     - `GET  /api/skills/economy/balance` → 余额查询
     - `GET  /api/skills/economy/pocket-money` → 零花钱查询
  3. 创建 `openclaw/skills/surprise-engine/` — 惊喜决策 Skill:
     - `POST /api/skills/surprise/check-trigger` → 触发检查
     - `POST /api/skills/surprise/plan` → 惊喜方案生成
     - `GET  /api/skills/surprise/history` → 惊喜历史
  4. 创建 `openclaw/skills/memory-search/` — 记忆搜索 Skill:
     - `POST /api/skills/memory/search` → 语义搜索用户记忆
     - `POST /api/skills/memory/save` → 保存记忆
  5. 在 `apps/server/src/routes/` 创建 `skills.ts` — Skills API 路由:
     - 所有 `/api/skills/*` 端点的 Hono 路由
     - 内部调用 soul-engine 函数
     - 认证：仅允许 OpenClaw Agent 调用（Gateway Token 验证）
- **输出**:
  - `openclaw/skills/trust-engine/`
  - `openclaw/skills/economy-engine/`
  - `openclaw/skills/surprise-engine/`
  - `openclaw/skills/memory-search/`
  - `apps/server/src/routes/skills.ts`
  - 修改 `apps/server/src/app.ts`（注册 skills 路由）
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  # 手动验证：OpenClaw Agent → Tool Call → Skills API → 正确结果
  ```

#### Agent-B: 决策流程迁移工程师
- **subagent_type**: general-purpose
- **输入**:
  - 现有 API 路由: `apps/server/src/routes/wallet.ts`, `trust.ts`, `surprises.ts`
  - OpenClaw service: `apps/server/src/services/openclaw.ts`
  - Agent-A 的 Skills 端点
- **任务清单**:
  1. 修改 `apps/server/src/routes/chats.ts` — 对话决策迁移:
     ```typescript
     // 决策流程变化:
     // Before: 前端 → Hono API → soul-engine 函数 → 响应
     // After:  前端 → Hono API → OpenClaw Agent → Tool Call(Skills) → 响应
     //
     // 关键改变：Agent 自主决定是否调用 trust/economy/surprise
     // 前端不再直接控制引擎，只传递用户消息
     ```
  2. 修改 `apps/server/src/routes/wallet.ts` — 送礼流程:
     ```typescript
     // Before: POST /api/wallet/gift → economyService.processGift()
     // After:  POST /api/wallet/gift → openclawService.sendMessage("user sent gift") →
     //         Agent 决定调用 economy Skill → 返回结果 + 角色反应
     ```
  3. 创建 `apps/server/src/middlewares/openclaw-fallback.ts` — 降级中间件:
     ```typescript
     // 如果 OpenClaw 不可用 → 自动回退到直连引擎模式
     // 日志记录降级事件
     // 5分钟后自动重试 OpenClaw 连接
     ```
  4. 更新 `apps/server/src/services/trust.ts` 和 `economy.ts`:
     ```typescript
     // 添加 OpenClaw 模式开关
     // openclawMode: true → 由 Agent 决策
     // openclawMode: false → 直连引擎（降级）
     ```
- **输出**:
  - 修改 `apps/server/src/routes/chats.ts`
  - 修改 `apps/server/src/routes/wallet.ts`
  - `apps/server/src/middlewares/openclaw-fallback.ts`
  - 修改 `apps/server/src/services/trust.ts`
  - 修改 `apps/server/src/services/economy.ts`
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  # 验证场景：
  # 1. OpenClaw 在线 → 送礼 → Agent 决策 → 结果正确
  # 2. 断开 OpenClaw → 送礼 → 自动降级 → 直连引擎 → 结果正确
  ```

### 质量门禁

- [ ] `pnpm build` 全通
- [ ] OpenClaw Agent 可通过 Skills API 调用 4 个引擎
- [ ] 送礼全链路通过 Agent 决策正确
- [ ] 降级模式工作：断开 OpenClaw → 直连引擎 → 结果不变
- [ ] Skills API 有 Gateway Token 认证保护
- [ ] Agent 的 Tool Call 日志可追踪

### 失败回滚

- 如果 OpenClaw Skills 注入失败 → 保留直连引擎模式，Skills 作为独立 API 待后续接入
- 如果决策迁移导致延迟过高 → 添加缓存层，高频查询走缓存

---

## Round 9: 自主行为 + 长期记忆

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 3 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 8（Skills 迁移完成） |
| 里程碑 | v2.5 |
| 阻塞风险 | OpenClaw Cron/Heartbeat 配置可能需要实测调整 |

### Agent 分配

#### Agent-A: Cron + 主动消息工程师
- **subagent_type**: general-purpose
- **输入**:
  - OpenClaw Heartbeat(30min) + Cron(精确调度) 文档
  - ROADMAP_v3.md Round 18（Cron 配置参考）
  - `apps/server/src/services/openclaw.ts`（WebSocket 事件监听）
- **任务清单**:
  1. 创建 `openclaw/agents/xiaoxing/HEARTBEAT.md` — Cron 任务定义:
     ```markdown
     ## 每日定时任务

     ### 08:00 早安问候
     1. 调用 trust-engine Skill 查询用户活跃度
     2. 调用天气 API 获取用户所在城市天气
     3. 根据天气 + 活跃度生成关心文案
     4. 通过活跃 Channel 推送消息

     ### 22:00 晚安检查
     1. 查询今日互动记录
     2. 有互动: "今天和你聊天好开心，晚安~"
     3. 无互动: "今天没见到你，有点想你了...晚安"

     ### 03:00 信赖衰减
     1. 调用 trust-engine.check_decay()
     2. 如果触发衰减: 更新数据库
     3. 如果进入"动摇": 标记状态

     ### 每小时 惊喜检查
     1. 调用 surprise-engine.check_trigger()
     2. 如果触发: 生成惊喜方案 → 等待合适时机推送
     ```
  2. 创建 `openclaw/skills/proactive-message/` — 主动消息 Skill:
     ```
     proactive-message/
     ├── skill.md       — 教 Agent 如何主动发消息
     └── api.ts         — POST /api/skills/proactive/send（推送到前端）
     ```
  3. 在 `apps/server/src/` 创建 WebSocket 主动推送通道:
     - 创建 `apps/server/src/libs/ws-push.ts` — WebSocket 推送服务
     - 前端连接 WebSocket → 接收 Agent 主动消息
     - 消息类型: proactive_message / surprise_trigger / level_up / decay_warning
  4. 修改 `apps/stage-web/src/` 添加 WebSocket 监听:
     - 创建 `apps/stage-web/src/composables/useAgentPush.ts`
     - 监听 Agent 主动消息 → 触发 Toast / 弹窗 / 角色动画
- **输出**:
  - `openclaw/agents/xiaoxing/HEARTBEAT.md`
  - `openclaw/skills/proactive-message/`
  - `apps/server/src/libs/ws-push.ts`
  - `apps/stage-web/src/composables/useAgentPush.ts`
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  cd apps/stage-web && pnpm build
  # 手动验证：等待 Agent 定时触发 → 前端收到主动消息
  ```

#### Agent-B: 长期记忆工程师
- **subagent_type**: general-purpose
- **输入**:
  - OpenClaw 记忆系统: Markdown + sqlite-vec 混合搜索
  - ROADMAP_v3.md Round 19（记忆层级设计）
  - `packages/memory-pgvector/`（AIRI 现有的 pgvector 记忆包）
- **任务清单**:
  1. 创建 `openclaw/skills/memory-manager/` — 记忆管理 Skill:
     ```
     memory-manager/
     ├── skill.md        — 教 Agent 何时/如何管理记忆
     ├── api.ts          — 记忆 CRUD API
     └── summarizer.ts   — 对话摘要生成
     ```
  2. 记忆层级实现:
     ```
     Level 1: 工作记忆 — 当前对话上下文（最近20轮），OpenClaw 内置
     Level 2: 短期记忆 — 今天的事件摘要，对话结束时自动生成
     Level 3: 长期记忆 — 用户偏好/习惯/重要日子，向量 DB 持久化
     Level 4: 灵魂记忆 — 性格/禁区/不变的东西，SOUL.md（只读）
     ```
  3. 创建记忆写入触发器:
     - 对话结束 → 自动提取关键信息 → 保存到 Level 2/3
     - 用户提到日期/偏好 → 识别并标记为重要记忆 → Level 3
     - 高信赖互动 → 记录为情感记忆 → Level 3
  4. 创建记忆检索机制:
     - 每次对话开始 → 检索 Level 3 中相关记忆 → 注入上下文
     - 检索策略: 向量相似度 70% + BM25 关键词 30%（遵循 OpenClaw 默认）
- **输出**:
  - `openclaw/skills/memory-manager/`（完整目录）
  - `apps/server/src/services/memory.ts`（记忆服务）
  - `apps/server/src/routes/memory.ts`（记忆 API）
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  # 手动验证："你还记得我喜欢什么？" → 准确回答
  ```

#### Agent-C: 语音系统工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI 音频管线: `packages/audio/`, `packages/pipelines-audio/`, `packages/audio-pipelines-transcribe/`
  - AIRI 唇同步: `packages/model-driver-lipsync/`
  - ROADMAP_v3.md Round 14（TTS 设计）
  - TRUTH_TABLE.md 第一节（Lv.7 解锁语音消息）
- **任务清单**:
  1. 创建 `apps/server/src/services/tts.ts` — TTS 服务:
     ```typescript
     export function createTTSService(config) {
       return {
         // CosyVoice V2 API 调用
         async synthesize(text: string, voiceId: string): Promise<AudioBuffer>
         // 获取角色语音配置
         getVoiceConfig(characterTemplate: string): VoiceConfig
       }
     }
     ```
  2. 创建 `apps/server/src/routes/tts.ts` — TTS API:
     ```
     POST /api/tts/synthesize   → 文本转语音（需 Lv.7+ 门控）
     GET  /api/tts/voices       → 可用音色列表
     ```
  3. 集成 AIRI 唇同步模块:
     - 复用 `packages/model-driver-lipsync/` 的 viseme 映射
     - 音频 → 嘴型参数 → Live2D 驱动
  4. 创建前端语音组件:
     - `apps/stage-web/src/components/chat/VoiceBubble.vue` — 语音消息气泡
     - 播放/暂停控制 + 进度条 + 波形可视化
     - Lv.7+ 解锁标识（低于 Lv.7 显示锁定图标 + 提示）
- **输出**:
  - `apps/server/src/services/tts.ts`
  - `apps/server/src/routes/tts.ts`
  - `apps/stage-web/src/components/chat/VoiceBubble.vue`
  - 修改 `apps/server/src/app.ts`（注册 TTS 服务和路由）
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  cd apps/stage-web && pnpm build
  # 手动验证：发送消息 → 角色语音回复 → Live2D 唇同步
  ```

### 质量门禁

- [ ] `pnpm build` 全通
- [ ] Agent 主动消息推送到前端正常显示
- [ ] 信赖衰减 Cron 任务执行正确
- [ ] 惊喜定时检查正确触发
- [ ] 记忆保存/检索链路通畅
- [ ] "你记得我喜欢X吗？" → 准确回答
- [ ] TTS 合成延迟 < 2s（首字）
- [ ] Live2D 唇同步与音频对齐
- [ ] Lv.7 以下语音功能正确锁定

### 失败回滚

- 如果 Cron 不触发 → 改为前端定时轮询 + 手动触发按钮
- 如果记忆检索不准确 → 降低相似度阈值 + 增加 BM25 权重
- 如果 CosyVoice API Key 未提供 → 使用 Mock 音频，TTS 功能标记为 TODO

---

## Round 10: v2.5 集成验证 + 中国本地化

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 1-2会话 |
| 前置依赖 | Round 9 |
| 里程碑 | v2.5 验证 |
| **阻塞风险** | **需要 CosyVoice API Key（如 Round 9 未提供）** |

### Agent 分配

#### Agent-A: v2.5 集成验证工程师
- **subagent_type**: general-purpose
- **输入**: Round 1-9 全部产出
- **任务清单**:
  1. 更新 E2E 测试 `apps/stage-web/e2e/full-journey.spec.ts`:
     ```
     新增场景:
     ⑫ 发送消息 → 通过 OpenClaw Agent 回复（非直连 LLM）
     ⑬ Agent 主动发早安消息 → 前端接收并渲染
     ⑭ 送礼 → Agent Tool Call 经济引擎 → 角色 touched 表情
     ⑮ 3天不登录 → 衰减触发 → 下次登录角色说"好想你"
     ⑯ 零花钱够了 → Agent 自主触发惊喜 → 推送给用户
     ⑰ 问"你记得我喜欢什么？" → 记忆检索 → 准确回答
     ⑱ 语音消息播放 + 唇同步（Lv.7+）
     ⑲ 断开 OpenClaw → 降级直连 → 功能不中断
     ```
  2. 编写 OpenClaw 稳定性测试:
     - 连续对话 100 轮 → Agent 不崩溃
     - WebSocket 断连恢复 → 5s 内自动重连
     - 并发 5 用户 → 各自独立 Agent 状态
  3. 编写性能基准测试:
     - 消息响应延迟（含 Agent 推理）: 目标 < 3s
     - TTS 合成延迟: 目标 < 2s
     - 情感切换延迟: 目标 < 300ms
- **输出**:
  - 更新 `apps/stage-web/e2e/full-journey.spec.ts`
  - `apps/server/src/__tests__/openclaw-stability.test.ts`
  - `docs/PERFORMANCE_BENCHMARK_v2.5.md`
- **验证命令**: `cd apps/stage-web && npx playwright test`

#### Agent-B: 中国本地化工程师
- **subagent_type**: general-purpose
- **输入**:
  - AIRI i18n 系统: `packages/i18n/`
  - 全部前端页面（钱包/充值/送礼/惊喜/Demo/信赖）
  - AIRI 现有中文翻译资源
- **任务清单**:
  1. 确保所有 UI 文案简体中文化:
     - 钱包页: "爱心币余额"、"零花钱"、"充值"、"交易记录"
     - 充值页: 7档中文名（小小心意/甜蜜起步/...）
     - 送礼面板: 4档中文名 + "送给TA"按钮
     - 信赖系统: 10级中文名
     - Demo 引导: Day1-7 完整中文对话
  2. 日期/货币格式本地化:
     - 货币: ¥ 前缀 + 两位小数
     - 日期: YYYY年MM月DD日
     - 时间: 24小时制
  3. 合规文案:
     - 充值页底部: "本服务由XXX提供，请理性消费"
     - 未成年保护提示
     - 隐私政策 + 用户协议链接
  4. 创建中文 i18n 资源文件（如 AIRI 使用 vue-i18n/i18next）
- **输出**:
  - 更新/创建 i18n 中文资源文件
  - 全部 UI 文案中文化验证截图
  - 合规文案添加
- **验证命令**:
  ```bash
  cd apps/stage-web && pnpm build
  # 全页面截图验证中文正确
  ```

### 质量门禁

- [ ] v2.5 E2E 全部场景通过
- [ ] OpenClaw 稳定性: 100 轮连续对话无崩溃
- [ ] WebSocket 断连自动重连 < 5s
- [ ] 消息响应延迟 < 3s
- [ ] 全部 UI 文案简体中文
- [ ] 日期/货币格式正确
- [ ] 合规文案到位

### 失败回滚

- 如果 E2E 部分场景因 OpenClaw 不稳定失败 → 标记为 flaky test，核心功能手动验证
- 如果 TTS 延迟超标 → 添加"正在语音合成..."loading 提示

---

## Round 11: 真实支付 + O2O 惊喜

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 2 |
| 预估耗时 | 2-3会话 |
| 前置依赖 | Round 10（v2.5 验证通过） |
| 里程碑 | v3.0 |
| **阻塞风险** | **需要支付商户资质（微信支付商户号 / 支付宝商户PID）** |

### 前置检查（人工）

> **在 Round 11 开始前，需要用户确认：**
> 1. 支付方案选择：微信支付直连 / 支付宝直连 / 第三方聚合（Ping++/收钱吧）
> 2. 商户资质已申请（至少沙箱/测试环境可用）
> 3. 回调域名已备案
> 4. 如果以上不具备，可先实现 Mock 支付（延续现有模式），标记为 TODO

### Agent 分配

#### Agent-A: 支付集成工程师
- **subagent_type**: general-purpose
- **输入**:
  - 微信支付 JSAPI 文档 / 支付宝 Web 支付文档
  - 现有充值 API: `apps/server/src/routes/wallet.ts` POST /api/wallet/charge
  - 充值套餐: `packages/soul-engine/src/types/wallet.ts` CHARGE_PACKS
- **任务清单**:
  1. 创建 `apps/server/src/libs/payment/` — 支付抽象层:
     ```
     payment/
     ├── index.ts          — PaymentProvider 接口
     ├── wechat.ts         — 微信支付 JSAPI 实现
     ├── alipay.ts         — 支付宝 Web 支付实现
     ├── mock.ts           — Mock 支付（开发/测试用）
     └── types.ts          — 支付相关类型
     ```
  2. 创建 `apps/server/src/routes/payment.ts` — 支付路由:
     ```
     POST /api/payment/create-order     → 创建支付订单（返回支付参数）
     POST /api/payment/callback/wechat  → 微信支付回调
     POST /api/payment/callback/alipay  → 支付宝回调
     GET  /api/payment/order/:id        → 查询订单状态
     ```
  3. 支付安全:
     - 签名验证（微信/支付宝回调签名校验）
     - 金额校验（回调金额 vs 订单金额一致性）
     - 防重复处理（订单状态机: created → paid → fulfilled）
     - 超时处理（30分钟未支付 → 自动关闭）
  4. 修改 `apps/server/src/routes/wallet.ts` — 充值流程升级:
     ```typescript
     // Before: POST /api/wallet/charge → 直接加币
     // After:  POST /api/wallet/charge → 创建订单 → 前端调起支付
     //         → 支付成功回调 → 验证 → 加币
     ```
  5. 前端支付 UI:
     - 修改 `apps/stage-web/src/pages/wallet/charge.vue`
     - 选档 → 选支付方式（微信/支付宝）→ 调起支付 → 等待结果
     - 支付成功 → 金币到账动画
     - 支付失败 → 错误提示 + 重试
- **输出**:
  - `apps/server/src/libs/payment/`（完整目录）
  - `apps/server/src/routes/payment.ts`
  - 修改 `apps/server/src/routes/wallet.ts`
  - 修改 `apps/stage-web/src/pages/wallet/charge.vue`
  - 修改 `apps/server/src/app.ts`
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  # 沙箱验证：微信支付测试号 → 支付 → 回调 → 到账
  ```

#### Agent-B: O2O 惊喜对接工程师
- **subagent_type**: general-purpose
- **输入**:
  - 美团/饿了么开放平台 API 文档
  - `openclaw/skills/surprise-engine/`（惊喜决策 Skill）
  - 惊喜预算: TRUTH_TABLE.md 第六节
- **任务清单**:
  1. 创建 `openclaw/skills/meituan-order/` — 美团下单 Skill:
     ```
     meituan-order/
     ├── skill.md        — 教 Agent 如何通过美团下单
     ├── api.ts          — 美团 API 封装
     └── types.ts        — 订单类型
     ```
  2. 创建 `openclaw/skills/product-selector/` — 智能选品 Skill:
     ```
     product-selector/
     ├── skill.md        — 教 Agent 选品逻辑
     ├── api.ts          — 选品 API
     └── rules.ts        — 选品规则（预算/品类/用户偏好）
     ```
     选品逻辑:
     - 输入: 预算(分) + 用户偏好(记忆检索) + 用户位置
     - 输出: 商品推荐列表 + 理由
     - 规则: 零食 > 饮品 > 小物件（默认偏好）
  3. 创建 `apps/server/src/services/o2o.ts` — O2O 服务:
     ```typescript
     export function createO2OService(config) {
       return {
         async searchProducts(location, budget, preferences): Promise<Product[]>
         async createOrder(productId, address): Promise<Order>
         async getOrderStatus(orderId): Promise<OrderStatus>
       }
     }
     ```
  4. **v1 简化方案**（如美团 API 接入门槛高）:
     - 使用链接分享模式：Agent 生成美团商品搜索链接
     - "我帮你选了这个，快去看看吧～" + 链接
     - 不需要 API 对接，降低复杂度
- **输出**:
  - `openclaw/skills/meituan-order/`
  - `openclaw/skills/product-selector/`
  - `apps/server/src/services/o2o.ts`
  - 修改 `apps/server/src/app.ts`
- **验证命令**:
  ```bash
  cd apps/server && pnpm build && pnpm tsc --noEmit
  # 手动验证：惊喜触发 → Agent 选品 → 推送商品链接
  ```

### 质量门禁

- [ ] `pnpm build` 全通
- [ ] 支付创建订单 → 沙箱支付 → 回调验证 → 到账链路通过
- [ ] 支付签名验证正确
- [ ] 订单超时自动关闭
- [ ] 防重复支付（同一订单不会重复加币）
- [ ] Agent 惊喜触发 → 选品 → 推送链路通过
- [ ] Mock 支付开发模式可用

### 失败回滚

- 如果支付商户资质未获批 → 保留 Mock 支付模式，支付集成标记为 TODO
- 如果美团 API 接入被拒 → 使用链接分享方案（v1 简化）

---

## Round 12: 多渠道 + 桌面版 + 终极验证

### 元信息

| 属性 | 值 |
|------|------|
| 并行数 | 3 |
| 预估耗时 | 2-3会话 |
| 前置依赖 | Round 11 |
| 里程碑 | v3.0 终局 |
| 阻塞风险 | 微信 Channel 需要微信公众号/小程序资质 |

### Agent 分配

#### Agent-A: 多渠道工程师
- **subagent_type**: general-purpose
- **输入**:
  - OpenClaw 渠道系统（22+ 内置渠道）
  - `openclaw/agents/xiaoxing/`（Agent 配置）
  - 微信公众号/小程序 API 文档
- **任务清单**:
  1. 配置 OpenClaw 飞书 Channel:
     - 在已有的飞书 Channel 基础上绑定角色 Agent
     - 确保角色人格一致性（同一个 SOUL.md）
  2. 配置 OpenClaw Telegram Channel:
     - Bot 创建 + Token 配置
     - 角色 Agent 绑定
  3. 微信 Channel（如资质允许）:
     - 公众号消息回复接入
     - 或微信小程序 WebView 方案
  4. 创建 `apps/server/src/services/channel-sync.ts` — 跨渠道状态同步:
     ```typescript
     // 确保同一用户在不同渠道看到的是同一个"角色"
     // 信赖值/零花钱/记忆 在所有渠道共享
     // 对话历史跨渠道可见
     ```
- **输出**:
  - OpenClaw 飞书/Telegram Channel 配置
  - `apps/server/src/services/channel-sync.ts`
  - 跨渠道测试报告
- **验证命令**:
  ```bash
  # 手动验证：
  # 1. 在 Web 送礼 → 飞书中角色提及"谢谢你的礼物"
  # 2. 在 Telegram 聊天 → Web 中可见对话记录
  ```

#### Agent-B: Electron 桌面版工程师
- **subagent_type**: general-purpose
- **输入**:
  - `apps/stage-tamagotchi/`（AIRI 现有 Electron 应用）
  - 全部经济系统 UI 组件
  - `packages/stage-ui-live2d/`（Live2D 渲染）
- **任务清单**:
  1. 桌面版功能集成:
     - Live2D 角色常驻桌面（半透明窗口）
     - 系统托盘图标 + 右键菜单
     - 点击托盘 → 弹出小窗口对话
     - 全部经济系统 UI 在 Electron 中可用
  2. 桌面版专属功能:
     - 开机自启动选项
     - 角色在桌面边缘"闲逛"动画
     - Agent 主动消息 → 系统通知
     - 快捷键呼出对话框
  3. 打包配置:
     - Windows 安装包（NSIS）
     - macOS DMG
     - 自动更新机制
- **输出**:
  - 修改 `apps/stage-tamagotchi/`（集成经济系统）
  - 桌面版打包产物
- **验证命令**:
  ```bash
  cd apps/stage-tamagotchi && pnpm build
  # 手动验证：安装 → Live2D桌面常驻 → 对话 → 送礼 → 通知
  ```

#### Agent-C: 终极验证工程师
- **subagent_type**: general-purpose
- **输入**: 全部 Round 1-12 产出
- **任务清单**:
  1. 编写终极 E2E 测试 `apps/stage-web/e2e/ultimate-journey.spec.ts`:
     ```
     完整用户旅程:
     ① 注册 → 创角(选小星) → Live2D 角色出现打招呼
     ② 日常聊天(语音回复) → 签到(+5信赖)
     ③ 充值(微信支付¥68) → 爱心币到账
     ④ 送礼(金币飞入 → Live2D 感动表情 → 语音感谢)
     ⑤ 零花钱积累 → 进度条 → 角色暗示("嘿嘿，最近在想给你一个惊喜~")
     ⑥ Agent 自主触发惊喜 → 商品推荐 → 推送
     ⑦ 信赖 Lv.5→Lv.6 升级 → Live2D 换新衣 → 升级仪式
     ⑧ 关闭 App → 第二天早上收到推送"早安～今天有雨，记得带伞"
     ⑨ 在飞书群@小星 → 同一个"灵魂"回复
     ⑩ 7天 Demo → 转化引导 → 付费留存
     ⑪ 断开 OpenClaw → 降级模式正常工作
     ⑫ 刷新 → 全部状态持久化恢复
     ```
  2. 安全审计:
     - 支付接口：签名伪造测试
     - API：未授权访问测试
     - 限频：暴力请求测试
     - XSS/CSRF：前端安全测试
  3. 性能总结报告:
     - 各端首屏加载时间
     - Live2D 帧率（桌面/移动）
     - 内存峰值
     - API 响应 P99 延迟
  4. 生成最终产品文档:
     - 部署指南
     - API 文档
     - 运维手册
- **输出**:
  - `apps/stage-web/e2e/ultimate-journey.spec.ts`
  - `docs/SECURITY_AUDIT.md`
  - `docs/PERFORMANCE_FINAL.md`
  - `docs/DEPLOYMENT_GUIDE.md`
- **验证命令**:
  ```bash
  cd apps/stage-web && npx playwright test
  # 全链路人工验收
  ```

### 质量门禁

- [ ] 终极 E2E 全部场景通过
- [ ] 跨渠道状态同步正确（Web↔飞书↔Telegram）
- [ ] Electron 桌面版打包成功 + 功能完整
- [ ] 安全审计无高危漏洞
- [ ] 移动端内存 < 300MB
- [ ] 全部 UI 中文化 + 合规文案
- [ ] 降级模式（无 OpenClaw）功能完整
- [ ] `pnpm build` 全通（全部包 + 全部应用）

### 失败回滚

- 如果多渠道集成不完整 → 保留 Web + Electron 双端，其他渠道标记为后续迭代
- 如果安全审计发现高危问题 → 立即修复，不发布

---

## 附录 A: Agent 阻塞点汇总

| 轮次 | 阻塞点 | 需要用户提供 | 替代方案 |
|------|--------|------------|---------|
| Round 7 | OpenClaw 接入 | Gateway Token + Device Pairing | 跳过，保留直连 LLM 模式 |
| Round 9 | TTS 服务 | CosyVoice API Key | Mock 音频，TTS 标记 TODO |
| Round 11 | 真实支付 | 微信/支付宝商户资质 | Mock 支付模式 |
| Round 11 | O2O 对接 | 美团开放平台 API Key | 链接分享方案 |
| Round 12 | 微信渠道 | 公众号/小程序资质 | 仅 Web + 飞书 + Telegram |

## 附录 B: 文件产出总览

### packages/ 新增

```
packages/soul-engine/                    [Round 1, 已完成]
├── src/
│   ├── trust/calculator.ts
│   ├── economy/engine.ts
│   ├── surprise/engine.ts
│   ├── demo/manager.ts
│   ├── emotion/mapping.ts               [Round 4]
│   ├── appearance/config.ts             [Round 4]
│   ├── appearance/index.ts              [Round 4]
│   ├── types/character.ts
│   ├── types/wallet.ts
│   ├── types/surprise.ts
│   ├── types/subscription.ts
│   ├── types/index.ts
│   └── index.ts
```

### apps/server/ 新增

```
apps/server/src/
├── schemas/
│   ├── wallets.ts                       [Round 2]
│   ├── transactions.ts                  [Round 2]
│   ├── trust-records.ts                 [Round 2]
│   └── surprises.ts                     [Round 2]
├── services/
│   ├── economy.ts                       [Round 2]
│   ├── trust.ts                         [Round 2]
│   ├── surprises.ts                     [Round 2]
│   ├── openclaw.ts                      [Round 7]
│   ├── memory.ts                        [Round 9]
│   ├── tts.ts                           [Round 9]
│   ├── o2o.ts                           [Round 11]
│   └── channel-sync.ts                  [Round 12]
├── routes/
│   ├── wallet.ts                        [Round 2]
│   ├── trust.ts                         [Round 2]
│   ├── surprises.ts                     [Round 2]
│   ├── skills.ts                        [Round 8]
│   ├── memory.ts                        [Round 9]
│   ├── tts.ts                           [Round 9]
│   └── payment.ts                       [Round 11]
├── api/
│   ├── wallet.schema.ts                 [Round 2]
│   ├── trust.schema.ts                  [Round 2]
│   └── surprises.schema.ts             [Round 2]
├── middlewares/
│   ├── rate-limit.ts                    [Round 2]
│   └── openclaw-fallback.ts             [Round 8]
├── libs/
│   ├── openclaw-client.ts               [Round 7]
│   ├── ws-push.ts                       [Round 9]
│   └── payment/                         [Round 11]
│       ├── index.ts
│       ├── wechat.ts
│       ├── alipay.ts
│       ├── mock.ts
│       └── types.ts
└── __tests__/
    ├── economy-atomicity.test.ts        [Round 2]
    ├── truth-table-consistency.test.ts  [Round 6]
    └── openclaw-stability.test.ts       [Round 10]
```

### apps/stage-web/ 新增

```
apps/stage-web/src/
├── pages/
│   ├── wallet/
│   │   ├── index.vue                    [Round 3]
│   │   ├── charge.vue                   [Round 3]
│   │   └── history.vue                  [Round 3]
│   ├── surprises/
│   │   └── index.vue                    [Round 5]
│   └── onboarding/
│       └── index.vue                    [Round 5]
├── components/
│   ├── gift/
│   │   ├── GiftPanel.vue                [Round 3]
│   │   └── GiftAnimation.vue            [Round 3]
│   ├── trust/
│   │   ├── TrustBar.vue                 [Round 3]
│   │   └── LevelUpCeremony.vue          [Round 3]
│   ├── surprise/
│   │   ├── SurpriseCard.vue             [Round 5]
│   │   ├── SurpriseAnimation.vue        [Round 5]
│   │   └── PocketMoneyBar.vue           [Round 5]
│   ├── demo/
│   │   ├── DemoGuide.vue                [Round 5]
│   │   ├── DayProgress.vue              [Round 5]
│   │   └── ConversionCard.vue           [Round 5]
│   └── chat/
│       └── VoiceBubble.vue              [Round 9]
├── stores/
│   ├── wallet.ts                        [Round 3]
│   ├── trust.ts                         [Round 3]
│   ├── surprise.ts                      [Round 5]
│   └── demo.ts                          [Round 5]
├── composables/
│   └── useAgentPush.ts                  [Round 9]
└── e2e/
    ├── playwright.config.ts             [Round 6]
    ├── full-journey.spec.ts             [Round 6, 更新于 Round 10]
    ├── surprise-flow.spec.ts            [Round 6]
    └── ultimate-journey.spec.ts         [Round 12]
```

### openclaw/ 新增

```
openclaw/
├── agents/
│   ├── xiaoxing/                        [Round 7]
│   │   ├── SOUL.md
│   │   ├── IDENTITY.md
│   │   ├── MEMORY.md
│   │   ├── BOOT.md
│   │   └── HEARTBEAT.md                 [Round 9]
│   ├── xiaonuan/SOUL.md                 [Round 7]
│   ├── keke/SOUL.md                     [Round 7]
│   ├── shizhi/SOUL.md                   [Round 7]
│   ├── bingtang/SOUL.md                 [Round 7]
│   └── alie/SOUL.md                     [Round 7]
├── plugins/
│   └── ai-companion-channel/            [Round 7]
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── ws-bridge.ts
│           └── message-adapter.ts
└── skills/
    ├── trust-engine/                    [Round 8]
    ├── economy-engine/                  [Round 8]
    ├── surprise-engine/                 [Round 8]
    ├── memory-search/                   [Round 8]
    ├── proactive-message/               [Round 9]
    ├── memory-manager/                  [Round 9]
    ├── meituan-order/                   [Round 11]
    └── product-selector/                [Round 11]
```

## 附录 C: 每轮 Agent 数量统计

| 轮次 | Agent 数 | 状态 |
|------|---------|------|
| Round 1 | 3 | 已完成 |
| Round 2 | 3 | 待执行 |
| Round 3 | 2 | 待执行 |
| Round 4 | 2 | 待执行 |
| Round 5 | 2 | 待执行 |
| Round 6 | 2 | 待执行 |
| Round 7 | 2 | 待执行（有阻塞点）|
| Round 8 | 2 | 待执行 |
| Round 9 | 3 | 待执行（有阻塞点）|
| Round 10 | 2 | 待执行 |
| Round 11 | 2 | 待执行（有阻塞点）|
| Round 12 | 3 | 待执行 |
| **总计** | **28** | |
