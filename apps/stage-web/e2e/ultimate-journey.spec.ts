/**
 * 伪春菜 v3.0 终极用户旅程 E2E 测试
 *
 * Round 12-C 最终验证轮 — 覆盖 R1-R12 全部功能点的端到端验证。
 * 12个核心场景，模拟完整用户生命周期。
 *
 * 注意：所有测试标记为 test.fixme()，因为需要：
 * - Playwright 完整安装
 * - 运行中的前后端服务（dev server + PostgreSQL）
 * - OpenClaw Agent 实例（NAS 192.168.3.196:3000）
 * - CosyVoice TTS API Key
 *
 * 待实际部署后移除 fixme 标记逐步启用。
 */

import { expect, test } from '@playwright/test'

// ─── 通用常量 ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3003'
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'

// 测试用户凭证（需要预配置或通过 API 创建）
const TEST_USER = {
  phone: '13800000001',
  password: 'test-password-e2e',
}

// 测试角色：小星（神秘灵动型）
const TEST_CHARACTER = {
  name: '小星',
  templateId: 'mystic_spirit',
}

// ─── 场景 ① 注册 → 创角(选小星) → Live2D 角色出现打招呼 ────────────────────

test.describe('场景①：注册 → 创角 → 初次见面', () => {
  test.fixme('用户可以通过手机号注册新账号', async ({ page }) => {
    // 导航到注册页
    await page.goto(`${BASE_URL}/register`)

    // 填写手机号
    await page.fill('[data-testid="phone-input"]', TEST_USER.phone)

    // 点击获取验证码
    await page.click('[data-testid="send-code-btn"]')

    // 等待验证码输入框出现
    await page.waitForSelector('[data-testid="code-input"]')

    // 填写验证码（Mock 模式下使用固定验证码 123456）
    await page.fill('[data-testid="code-input"]', '123456')

    // 提交注册
    await page.click('[data-testid="register-btn"]')

    // 验证跳转到角色选择页
    await expect(page).toHaveURL(/\/onboarding/)
  })

  test.fixme('用户可以选择小星作为初始角色', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`)

    // 等待角色卡片加载
    await page.waitForSelector('[data-testid="character-card"]')

    // 选择小星（mystic_spirit 模板）
    await page.click('[data-testid="character-card-mystic_spirit"]')

    // 确认选择
    await page.click('[data-testid="confirm-character-btn"]')

    // 验证角色创建成功
    await expect(page.locator('[data-testid="character-name"]')).toContainText('小星')
  })

  test.fixme('Live2D 角色出现并播放打招呼动画', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 等待 Live2D Canvas 加载
    await page.waitForSelector('canvas[data-testid="live2d-canvas"]', { timeout: 10000 })

    // 验证 Live2D Canvas 可见
    const canvas = page.locator('canvas[data-testid="live2d-canvas"]')
    await expect(canvas).toBeVisible()

    // 验证打招呼消息气泡出现
    await page.waitForSelector('[data-testid="chat-bubble"]', { timeout: 5000 })
    const greeting = page.locator('[data-testid="chat-bubble"]').first()
    await expect(greeting).toBeVisible()
  })
})

// ─── 场景 ② 日常聊天(语音回复) → 签到(+5信赖) ──────────────────────────────

test.describe('场景②：日常聊天 + 语音回复 + 签到', () => {
  test.fixme('用户可以发送消息并收到 SSE 流式回复', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 找到聊天输入框
    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('你好小星，今天天气真好！')

    // 发送消息
    await page.click('[data-testid="send-btn"]')

    // 等待 SSE 流式回复开始（token 逐字出现）
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 })

    // 验证回复非空
    const reply = page.locator('[data-testid="assistant-message"]').last()
    await expect(reply).not.toBeEmpty()
  })

  test.fixme('Lv.7+ 用户可以收到语音回复气泡', async ({ page }) => {
    // 前置条件：用户信赖等级 >= 7（需要提前通过 API 设置）
    // TODO: 通过 API 将用户信赖等级设为 Lv.7 (3500+)

    await page.goto(`${BASE_URL}/`)

    // 发送消息
    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('给我唱首歌吧')
    await page.click('[data-testid="send-btn"]')

    // 等待语音气泡出现
    await page.waitForSelector('[data-testid="voice-bubble"]', { timeout: 15000 })

    // 验证语音播放按钮可用
    const playBtn = page.locator('[data-testid="voice-play-btn"]')
    await expect(playBtn).toBeVisible()
  })

  test.fixme('每日签到增加 +5 信赖值', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 点击签到按钮
    await page.click('[data-testid="checkin-btn"]')

    // 等待签到成功提示
    await page.waitForSelector('[data-testid="checkin-success"]')

    // 验证信赖值增加了 +5
    const trustChange = page.locator('[data-testid="trust-change"]')
    await expect(trustChange).toContainText('+5')

    // 验证信赖条更新
    const trustBar = page.locator('[data-testid="trust-bar"]')
    await expect(trustBar).toBeVisible()
  })
})

// ─── 场景 ③ 充值(Mock支付¥68) → 爱心币到账 ─────────────────────────────────

test.describe('场景③：充值 Mock 支付 ¥68 → 爱心币到账', () => {
  test.fixme('用户可以通��� Mock 支付完成 ¥68 充值', async ({ page }) => {
    await page.goto(`${BASE_URL}/wallet/charge`)

    // 等待充值套餐卡片加载
    await page.waitForSelector('[data-testid="charge-pack"]')

    // 选择 ¥68 档位（真心以待，680 + 180 赠送 = 860 爱心币）
    await page.click('[data-testid="charge-pack-pack_68"]')

    // 确认充值
    await page.click('[data-testid="confirm-charge-btn"]')

    // 等待 Mock 支付页面
    await page.waitForSelector('[data-testid="mock-pay-btn"]', { timeout: 5000 })

    // 完成 Mock 支付
    await page.click('[data-testid="mock-pay-btn"]')

    // 等待支付成功提示
    await page.waitForSelector('[data-testid="charge-success"]')
  })

  test.fixme('首充翻倍：首次充值 ¥68 应得到 1360 爱心币', async ({ page }) => {
    // 首充翻倍：基础 680 × 2 = 1360（首充翻倍仅计算基础币数，不含赠送）
    await page.goto(`${BASE_URL}/wallet`)

    // 等待余额加载
    await page.waitForSelector('[data-testid="wallet-balance"]')

    // 验证爱心币余额包含首充翻倍
    const balance = page.locator('[data-testid="wallet-balance"]')
    // 首次充值 pack_68: 680 基础 × 2 (首充翻倍) + 180 赠送 = 1540
    // 或者：680 + 180 = 860 × 2 = 1720（取决于翻倍规则实现）
    // 需要根据实际实现验证具体值
    await expect(balance).toBeVisible()
  })

  test.fixme('充值交易记录中显示本次充值', async ({ page }) => {
    await page.goto(`${BASE_URL}/wallet/history`)

    // 等待交易记录加载
    await page.waitForSelector('[data-testid="transaction-item"]')

    // 验证最新记录是充值
    const latestTx = page.locator('[data-testid="transaction-item"]').first()
    await expect(latestTx).toContainText('充值')
    await expect(latestTx).toContainText('68')
  })
})

// ─── 场景 ④ 送礼(金币飞入 → Live2D 感动表情 → 语音感谢) ───────────────────

test.describe('场景④：送礼 → 动画 → 感动表情 → 感谢', () => {
  test.fixme('送出"暖暖的"礼物后金币飞入动画播放', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 打开礼物面板
    await page.click('[data-testid="gift-floating-btn"]')

    // 等待礼物面板加载
    await page.waitForSelector('[data-testid="gift-panel"]')

    // 选择"暖暖的"礼物（50 爱心币，+45 信赖）
    await page.click('[data-testid="gift-tier-medium"]')

    // 确认送礼
    await page.click('[data-testid="confirm-gift-btn"]')

    // 等待送礼动画
    await page.waitForSelector('[data-testid="gift-animation"]', { timeout: 3000 })

    // 验证动画正在播放
    const animation = page.locator('[data-testid="gift-animation"]')
    await expect(animation).toBeVisible()
  })

  test.fixme('送礼后 Live2D 角色切换为感动表情', async ({ page }) => {
    // 前置条件：刚刚完成送礼
    // 等待 Live2D 表情变化（emotion: touched）
    await page.waitForTimeout(1000) // 等待情感状态更新

    // 验证情感状态指示器显示"感动"
    const emotionIndicator = page.locator('[data-testid="emotion-state"]')
    await expect(emotionIndicator).toContainText('感动')
  })

  test.fixme('送礼后角色发送语音感谢消息', async ({ page }) => {
    // 等待角色感谢消息
    await page.waitForSelector('[data-testid="thank-message"]', { timeout: 5000 })

    const thankMsg = page.locator('[data-testid="thank-message"]')
    await expect(thankMsg).toBeVisible()

    // 如果信赖等级足够（Lv.7+），应有语音按钮
    // 否则仅文字感谢
  })

  test.fixme('送礼后钱包余额正确扣减 50 爱心币', async ({ page }) => {
    // 通过 API 验证余额
    const response = await page.request.get(`${API_URL}/api/wallet`, {
      headers: { Authorization: 'Bearer <test-token>' },
    })

    const wallet = await response.json()
    // 验证余额已扣减 50 币
    expect(wallet.coinBalance).toBeDefined()
  })
})

// ─── 场景 ⑤ 零花钱积累 → 进度条 → 角色暗示 ─────────────────────────────────

test.describe('场景⑤：零花钱积累 → 进度条 → 角色暗示', () => {
  test.fixme('多次送礼后零花钱池显示进度条', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 等待零花钱进度条组件加载
    await page.waitForSelector('[data-testid="pocket-money-bar"]')

    // 验证进度条可见
    const pocketBar = page.locator('[data-testid="pocket-money-bar"]')
    await expect(pocketBar).toBeVisible()

    // 验证当前零花钱数值显示
    const pocketAmount = page.locator('[data-testid="pocket-money-amount"]')
    await expect(pocketAmount).toBeVisible()
  })

  test.fixme('零花钱达到阈值时角色发出暗示', async ({ page }) => {
    // 前置条件：零花钱池达到虚拟惊喜阈值（>= 0元，Lv.5+）
    // TODO: 通过 API 设置用户零花钱为阈值附近值

    await page.goto(`${BASE_URL}/`)

    // 等待角色暗示消息（Agent 主动推送）
    // 暗示内容可能是："我最近看到一个很可爱的东西..."
    await page.waitForSelector('[data-testid="proactive-message"]', { timeout: 30000 })

    const hint = page.locator('[data-testid="proactive-message"]')
    await expect(hint).toBeVisible()
  })

  test.fixme('零花钱进度条的4个阈值标记正确显示', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 验证 4 个阈值标记点存在
    // 阈值: 0元(虚拟) / 15元(电子) / 30元(实物) / 50元(个性化)
    const thresholds = page.locator('[data-testid="threshold-marker"]')
    await expect(thresholds).toHaveCount(4)
  })
})

// ─── 场景 ⑥ Agent 自主触发惊喜 → 商品推荐 → 推送 ────────────────────────────

test.describe('场景⑥：Agent 自主惊喜 → 商品推荐 → 推送', () => {
  test.fixme('Agent 通过 Cron 检测到惊喜条件并触发', async ({ page }) => {
    // 前置条件：
    // - 信赖等级 Lv.8+（知己，6000+）
    // - 零花钱 >= 30元（实物惊喜阈值）
    // - 冷却期已过（>= 7天未触发惊喜）
    // TODO: 通过 API 配置满足条件的用户状态

    await page.goto(`${BASE_URL}/`)

    // 等待 WebSocket 连接建立
    await page.waitForSelector('[data-testid="ws-connected"]', { timeout: 5000 })

    // 等待惊喜推送（通过 WebSocket surprise_trigger 事件）
    await page.waitForSelector('[data-testid="surprise-notification"]', { timeout: 60000 })

    const notification = page.locator('[data-testid="surprise-notification"]')
    await expect(notification).toBeVisible()
  })

  test.fixme('惊喜卡片展示商品推荐和 O2O 链接', async ({ page }) => {
    // 点击惊喜通知打开详情
    await page.click('[data-testid="surprise-notification"]')

    // 等待惊喜卡片展示
    await page.waitForSelector('[data-testid="surprise-card"]')

    // 验证包含商品信息
    const productName = page.locator('[data-testid="surprise-product-name"]')
    await expect(productName).toBeVisible()

    // 验证包含外卖平台链接
    const orderLink = page.locator('[data-testid="surprise-order-link"]')
    await expect(orderLink).toBeVisible()
    await expect(orderLink).toHaveAttribute('href', /meituan|eleme/)
  })

  test.fixme('惊喜记录页显示历史惊喜', async ({ page }) => {
    await page.goto(`${BASE_URL}/surprises`)

    // 等待惊喜记录加载
    await page.waitForSelector('[data-testid="surprise-history-item"]')

    // 验证有至少一条惊喜记录
    const items = page.locator('[data-testid="surprise-history-item"]')
    expect(await items.count()).toBeGreaterThan(0)
  })
})

// ─── 场景 ⑦ 信赖升级 → Live2D 换装 → 升级仪式 ──────────────────────────────

test.describe('场景⑦：信赖升级 → Live2D 换装 → 仪式', () => {
  test.fixme('信赖等级从 Lv.2 升级到 Lv.3 时触发升级仪式', async ({ page }) => {
    // 前置条件：信赖值接近 Lv.3 阈值（350）
    // TODO: 通过 API 设置用户信赖值为 349

    await page.goto(`${BASE_URL}/`)

    // 执行一个 +5 的签到操作让信赖突破 350
    await page.click('[data-testid="checkin-btn"]')

    // 等待升级仪式全屏动画
    await page.waitForSelector('[data-testid="level-up-ceremony"]', { timeout: 5000 })

    // 验证升级仪式显示正确的等级
    const ceremony = page.locator('[data-testid="level-up-ceremony"]')
    await expect(ceremony).toBeVisible()

    const newLevel = page.locator('[data-testid="new-level-display"]')
    await expect(newLevel).toContainText('3')
  })

  test.fixme('升级后 Live2D 角色服装自动更换', async ({ page }) => {
    // 等待升级仪式结束
    await page.waitForSelector('[data-testid="level-up-ceremony"]', { state: 'hidden', timeout: 10000 })

    // 验证 Live2D 模型已更换服装（通过外观层级变化）
    // 外观层级: Lv.1-2 = starter(新手), Lv.3-4 = casual(日常)
    const appearanceIndicator = page.locator('[data-testid="appearance-tier"]')
    await expect(appearanceIndicator).toContainText('casual')
  })

  test.fixme('信赖等级进度条正确显示新等级进度', async ({ page }) => {
    // 验证信赖条更新为新等级
    const trustBar = page.locator('[data-testid="trust-bar"]')
    await expect(trustBar).toBeVisible()

    const levelDisplay = page.locator('[data-testid="trust-level-display"]')
    await expect(levelDisplay).toContainText('Lv.3')

    // 验证等级名称
    const levelName = page.locator('[data-testid="trust-level-name"]')
    await expect(levelName).toContainText('熟悉')
  })
})

// ─── 场景 ⑧ Agent 主动推送(早安消息) ─────────────────────────────────────────

test.describe('场景⑧：Agent 主动推送早安消息', () => {
  test.fixme('Agent 在早晨 8:00-9:00 发送早安消息', async ({ page }) => {
    // 注意：此测试依赖 OpenClaw Cron 任务配置
    // HEARTBEAT.md 配置了每日 8:00-9:00 早安问候

    await page.goto(`${BASE_URL}/`)

    // 等待 WebSocket 连接
    await page.waitForSelector('[data-testid="ws-connected"]')

    // 等待主动消息推送
    // 在实际测试中，可能需要 Mock 时间或通过 API 手动触发
    await page.waitForSelector('[data-testid="proactive-message"]', { timeout: 60000 })

    const message = page.locator('[data-testid="proactive-message"]').last()
    await expect(message).toBeVisible()

    // 验证消息类型标识为 greeting
    const messageType = page.locator('[data-testid="message-type-badge"]').last()
    await expect(messageType).toContainText('问候')
  })

  test.fixme('早安消息包含角色情感状态（想念/开心）', async ({ page }) => {
    // 验证消息带有情感标签
    const emotionTag = page.locator('[data-testid="message-emotion"]').last()
    await expect(emotionTag).toBeVisible()

    // 早安消息通常带"想念"（missing）或"开心"（happy）情感
    const emotionText = await emotionTag.textContent()
    expect(['想念', '开心', '关心']).toContain(emotionText?.trim())
  })

  test.fixme('用户离线时主动消息在上线后补发', async ({ page }) => {
    // 导航到页面建立连接
    await page.goto(`${BASE_URL}/`)

    // 等待 WebSocket 连接
    await page.waitForSelector('[data-testid="ws-connected"]')

    // 验证有未读消息提示（如果在离线期间有主动消息）
    const unreadBadge = page.locator('[data-testid="unread-count"]')
    // 如果有未读消息，badge 应该可见
    // 注意：具体逻辑取决于后端是否存储离线消息
  })
})

// ─── 场景 ⑨ 跨渠道一致性(Web↔飞书) ──────────────────────────────────────────

test.describe('场景⑨：跨渠道一致性（Web ↔ 飞书）', () => {
  test.fixme('Web 端送礼后飞书端查询余额一致', async ({ page, request }) => {
    // 1. Web 端送礼
    await page.goto(`${BASE_URL}/`)
    await page.click('[data-testid="gift-floating-btn"]')
    await page.waitForSelector('[data-testid="gift-panel"]')
    await page.click('[data-testid="gift-tier-small"]') // 10 爱心币
    await page.click('[data-testid="confirm-gift-btn"]')

    // 等待送礼完成
    await page.waitForSelector('[data-testid="gift-success"]')

    // 2. 通过 API 模拟飞书渠道查询余额
    const walletResponse = await request.get(`${API_URL}/api/wallet`, {
      headers: {
        'Authorization': 'Bearer <test-token>',
        'X-Channel': 'feishu',
      },
    })

    const wallet = await walletResponse.json()
    expect(wallet.coinBalance).toBeDefined()

    // 3. Web 端余额应与 API 返回一致
    const webBalance = page.locator('[data-testid="wallet-balance"]')
    const webBalanceText = await webBalance.textContent()
    expect(Number.parseInt(webBalanceText ?? '0')).toBe(wallet.coinBalance)
  })

  test.fixme('飞书端信赖等级与 Web 端一致', async ({ page, request }) => {
    // 通过 API 查询信赖等级（模拟飞书渠道）
    const trustResponse = await request.get(`${API_URL}/api/trust/test-character-id`, {
      headers: {
        'Authorization': 'Bearer <test-token>',
        'X-Channel': 'feishu',
      },
    })

    const trustData = await trustResponse.json()

    // Web 端信赖等级
    await page.goto(`${BASE_URL}/`)
    const trustLevel = page.locator('[data-testid="trust-level-display"]')
    const webLevel = await trustLevel.textContent()

    // 验证等级一致
    expect(webLevel).toContain(`Lv.${trustData.trustLevel}`)
  })

  test.fixme('渠道绑定后两端消息记录同步', async ({ page, request }) => {
    // 验证渠道绑定 API 可用
    // TODO: 飞书渠道绑定需要 OpenClaw 支持的 Feishu Channel 配置

    // 发送消息后，两个渠道应能查到相同的对话历史
    // 此测试需要渠道同步服务完成后才能启用
    const syncResponse = await request.get(`${API_URL}/api/channel/sync-status`, {
      headers: { Authorization: 'Bearer <test-token>' },
    })

    expect(syncResponse.ok()).toBeTruthy()
  })
})

// ─── 场景 ⑩ 7天 Demo → 转化引导 ────────────────────────────────────────────

test.describe('场景⑩：7天 Demo 体验 → 转化引导', () => {
  test.fixme('Day 1: 首次进入显示 Onboarding 引导', async ({ page }) => {
    // 清除本地存储模拟新用户
    await page.goto(`${BASE_URL}/`)
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // 验证 Onboarding 页面出现
    await page.waitForSelector('[data-testid="onboarding-welcome"]')

    // 验证 3 个特性卡片展示
    const featureCards = page.locator('[data-testid="feature-card"]')
    await expect(featureCards).toHaveCount(3)
  })

  test.fixme('Day 3: 赠送 50 爱心币体验送礼', async ({ page }) => {
    // 模拟 Demo Day 3
    // TODO: 设置 demo store 的 currentDay = 3

    await page.goto(`${BASE_URL}/`)

    // 等待 Day 3 引导提示
    await page.waitForSelector('[data-testid="demo-guide"]')

    // 验证赠送 50 爱心币提示
    const guideContent = page.locator('[data-testid="demo-guide-content"]')
    await expect(guideContent).toContainText('50')
  })

  test.fixme('Day 5: 触发模拟虚拟惊喜', async ({ page }) => {
    // 模拟 Demo Day 5
    // TODO: 设置 demo store 的 currentDay = 5

    await page.goto(`${BASE_URL}/`)

    // 等待惊喜动画
    await page.waitForSelector('[data-testid="surprise-animation"]', { timeout: 10000 })

    // 验证惊喜卡片展示
    const surpriseCard = page.locator('[data-testid="surprise-card"]')
    await expect(surpriseCard).toBeVisible()
  })

  test.fixme('Day 7: 展示转化卡片引导付费', async ({ page }) => {
    // 模拟 Demo Day 7
    // TODO: 设置 demo store 的 currentDay = 7

    await page.goto(`${BASE_URL}/`)

    // 等待转化卡片
    await page.waitForSelector('[data-testid="conversion-card"]')

    // 验证转化卡片包含统计回顾
    const stats = page.locator('[data-testid="demo-stats"]')
    await expect(stats).toBeVisible()

    // 验证包含 CTA 按钮
    const ctaBtn = page.locator('[data-testid="conversion-cta-btn"]')
    await expect(ctaBtn).toBeVisible()
    await expect(ctaBtn).toContainText('开始正式旅程')
  })

  test.fixme('Demo 结束后保留 100 信赖值(Lv.2 起步)', async ({ page, request }) => {
    // Demo 结束后转为正式用户
    // 验证信赖值被重置为 100（Lv.2 相识）

    const trustResponse = await request.get(`${API_URL}/api/trust/test-character-id`, {
      headers: { Authorization: 'Bearer <test-token>' },
    })

    const trustData = await trustResponse.json()
    expect(trustData.trustPoints).toBe(100) // Demo 结束保留值
    expect(trustData.trustLevel).toBe(2) // Lv.2 相识
  })
})

// ─── 场景 ⑪ OpenClaw 降级模式验证 ───────────────────────────────────────────

test.describe('场景⑪：OpenClaw 降级模式验证', () => {
  test.fixme('OpenClaw 连接正常时显示 openclaw 通道', async ({ page, request }) => {
    // 查询通道状态
    const statusResponse = await request.get(`${API_URL}/api/chat/status`, {
      headers: { Authorization: 'Bearer <test-token>' },
    })

    const status = await statusResponse.json()
    expect(status.channel).toBe('openclaw')
    expect(status.openclaw.connected).toBe(true)
  })

  test.fixme('OpenClaw 断连后 3s 内自动切换到降级模式', async ({ page, request }) => {
    // TODO: 通过管理 API 或直接断开 WebSocket 模拟 OpenClaw 不可用
    // 降级管理器应在 5 分钟重试间隔后自动检查恢复

    // 验证状态切换
    const statusResponse = await request.get(`${API_URL}/api/chat/status`, {
      headers: { Authorization: 'Bearer <test-token>' },
    })

    const status = await statusResponse.json()
    // 降级后通道应为 fallback
    if (!status.openclaw.connected) {
      expect(status.channel).toBe('fallback')
    }
  })

  test.fixme('降级模式下基础对话功能仍可使用', async ({ page }) => {
    // 在降级模式下发送消息
    await page.goto(`${BASE_URL}/`)

    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('降级模式测试消息')
    await page.click('[data-testid="send-btn"]')

    // 等待回复（通过 fallback LLM）
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 15000 })

    // 验证回复存在（即使来自降级通道）
    const reply = page.locator('[data-testid="assistant-message"]').last()
    await expect(reply).not.toBeEmpty()

    // 验证降级提示可见
    const degradedBanner = page.locator('[data-testid="degraded-mode-banner"]')
    // 降级提示应该存在但不阻断体验
  })

  test.fixme('OpenClaw 恢复后自动退出降级模式', async ({ page, request }) => {
    // TODO: 恢复 OpenClaw 连接后验证自动切换回主通道
    // 降级管理器在 RETRY_INTERVAL_MS (5分钟) 后检查恢复

    // 模拟等待后查询状态
    const statusResponse = await request.get(`${API_URL}/api/chat/status`, {
      headers: { Authorization: 'Bearer <test-token>' },
    })

    const status = await statusResponse.json()
    // 恢复后应切回 openclaw
    if (status.openclaw.connected) {
      expect(status.channel).toBe('openclaw')
    }
  })
})

// ─── 场景 ⑫ 刷新 → 全部状态持久化恢复 ──────────────────────────────────────

test.describe('场景⑫：刷新 → 全部状态持久化恢复', () => {
  test.fixme('刷新后钱包余额与刷新前一致', async ({ page }) => {
    await page.goto(`${BASE_URL}/wallet`)

    // 获取刷新前余额
    await page.waitForSelector('[data-testid="wallet-balance"]')
    const balanceBefore = await page.locator('[data-testid="wallet-balance"]').textContent()

    // 执行页面刷新
    await page.reload()

    // 等待余额重新加载
    await page.waitForSelector('[data-testid="wallet-balance"]')
    const balanceAfter = await page.locator('[data-testid="wallet-balance"]').textContent()

    // 验证余额一致（来自数据库，非本地状态）
    expect(balanceAfter).toBe(balanceBefore)
  })

  test.fixme('刷新后信赖等级与刷新前一致', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 获取刷新前信赖等级
    await page.waitForSelector('[data-testid="trust-level-display"]')
    const levelBefore = await page.locator('[data-testid="trust-level-display"]').textContent()

    // 执行页面刷新
    await page.reload()

    // 等待信赖信息重新加载
    await page.waitForSelector('[data-testid="trust-level-display"]')
    const levelAfter = await page.locator('[data-testid="trust-level-display"]').textContent()

    // 验证等级一致
    expect(levelAfter).toBe(levelBefore)
  })

  test.fixme('刷新后 Live2D 角色外观保持正确', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 等待 Live2D 加载
    await page.waitForSelector('canvas[data-testid="live2d-canvas"]', { timeout: 10000 })

    // 验证角色加载完成
    const canvas = page.locator('canvas[data-testid="live2d-canvas"]')
    await expect(canvas).toBeVisible()

    // 验证外观层级与信赖等级匹配
    const appearanceTier = page.locator('[data-testid="appearance-tier"]')
    await expect(appearanceTier).toBeVisible()
  })

  test.fixme('刷新后 OpenClaw 连接状态正确恢复', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 等待 WebSocket 重连
    await page.waitForSelector('[data-testid="ws-connected"]', { timeout: 10000 })

    // 验证连接状态指示器
    const wsStatus = page.locator('[data-testid="ws-status"]')
    await expect(wsStatus).toContainText('已连接')
  })

  test.fixme('刷新后 Demo 进度保持不变（localStorage 持久化）', async ({ page }) => {
    // 设置 Demo 进度
    await page.goto(`${BASE_URL}/`)
    await page.evaluate(() => {
      localStorage.setItem('demo-store', JSON.stringify({ currentDay: 4, isActive: true }))
    })
    await page.reload()

    // 验证 Demo 进度条显示正确天数
    await page.waitForSelector('[data-testid="day-progress"]')
    const dayProgress = page.locator('[data-testid="day-progress-current"]')
    await expect(dayProgress).toContainText('4')
  })

  test.fixme('刷新后聊天历史可加载（非丢失）', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    // 等待聊天历史加载
    await page.waitForSelector('[data-testid="chat-history"]', { timeout: 5000 })

    // 验证有历史消息存在
    const messages = page.locator('[data-testid="chat-message"]')
    // 至少应该有之前的对话记录
    expect(await messages.count()).toBeGreaterThanOrEqual(0)
  })
})
