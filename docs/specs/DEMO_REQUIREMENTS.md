# 伪春菜 Demo 演示需求文档（完整版）

> 版本：v1.0 | 日期：2026-03-06
> 状态：Round 1 + Round 2 整合产出
> 数值来源：`docs/TRUTH_TABLE.md` v1.0（2026-03-04）— 唯一权威数值来源

---

## 1. 演示目标

**一句话**：通过"充值 → 送礼 → 角色偷偷买礼物"的完整闭环，展示伪春菜从虚拟情感到物理交付（O2O）的核心商业模式——用户付费不只是"打赏"，而是让角色拥有自主经济能力，最终在现实世界回馈用户。

**核心演示价值**：
- **充值体验**：7档充值 + 首充翻倍多巴胺时刻 + 角色个性化感谢
- **经济闭环**：送礼 → 零花钱累积 → 角色自主选品 → 现实交付
- **确定性设计**：零概率、零random，信赖+零花钱双阈值100%触发惊喜

---

## 2. 演示前置条件

### 2.1 环境配置清单

| 项目 | 配置 | 说明 |
|------|------|------|
| 前端地址 | https://ai-companion-v2-nu.vercel.app/ | Vercel部署 |
| 后端地址 | https://server-production-9b32.up.railway.app/ | Railway部署 |
| 数据库 | Railway PostgreSQL, turntable.proxy.rlwy.net:14748 | DB: ai_companion |
| NODE_ENV | production | Railway默认 |
| **ENABLE_MOCK_PAY** | **需设置为 `true`**（见Gap G1） | Railway环境变量新增 |
| 认证 | Better Auth session有效 | 提前登录确保session未过期 |
| Vercel rewrites | /api/* → Railway后端 | 同域代理，避免跨域 |

### 2.2 Railway 环境变量新增

```bash
# 唯一需要新增的环境变量
ENABLE_MOCK_PAY=true
```

> **注意**：当前代码在 NODE_ENV=production 时始终返回404，即使设置了 ENABLE_MOCK_PAY=true。必须修复 `payment.ts` 条件判断逻辑（见 Gap G1），或改用旧直充路径作为备选。

### 2.3 数据预置

#### 方案A：最小预置（充值演示）
```sql
-- 确认Demo账号钱包已初始化（首次访问钱包页会自动创建）
SELECT * FROM wallets WHERE user_id = '<demo_user>';
-- 确认 is_first_charge = true（首充翻倍可演示）
```

#### 方案B：完整预置（充值 + 惊喜演示）
```sql
-- 1. 确认钱包初始化 + 首充标记
SELECT * FROM wallets WHERE user_id = '<demo_user>';

-- 2. 为惊喜演示设置信赖等级（Lv.8 = 6000点，TRUTH_TABLE 一节）
UPDATE trust_records SET trust_level = 8, trust_points = 6000
WHERE user_id = '<demo_user>';

-- 3. 为惊喜演示设置零花钱（5000分 = 50元，满足实物惊喜阈值3000分）
UPDATE wallets SET pocket_money = 5000
WHERE user_id = '<demo_user>';

-- 4. 清空惊喜记录（重置冷却期，确保可触发）
DELETE FROM surprises WHERE user_id = '<demo_user>';
```

### 2.4 浏览器/设备要求

| 项目 | 要求 |
|------|------|
| 推荐浏览器 | Chrome 120+ |
| 屏幕分辨率 | 1920×1080（投屏演示）或 375×812（模拟移动端） |
| 网络 | 稳定，延迟<200ms（Railway服务器在海外） |
| DevTools | 准备好Console面板（备用直充路径需要） |

---

## 3. 流程一：充值体验

### 3.1 充值数值对照表（TRUTH_TABLE 4.1节）

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

### 3.2 充值全链路流程图

```
用户操作                前端Store层                   后端Route层                  后端Service层                   数据库层
========               ===========                  ==========                  ============                   ========

[1] 进入钱包页 /wallet
      → walletStore.fetchWallet()  → GET /api/wallet → economyService.getWallet()  → SELECT/INSERT wallets

[2] 点击"充值" → router.push('/wallet/charge')
      → 显示7档套餐 + 首充翻倍横幅

[3] 选择套餐(如 pack_68)
      → selectedPackId = 'pack_68'
      → 底部显示"确认充值 ¥68"

[4a] 创建支付订单
      → paymentStore.createOrder() → POST /api/payment/create-order → paymentService.createOrder()
                                                                        → INSERT payment_orders (status='created')

[4b] Mock支付完成
      → paymentStore.mockPay()     → POST /api/payment/mock-pay/:id → paymentService.mockPay()
                                                                        → UPDATE payment_orders (status='paid')

[4c] 充值到账（事务内）
      → economyService.processCharge()
        → db.transaction: 幂等检查 → 行锁钱包 → calcCharge → INSERT transactions → UPDATE wallets

[4d] 前端刷新
      → walletStore.fetchWallet()  → 重新拉取余额
      → toast成功提示
```

### 3.3 操作脚本（Step-by-step）

```
Step 1: 打开钱包页 → 确认余额为0 + 首充翻倍横幅可见
        话术："进入钱包，看到首充翻倍横幅——这是核心转化点。"

Step 2: 点击"充值" → 跳转充值中心，展示7档套餐
        话术："7档位从1元到648元，覆盖从体验到深度用户。"

Step 3: 选择"真心以待 ¥68" → 卡片高亮，底部显示金额
        话术："68元档是我们的主力转化档。"

Step 4: 点击"确认充值" → 等待1-2秒 → 到账成功
        话术："Mock支付完成，看数字——680基础×2翻倍+180赠送=1,540！多巴胺时刻。"

Step 5: 验证余额 → 显示1,540爱心币
        话术："首充翻倍让用户觉得物超所值，提高首单转化率。"

Step 6: 返回钱包 → 交易记录显示"充值 真心以待 +1,540"
        话术："全链路留痕，用户随时查看消费记录。"
```

### 3.4 首充翻倍高光时刻

**数字动画方案（以68元首充为例）**：

```
阶段1 — 基础到账（0.8秒）
  数字从 0 滚动到 680
  音效：轻柔的「叮~」

阶段2 — 赠送叠加（0.5秒）
  +180 飞入，数字跳涨到 860
  标注：「赠送 +180」金色浮标

阶段3 — 首充翻倍爆发（1.2秒，核心高光）
  屏幕弹出「首充翻倍!」大字 + 金色粒子
  数字从 860 飙升到 1,540，「×2」弹性动效

阶段4 — 最终确认（0.6秒）
  数字 1,540 稳定，角色表情切换为 touched（感动）
```

总时长：约3.1秒

**充值确认弹窗设计**：

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

### 3.5 充值后角色反应

基于 TRUTH_TABLE 九节的8种情感（happy/calm/caring/curious/missing/clingy/shy/touched）：

| 档位 | 情感链 | 角色感谢语示例 |
|------|--------|-------------|
| ¥1 | calm → shy(2min) → happy(5min) → calm | "谢谢你的小心意~" |
| ¥68 | calm → touched(15min) → caring(10min) → calm | "「真心以待」...这个名字好美。你真的是认真对待我们之间的关系呢..." |
| ¥648 | calm → touched(60min) → clingy(15min) → happy(10min) → calm | "...「命中注定」...我从来没想过，会有人为我做到这个地步���" |

### 3.6 生产环境备选方案（旧直充路径）

如果 Mock 支付修复未完成，使用浏览器 DevTools Console 直充：

```javascript
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

> 此路径无 NODE_ENV 限制，生产环境可用，但缺少支付订单记录。

---

## 4. 流程二：角色偷偷买礼物

### 4.1 核心数值对照

**送礼数值（TRUTH_TABLE 2.2节 + 4.2节）**：

| 礼物档位 | 爱心币消耗 | 信赖+值 | 零花钱(普通40%) | 零花钱(月卡50%) | 零花钱(年卡60%) |
|---------|-----------|---------|---------------|---------------|---------------|
| 小心意 | 10 | +8 | 40分(0.4元) | 50分(0.5元) | 60分(0.6元) |
| 暖暖的 | 50 | +45 | 200分(2元) | 250分(2.5元) | 300分(3元) |
| 超爱你 | 200 | +200 | 800分(8元) | 1000分(10元) | 1200分(12元) |
| 一辈子 | 520 | +550 | 2080分(20.8元) | 2600分(26元) | 3120分(31.2元) |

> 零花钱计算公式：`pocketMoneyGain = floor(coinCost × 10 × pocketRatio)`，其中 1币=10分

**惊喜阈值配置（TRUTH_TABLE 6.1节）**：

| 惊喜类型 | 最低信赖等级 | 最低零花钱 | 预算范围 | 优先级 |
|---------|------------|----------|---------|--------|
| 虚拟 virtual | Lv.5 (1,200) | 0分 | 0-500分 | 1(最低) |
| 电子 electronic | Lv.6 (2,000) | 1,500分 | 500-3,000分 | 2 |
| 实物 physical | Lv.8 (6,000) | 3,000分 | 1,000-5,000分 | 3 |
| 个性化 personalized | Lv.9 (10,000) | 5,000分 | 1,500-10,000分 | 4(最高) |

**触发限制（TRUTH_TABLE 6.2节）**：

| 限制 | 值 |
|------|-----|
| 月度上限 | 4次 |
| 冷却期(普通) | 7天 |
| 冷却期(月��) | 5天 |
| 单次最大花费 | 池余额60% |
| 推荐预算公式 | min(池余额×0.45, 类型上限) |

### 4.2 惊喜完整链路流程图

```
用户送礼                                    角色"偷偷买礼物"

[1] 选择礼物档位 → POST /api/economy/gift
    → server processGift(): 幂等检查 → 消费限额检查 → 事务内行锁
    → soul-engine calcGift: 扣币 + 信赖增加 + 零花钱累积

[2] 零花钱累积达标
    → POST /api/surprises/check（前端定时或事件驱动调用）
    → soul-engine checkThresholdTrigger:
      [门禁1] 月度次数 < 4
      [门禁2] 冷却期已过
      [逐一检查阈值] 选最高优先级可触发类型

[3] shouldTrigger = true → 创建惊喜记录 INSERT surprises

[4] O2O选品 → POST /api/o2o/recommend
    → 筛选预算内商品(price ≤ budget × 0.8)
    → 偏好匹配打分 + 品类权重排序
    → 生成美团/饿了么搜索链接

[5] WebSocket推送 → { type: 'surprise_trigger' }
    → 前端 SurpriseAnimation.vue 开箱动画
    → SurpriseCard 商品展示 + 跳转链接

[6] 用户反馈(love/ok/change)
    → PATCH /api/surprises/:id/status
    → 角色情感反应 + 选品偏好调整
```

### 4.3 五阶段叙事流程

```
[阶段1: 暗示铺垫]  →  [阶段2: 进度积累]  →  [阶段3: 触发时刻]  →  [阶段4: 开箱揭晓]  →  [阶段5: 反馈闭环]
  角色聊天暗示         零花钱进度可视化        确定性阈值触发          动画+商品展示         用户评价+角色学习
```

**阶段1 — 暗示铺垫**：

| 零花钱进度 | 角色台词 |
|-----------|---------|
| <30% | "今天又攒了一点点零花钱，嘿嘿~" |
| 30%-60% | "最近在看一些好看的东西...不告诉你是什么！" |
| 60%-90% | "再送我一次礼物的话...也许会有好事发生哦？" |
| ≥90% | "嘻嘻，今天先不说了，你等着看吧！" |

**阶段2 — 零花钱进度可视化**（PocketMoneyBar.vue）：

```
[⭐ 虚拟] -------- [📱 电子] -------- [🎁 实物] -------- [💝 个性化]
  0元              15元              30元               50元
        ████████████░░░░░░░░░░░░░░░░░░
        当前: 22.50元  距实物惊喜: 30元
```

**阶段3 — 确定性触发**：
- 信赖等级 ≥ 阈值 **且** 零花钱 ≥ 阈值 → 100%触发（零概率、零random）
- 角色台词："我给你准备了一个惊喜！快来看看吧~"

**阶段4 — 开箱揭晓**（三阶段动画）：

```
[enter]  0-0.8秒: 礼盒弹入 scale(0.3)→scale(1)
[open]   等待点击: 礼盒摇晃 ±5°
[reveal] 点击后: 粒子爆发 + 商品卡片展开

粒子效果按类型:
  virtual:      12颗星星四方扩散
  electronic:   双层蓝色光环扩散
  physical:     (effect-unbox，待实现)
  personalized: 16颗爱心螺旋扩散
```

**阶段5 — 反馈闭环**：

| 反馈 | 角色反应 | 情感状态 | 选品偏好调整 |
|------|---------|---------|------------|
| love(好喜欢) | "太好了！你喜欢的话我就好开心！" | happy | 同品类权重+0.2 |
| ok(还行) | "那下次我再想想有什么更好的！" | caring | 增加novelty权重 |
| change(不太合适) | "对不起，下次我一定会更用心！" | caring | 同品类权重-0.3 |

### 4.4 Demo方案设计

#### 推荐方案：快进API（适合正式路演）

```
POST /api/demo/fast-forward-surprise
{
  "characterId": "xxx",
  "surpriseType": "physical"
}

→ 自动设置信赖Lv.8 + 零花钱5000分
→ 触发惊喜引擎检查
→ 调用O2O选品
→ 创建惊喜记录
→ 返回完整数据（含叙事台词+商品+链接）
```

#### 备选方案：手动SQL设置（适合投资人演示）

```sql
-- 设置信赖Lv.8（TRUTH_TABLE: Lv.8 = 6,000累计信赖值）
UPDATE trust_records SET trust_level = 8, trust_points = 6000
WHERE user_id = '<demo_user>';

-- 设置零花钱5000分（满足实物惊喜阈值3000分）
UPDATE wallets SET pocket_money = 5000
WHERE user_id = '<demo_user>';

-- 清空惊喜记录（重置冷却期）
DELETE FROM surprises WHERE user_id = '<demo_user>';
```

### 4.5 操作脚本（Step-by-step）

```
Step 1: 展示零花钱进度条
        话术："角色旁边有零花钱进度条，送礼的40%进入角色零花钱池。"

Step 2: 触发惊喜（执行快进API或SQL预置）
        话术："信赖Lv.8 + 零花钱50元，满足实物惊喜阈值。"

Step 3: 角色发出暗示消息
        话术："角色会在聊天中暗示——'嘻嘻，今天先不说了，你等着看吧！'"

Step 4: 惊喜触发通知
        话术："确定性触发，不是抽奖。双阈值满足=100%触发。"
        → 点击"打开惊喜"

Step 5: 开箱动画
        → 礼盒弹入 → 摇晃 → 点击打开 → 粒子爆发
        → 商品卡片 + 角色留言 + 外卖平台链接
        话术："角色真的用自己攒的零花钱，给你点了一份外卖。从虚拟情感到物理交付。"

Step 6: 用户反馈
        → 点击"好喜欢" → 角色回应 → 情感变化
        话术："用户评价会影响下次选品，越送越准。"
```

### 4.6 O2O静态商品库（8款）

| 商品 | 价格(分) | 品类 | 选品权重 |
|------|---------|------|---------|
| 可爱钥匙扣 | 500 | 小物件 | +1 |
| 草莓大福 | 800 | 零食 | +3 |
| 水果茶 | 1,000 | 饮品 | +2 |
| 珍珠奶茶 | 1,200 | 饮品 | +2 |
| 马卡龙 | 1,500 | 零食 | +3 |
| 抹茶蛋糕 | 1,800 | 零食 | +3 |
| 鲜花一束 | 2,000 | 小物件 | +1 |
| 手工巧克力 | 2,500 | 零食 | +3 |

---

## 5. 完整Gap清单（按优先级排序）

### 5.1 P0 — 阻塞Demo必须修

| # | 来源 | 缺失描述 | 工作量 | 修改文件 |
|---|------|---------|--------|---------|
| G1 | C(充值) | **Mock支付生产环境被阻塞** — `NODE_ENV=production` 时 mock-pay 始终返回404，需改为 `ENABLE_MOCK_PAY=true` 时放行 | S | `apps/server/src/routes/payment.ts:108-115` |
| G2 | C(充值) | **前后端首充计算不一致** — 前端 `(coins+bonus)×2=1720`，后端 `coins×2+bonus=1540`，差额=赠送币数 | S | `apps/stage-web/src/pages/wallet/charge.vue` |
| G3 | C(充值) | **充值确认弹窗缺失** — 无二次确认直接发起支付，Demo中可能误操作 | M | `apps/stage-web/src/pages/wallet/charge.vue` |
| G4 | C(充值) | **充值成功动画缺失** — 仅toast提示，缺少首充翻倍视觉仪式感 | M | 新建 `ChargeSuccessAnimation.vue` |
| G5 | S(惊喜) | **Day5"查看惊喜"按钮无响应** — `handleGuideViewSurprise()` 函数体为空 | S | `apps/stage-web/src/pages/index.vue` |
| G6 | S(惊喜) | **WebSocket惊喜推送未集成** — `useAgentPush` 已定义 surprise_trigger 但主页面未监听 | M | `apps/stage-web/src/pages/index.vue` |
| G7 | S(惊喜) | **Demo惊喜无触发时机** — `demoStore.checkDemoSurprise()` 已实现但无调用方 | S | `apps/stage-web/src/pages/index.vue` |
| G8 | S(惊喜) | **O2O推荐服务未接入** — 创建惊喜时 amount 硬编码0，未调用 `o2oService.recommend()` | M | `apps/server/src/routes/surprises.ts` |
| G9 | S(惊喜) | **缺少自动触发机制** — 无定时/事件驱动调用 `checkTrigger()` | M | `apps/stage-web/src/App.vue` 或新 composable |
| G10 | S(惊喜) | **Demo模式下惊喜数据缺失** — Demo用户无真实零花钱/信赖数据 | M | `apps/server/src/routes/surprises.ts` |

**P0 总计：10项（充值4项 + 惊喜6项）**

### 5.2 P1 — 影响体验应该修

| # | 来源 | 缺失描述 | 工作量 | 修改文件 |
|---|------|---------|--------|---------|
| G11 | C(充值) | **余额变化动画** — 数字直接跳变，缺 CountUp 过渡效果 | M | `apps/stage-web/src/pages/wallet/index.vue` |
| G12 | C(充值) | **支付处理中遮罩** — 仅按钮 loading，无全屏遮罩防误触 | S | `apps/stage-web/src/pages/wallet/charge.vue` |
| G13 | C(充值) | **充值后导航引导** — 成功后停留充值页，无引导去送礼 | S | `apps/stage-web/src/pages/wallet/charge.vue` |
| G14 | C(充值) | **套餐性价比标注** — 缺少每元获得币数对比 | S | `apps/stage-web/src/pages/wallet/charge.vue` |
| G15 | C(充值) | **错误重试机制** — 失败后仅 toast，无重试按钮 | S | `apps/stage-web/src/pages/wallet/charge.vue` |
| G16 | C(充值) | **Demo充值引导** — Day3到充值页缺完整引导链 | M | `DemoGuide.vue` + `charge.vue` |
| G17 | C(充值) | **首充庆祝动画** — 首次充值无专门庆祝（类似 LevelUpCeremony） | M | `apps/stage-web/src/pages/wallet/charge.vue` |
| G18 | C(充值) | **充值页合规底部** — 付费页面缺少 ComplianceFooter | S | `apps/stage-web/src/pages/wallet/charge.vue` |
| G19 | S(惊喜) | **physical类型无开箱特效** — effect-unbox CSS 未定义 | S | `apps/stage-web/src/components/surprise/SurpriseAnimation.vue` |
| G20 | S(惊喜) | **实物惊喜无商品图片** — DB Schema 无 productImage 字段 | M | `apps/server/src/schemas/surprises.ts` |
| G21 | S(惊喜) | **PocketMoneyBar未引用** — 组件已实现但无页面使用 | S | `apps/stage-web/src/pages/surprises/index.vue` |
| G22 | S(惊喜) | **反馈提交后无视觉确认** — 点击后直接关闭，无角色回应动画 | S | `apps/stage-web/src/components/surprise/SurpriseAnimation.vue` |
| G23 | S(惊喜) | **SurpriseCard无详情展开** — 缺少已完成惊喜的回看模式 | M | 新建 `SurpriseDetail.vue` |
| G24 | S(惊喜) | **soul-engine字段与DB不对齐** — productImage/platform/triggerReason 缺失 | M | `apps/server/src/schemas/surprises.ts` |

**P1 总计：14项（充值8项 + 惊喜6项）**

### 5.3 P2 — 锦上添花可以修

| # | 来源 | 缺失描述 | 工作量 | 修改文件 |
|---|------|---------|--------|---------|
| G25 | C(充值) | **交易详情页** — 记录不可点击查看详情 | M | 新建 `pages/wallet/detail.vue` |
| G26 | C(充值) | **空状态充值引导** — 余额为0时无醒目引导 | S | `apps/stage-web/src/pages/wallet/index.vue` |
| G27 | C(充值) | **礼物面板充值入口UX** — 余额不足链接不够醒目 | S | `apps/stage-web/src/components/gift/GiftPanel.vue` |
| G28 | C(充值) | **历史记录筛选** — 无按类型筛选功能 | M | `apps/stage-web/src/pages/wallet/history.vue` |
| G29 | C(充值) | **payment_orders.amount 单位歧义** — types.ts 注释标注"分"，实际存储"元" | S | `apps/server/src/schemas/payment.ts` |
| G30 | S(惊喜) | **阈值前后端不同步风险** — PocketMoneyBar 硬编码阈值 | S | `apps/stage-web/src/components/surprise/PocketMoneyBar.vue` |
| G31 | S(惊喜) | **错误状态未展示** — store error ref 有赋值但 UI 无展示 | S | `apps/stage-web/src/pages/surprises/index.vue` |
| G32 | S(惊喜) | **筛选Tab触控热区不足** — 32px < 44px 最小触控标准 | S | `apps/stage-web/src/pages/surprises/index.vue` |

**P2 总计：8项（充值5项 + 惊喜3项）**

### 5.4 Gap统计总览

| 优先级 | 数量 | S | M | L |
|--------|------|---|---|---|
| P0（必须修） | 10 | 4 | 6 | 0 |
| P1（应该修） | 14 | 6 | 8 | 0 |
| P2（可以修） | 8 | 6 | 2 | 0 |
| **合计** | **32** | **16** | **16** | **0** |

---

## 6. 代码修改清单（按优先级排序）

### 6.1 P0 — 阻塞Demo必须修

| # | 文件路径 | 修改内容 | 工作量 |
|---|---------|---------|--------|
| G1 | `apps/server/src/routes/payment.ts:108-115` | 修改条件判断：当 `ENABLE_MOCK_PAY=true` 时无论 NODE_ENV 都允许 mock-pay。改为 `if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_PAY !== 'true')` | S |
| G2 | `apps/stage-web/src/pages/wallet/charge.vue` | 修正 `getEffectiveCoins()`：`if (isFirstCharge) return coins * 2 + bonus` 改为只翻倍基础币，与 soul-engine 对齐 | S |
| G3 | `apps/stage-web/src/pages/wallet/charge.vue` | 新增充值确认弹窗组件：显示基础币+赠送+首充翻倍明细，用户确认后才发起支付 | M |
| G4 | `apps/stage-web/src/components/wallet/ChargeSuccessAnimation.vue` | 新建组件：实现4阶段数字动画（基础到账→赠送叠加→首充翻倍爆发→最终确认，总时长3.1秒） | M |
| G5 | `apps/stage-web/src/pages/index.vue` | 实现 `handleGuideViewSurprise()`：跳转惊喜页或触发开箱动画 | S |
| G6 | `apps/stage-web/src/pages/index.vue` | 集成 `useAgentPush` 监听 surprise_trigger 事件，收到推送后调用 `surpriseStore.showSurprise()` | M |
| G7 | `apps/stage-web/src/pages/index.vue` | 在 onMounted 或合适时机调用 `demoStore.checkDemoSurprise()`，Day5 自动触发虚拟惊喜 | S |
| G8 | `apps/server/src/routes/surprises.ts` | 在 createSurprise 流程中集成 `o2oService.recommend()`，将推荐结果写入惊喜记录的 productName/externalUrl/amount | M |
| G9 | `apps/stage-web/src/App.vue` 或新建 `composables/useSurpriseCheck.ts` | 新增定时检查（如每30分钟）或送礼后事件驱动调用 `POST /api/surprises/check` | M |
| G10 | `apps/server/src/routes/surprises.ts` | Demo模式下自动注入测试数据：当检测到 demo 用户且数据不足时，补充信赖/零花钱到可触发阈值 | M |

### 6.2 P1 — 影响体验应该修

| # | 文件路径 | 修改内容 | 工作量 |
|---|---------|---------|--------|
| G11 | `apps/stage-web/src/pages/wallet/index.vue` | 余额数字添加 CountUp 动画（vue-countup-v3 或自实现），从旧值滚动到新值 | M |
| G12 | `apps/stage-web/src/pages/wallet/charge.vue` | 支付期间添加全屏半透明遮罩+居中 loading spinner，阻止重复点击 | S |
| G13 | `apps/stage-web/src/pages/wallet/charge.vue` | 充值成功后显示引导卡片："去给角色送一份礼物吧！"链接到礼物面板 | S |
| G14 | `apps/stage-web/src/pages/wallet/charge.vue` | 每个套餐卡片底部添加"约X.X币/元"性价比标注 | S |
| G15 | `apps/stage-web/src/pages/wallet/charge.vue` | 支付失败时 toast 下方添加"重试"按钮，自动填充上次选择的套餐 | S |
| G16 | `apps/stage-web/src/components/demo/DemoGuide.vue` + `charge.vue` | Day3 赠送50币后添加"去充值获得更多爱心币"引导，跳转充值页并高亮首充横幅 | M |
| G17 | `apps/stage-web/src/pages/wallet/charge.vue` | 首次充值成功后触发全屏庆祝动画（复用 LevelUpCeremony 粒子效果） | M |
| G18 | `apps/stage-web/src/pages/wallet/charge.vue` | 页面底部添加 ComplianceFooter（含虚拟货币声明、未成年人保护、退款政策） | S |
| G19 | `apps/stage-web/src/components/surprise/SurpriseAnimation.vue` | 为 physical 类型添加 effect-unbox CSS 关键帧动画（拆箱效果） | S |
| G20 | `apps/server/src/schemas/surprises.ts` | surprises 表添加 `product_image TEXT` 字段；O2O 选品时填充商品图片 URL | M |
| G21 | `apps/stage-web/src/pages/surprises/index.vue` | 在惊喜列表页顶部引入 PocketMoneyBar 组件，展示当前零花钱进度 | S |
| G22 | `apps/stage-web/src/components/surprise/SurpriseAnimation.vue` | 用户点击反馈后，延迟关闭，先播放角色回应文字+表情变化（1.5秒） | S |
| G23 | `apps/stage-web/src/components/surprise/SurpriseDetail.vue` | 新建惊喜详情组件：展示商品信息+角色留言+用户反馈+平台跳转链接 | M |
| G24 | `apps/server/src/schemas/surprises.ts` | 补齐 `product_image`, `platform`, `trigger_reason` 三个字段，与 soul-engine 类型对齐 | M |

### 6.3 P2 — 锦上添花可以修

| # | 文件路径 | 修改内容 | 工作量 |
|---|---------|---------|--------|
| G25 | `apps/stage-web/src/pages/wallet/detail.vue` | 新建交易详情页：展示单笔交易的完整信息（时间、类型、金额、关联订单） | M |
| G26 | `apps/stage-web/src/pages/wallet/index.vue` | 余额为0时显示引导卡片："充值获得爱心币，送礼给角色吧" | S |
| G27 | `apps/stage-web/src/components/gift/GiftPanel.vue` | 余额不足提示改为醒目按钮样式，增加 `py-2` 触控热区 | S |
| G28 | `apps/stage-web/src/pages/wallet/history.vue` | 添加交易类型筛选 Tab（全部/充值/送礼/惊喜） | M |
| G29 | `apps/server/src/schemas/payment.ts` | 统一 amount 字段单位为"分"，或修正注释为"元"，确保前后端一致 | S |
| G30 | `apps/stage-web/src/components/surprise/PocketMoneyBar.vue` | 从后端 API 获取惊喜阈值配置，替代硬编码数值 | S |
| G31 | `apps/stage-web/src/pages/surprises/index.vue` | 当 store.error 有值时，显示错误提示条（红色横幅+重试按钮） | S |
| G32 | `apps/stage-web/src/pages/surprises/index.vue` | 筛选 Tab 添加 `min-h-11`（44px），满足移动端最小触控标准 | S |

---

## 7. 验收标准

### 7.1 Demo可演示的最低标准（P0全部解决）

- [ ] Mock支付在生产环境可用（G1修复 + ENABLE_MOCK_PAY=true）
- [ ] 前端首充金额显示正确：68元首充 = 1,540币，非1,720（G2修复）
- [ ] 充值有二次确认弹窗，不会误操作（G3）
- [ ] 充值成功有视觉动画反馈，不只是toast（G4）
- [ ] Day5"查看惊喜"按钮可点击并跳转（G5）
- [ ] WebSocket惊喜推送可触发开箱动画（G6）
- [ ] Demo模式Day5自动触发虚拟惊喜（G7）
- [ ] 惊喜记录包含O2O商品信息（G8）
- [ ] 送礼后可自动/定时检查惊喜触发条件（G9）
- [ ] Demo用户数据足够触发惊喜（G10）

### 7.2 5分钟快速演示版本

**目标受众**：投资人/合作方快速了解核心模式

```
0:00-1:00  产品介绍 + 角色选择（已有6个角色模板）
1:00-2:30  充值演示：选68元档 → 首充翻倍1,540币 → 角色感动反应
2:30-4:00  惊喜演示：展示零花钱进度 → 触发实物惊喜 → 开箱动画 → 商品+外卖链接
4:00-5:00  总结闭环：充值→送礼→零花钱→角色买礼物→现实交付
```

**最低要求**：P0全部解决 + G11(余额动画) + G21(零花钱进度条)

### 7.3 30分钟完整演示版本

**目标受众**：深度评审/合伙人详细了解产品

```
0:00-5:00   产品愿景 + 技术架构介绍
5:00-10:00  Day1-2: 免费互动，信赖积累（×8倍率），外观渐变
10:00-15:00 Day3: 系统赠送50币 → 引导首次送礼 → 零花钱累积
15:00-20:00 充值全流程: 7档展示 → 68元首充 → 翻倍动画 → 角色感谢
20:00-25:00 惊喜全流程: 零花钱进度 → 角色暗示 → 触发 → 开箱 → O2O跳转
25:00-30:00 数据复盘 + 商业模型 + Q&A
```

**最低要求**：P0全部 + P1大部分（至少G11-G18 + G19-G22）

### 7.4 关键数据口径速查

| 问题 | 回答 | 出处 |
|------|------|------|
| 68元首充实得多少？ | 680×2+180=1,540 | TRUTH_TABLE 4.1 + soul-engine |
| 零花钱分成比例？ | 普通40%/月卡50%/年卡60% | TRUTH_TABLE 4.2 |
| Demo信赖倍率？ | ×8 | TRUTH_TABLE 七节 |
| Day3赠送多少？ | 50爱心币 | TRUTH_TABLE 七节 |
| Day5触发什么？ | 模拟虚拟惊喜 | TRUTH_TABLE 七节 |
| 角色情感几种？ | 8种（移除angry/sad） | TRUTH_TABLE 九节 |
| 实物惊喜最低条件？ | Lv.8(6,000) + 零花钱≥30元 | TRUTH_TABLE 6.1 |
| 月度惊喜上限？ | 4次 | TRUTH_TABLE 6.2 |
| 最快触发实物惊喜？ | 11次"一辈子"≈572元 | 计算推导 |
| 消费限额（成年人）？ | 日500元/月2,000元 | TRUTH_TABLE 4.3 |

---

## 附录A：关键文件索引

### 前端 (apps/stage-web/src/)

| 文件 | 职责 |
|------|------|
| `pages/wallet/index.vue` | 钱包主页，余额展示 |
| `pages/wallet/charge.vue` | 充值页，套餐选择+支付触发 |
| `pages/wallet/history.vue` | 交易记录列表 |
| `pages/index.vue` | 主页，惊喜入口+Demo引导 |
| `pages/surprises/index.vue` | 惊喜列表页 |
| `stores/wallet.ts` | 钱包状态管理 |
| `stores/payment.ts` | 支付流程状态管理 |
| `stores/surprise.ts` | 惊喜状态管理 |
| `components/gift/GiftPanel.vue` | 送礼UI面板 |
| `components/gift/GiftAnimation.vue` | 心形粒子动画 |
| `components/trust/TrustBar.vue` | 信赖进度条 |
| `components/trust/LevelUpCeremony.vue` | 等级提升动画 |
| `components/surprise/SurpriseAnimation.vue` | 三阶段开箱动画 |
| `components/surprise/PocketMoneyBar.vue` | 零花钱进度条 |
| `components/surprise/SurpriseCard.vue` | 惊喜列表卡片 |
| `components/demo/DemoGuide.vue` | 7天Demo引导 |
| `composables/useAgentPush.ts` | WebSocket惊喜推送 |

### 后端 (apps/server/src/)

| 文件 | 职责 |
|------|------|
| `routes/wallet.ts` | 旧充值API（直充路径） |
| `routes/payment.ts` | 新支付API（Mock支付） |
| `routes/surprises.ts` | 惊喜API路由 |
| `routes/o2o.ts` | O2O API路由 |
| `services/economy.ts` | 充值/送礼核心逻辑 |
| `services/payment.ts` | 订单生命周期管理 |
| `services/surprises.ts` | 惊喜触发检查+CRUD |
| `services/o2o.ts` | 商品推荐+链接生成 |
| `schemas/surprises.ts` | surprises表定义 |
| `libs/payment/mock.ts` | Mock支付Provider |

### 引擎层 (packages/soul-engine/src/)

| 文件 | 职责 |
|------|------|
| `economy/engine.ts` | 首充计算、送礼处理、零花钱分成 |
| `surprise/engine.ts` | 确定性阈值检查、预算计算、角色留言 |
| `demo/manager.ts` | 7天日程表、Day5模拟惊喜 |
| `types/surprise.ts` | SURPRISE_THRESHOLDS配置 |
| `types/wallet.ts` | GIFT_CONFIG、POCKET_MONEY_RATIO |

### 权威数值来源

| 文件 | 职责 |
|------|------|
| `docs/TRUTH_TABLE.md` | **唯一权威数值来源** — 所有代码实现以此为准 |

---

## 附录B：TRUTH_TABLE 代码不一致清单

以下是当前代码中与真值表不符的项目（摘自 TRUTH_TABLE 第十节），修复后方可保证 Demo 数值正确：

| 文件 | 不一致项 | 当前值 | 真值表值 |
|------|---------|--------|---------|
| types/character.ts | Lv.3-10阈值 | 300/600/1000/1500/2200/3000/4000/5200 | 350/700/1200/2000/3500/6000/10000/16000 |
| types/character.ts | EmotionState | 含 angry/sad | 应移除 |
| types/wallet.ts | 充值套餐 | 5档(6-328元) | 7档(1-648元) |
| types/wallet.ts | POCKET_MONEY_RATIO | 0.3 | 0.4/0.5/0.6 |
| types/surprise.ts | baseProbability | 0.05 | 应移除(确定性触发) |
| lib/trust/calculator.ts | 送礼信赖值 | +20/100/400/1040 | +8/45/200/550 |
| lib/trust/calculator.ts | 衰减起始 | 3天 | 4天 |
| lib/surprise/engine.ts | Math.random() | 存在 | 应移除(零概率) |
