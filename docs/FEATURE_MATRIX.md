# 伪春菜 v2 — 功能矩阵

> 最后更新：2026-03-05
>
> 图例：✅ 完整 | ⚠️ 部分实现 | ❌ 缺失 | 🔲 未验证

---

## 1. 用户认证

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 邮箱密码注册 | ✅ `/auth/login` | ✅ better-auth | ✅ `user` + `account` 表 | N/A | ❌ | ✅ 完整 |
| 邮箱密码登录 | ✅ `/auth/login` | ✅ better-auth | ✅ `session` 表 | N/A | ❌ | ✅ 完整 |
| Google OAuth | ✅ 按钮 | ✅ `AUTH_GOOGLE_CLIENT_ID/SECRET` | ✅ account 关联 | N/A | ❌ | ⚠️ 需配置 |
| GitHub OAuth | ✅ 按钮 | ✅ `AUTH_GITHUB_CLIENT_ID/SECRET` | ✅ account 关联 | N/A | ❌ | ⚠️ 需配置 |
| 会话管理 | ✅ Cookie | ✅ sessionMiddleware | ✅ `session` 表 | N/A | ❌ | ✅ 完整 |
| 登出 | ✅ | ✅ better-auth | ✅ session 销毁 | N/A | ❌ | ✅ 完整 |

---

## 2. 信赖系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 每日签到 | ✅ trust store | ✅ `POST /api/trust/checkin` | ✅ `trust_records` | ✅ `calculateDailyTrust` | ❌ | ✅ 完整 |
| 连续签到加成 | ✅ 显示连续天数 | ✅ 签到时计算 | ✅ `streak_days` 字段 | ✅ `getStreakBonus` | ❌ | ✅ 完整 |
| 信赖衰减 | ❌ 无前端展示 | ✅ `POST /api/skills/trust/check-decay` | ✅ `trust_points` 更新 | ✅ `calculateTrustDecay` | ❌ | ⚠️ 后端完整，前端未展示 |
| 10 级等级体系 | ✅ 等级名称+进度 | ✅ `GET /api/trust/:characterId` | ✅ `trust_level` 字段 | ✅ `determineTrustLevel` | ❌ | ✅ 完整 |
| 升级动画 | ✅ `showLevelUp` 弹窗 | ✅ 返回等级变化 | ✅ | ✅ `checkLevelUp` | ❌ | ✅ 完整 |
| 升级冷却天数 | ❌ 无前端展示 | ✅ 内部计算 | ✅ `days_at_current_level` | ✅ `cooldownDays` 配置 | ❌ | ⚠️ 前端未展示冷却信息 |
| 动摇状态 | ❌ 无前端展示 | ✅ 返回 `isShaken` | ✅ `is_shaken` 字段 | ✅ `isShaken` 计算 | ❌ | ⚠️ 前端未使用 |
| 信赖事件值 | N/A | ✅ 各事件对应分值 | N/A | ✅ `getTrustEventValue` | ❌ | ✅ 完整 |
| Demo 模式 8 倍率 | ✅ demo store | ✅ 计算时应用 | N/A | ✅ `DEMO_MULTIPLIER = 8` | ❌ | ✅ 完整 |

---

## 3. 经济系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 钱包余额查询 | ✅ `/wallet` | ✅ `GET /api/wallet` | ✅ `wallets` 表 | N/A | ❌ | ✅ 完整 |
| 充值 7 档 | ✅ `/wallet/charge` | ✅ `POST /api/wallet/charge` | ✅ `transactions` 表 | ✅ `processCharge` | ❌ | ✅ 完整 |
| 首充翻倍 | ✅ 标注显示 | ✅ 首次自动翻倍 | ✅ `is_first_charge` 字段 | ✅ `FIRST_CHARGE_BONUS_MULTIPLIER` | ❌ | ✅ 完整 |
| 送礼 4 档 | ✅ trust store | ✅ `POST /api/wallet/gift` | ✅ `transactions` 表 | ✅ `processGift` | ❌ | ✅ 完整 |
| 送礼增加信赖 | ✅ 触发升级检查 | ✅ 送礼后调用 `applyTrustEvent` | ✅ 联动更新 | ✅ `getGiftTrustGain` | ❌ | ✅ 完整 |
| 零花钱分成 | ✅ 显示零花钱 | ✅ 送礼时计算 | ✅ `pocket_money` 字段 | ✅ `getPocketMoneyRatio` | ❌ | ✅ 完整 |
| 交易记录 | ✅ `/wallet/history` | ✅ `GET /api/wallet/history` | ✅ `transactions` 表 | N/A | ❌ | ✅ 完整 |
| 消费限额 | ❌ 无前端展示 | ❌ 未在路由层应用 | N/A | ✅ `checkSpendingLimit` | ❌ | ⚠️ 引擎有逻辑但未调用 |
| 订阅卡（月卡/季卡/年卡） | ✅ store 有类型 | ❌ 无购买接口 | ✅ `subscription_tier` 字段 | ✅ `SUBSCRIPTION_CONFIGS` | ❌ | ⚠️ 数据模型有但购买流程未实现 |

---

## 4. 惊喜系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 惊喜记录列表 | ✅ `/surprises` | ✅ `GET /api/surprises` | ✅ `surprises` 表 | N/A | ❌ | ✅ 完整 |
| 阈值触发检查 | ✅ `checkTrigger()` | ✅ `POST /api/surprises/check` | ✅ 查询零花钱 | ✅ `checkThresholdTrigger` | ❌ | ✅ 完整 |
| 预算控制 | N/A | ✅ 内部计算 | N/A | ✅ `calculateBudget` | ❌ | ✅ 完整 |
| 冷却检查 | N/A | ✅ 内部计算 | N/A | ✅ `checkCooldown` | ❌ | ✅ 完整 |
| 惊喜类型选择 | ✅ 4 种类型筛选 | ✅ 按零花钱阈值 | ✅ `type` 字段 | ✅ `selectSurpriseType` | ❌ | ✅ 完整 |
| 惊喜动画 | ✅ `showAnimation` | N/A | N/A | N/A | ❌ | ✅ 完整 |
| 用户反馈 | ✅ love/ok/change | ✅ `PATCH /api/surprises/:id/status` | ✅ `feedback` 字段 | N/A | ❌ | ✅ 完整 |
| 角色惊喜消息 | N/A | ✅ 创建时生成 | ✅ `message` 字段 | ✅ `generateCharacterMessage` | ❌ | ✅ 完整 |

---

## 5. Demo 模式

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 7 天引导流程 | ✅ demo store | N/A | ✅ localStorage | ✅ `DEMO_SCHEDULE` | ❌ | ✅ 完整 |
| 每日配置 | ✅ `getDayConfig()` | N/A | N/A | ✅ `getDemoDayConfig` | ❌ | ✅ 完整 |
| Day 3 赠金币 | ✅ `checkGiftCoins()` | N/A | N/A | ✅ `shouldReceiveGiftCoins` | ❌ | ✅ 完整 |
| Day 5 Demo 惊喜 | ✅ `checkDemoSurprise()` | N/A | N/A | ✅ `shouldTriggerDemoSurprise` | ❌ | ✅ 完整 |
| 信赖 8 倍率 | ✅ demo 状态判断 | N/A | N/A | ✅ `DEMO_MULTIPLIER = 8` | ❌ | ✅ 完整 |
| 转化引导文案 | ✅ `getConversionText()` | N/A | N/A | ✅ `getConversionPrompt` | ❌ | ✅ 完整 |
| 转为正式用户 | ✅ `convert()` | N/A | ✅ 清除 localStorage | ✅ `convertToFormal` | ❌ | ✅ 完整 |
| Demo 统计数据 | ✅ `demoStats` computed | N/A | N/A | N/A | ❌ | ✅ 完整 |

---

## 6. 聊天系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 消息发送 | ✅ 主页聊天 | ✅ `POST /api/chat` | ✅ `chats` 表 | N/A | ❌ | ✅ 完整 |
| SSE 流式响应 | ✅ EventSource | ✅ `streamSSE` | N/A | N/A | ❌ | ✅ 完整 |
| OpenClaw 主通道 | ✅ 通道指示 | ✅ WebSocket JSON-RPC | N/A | N/A | ✅ | ✅ 完整 |
| OpenRouter 降级通道 | ✅ 通道指示 | ✅ fallback 管理器 | N/A | N/A | ✅ | ✅ 完整 |
| 通道状态查询 | N/A | ✅ `GET /api/chat/status` | N/A | N/A | ❌ | ✅ 完整 |
| 聊天历史 | 🔲 | ✅ CRUD via `chats` routes | ✅ `chats` 表 | N/A | ✅ | ⚠️ API 有但前端集成未验证 |
| 角色人格(SOUL.md) | N/A | ✅ 加载 `openclaw/agents/*/SOUL.md` | N/A | N/A | ❌ | ✅ 完整 |

---

## 7. 角色系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 6 预设角色模板 | ✅ 选择页面 | ✅ `GET /api/characters` | ✅ `characters` 表 | ✅ `CHARACTER_TEMPLATES` | ✅ | ✅ 完整 |
| 角色创建 | ✅ CharacterCreate.vue | ✅ POST 创建 | ✅ | ✅ `CharacterCreateForm` | ✅ | ✅ 完整 |
| 角色切换 | ✅ CharacterItem.vue | ✅ 设置 active | ✅ `is_active` 字段 | N/A | ❌ | ✅ 完整 |
| 12 种性格标签 | ✅ 展示 | ✅ 存储 | ✅ personality 数组 | ✅ `PersonalityTag` | ❌ | ✅ 完整 |
| 7 种说话风格 | ✅ 展示 | ✅ 存储 | ✅ | ✅ `SpeakingStyle` | ❌ | ✅ 完整 |
| 8 种情感状态 | ✅ Live2D 映射 | ✅ 存储 | ✅ | ✅ `EmotionState` | ❌ | ✅ 完整 |
| Live2D 渲染 | ✅ stage-ui-live2d | N/A | N/A | ✅ emotion mapping | ❌ | ✅ 完整 |
| VRM 3D 渲染 | ✅ stage-ui-three | N/A | N/A | N/A | ❌ | ✅ 完整 |
| 外观等级解锁 | ❌ 无前端展示 | ❌ 无 API | N/A | ✅ `getAppearanceForLevel` | ❌ | ⚠️ 引擎有但未集成 |

---

## 8. 钱包页面

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 余额展示 | ✅ `/wallet` | ✅ `GET /api/wallet` | ✅ `coin_balance` | N/A | ❌ | ✅ 完整 |
| 零花钱展示 | ✅ 格式化显示 | ✅ 返回 pocketMoney | ✅ `pocket_money` | N/A | ❌ | ✅ 完整 |
| 订阅标签 | ✅ 月卡/季卡/年卡 | ✅ 返回 subscriptionTier | ✅ `subscription_tier` | N/A | ❌ | ✅ 完整 |
| 充值 7 档选择 | ✅ `CHARGE_PACKAGES` | ✅ packId 映射 | ✅ | ✅ `CHARGE_PACKS` | ❌ | ✅ 完整 |
| 交易记录分页 | ✅ 无限滚动 | ✅ limit+offset | ✅ `transactions` | N/A | ❌ | ✅ 完整 |
| 最近 5 条交易 | ✅ `recentTransactions` | N/A (前端截取) | N/A | N/A | ❌ | ✅ 完整 |

---

## 9. 记忆系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 保存记忆 | ❌ 无前端 UI | ✅ `POST /api/memory/save` | ✅ `memories` 表 | N/A | ❌ | ⚠️ 仅 API |
| 搜索记忆 | ❌ 无前端 UI | ✅ `POST /api/memory/search` | ✅ 文本搜索 | N/A | ❌ | ⚠️ 仅 API |
| 最近记忆 | ❌ 无前端 UI | ✅ `GET /api/memory/recent` | ✅ 时间查询 | N/A | ❌ | ⚠️ 仅 API |
| 删除记忆 | ❌ 无前端 UI | ✅ `DELETE /api/memory/:id` | ✅ Level 2 限制 | N/A | ❌ | ⚠️ 仅 API |
| 向量语义搜索 | ❌ | ❌ | ❌ embedding 字段注释 | N/A | ❌ | ❌ 缺失 |
| 记忆过期 | N/A | ⚠️ expiresAt 字段存在 | ✅ `expires_at` | N/A | ❌ | ⚠️ 字段有但未实现清理 |
| Agent 记忆调用 | N/A | ✅ Skills `/memory/search` + `/memory/save` | ✅ | N/A | ❌ | ✅ 完整 |

---

## 10. TTS 语音

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 文本转语音 | ❌ 无前端 UI | ✅ `POST /api/tts/synthesize` | N/A | N/A | ❌ | ⚠️ 仅 API |
| Lv.7+ 门控 | N/A | ✅ trustLevel >= 7 检查 | ✅ 查询 trust_records | N/A | ❌ | ✅ 完整 |
| 6 角色音色配置 | N/A | ✅ `VOICE_CONFIGS` | N/A | N/A | ❌ | ✅ 完整 |
| 音色列表查询 | ❌ 无前端 UI | ✅ `GET /api/tts/voices` | N/A | N/A | ❌ | ⚠️ 仅 API |
| CosyVoice 实际合成 | ❌ | ⚠️ API 框架完成 | N/A | N/A | ❌ | ⚠️ 需配置 API Key |
| Mock 模式 | N/A | ✅ 无 Key 时返回空音频 | N/A | N/A | ❌ | ✅ 完整 |

---

## 11. 多渠道

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 渠道绑定 | ❌ 无前端 UI | ✅ `POST /api/channels/bind` | ✅ `channel_bindings` 表 | N/A | ❌ | ⚠️ 仅 API |
| 查询绑定 | ❌ 无前端 UI | ✅ `GET /api/channels/bindings` | ✅ | N/A | ❌ | ⚠️ 仅 API |
| 解除绑定 | ❌ 无前端 UI | ✅ `DELETE /api/channels/unbind` | ✅ | N/A | ❌ | ⚠️ 仅 API |
| 用户解析 | N/A | ✅ `POST /api/channels/resolve` | ✅ | N/A | ❌ | ✅ 完整 |
| 飞书适配器 | ❌ | ❌ | N/A | N/A | ❌ | ❌ 缺失 |
| Telegram 适配器 | ❌ | ❌ 原有 AIRI 集成独立 | N/A | N/A | ❌ | ❌ 缺失 |
| 支持渠道类型 | N/A | ✅ feishu/telegram/wechat/web | ✅ `channel` text 字段 | N/A | ❌ | ⚠️ Schema 支持但适配器未实现 |

---

## 12. 桌面端 (Electron)

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| Electron 壳 | ✅ stage-tamagotchi | N/A | N/A | N/A | ❌ | ✅ 完整 |
| main/preload/renderer 三层 | ✅ | N/A | N/A | N/A | ❌ | ✅ 完整 |
| 系统托盘 | 🔲 | N/A | N/A | N/A | ❌ | 🔲 未验证 |
| 自动更新 | 🔲 | N/A | N/A | N/A | ❌ | 🔲 未验证 |
| 窗口管理 | 🔲 | N/A | N/A | N/A | ❌ | 🔲 未验证 |
| electron-vueuse 集成 | ✅ | N/A | N/A | N/A | ❌ | ✅ 完整 |
| electron-eventa 事件 | ✅ | N/A | N/A | N/A | ❌ | ✅ 完整 |

---

## 13. PWA

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| Service Worker 注册 | ✅ pwa store | N/A | N/A | N/A | ❌ | ✅ 完整 |
| 离线缓存 | ✅ Workbox 配置 | N/A | N/A | N/A | ❌ | ✅ 完整 |
| PWA 安装提示 | ✅ manifest.json | N/A | N/A | N/A | ❌ | ✅ 完整 |
| 更新通知 | ✅ `ToasterPWAUpdateReady` | N/A | N/A | N/A | ❌ | ✅ 完整 |
| 推送通知 | ❌ | ❌ | ❌ | N/A | ❌ | ❌ 缺失 |

---

## 14. 支付系统

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 创建订单 | ❌ 无前端 UI | ✅ `POST /api/payment/create-order` | ✅ `payment_orders` 表 | N/A | ❌ | ⚠️ 仅 API |
| 微信回调 | N/A | ✅ `POST /api/payment/callback/wechat` | ✅ 状态更新 | N/A | ❌ | ⚠️ 签名验证为占位 |
| 支付宝回调 | N/A | ✅ `POST /api/payment/callback/alipay` | ✅ 状态更新 | N/A | ❌ | ⚠️ 签名验证为占位 |
| 查询订单 | ❌ 无前端 UI | ✅ `GET /api/payment/order/:id` | ✅ | N/A | ❌ | ⚠️ 仅 API |
| Mock 支付 | ❌ 无前端 UI | ✅ `POST /api/payment/mock-pay/:id` | ✅ 自动到账 | N/A | ❌ | ⚠️ 仅 API |
| 订单过期处理 | N/A | ⚠️ `expire_at` 字段存在 | ✅ | N/A | ❌ | ⚠️ 无定时清理 |

---

## 15. O2O 惊喜

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| 智能选品推荐 | ❌ | ✅ `POST /api/skills/o2o/recommend` | N/A | ✅ 预算+偏好 | ❌ | ⚠️ 仅 API |
| 搜索链接生成 | ❌ | ✅ `POST /api/skills/o2o/generate-link` | N/A | ✅ 美团/饿了么 | ❌ | ⚠️ 仅 API |
| O2O 惊喜推送 | ❌ | ✅ `POST /api/skills/o2o/send-surprise` | N/A | ✅ WS push | ❌ | ⚠️ 仅 API |

---

## 16. 主动消息

| 功能 | 前端UI | 后端API | 数据库 | 引擎逻辑 | 集成测试 | 状态 |
|------|--------|---------|--------|---------|---------|------|
| Agent 推送消息 | ⚠️ WS 接收 | ✅ `POST /api/skills/proactive/send` | N/A | N/A | ❌ | ⚠️ 部分 |
| 在线状态查询 | N/A | ✅ `GET /api/skills/proactive/status` | N/A | N/A | ❌ | ✅ 完整 |
| 消息类型分类 | N/A | ✅ greeting/reminder/surprise/system | N/A | N/A | ❌ | ✅ 完整 |

---

## 统计汇总

| 类别 | ✅ 完整 | ⚠️ 部分 | ❌ 缺失 | 🔲 未验证 |
|------|--------|---------|--------|---------|
| 用户认证 | 4 | 2 | 0 | 0 |
| 信赖系统 | 6 | 3 | 0 | 0 |
| 经济系统 | 7 | 2 | 0 | 0 |
| 惊喜系统 | 8 | 0 | 0 | 0 |
| Demo 模式 | 8 | 0 | 0 | 0 |
| 聊天系统 | 5 | 1 | 0 | 1 |
| 角色系统 | 8 | 1 | 0 | 0 |
| 钱包页面 | 6 | 0 | 0 | 0 |
| 记忆系统 | 2 | 4 | 1 | 0 |
| TTS 语音 | 3 | 3 | 0 | 0 |
| 多渠道 | 1 | 3 | 2 | 0 |
| 桌面端 | 3 | 0 | 0 | 3 |
| PWA | 4 | 0 | 1 | 0 |
| 支付系统 | 0 | 5 | 0 | 0 |
| O2O 惊喜 | 0 | 3 | 0 | 0 |
| 主动消息 | 1 | 1 | 0 | 0 |
| **合计** | **66** | **28** | **4** | **4** |
