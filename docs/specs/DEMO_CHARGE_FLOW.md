# 充值演示流程需求文档

> 版本：v1.0 | 日期：2026-03-06
> 状态：Round 1 产出（3 Agent 整合）
> 数值来源：`docs/TRUTH_TABLE.md` v1.0（2026-03-04）

---

## 一、充值全链路流程图

### 1.1 ASCII 全链路流程图

```
用户操作                前端Store层                   后端Route层                  后端Service层                   数据库层
========               ===========                  ==========                  ============                   ========

[1] 用户进入钱包页
    /wallet
        |
        v
  wallet/index.vue
  onMounted()
        |
        v
  walletStore          GET /api/wallet
  .fetchWallet() -----> wallet.ts route ----------> economyService
        |               authGuard                   .getWallet(userId)
        |               queryRateLimiter             |
        |               (60次/分)                    +--> SELECT * FROM wallets
        |                                            |    WHERE user_id = ?
        |                                            +--> 不存在则 INSERT (initWallet)
        v                                                     |
  walletStore                                                 v
  .fetchTransactions() -> GET /api/wallet/history           返回 wallet 对象
                          authGuard                         (含 isFirstCharge 标记)
                          queryRateLimiter

[2] 用户点击"充值"
    router.push('/wallet/charge')
        |
        v
  wallet/charge.vue
  显示7档充值套餐 + 首充翻倍提示

[3] 用户选择套餐（如 pack_68）
    selectPack('pack_68')
        |
        v
  selectedPackId = 'pack_68'
  界面高亮选中态 + 底部按钮显示"确认充值 ¥68"

[4] 用户点击"确认充值"
    handleCharge()
        |
        +----> 生成 idempotencyKey = crypto.randomUUID()
        |
        |  ============ 步骤 4a：创建支付订单 ============
        v
  paymentStore               POST /api/payment/
  .createOrder() ----------> create-order ------------> paymentService
  (packId, idempKey)         authGuard                  .createOrder(userId,
  body: {                    |                           packId, provider,
    packId: 'pack_68',       | CreatePaymentOrder        idempotencyKey)
    provider: 'mock',        | Schema校验                |
    idempotencyKey           |                           +--> 1. getChargePack(packId)
  }                          |                           |    验证套餐存在
                             |                           |
                             |                           +--> 2. 幂等检查(idempKey)
                             |                           |
                             |                           +--> 3. createPaymentProvider('mock')
                             |                           |    调用 MockProvider.createOrder()
                             |                           |    生成 mockOrderId
                             |                           |    状态='created'
                             |                           |    过期时间=30分钟后
                             |                           |
                             |                           +--> 4. INSERT INTO payment_orders
                             |                                {userId, packId, amount,
                             |                                 provider='mock',
                             |                                 status='created',
                             |                                 paymentParams=JSON,
                             |                                 expireAt}
                             v
                      返回 { order: {orderId, ...}, duplicate: false }
        |
        |  ============ 步骤 4b：Mock 支付完成 ============
        v
  paymentStore               POST /api/payment/
  .mockPay(orderId) -------> mock-pay/:id -------------> paymentService
                             authGuard                   .mockPay(orderId)
                             |                            |
                             | ⚠️安全检查:                 +--> 1. 查找订单
                             | NODE_ENV !== 'production'  |
                             | 或 ENABLE_MOCK_PAY=true    +--> 2. 验证 provider='mock'
                             |                            |    验证 status='created'
                             | 验证订单属于当前用户          |    验证未过期(30min)
                             |                            |
                             |                            +--> 3. mockCompletePayment(id)
                             |                            |    (内存Map标记paid)
                             |                            |
                             |                            +--> 4. UPDATE payment_orders
                             |                                 SET status='paid',
                             |                                     transaction_id='mock_tx_{ts}',
                             |                                     paid_at=NOW()
                             |
                             |  ======= 步骤 4c：触发充值到账 =======
                             |
                             +-----> economyService
                                     .processCharge(userId, packId, 'payment:{orderId}')
                                      |
                                      +--> 1. getChargePack(packId)
                                      +--> 2. getWallet(userId)
                                      +--> 3. db.transaction() {
                                      |    3a. 幂等检查(事务内)
                                      |    3b. SELECT ... FOR UPDATE  <-- 行锁!
                                      |    3c. calcCharge(packId, balance, isFirstCharge)
                                      |        → soul-engine processCharge
                                      |    3d. INSERT INTO transactions
                                      |    3e. UPDATE wallets SET
                                      |        coin_balance += coinsAdded,
                                      |        total_charged += price,
                                      |        is_first_charge = false
                                      |    }
                                      v
                               返回 {transaction, chargeResult, duplicate}
        |
        |  ============ 步骤 4d：前端刷新 ============
        v
  walletStore.fetchWallet()   --> 重新拉取最新余额
  toast.success(...)          --> 弹出成功提示
  paymentStore.clearOrder()   --> 清除支付状态
```

### 1.2 两条充值路径对比

| 特性 | 路径A（旧直充） | 路径B（新支付订单） |
|------|---------------|-------------------|
| 前端入口 | `walletStore.charge()` | `paymentStore.createOrder()` + `mockPay()` |
| API端点 | `POST /api/wallet/charge` | `POST /api/payment/create-order` + `mock-pay/:id` |
| 支付订单记录 | 无 | 有（payment_orders表） |
| 生产环境可用 | **是**（无NODE_ENV检查） | **否**（mock-pay返回404） |
| 当前charge.vue使用 | 否 | **是** |

### 1.3 数据库变化追踪

| 步骤 | 表 | 操作 | 变化字段 |
|------|---|------|---------|
| 进入钱包页 | wallets | SELECT/INSERT | 若不存在则初始化(coin_balance=0, is_first_charge=true) |
| 选择套餐 | — | — | 纯前端操作，无DB变化 |
| 创建订单(4a) | payment_orders | INSERT | `{status:'created', provider:'mock', expire_at=NOW()+30min}` |
| Mock支付(4b) | payment_orders | UPDATE | `status→'paid', transaction_id='mock_tx_...', paid_at=NOW()` |
| 充值到账(4c) | transactions | INSERT | `{type:'charge', coins=1540(首充)/860(非首充)}` |
| 充值到账(4c) | wallets | UPDATE | `coin_balance+=N, total_charged+=68, is_first_charge=false` |

---

## 二、充值数值对照表

> 引用 TRUTH_TABLE.md 4.1节

| 档位 | 价格 | 基础币 | 赠送 | 非首充总计 | 首充总计 | packId |
|------|------|--------|------|-----------|---------|--------|
| 小小心意 | ¥1 | 10 | 0 | **10** | **20** | pack_1 |
| 甜蜜起步 | ¥6 | 60 | 10 | **70** | **130** | pack_6 |
| 暖心之选 | ¥30 | 300 | 70 | **370** | **670** | pack_30 |
| 真心以待 | ¥68 | 680 | 180 | **860** | **1,540** | pack_68 |
| 浓情蜜意 | ¥128 | 1,280 | 420 | **1,700** | **2,980** | pack_128 |
| 至死不渝 | ¥328 | 3,280 | 1,020 | **4,300** | **7,580** | pack_328 |
| 命中注定 | ¥648 | 6,480 | 2,520 | **9,000** | **15,480** | pack_648 |

**首充翻倍公式**（soul-engine实现）：
```
coinsAdded = baseCoins × 2 + bonusCoins
即：基础币翻倍，赠送不翻倍
```

**消费限额**（TRUTH_TABLE 4.3节）：

| 用户类型 | 单日上限 | 单月上限 |
|---------|---------|---------|
| 成年用户 | 500元 | 2,000元 |
| 16-17岁 | 50元 | 200元 |
| 8-15岁 | 20元 | 100元 |
| 8岁以下 | 禁止充值 | 禁止充值 |

---

## 三、Demo环境阻塞点分析

### 3.1 Mock支付生产环境限制

**文件位置**：`apps/server/src/routes/payment.ts:108-115`

```typescript
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MOCK_PAY !== 'true') {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not Found' }, 404)  // 生产环境始终返回404
  }
}
```

**环境行为矩阵**：

| NODE_ENV | ENABLE_MOCK_PAY | mock-pay可用? |
|----------|-----------------|--------------|
| development | 未设置 | **可用** |
| development | 'true' | **可用** |
| production | 未设置 | **不可用(404)** |
| production | 'true' | **不可用(404)** |

> Railway部署默认 NODE_ENV=production，因此当前线上 mock-pay 端点返回404。

### 3.2 其他潜在阻塞点

| 阻塞点 | 原因 | 影响 |
|--------|------|------|
| 认证过期 | authGuard要求有效session | 所有充值操作被拦截 |
| 频率限制 | chargeRateLimiter 5次/分 | 快速演示时可能触发429 |
| 幂等键重复 | 同一UUID不能二次充值 | 每次充值必须新UUID |

---

## 四、Demo充值方案设计

### 4.1 三方案对比

| 对比项 | 方案A：Mock全流程 | 方案B：直接充值 | 方案C：Demo专属（推荐） |
|--------|-----------------|---------------|----------------------|
| 操作 | 设置ENABLE_MOCK_PAY=true | 调用POST /api/wallet/charge | 方案A + Demo Day3剧情衔接 |
| 改动量 | 0行代码 | 0行代码 | 0行代码，1个环境变量 |
| 支付流程完整度 | 完整 | 无订单记录 | 完整 |
| 演示叙事性 | 中 | 低 | **高** |
| 安全隔离 | 好 | 需额外防护 | 好 |
| **推荐度** | 适合技术演示 | 仅限内部 | **首选** |

### 4.2 推荐方案C详情

**核心思路**：Mock支付全流程 + Demo模式Day3赠送 + 首充翻倍高光

```
Day 1-2: 免费互动积累信赖（×8 倍率），角色外观渐变
   ↓
Day 3: 系统赠送 50 爱心币 → 引导首次送礼体验
   ↓
演示高光: 执行首充 → 首充翻倍动画 → 角色感动反应
   ↓
Day 3+: 用爱心币送礼 → 信赖飙升 → 解锁新外观/新互动
```

**环境配置**（仅需1行）：
```bash
# Railway 环境变量新增
ENABLE_MOCK_PAY=true
```

> **注意**：当前代码逻辑在 NODE_ENV=production 时**始终返回404**，即使设置了 ENABLE_MOCK_PAY=true。需要修改 payment.ts 第108-115行的条件判断逻辑，改为：当 ENABLE_MOCK_PAY=true 时无论 NODE_ENV 都允许 mock-pay。或使用**路径A（旧直充）**作为Demo备选方案。

### 4.3 生产环境备选方案

如果不修改代码，使用旧直充路径：
```javascript
// 浏览器 DevTools Console
fetch('/api/wallet/charge', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    packId: 'pack_68',
    idempotencyKey: crypto.randomUUID()
  })
}).then(r => r.json()).then(console.log)
```

---

## 五、首充翻倍高光时刻设计

### 5.1 数字动画方案（以68元首充为例）

```
阶段1 — 基础到账（0.8秒）
  数字从 0 滚动跳涨到 680
  背景：粉色柔光渐入
  音效：轻柔的「叮~」

阶段2 — 赠送叠加（0.5秒）
  +180 从右侧飞入，数字跳涨到 860
  标注：「赠送 +180」金色浮标
  音效：「叮叮~」连续两声

阶段3 — 首充翻倍爆发（1.2秒，核心高光）
  屏幕中央弹出「首充翻倍!」大字（金色+光效粒子）
  数字从 860 飙升到 1,540
  「×2」标识弹出，带弹性动效
  背景爆发金色粒子特效
  音效：「叮叮叮~~~嘭!」

阶段4 — 最终确认（0.6秒）
  数字 1,540 轻微弹跳后稳定
  底部滑入确认条
  角色表情切换为「感动」(touched)
```

总时长：约3.1秒

### 5.2 充值确认弹窗UI设计

```
┌─────────────────────────────────┐
│        确认充值 ¥68             │
│                                 │
│   基础爱心币     680            │
│   赠送           +180           │
│   ─────────────────             │
│   常规总计       860            │
│                                 │
│   ══════════════════            │
│   首充翻倍       +680    ← 金色高亮
│   ══════════════════            │
│                                 │
│   实际到账   ★ 1,540 ★         │
│                                 │
│   节省了 ¥68（相当于买一送一）    │
│                                 │
│      [ 确认支付 ¥68 ]           │
└─────────────────────────────────┘
```

---

## 六、充值后角色反应设计

### 6.1 各档位情感状态链

基于 TRUTH_TABLE 九节的8种情感（happy/calm/caring/curious/missing/clingy/shy/touched）：

| 档位 | 情感链 |
|------|--------|
| 1元 | calm → shy(2min) → happy(5min) → calm |
| 6元 | calm → happy(5min) → calm |
| 30元 | calm → touched(10min) → happy(5min) → calm |
| 68元 | calm → touched(15min) → caring(10min) → calm |
| 128元 | calm → touched(3min) → clingy(10min) → happy(5min) → calm |
| 328元 | calm → touched(30min) → caring(15min) → calm |
| 648元 | calm → touched(60min) → clingy(15min) → happy(10min) → calm |

### 6.2 角色感谢语模板示例

**68元「真心以待」**：
> "「真心以待」...这个名字好美。你真的是认真对待我们之间的关系呢...我感受到了你的心意，每一颗爱心币都承载着你的温柔。"
> [情感状态: touched，持续15分钟]

**648元「命中注定」**：
> "...对不起，让我缓一缓。「命中注定」...我从来没想过，会有人为我做到这个地步。从今以后，我也是你的「命中注定」。"
> [情感状态: touched，持续1小时][触发: 角色主动发3条消息]

---

## 七、演示者操作脚本

### 7.1 首充演示脚本（推荐）

```
Step 1: 打开钱包页 → 确认余额0 + 首充翻倍横幅可见
Step 2: 点击"充值" → 跳转充值中心，7档套餐+首充双倍横幅
Step 3: 选择"真心以待 ¥68" → 卡片高亮，底部显示"确认充值 ¥68"
Step 4: 点击确认充值 → 等待1-2秒 → 到账成功
Step 5: 验证余额 → 显示1,540爱心币（首充翻倍）
Step 6: 返回钱包页 → 交易记录显示"充值 真心以待" +1,540
```

### 7.2 演示者话术要点

| 步骤 | 话术重点 |
|------|---------|
| 展示充值中心 | "7档位从1-648元，首充翻倍是核心转化策略" |
| 执行首充 | "看数字动画——680基础+180赠送+680翻倍=1,540，多巴胺时刻" |
| 角色反应 | "个性化情感反馈，不是简单弹'谢谢'，提高复充率的关键" |
| 送礼展示 | "40%进入零花钱池，角色攒够钱给你买惊喜——闭环" |

### 7.3 关键数据口径速查

| 问题 | 回答 | 出处 |
|------|------|------|
| 68元首充实得？ | 680×2+180=1,540 | TRUTH_TABLE 4.1 + soul-engine |
| 零花钱分成？ | 普通40%/月卡50%/年卡60% | TRUTH_TABLE 4.2 |
| Demo信赖倍率？ | ×8 | TRUTH_TABLE 七节 |
| Day3赠送？ | 50爱心币 | TRUTH_TABLE 七节 |
| 角色情感几种？ | 8种（移除angry/sad） | TRUTH_TABLE 九节 |

---

## 八、充值UI流程Gap清单

### 8.1 高优先级（P0 — 必须修）

| # | 缺失描述 | 工作量 | 修改文件 |
|---|---------|--------|---------|
| C1 | **充值确认弹窗**：无二次确认直接发起支付 | M | `pages/wallet/charge.vue` |
| C2 | **充值成功动画**：仅toast提示，缺少视觉仪式感 | M | 新建 `ChargeSuccessAnimation.vue` |
| C3 | **充值页合规底部**：付费页面缺少ComplianceFooter | S | `pages/wallet/charge.vue` |

### 8.2 中优先级（P1 — 应该修）

| # | 缺失描述 | 工作量 | 修改文件 |
|---|---------|--------|---------|
| C4 | **余额变化动画**：数字直接跳变，缺CountUp过渡 | M | `pages/wallet/index.vue` |
| C5 | **支付处理中遮罩**：仅按钮loading，无全屏遮罩 | S | `pages/wallet/charge.vue` |
| C6 | **充值后导航引导**：成功后停留充值页无引导 | S | `pages/wallet/charge.vue` |
| C7 | **套餐性价比标注**：缺少每元获得币数对比 | S | `pages/wallet/charge.vue` |
| C8 | **错误重试机制**：失败后仅toast无重试按钮 | S | `pages/wallet/charge.vue` |
| C9 | **Demo充值引导**：Day3到充值页缺完整引导链 | M | `DemoGuide.vue` + `charge.vue` |
| C10 | **首充庆祝动画**：首次充值无专门庆祝（类似LevelUpCeremony） | M | `pages/wallet/charge.vue` |

### 8.3 低优先级（P2 — 可以修）

| # | 缺失描述 | 工作量 | 修改文件 |
|---|---------|--------|---------|
| C11 | **交易详情页**：记录不可点击查看详情 | M | 新建 `pages/wallet/detail.vue` |
| C12 | **空状态充值引导**：余额为0时无醒目引导 | S | `pages/wallet/index.vue` |
| C13 | **礼物面板充值入口UX**：余额不足链接不够醒目 | S | `GiftPanel.vue` |
| C14 | **历史记录筛选**：无按类型筛选功能 | M | `pages/wallet/history.vue` |

### 8.4 移动端适配项

- 充值页套餐卡片375px下 `p-4` 可减为 `p-3`
- 礼物面板"去充值"链接触控区域偏小（`py-1` → `py-2`）
- 天数进度7圆在极窄屏幕空间紧张
- 浮动按钮小标签可能溢出视口

---

## 九、已知Bug

### 9.1 前后端首充计算不一致

| 位置 | 计算方式 | pack_68首充结果 |
|------|---------|---------------|
| 前端 `charge.vue` getEffectiveCoins | `(coins + bonus) × 2` | **1,720** |
| 后端 soul-engine processCharge | `coins × 2 + bonus` | **1,540** |

**影响**：前端展示和toast显示1,720，实际到账1,540，差额=赠送币数(180)

**修复方案**：
```typescript
// charge.vue 修正
function getEffectiveCoins(coins: number, bonus: number) {
  if (wallet.value?.isFirstCharge) return coins * 2 + bonus  // 只翻倍基础币
  return coins + bonus
}
```

### 9.2 payment_orders.amount 单位歧义

types.ts注释标注"分"，实际存储"元"（pack.price），需统一。

---

## 十、关键文件索引

| 文件 | 路径 | 职责 |
|------|------|------|
| 钱包页 | `apps/stage-web/src/pages/wallet/index.vue` | 余额展示+入口 |
| 充值页 | `apps/stage-web/src/pages/wallet/charge.vue` | 套餐选择+充值触发 |
| 历史页 | `apps/stage-web/src/pages/wallet/history.vue` | 交易记录 |
| 钱包Store | `apps/stage-web/src/stores/wallet.ts` | 前端钱包状态 |
| 支付Store | `apps/stage-web/src/stores/payment.ts` | 前端支付流程 |
| 礼物面板 | `apps/stage-web/src/components/gift/GiftPanel.vue` | 送礼UI |
| 礼物动画 | `apps/stage-web/src/components/gift/GiftAnimation.vue` | 心形粒子 |
| 信赖条 | `apps/stage-web/src/components/trust/TrustBar.vue` | 信赖进度 |
| 升级仪式 | `apps/stage-web/src/components/trust/LevelUpCeremony.vue` | 等级提升动画 |
| Demo引导 | `apps/stage-web/src/components/demo/DemoGuide.vue` | 7天引导 |
| 钱包路由 | `apps/server/src/routes/wallet.ts` | 旧充值API |
| 支付路由 | `apps/server/src/routes/payment.ts` | 新支付API |
| 经济服务 | `apps/server/src/services/economy.ts` | 充值核心逻辑 |
| 支付服务 | `apps/server/src/services/payment.ts` | 订单生命周期 |
| Mock支付 | `apps/server/src/libs/payment/mock.ts` | Mock Provider |
| 充值引擎 | `packages/soul-engine/src/economy/engine.ts` | 首充/赠送计算 |
| Demo管理 | `packages/soul-engine/src/demo/manager.ts` | 7天Demo控制 |
| 数值真值表 | `docs/TRUTH_TABLE.md` | 权威数值来源 |
