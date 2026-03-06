# 角色偷偷买礼物 — 演示流程需求文档

> 版本：v1.0 | 日期：2026-03-06
> 状态：Round 2 产出（3 Agent 整合）
> 数值来源：`docs/TRUTH_TABLE.md` v1.0（第4.2/5/6/7节）

---

## 一、惊喜完整链路流程图

### 1.1 ASCII 全链路流程图

```
用户送礼流程                        角色"偷偷买礼物"流程
==============                      ====================

[用户] 选择礼物档位
   |
   v
POST /api/economy/gift
   |
   v
server economy.ts processGift()
  1. 幂等性检查
  2. 消费限额检查
  3. 事务内行锁钱包
  4. 调用 soul-engine calcGift
   |
   v
soul-engine processGift()
  coinCost        = GIFT_CONFIG[tier].coinCost
  trustGain       = GIFT_CONFIG[tier].trustGain
  totalCentsValue = coinCost * 10  (1币=10分)
  pocketRatio     = 0.4/0.5/0.6 (按订阅等级)
  pocketMoneyGain = floor(totalCentsValue * pocketRatio)
   |
   v
server 事务写入
  wallet.coinBalance  -= cost
  wallet.pocketMoney  += gain    ← 角色零花钱累积
  wallet.totalGifted  += cost
  transaction记录插入
   |
   | ===== 零花钱已累积 =====
   v
POST /api/surprises/check        ← 惊喜触发检查（需主动调用）
   |
   v
server surprises.ts checkTrigger()
  1. 查询 trustRecords → trustLevel
  2. 查询 wallets → pocketMoney
  3. 查询最近 surprise → lastSurpriseDate
  4. 计算本月 surprise 次数
  5. 调用 soul-engine checkThresholdTrigger(context)
   |
   v
soul-engine surprise/engine.ts
  [门禁1] 月度次数上限: monthlySurpriseCount >= 4?
  [门禁2] 冷却期: 普通7天/月卡5天
  [逐一检查4种阈值]
    virtual:      Lv.5 + 0分
    electronic:   Lv.6 + 1500分
    physical:     Lv.8 + 3000分
    personalized: Lv.9 + 5000分
  [选最高优先级] personalized > physical > electronic > virtual
   |
   | shouldTrigger = true
   v
自动创建惊喜记录 → INSERT surprises
   |
   | === 如果需要O2O选品 ===
   v
POST /api/o2o/recommend
  1. 筛选预算内商品: price <= budget * 0.8
  2. 偏好关键词匹配打分 (+10/匹配词)
  3. 品类权重: 零食(+3) > 饮品(+2) > 小物件(+1)
  4. 生成美团/饿了么搜索链接
   |
   v
POST /api/o2o/send-surprise
  → WebSocket 推送 { type: 'surprise_trigger' }
   |
   v
前端 useAgentPush 接收
  → surpriseStore.showSurprise()
  → SurpriseAnimation.vue 开箱动画
  → SurpriseCard.vue 商品展示 + 跳转链接
  → 用户反馈: love/ok/change
  → PATCH /api/surprises/:id/status
```

### 1.2 核心数值对照

| 礼物档位 | 爱心币 | 信赖+值 | 零花钱(普通40%) | 零花钱(月卡50%) |
|---------|--------|---------|---------------|---------------|
| 小心意 | 10 | +8 | 40分(0.4元) | 50分(0.5元) |
| 暖暖的 | 50 | +45 | 200分(2元) | 250分(2.5元) |
| 超爱你 | 200 | +200 | 800分(8元) | 1000分(10元) |
| 一辈子 | 520 | +550 | 2080分(20.8元) | 2600分(26元) |

### 1.3 惊喜阈值配置（TRUTH_TABLE 6.1节）

| 惊喜类型 | 最低信赖等级 | 最低零花钱 | 预算范围 | 优先级 |
|---------|------------|----------|---------|--------|
| 虚拟 virtual | Lv.5 (1200) | 0分 | 0-500分 | 1 |
| 电子 electronic | Lv.6 (2000) | 1500分 | 500-3000分 | 2 |
| 实物 physical | Lv.8 (6000) | 3000分 | 1000-5000分 | 3 |
| 个性化 personalized | Lv.9 (10000) | 5000分 | 1500-10000分 | 4 |

### 1.4 触发限制（TRUTH_TABLE 6.2节）

| 限制 | 值 |
|------|-----|
| 月度上限 | 4次 |
| 冷却期(普通) | 7天 |
| 冷却期(月卡) | 5天 |
| 单次最大花费 | 池余额60% |
| 推荐预算公式 | min(池余额×0.45, 类型max) |

---

## 二、数值示例与最短触发路径

### 2.1 示例1：送10次"小心意"

```
每次: coinCost=10, trustGain=+8, pocketGain=40分
10次累计: 零花钱=400分(4元), 信赖=80(Lv.1)
结论: 信赖等级远未达Lv.5，无法触发任何惊喜
```

### 2.2 示例2：最快触发虚拟惊喜

```
条件: Lv.5(累计1200信赖) + 零花钱≥0分

纯送"暖暖的": ceil(1200/45) = 27次
  零花钱=5400分, 爱心币消耗=1350币(135元)

混合模式(每天送1次+免费43信赖): ceil(1200/88) ≈ 14天
  零花钱=2800分, 爱心币消耗=700币(70元)
```

### 2.3 示例3：最快触发实物惊喜

```
条件: Lv.8(累计6000信赖) + 零花钱≥3000分

纯送"一辈子": ceil(6000/550) = 11次
  零花钱=22880分>>3000分(轻松满足)
  爱心币消耗=5720币(572元)

最短路径: 11次"一辈子" ≈ 572元
```

### 2.4 Demo模式下的触发

```
Demo模式 (TRUTH_TABLE 第七节):
  - 信赖倍率: ×8
  - Day5自动触发: 虚拟惊喜（零操作）
  - 实物惊喜: 不可能（7天×8最高≈Lv.5，远未达Lv.8的6000）
  - 这是设计意图: 实物惊喜作为正式版高等级留存钩子
```

---

## 三、Demo惊喜方案设计

### 3.1 三方案对比

| 对比项 | 方案A: Day5自动触发 | 方案B: 手动设置数据 | 方案C: 快进API（推荐） |
|--------|-------------------|-------------------|---------------------|
| 操作 | 等待Day5 | SQL设置信赖+零花钱 | 一键API调用 |
| 改动量 | 0 | 0（仅SQL） | 新增1个API端点 |
| 惊喜类型 | 仅虚拟 | 可选任意类型 | 可选任意类型 |
| 叙事完整度 | 中 | 高 | **极高** |
| 推荐场景 | 开发测试 | 投资人演示 | **正式路演** |

### 3.2 推荐方案C: Demo快进API

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

### 3.3 备选方案B: 手动SQL设置

```sql
-- 设置信赖Lv.8
UPDATE trust_records SET trust_level = 8, trust_points = 6000
WHERE user_id = '<demo_user>';

-- 设置零花钱5000分
UPDATE wallets SET pocket_money = 5000
WHERE user_id = '<demo_user>';

-- 清空惊喜记录（重置冷却）
DELETE FROM surprises WHERE user_id = '<demo_user>';
```

---

## 四、"角色偷偷买礼物"叙事UI流程

### 4.1 五阶段叙事时间线

```
[阶段1: 暗示铺垫]  →  [阶段2: 进度积累]  →  [阶段3: 触发时刻]  →  [阶段4: 开箱揭晓]  →  [阶段5: 反馈闭环]
   2-3天自然积累          零花钱进度可视化          角色兴奋通知            动画+商品展示            用户评价+角色反应
```

### 4.2 阶段1: 暗示铺垫

角色在聊天中按零花钱进度分级暗示：

| 零花钱进度 | 角色台词 |
|-----------|---------|
| <30% | "今天又攒了一点点零花钱，嘿嘿~" |
| 30%-60% | "最近在看一些好看的东西...不告诉你是什么！" |
| 60%-90% | "再送我一次礼物的话...也许会有好事发生哦？" |
| ≥90% | "嘻嘻，今天先不说了，你等着看吧！" |

### 4.3 阶段2: 零花钱进度可视化

PocketMoneyBar.vue（已实现）：

```
[⭐ 虚拟] -------- [📱 电子] -------- [🎁 实物] -------- [💝 个性化]
  0元              15元              30元               50元
          ████████████░░░░░░░░░░░░░░░░░░
          当前: 22.50元  距实物惊喜: 30元
```

### 4.4 阶段3: 触发时刻

确定性触发（零random）：
- 信赖等级 ≥ 阈值 **且** 零花钱 ≥ 阈值 → 100%触发
- 角色台词："我给你准备了一个惊喜！快来看看吧~"

### 4.5 阶段4: 开箱揭晓

三阶段动画（SurpriseAnimation.vue已实现）：

```
[enter] 0-0.8秒: 礼盒弹入，scale(0.3)→scale(1)
[open]  等待点击: 礼盒摇晃，左右-5°~+5°
[reveal] 点击后: 粒子爆发 + 商品卡片展开

粒子效果按类型:
  virtual:      12颗星星四方扩散
  electronic:   双层蓝色光环扩散
  physical:     (effect-unbox，待实现)
  personalized: 16颗爱心螺旋扩散
```

商品展示卡片：

```
┌─────────────────────────────────────┐
│            🎁 (类型图标)              │
│        草莓大福                      │
│        ¥8.00                        │
│  ┌─────────────────────────────┐    │
│  │ 我用零花钱给你买了草莓大福...  │    │
│  │ 想到你收到时的表情，好开心~    │    │
│  └─────────────────────────────┘    │
│  ┌─────────┐ ┌────────┐ ┌────────┐  │
│  │  💕     │ │  😊    │ │  🤔    │  │
│  │ 好喜欢  │ │  还行  │ │不太合适│  │
│  └─────────┘ └────────┘ └────────┘  │
└─────────────────────────────────────┘
```

### 4.6 阶段5: 反馈闭环

| 反馈 | 角色反应 | 情感状态 | 对后续选品影响 |
|------|---------|---------|-------------|
| love(好喜欢) | "太好了！你喜欢的话我就好开心！" | happy | 同品类权重+0.2 |
| ok(还行) | "那下次我再想想有什么更好的！" | caring | 增加novelty权重 |
| change(不太合适) | "对不起，下次我一定会更用心！" | caring(不用sad) | 同品类权重-0.3 |

角色留言按惊喜类型区分：

| 类型 | 角色留言模板 |
|------|------------|
| virtual | "我给你准备了一个小惊喜——{商品}！虽然不贵重，但这是我的心意~" |
| electronic | "我攒了好久的零花钱，终于可以给你买{商品}啦！" |
| physical | "今天有个快递要到哦！我用零花钱给你买了{商品}~" |
| personalized | "我想了很久，觉得{商品}最适合你。这是我专门为你挑的~" |

---

## 五、O2O商品库

### 5.1 静态商品目录（8款）

| 商品 | 价格(分) | 品类 | 选品权重 |
|------|---------|------|---------|
| 可爱钥匙扣 | 500 | 小物件 | +1 |
| 草莓大福 | 800 | 零食 | +3 |
| 水果茶 | 1000 | 饮品 | +2 |
| 珍珠奶茶 | 1200 | 饮品 | +2 |
| 马卡龙 | 1500 | 零食 | +3 |
| 抹茶蛋糕 | 1800 | 零食 | +3 |
| 鲜花一束 | 2000 | 小物件 | +1 |
| 手工巧克力 | 2500 | 零食 | +3 |

### 5.2 选品评分权重

| 维度 | 默认权重 | 说明 |
|------|---------|------|
| preferenceMatch | 0.4 | 偏好匹配 |
| timingFit | 0.3 | 时机合适度 |
| novelty | 0.2 | 新鲜度 |
| priceReasonable | 0.1 | 价格合理度 |

### 5.3 平台链接生成

| 平台 | 搜索URL格式 |
|------|------------|
| 美团 | `https://waimai.meituan.com/search?q={encoded}` |
| 饿了么 | `https://h5.ele.me/search/?q={encoded}` |

---

## 六、演示者操作脚本与话术

### 6.1 操作脚本

```
Step 1: 展示零花钱进度条（已有礼物送出历史）
  → 指向PocketMoneyBar："角色旁边有零花钱进度条"

Step 2: 触发惊喜（方案B或C）
  → 方案B: 在Railway DB执行SQL设置数据
  → 方案C: 调用快进API

Step 3: 角色发出暗示消息
  → "嘻嘻，今天先不说了，你等着看吧！"

Step 4: 惊喜触发通知
  → 角色说"我给你准备了一个惊喜！"
  → 点击"打开惊喜"

Step 5: 开箱动画
  → 礼盒弹入 → 摇晃 → 点击打开 → 粒子爆发
  → 展示商品卡片 + 角色留言 + 外卖链接

Step 6: 用户反馈
  → 点击"好喜欢" → 角色回应 → 情感变化
```

### 6.2 核心话术

> **零花钱来源**："用户送礼的一部分会进入角色的零花钱池——普通用户40%、月卡50%、年卡60%。"

> **确定性触发**："触发是确定性的，不是概率的。信赖等级和零花钱同时达标，惊喜100%触发。零概率、零random。"

> **O2O闭环**："角色不只在屏幕里聊天，她真的会用自己攒的零花钱，在现实中给你点一份外卖。从虚拟情感到物理交付。"

> **反馈学习**："用户评价'好喜欢'或'不太合适'，角色会调整下次选品偏好。越送越准。"

### 6.3 常见提问应对

| 问题 | 回答 |
|------|------|
| 角色怎么知道用户喜欢什么？ | 选品基于4维评分：偏好匹配40%+时机30%+新鲜度20%+价格10%，根据反馈动态调整 |
| 触发条件是什么？ | 实物惊喜需Lv.8+零花钱≥30元+冷却期过+月≤4次，全部满足100%触发 |
| 预算怎么控制？ | 单次不超过池余额60%，推荐预算=min(池×45%,类型上限)，月最多4次 |
| 从新用户到实物惊喜需要多少钱？ | 最短路径：11次"一辈子"≈572元 |

---

## 七、惊喜UI Gap清单

### 7.1 高优先级（P0 — 阻塞Demo）

| # | 缺失描述 | 工作量 | 修改文件 |
|---|---------|--------|---------|
| S1 | **Day5"查看惊喜"按钮无响应** — handleGuideViewSurprise()函数体为空 | S | `pages/index.vue` |
| S2 | **WebSocket惊喜推送未集成** — useAgentPush已定义surprise_trigger但主页面未监听 | M | `pages/index.vue` |
| S3 | **Demo惊喜无触发时机** — demoStore.checkDemoSurprise()已实现但无调用方 | S | `pages/index.vue` |
| S6 | **O2O推荐服务未接入** — 创建惊喜时amount硬编码0，未调用o2oService.recommend() | M | `routes/surprises.ts` |
| S9 | **缺少自动触发机制** — 无定时/事件驱动调用checkTrigger() | M | `App.vue`或新composable |
| S14 | **Demo模式下惊喜数据缺失** — Demo用户无真实零花钱/信赖数据 | M | `routes/surprises.ts` |

### 7.2 中优先级（P1 — 影响体验）

| # | 缺失描述 | 工作量 | 修改文件 |
|---|---------|--------|---------|
| S4 | **physical类型无开箱特效** — effect-unbox CSS未定义 | S | `SurpriseAnimation.vue` |
| S5 | **实物惊喜无商品图片** — DB Schema无productImage字段 | M | `schemas/surprises.ts` |
| S7 | **PocketMoneyBar未引用** — 组件已实现但无页面使用 | S | `surprises/index.vue` |
| S10 | **反馈提交后无视觉确认** — 点击后直接关闭，无角色回应 | S | `SurpriseAnimation.vue` |
| S11 | **SurpriseCard无详情展开** — 缺少已完成惊喜的回看模式 | M | 新建 `SurpriseDetail.vue` |
| S12 | **soul-engine字段与DB不对齐** — productImage/platform/triggerReason缺失 | M | `schemas/surprises.ts` |

### 7.3 低优先级（P2 — 锦上添花）

| # | 缺失描述 | 工作量 | 修改文件 |
|---|---------|--------|---------|
| S8 | **阈值前后端不同步风险** — PocketMoneyBar硬编码阈值 | S | `PocketMoneyBar.vue` |
| S13 | **错误状态未展示** — store error ref有赋值但UI无展示 | S | `surprises/index.vue` |
| S15 | **筛选Tab触控热区不足** — 32px<44px | S | `surprises/index.vue` |

### 7.4 缺失UI组件清单

| 组件 | 描述 | 工作量 |
|------|------|--------|
| `SavingHint.vue` | 角色"攒钱中"浮动气泡提示 | S |
| `SurprisePreparation.vue` | 角色选品中等待动画（8秒沉浸式） | M |
| 实物惊喜展示卡片 | 商品图+价格+平台链接+留言完整卡片 | M |
| `DeliveryNotification.vue` | "包裹寄出"顶部通知横幅 | S |
| `DeliveryTimeline.vue` | 模拟物流时间线 | M |

### 7.5 移动端适配项

- 筛选Tab触控热区不足(32px)，建议添加 `min-h-11`
- 开箱动画反馈按钮375px下偏拥挤
- star-particle粒子可能溢出375px屏幕
- SurpriseCard状态标签+时间可能挤压
- productName无文字截断处理

---

## 八、关键文件索引

### 引擎层 (soul-engine)

| 文件 | 职责 |
|------|------|
| `packages/soul-engine/src/surprise/engine.ts` | 确定性阈值检查、预算计算、角色留言 |
| `packages/soul-engine/src/economy/engine.ts` | 送礼处理、零花钱分成计算 |
| `packages/soul-engine/src/demo/manager.ts` | 7天日程表、Day5模拟惊喜 |
| `packages/soul-engine/src/types/surprise.ts` | SURPRISE_THRESHOLDS配置 |
| `packages/soul-engine/src/types/wallet.ts` | GIFT_CONFIG、POCKET_MONEY_RATIO |

### 服务层 (server)

| 文件 | 职责 |
|------|------|
| `apps/server/src/services/surprises.ts` | 触发检查+CRUD |
| `apps/server/src/services/o2o.ts` | 商品推荐+链接生成 |
| `apps/server/src/services/economy.ts` | processGift事务写入 |
| `apps/server/src/routes/surprises.ts` | 惊喜API路由 |
| `apps/server/src/routes/o2o.ts` | O2O API路由 |
| `apps/server/src/schemas/surprises.ts` | surprises表定义 |

### 前端层 (stage-web)

| 文件 | 职责 |
|------|------|
| `apps/stage-web/src/pages/surprises/index.vue` | 惊喜列表页 |
| `apps/stage-web/src/components/surprise/SurpriseAnimation.vue` | 三阶段开箱动画 |
| `apps/stage-web/src/components/surprise/PocketMoneyBar.vue` | 零花钱进度条 |
| `apps/stage-web/src/components/surprise/SurpriseCard.vue` | 惊喜列表卡片 |
| `apps/stage-web/src/stores/surprise.ts` | 惊喜状态管理 |
| `apps/stage-web/src/composables/useAgentPush.ts` | WebSocket惊喜推送 |
