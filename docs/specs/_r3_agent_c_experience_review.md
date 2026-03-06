# Demo 体验审查报告 -- 演示观众视角

> 审查人：Agent C（演示体验审查专家）
> 版本：v1.0 | 日期：2026-03-06
> 审查范围：充值流程 + 惊喜流程 + 主页交互 + 移动端适配
> 基于文件：Round 1/2 产出文档 + 全部前端组件源码

---

## 一、演示全链路体验走查

### 1.1 观众视角完整流程

```
[入口] 主页（Live2D角色 + 聊天）
  |
  +--> [发现] 右下角送礼浮动按钮（GiftFloatingButton）
  |      |
  |      +--> 点击打开 GiftPanel（底部弹出）
  |      |     +--> 选择礼物档位
  |      |     +--> 确认送出 --> GiftAnimation（心形粒子上升）
  |      |     +--> TrustBar 更新 --> 可能触发 LevelUpCeremony
  |      |
  |      +--> 余额不足 --> "去充值" 跳转
  |
  +--> [充值] /wallet 钱包页
  |      +--> 余额卡 + 首充横幅 + 充值按钮
  |      +--> /wallet/charge 充值中心
  |            +--> 7档套餐选择
  |            +--> 确认充值 --> Mock支付 --> toast成功
  |            +--> 返回钱包查看余额变化
  |
  +--> [惊喜] /surprises 惊喜记录
  |      +--> 列表展示 + 筛选
  |      +--> 点击卡片 --> SurpriseAnimation 开箱
  |            +--> 礼盒弹入 --> 摇晃 --> 点击打开
  |            +--> 粒子特效 --> 商品展示 --> 反馈按钮
  |
  +--> [引导] DemoGuide 浮层（7天制）
         +--> Day1-2 签到引导
         +--> Day3 赠送50爱心币
         +--> Day5 惊喜体验
         +--> Day7 转化引导
```

### 1.2 体验断裂点标注

以下逐段标注演示观众在各环节可能遇到的"WTF时刻"——即体验中断、困惑或失望的节点。

---

## 二、P0（必须修）-- 阻塞演示的问题

### P0-1: 线上充值完全不可用（mock-pay 生产环境返回 404）

**问题描述**：
`payment.ts:110-114` 的条件判断逻辑使得 `NODE_ENV=production` 时**无论** `ENABLE_MOCK_PAY` 的值都返回 404。这意味着在 Railway 线上环境（默认 production），charge.vue 中的 `handleCharge()` 必定失败，演示者点击"确认充值"后只会看到一个红色 toast "充值失败，请稍后重试"。

**影响**：充值是整个 Demo 的核心高光环节。如果充值失败，所有后续流程（余额变化、送礼、惊喜触发）全部无法演示。**这是当前最大的阻塞问题。**

**修改方案**：
- 文件：`apps/server/src/routes/payment.ts` 第 108-115 行
- 改法：将条件改为"生产环境下，仅当 ENABLE_MOCK_PAY=true 时才放行"
```typescript
// 修改前（当前逻辑，production 始终404）
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MOCK_PAY !== 'true') {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not Found' }, 404)
  }
}

// 修改后（production 下通过 ENABLE_MOCK_PAY 控制）
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_PAY !== 'true') {
  return c.json({ error: 'Not Found' }, 404)
}
```
- 同时在 Railway 设置 `ENABLE_MOCK_PAY=true`
- **工作量**：S（1行代码 + 1个环境变量）

---

### P0-2: 首充金额前后端计算不一致，展示与实际到账有差额

**问题描述**：
`charge.vue:28-34` 的 `getEffectiveCoins()` 计算首充公式为 `(coins + bonus) * 2`，而后端 soul-engine 的实际公式是 `coins * 2 + bonus`。以 pack_68 为例：
- 前端展示：`(680 + 180) * 2 = 1,720`
- 后端实际到账：`680 * 2 + 180 = 1,540`

演示者充值后 toast 显示"获�� 1,720 爱心币"，但钱包余额只有 1,540。观众一旦注意到就会当场质疑数值一致性。

**修改方案**：
- 文件：`apps/stage-web/src/pages/wallet/charge.vue` 第 28-34 行
```typescript
// 修改前
function getEffectiveCoins(coins: number, bonus: number) {
  if (!wallet.value) return coins + bonus
  if (wallet.value.isFirstCharge) return (coins + bonus) * 2
  return coins + bonus
}

// 修改后（与后端 soul-engine 对齐：基础币翻倍，赠送不翻倍）
function getEffectiveCoins(coins: number, bonus: number) {
  if (!wallet.value) return coins + bonus
  if (wallet.value.isFirstCharge) return coins * 2 + bonus
  return coins + bonus
}
```
- **工作量**：S（1行修改）

---

### P0-3: Day5"查看惊喜"按钮无响应

**问题描述**：
`pages/index.vue:68-70` 的 `handleGuideViewSurprise()` 函数体为空——只有注释 `// 导航到惊喜页面（如果需要）`，没有任何实际代码。当 Demo 进入 Day5，DemoGuide 弹出"查看惊喜"按钮，用户点击后**什么都不会发生**，只是弹窗关闭。

**影响**：Day5 的惊喜是 Demo 叙事的第二个高潮。按钮失灵会让观众觉得产品是半成品。

**修改方案**：
- 文件：`apps/stage-web/src/pages/index.vue` 第 68-70 行
```typescript
// 修改后
function handleGuideViewSurprise() {
  router.push('/surprises')
  // 同时检查并触发 Demo 惊喜
  if (demoStore.checkDemoSurprise()) {
    demoStore.markSurpriseReceived()
  }
}
```
- 需要在文件顶部 import `useRouter` 并 `const router = useRouter()`（当前 index.vue 未导入 router）
- **工作量**：S

---

### P0-4: 惊喜无法自动触发 -- 缺少调用 checkTrigger 的机制

**问题描述**：
soul-engine 的 `checkThresholdTrigger()` 和 `demoStore.checkDemoSurprise()` 都已实现，但**没有任何地方调用它们**。没有定时器、没有事件驱动、也没有在送礼后自动检查。这意味着即使零花钱和信赖都达标了，惊喜也永远不会触发。

App.vue 中虽然 watch 了 `agentPushLastMessage` 并对 `surprise_trigger` 做 toast，但 WebSocket 推送本身也未在后端送礼流程中触发（S2问题）。

**修改方案**：
- 方案A（最小改动）：在 `GiftFloatingButton.vue` 的 `handleGiftSent()` 中，送礼成功后调用后端 `POST /api/surprises/check`
- 方案B（完整方案）：新增 composable `useSurpriseChecker`，在 App.vue onMounted 中初始化，定期（如每30秒）或在关键事件后检查
- 文件：`apps/stage-web/src/components/gift/GiftFloatingButton.vue`
```typescript
// 在 handleGiftSent() 末尾添加
async function handleGiftSent(tierId: string, _result: unknown) {
  // ... 现有动画逻辑 ...

  // 送礼后检查是否触发惊喜
  try {
    const res = await fetch('/api/surprises/check', {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      if (data.triggered) {
        // 导航到惊喜页面或直接展示惊喜动画
      }
    }
  } catch { /* 静默失败 */ }
}
```
- **工作量**：M

---

### P0-5: 充值成功后无视觉仪式感 -- 仅 toast 提示

**问题描述**：
`charge.vue:53-54` 充值成功后只调用了 `toast.success()`。对于"首充翻倍"这样的核心高光时刻，一个小小的 toast 通知完全无法传达"多巴胺时刻"的感觉。演示者需要额外口头解释"刚才发生了什么"，观众很容易错过。

对比 LevelUpCeremony.vue（信赖升级仪式）的全屏动画体验，充值成功的反馈落差极大。

**修改方案**：
- 新建组件 `ChargeSuccessAnimation.vue`，参考 DEMO_CHARGE_FLOW.md 第五节设计的四阶段动画
- 至少实现简版：全屏遮罩 + 数字滚动（0 -> 基础币 -> +赠送 -> 首充翻倍最终值）+ 金色粒子
- 在 charge.vue 中充值成功后展示此动画，而非 toast
- **工作量**：M

---

## 三、P1（应该修）-- 影响体验流畅度的问题

### P1-1: 充值页缺少 ComplianceFooter 合规底部

**问题描述**：
wallet/index.vue 有 `<ComplianceFooter />`，但 charge.vue（实际付费页面）没有。对于涉及真金白银支付的页面，缺少合规底部（理性消费提示、未成年人保护）存在合规风险，也影响专业度观感。

**修改方案**：
- 文件：`apps/stage-web/src/pages/wallet/charge.vue`
- 在 `</div>` (确认按钮的 sticky 容器) 后添加：
```vue
<ComplianceFooter />
```
- 并在 script 中 import
- **工作量**：S

---

### P1-2: 钱包余额数字直接跳变，缺少 CountUp 动画

**问题描述**：
wallet/index.vue 的余额显示 `{{ formattedBalance }}` 是纯文本渲染。充值成功返回钱包页时，余额从 0 直接跳到 1,540，没有数字滚动过渡。这种"硬切"让用户感受不到"获得感"的积累。

**修改方案**：
- 安装 `vue-countup-v3` 或使用 CSS @keyframes 实现简易数字滚动
- 文件：`apps/stage-web/src/pages/wallet/index.vue` 第 90-92 行
- 将 `{{ formattedBalance }}` 替换为 CountUp 组件，从 previous value 动画到 new value
- **工作量**：M

---

### P1-3: 充值成功后停留在充值页，无导航引导

**问题描述**：
charge.vue 充值成功后仅 `toast.success()` + 清除选中状态，用户仍停留在充值页面。观众不知道下一步应该干什么——是返回钱包看余额？还是去送礼？

**修改方案**：
- 文件：`apps/stage-web/src/pages/wallet/charge.vue` `handleCharge()` 成功后
- 添加延时自动导航或弹出引导：
```typescript
// 成功后 2秒 自动返回钱包页
setTimeout(() => {
  router.push('/wallet')
}, 2000)
```
- 或：展示一个"查看钱包 / 去送礼"的双选按钮，更自然
- **工作量**：S

---

### P1-4: 充值无二次确认弹窗

**问题描述**：
用户选中套餐后点击"确认充值"，charge.vue 立即发起支付请求，无二次确认。对于涉及金额的操作缺少确认步骤不符合用户预期，也容易误触。

**修改方案**：
- 文件：`apps/stage-web/src/pages/wallet/charge.vue` `handleCharge()`
- 添加确认弹窗（可复用 Dialog 组件），展示 DEMO_CHARGE_FLOW.md 5.2 节设计的确认弹窗 UI（基础币 + 赠送 + 首充翻倍明细）
- **工作量**：M

---

### P1-5: physical 类型惊喜无开箱特效

**问题描述**：
SurpriseAnimation.vue 第 25 行定义了 `physical: 'effect-unbox'`，但对应的 CSS 样式 `.effect-unbox` 从未定义。`<template>` 中也没有 `v-if="surprise.type === 'physical'"` 的粒子模板。这意味着实物惊喜开箱时只有空白背景，没有任何粒子效果。

**修改方案**：
- 文件：`apps/stage-web/src/components/surprise/SurpriseAnimation.vue`
- 在 effect particles 区域添加 physical 类型模板和对应 CSS
- 可参考 virtual 的星星粒子，改为礼盒碎片/彩带效果
- **工作量**：S

---

### P1-6: PocketMoneyBar 已实现但未被任何页面使用

**问题描述**：
`PocketMoneyBar.vue` 是零花钱进度可视化组件，展示角色"攒钱中"的进度。这是惊喜系统叙事的关键视觉元素，但目前没有被任何页面引用。观众无法直观看到"角色在攒零花钱给我买礼物"这个过程。

**修改方案**：
- 方案A：在 `surprises/index.vue` 顶部引入 PocketMoneyBar
- 方案B：在 GiftFloatingButton 展开的 TrustBar 附近显示
- 推荐方案A，文件：`apps/stage-web/src/pages/surprises/index.vue`
- **工作量**：S

---

### P1-7: 惊喜反馈提交后直接关闭，无角色回应

**问题描述**：
SurpriseAnimation.vue 第 71-83 行，用户点击反馈按钮（好喜欢/还行/不太合适）后直接 `show.value = false` 关闭弹窗。根据 DEMO_SURPRISE_FLOW.md 第四节设计，应该展示角色对反馈的回应语：
- love: "太好了！你喜欢的话我就好开心！"
- ok: "那下次我再想想有什么更好的！"
- change: "对不起，下次我一定会更用心！"

当前实现跳过了这个闭环，让用户感觉反馈被忽视了。

**修改方案**：
- 文件：`apps/stage-web/src/components/surprise/SurpriseAnimation.vue`
- 在 `handleFeedback()` 中提交后，不立即关闭，先展示角色回应文字（1.5秒），再关闭
- **工作量**：S

---

### P1-8: 充值到惊喜缺乏叙事过渡

**问题描述**：
从观众视角，"充值 -> 送礼 -> 零花钱累积 -> 惊喜触发"的因果链缺少视觉过渡。用户送完礼后，不会意识到"一部分爱心币变成了角色的零花钱"这件事。这是产品的核心差异化卖点，但当前体验中完全隐形。

**修改方案**：
- 在送礼成功后的 GiftAnimation 结束时，增加一个轻量提示，如："角色获得 X 元零花钱"的浮动文字
- 文件：`apps/stage-web/src/components/gift/GiftFloatingButton.vue` 第 43-53 行的 `handleGiftSent()` 中
- 获取 walletResult 中的零花钱增量并显示
- **工作量**：M

---

### P1-9: 支付处理中缺少全屏遮罩

**问题描述**：
charge.vue 在充值过程中仅按钮显示 `:loading="isCharging"`，但页面其余部分可以正常操作。用户可能在等待过程中误触返回、重复点击或选择其他套餐。

**修改方案**：
- 文件：`apps/stage-web/src/pages/wallet/charge.vue`
- 添加全屏半透明遮罩 + 加载指示器
```vue
<div v-if="isCharging" fixed inset-0 z-50 bg="black/30" flex items-center justify-center>
  <div bg="white dark:neutral-900" rounded-2xl p-6 flex="~ col items-center gap-3">
    <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
    <span text="sm neutral-600 dark:neutral-300">支付处理中...</span>
  </div>
</div>
```
- **工作量**：S

---

### P1-10: WebSocket 惊喜推送未在主页面监听处理

**问题描述**：
App.vue 第 79 行对 `surprise_trigger` 类型消息仅做了 `toast.success(msg.content)`。但惊喜触发应该是一个重大体验节点——应直接打开 SurpriseAnimation 弹窗，而不是一个普通的 toast。用户很可能错过这个 toast。

**修改方案**：
- 文件：`apps/stage-web/src/App.vue` 第 75-88 行的 watch
- 对 `surprise_trigger` 类型，调用 `surpriseStore.showSurprise()` 而不是 toast
```typescript
if (msg.type === 'surprise_trigger') {
  // 创建 SurpriseRecord 并展示动画
  const surpriseStore = useSurpriseStore()
  surpriseStore.showSurprise(msg.metadata?.surprise as SurpriseRecord)
}
```
- **工作量**：M

---

## 四、P2（可以修）-- 锦上添花的改进

### P2-1: 浮动按钮 Lv.X 小标签可能溢出视口

**问题描述**：
GiftFloatingButton.vue 第 91-104 行，信赖等级小标签使用 `absolute -top-2 -left-3`，在窄屏幕（375px）下若 Lv 数字较大（如 Lv.10），标签可能超出屏幕右边缘。

**修改方案**：
- 添加 `max-w-16 truncate` 或改用 tooltip 展示
- **工作量**：S

---

### P2-2: DayProgress 7天进度圆点在极窄屏紧凑

**问题描述**：
DayProgress.vue 的 7 个圆点 + 6 条连接线在 320px 屏幕下空间极度紧张。圆点 `w-8 h-8` + 间距可能导致换行或溢出。

**修改方案**：
- 在 `< 360px` 屏幕下，将圆点缩小到 `w-6 h-6`，或减少连接线 `max-w`
- **工作量**：S

---

### P2-3: 惊喜筛选 Tab 触控热区曾不足（已修复 min-h-11）

**问题描述**：
surprises/index.vue 第 81 行筛选按钮已设置 `min-h-11`（44px），满足移动端触控要求。但 `px-4 py-2` 的内间距在内容较短时（如"全部"二字），水平触控热区偏小。

**修改方案**：
- 添加 `min-w-14` 确保最小宽度
- **工作量**：S

---

### P2-4: 钱包页余额为0时缺少醒目充值引导

**问题描述**：
wallet/index.vue 余额为 0 时仅显示 `0` 数字，没有任何引导文案提示用户去充值。新用户看到空钱包可能不知道下一步该做什么。

**修改方案**：
- 当 `coinBalance === 0 && isFirstCharge` 时，在余额卡下方增加引导横幅："还没有爱心币？首充翻倍，任意档位！"
- **工作量**：S

---

### P2-5: 礼物面板"去充值"链接触控区域偏小

**问题描述**：
GiftPanel.vue 第 171-178 行的"余额不足，去充值 →"按钮只有 `py-1` 的垂直内间距，触控热区约 24px，远低于 44px 推荐值。

**修改方案**：
- 将 `py-1` 改为 `py-2.5`，并添加 `min-h-11`
- **工作量**：S

---

### P2-6: 套餐卡片缺少性价比标注

**问题描述**：
charge.vue 的套餐卡片只展示了基础币、赠送和价格，缺少"每元获得 XX 币"的性价比对比。高档位的性价比优势不直观，不利于引导用户选择高档位。

**修改方案**：
- 在每个套餐卡片中添加 `{{ Math.floor((pack.coins + pack.bonus) / pack.price) }}币/元`
- **工作量**：S

---

### P2-7: 惊喜列表错误状态未展示

**问题描述**：
surprises/index.vue 中 surpriseStore 有 `error` ref，但模板中没有错误状态展示。如果 API 请求失败，用户会看到空列表或永久 loading。

**修改方案**：
- 添加错误状态 UI（重试按钮 + 错误提示）
- **工作量**：S

---

### P2-8: star-particle 粒子可能溢出 375px 屏幕

**问题描述**：
SurpriseAnimation.vue 第 106 行，virtual 类型的 12 颗星星粒子使用 `--x: (i%4 - 1.5) * 80px`，最大 X 偏移为 `1.5 * 80 = 120px`。在 375px 屏幕上从中心偏移 120px 接近边缘。加上 `1.5x` 缩放后到 180px，可能导致水平滚动条出现。

**修改方案**：
- 将外层容器添加 `overflow-hidden`（当前已有 `inset-0`，加 `overflow-hidden` 即可）
- **工作量**：S

---

### P2-9: SurpriseCard 商品名无文字截断

**问题描述**：
SurpriseCard.vue 第 152 行 `{{ surprise.productName }}` 没有文字截断处理。如果商品名较长（如"限定款手工巧克力礼盒装"），可能溢出或破坏布局。

**修改方案**：
- 添加 `truncate` 或 `line-clamp-1`
- **工作量**：S

---

## 五、移动端（375px）逐页面可用性审查

### 5.1 主页 (index.vue)

| 元素 | 状态 | 问题 |
|------|------|------|
| Live2D 舞台 | OK | 自适应，无溢出 |
| 聊天区域 | OK | MobileInteractiveArea 已适配 |
| 送礼浮动按钮 | 注意 | Lv.X/余额小标签 `-left-3` 可能贴近右边缘 |
| DemoGuide 弹窗 | OK | `mx-4 max-w-sm` 适配良好 |

### 5.2 钱包页 (wallet/index.vue)

| 元素 | 状态 | 问题 |
|------|------|------|
| 返回按钮 | OK | `min-w-11 min-h-11` 满足 44px |
| 余额卡 | OK | `p-6` 间距充裕 |
| 首充横幅 | OK | 内容简洁不挤压 |
| 快捷操作按钮 | OK | `block` 全宽，可点击区域足够 |
| 交易记录 | OK | 单行布局，不换行 |
| ComplianceFooter | OK | 文字居中，链接可点 |

### 5.3 充值页 (wallet/charge.vue)

| 元素 | 状态 | 问题 |
|------|------|------|
| 套餐网格 | 注意 | `grid-cols-2 gap-3 p-4`，375px 下每卡约 160px 宽，内容紧凑但可接受；`p-4` 可酌情减为 `p-3` |
| 套餐 tag 角标 | 注意 | `absolute top--2 right-2`，3字文案（最受欢迎）可能被截断 |
| 首充实得文字 | OK | 字号 `xs` 适配 |
| 确认按钮 | OK | `sticky bottom-4 block` 全宽 |
| **缺少 ComplianceFooter** | 缺失 | P1-1 已标注 |

### 5.4 礼物面板 (GiftPanel.vue)

| 元素 | 状态 | 问题 |
|------|------|------|
| 底部弹出面板 | OK | `max-h-85vh overflow-y-auto` 适配 |
| 礼物卡片网格 | OK | `grid-cols-2 gap-3`，每卡约 160px |
| 确认按钮 | OK | 全宽 `w-full py-3` |
| "去充值"链接 | 注意 | `py-1` 触控热区不足（P2-5） |

### 5.5 惊喜记录 (surprises/index.vue)

| 元素 | 状态 | 问题 |
|------|------|------|
| 筛选 Tab 栏 | OK | `overflow-x-auto hide-scrollbar`，可横滑 |
| Tab 触控热区 | 已修 | `min-h-11` 已满足 44px |
| SurpriseCard | OK | 单列全宽，布局合理 |
| 空状态 | OK | Emoji + 文案居中 |

### 5.6 惊喜动画 (SurpriseAnimation.vue)

| 元素 | 状态 | 问题 |
|------|------|------|
| 遮罩层 | OK | `fixed inset-0` |
| 礼盒 Emoji | OK | `text-8xl` 在移动端显眼 |
| 商品展示卡 | OK | `max-w-sm w-full mx-3` 有边距 |
| 反馈按钮 | 注意 | 三个按钮 `flex gap-2`，375px 下每个约 110px，`sm:gap-3` 不触发，勉强够用 |
| 粒子特效 | 注意 | 可能溢出（P2-8） |

### 5.7 字体大小总结

| 场景 | 当前字号 | 评估 |
|------|---------|------|
| 页面标题 | text-xl (20px) | OK |
| 余额数字 | text-4xl (36px) | OK，醒目 |
| 套餐价格 | text-lg (18px) | OK |
| 套餐币数 | text-2xl (24px) | OK |
| 赠送/首充文字 | text-xs (12px) | 偏小但可接受 |
| 合规底部 | text-xs (12px) | OK，合规信息不需要大字 |
| 反馈按钮文字 | text-xs (12px) | 偏小，建议 text-sm |

---

## 六、页面切换流畅度评估

| 切换路径 | 切换方式 | 流畅度 | 备注 |
|---------|---------|--------|------|
| 主页 -> 钱包 | router.push('/wallet') | 中 | StageTransitionGroup 提供了页面过渡，但仅限 KeepAlive 页面 |
| 钱包 -> 充值 | router.push('/wallet/charge') | 低 | 无明显过渡动画，硬切 |
| 充值 -> 钱包（返回） | router.back() | 低 | 同上 |
| 主页 -> 惊喜 | router.push('/surprises') | 中 | 有基础过渡 |
| GiftPanel 弹出 | v-if + Transition | 高 | 底部滑入 + backdrop，体验好 |
| SurpriseAnimation | v-if + Transition | 高 | 三阶段动画完整 |
| LevelUpCeremony | v-if + Transition | 高 | 全屏仪式感强 |
| DemoGuide | v-if + Transition | 高 | 居中弹出 + 淡入 |

**关键问题**：子页面（wallet/charge、wallet/history、surprises）之间的路由切换缺乏统一过渡动画。建议添加全局 slide 过渡。

---

## 七、优先级汇总表

| ID | 优先级 | 问题 | 工作量 | 影响范围 |
|----|--------|------|--------|---------|
| P0-1 | **P0** | mock-pay 生产环境 404 | S | 充值全链路 |
| P0-2 | **P0** | 首充金额前后端不一致 | S | 充值数值展示 |
| P0-3 | **P0** | Day5"查看惊喜"按钮空函数 | S | Demo Day5 叙事 |
| P0-4 | **P0** | 惊喜无触发调用机制 | M | 惊喜全链路 |
| P0-5 | **P0** | 充值成功仅 toast 无仪式感 | M | 充值高光时刻 |
| P1-1 | P1 | 充值页缺 ComplianceFooter | S | 合规 |
| P1-2 | P1 | 余额数字无 CountUp 动画 | M | 充值反馈感 |
| P1-3 | P1 | 充值后无导航引导 | S | 流程衔接 |
| P1-4 | P1 | 充值无二次确认弹窗 | M | 安全/专业度 |
| P1-5 | P1 | physical 惊喜无开箱特效 | S | 惊喜体验 |
| P1-6 | P1 | PocketMoneyBar 未使用 | S | 惊喜叙事 |
| P1-7 | P1 | 反馈后无角色回应 | S | 惊喜闭环 |
| P1-8 | P1 | 充值到惊喜无叙事过渡 | M | 核心卖点感知 |
| P1-9 | P1 | 充值中缺全屏遮罩 | S | 防误触 |
| P1-10 | P1 | WS推送仅toast不展示动画 | M | 惊喜触发体验 |
| P2-1 | P2 | 浮动按钮标签溢出 | S | 移动端边缘 |
| P2-2 | P2 | DayProgress 窄屏紧凑 | S | 极窄屏适配 |
| P2-3 | P2 | 筛选Tab最小宽度 | S | 触控 |
| P2-4 | P2 | 零余额缺充值引导 | S | 新用户引导 |
| P2-5 | P2 | "去充值"触控区偏小 | S | 触控 |
| P2-6 | P2 | 套餐缺性价比标注 | S | 转化引导 |
| P2-7 | P2 | 惊喜列表无错误展示 | S | 容错 |
| P2-8 | P2 | 粒子溢出 375px | S | 移动端 |
| P2-9 | P2 | 商品名无截断 | S | 布局 |

---

## 八、线上验证状态

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 前端 (Vercel) | 连接超时 | curl 返回 000（GFW 限制或站点未部署当前分支） |
| 后端 (Railway) | 404 on /api/health | 服务可能运行中但 health 端点不存在或路径不同 |
| Chrome DevTools MCP | 浏览器实例冲突 | 已有 Chrome 实例占用 profile，无法启动新实例 |

> 由于网络限制，无法完成线上实际交互验证。上述所有分析均基于源码静态审查。建议在代理环境下进行线上 E2E 验证。

---

## 九、推荐修复顺序

### 第一波（2小时，解除 Demo 阻塞）：
1. **P0-1** — 修改 payment.ts mock-pay 条件（5分钟）
2. **P0-2** — 修正 charge.vue 首充计算公式（5分钟）
3. **P0-3** — 实现 handleGuideViewSurprise 导航（10分钟）
4. **P1-1** — 充值页添加 ComplianceFooter（5分钟）
5. **P1-9** — 添加充值中全屏遮罩（15分钟）
6. **P1-3** — 充值成功后自动导航（10分钟）

### 第二波（4小时，提升 Demo 质量）：
7. **P0-5** — 充值成功仪式动画（90分钟）
8. **P0-4** — 送礼后自动检查惊喜触发（30分钟）
9. **P1-6** — 惊喜页引入 PocketMoneyBar（15分钟）
10. **P1-5** — physical 开箱特效（20分钟）
11. **P1-7** — 惊喜反馈角色回应（20分钟）
12. **P1-8** — 送礼后零花钱增量提示（30分钟）

### 第三波（可选优化）：
13. P1-2, P1-4, P1-10 及所有 P2 项

---

## 十、总体评价

### 已做得好的方面
1. **组件结构清晰**：礼物系统（GiftPanel + GiftAnimation + GiftFloatingButton）形成完整组件树
2. **动画品质高**：SurpriseAnimation 三阶段设计、LevelUpCeremony 仪式感、心形粒子上升效果
3. **过渡动效统一**：大多数弹窗/浮层使用 `<Transition>` + cubic-bezier，体验一致
4. **暗色模式完整**：所有组件都有 dark: 变体
5. **移动端基础适配**：大部分触控热区达标，滚动和布局合理

### 核心差距
1. **关键链路断裂**：充值和惊喜两条核心链路都有功能性阻塞（P0-1, P0-3, P0-4）
2. **反馈仪式感不足**：最重要的首充高光时刻只有一个 toast
3. **叙事连贯性缺失**：充值 -> 送礼 -> 零花钱 -> 惊喜的因果链在 UI 层面不够显性
4. **数值一致性 Bug**：首充计算前后端不一致（P0-2）是可信度杀手

### 建议
修复 P0 全部 5 项 + P1 前 3 项后，Demo 流程即可正常走通。再加上充值仪式动画（P0-5），就能达到"让观众产生情感共鸣"的演示效果。
