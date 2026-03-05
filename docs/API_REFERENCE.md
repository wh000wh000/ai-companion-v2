# 伪春菜 v3.0 — API 参考文档

> 版本：v3.0 Final
> 日期：2026-03-05
> 基础路径：`/api`
> 框架：Hono (TypeScript)
> 输入校验：Valibot
> 认证：better-auth Session / Gateway Token

---

## 目录

1. [认证说明](#一认证说明)
2. [钱包 API (Wallet)](#二钱包-api-wallet)
3. [信赖 API (Trust)](#三信赖-api-trust)
4. [惊喜 API (Surprises)](#四惊喜-api-surprises)
5. [角色 API (Characters)](#五角色-api-characters)
6. [聊天 API (Chat)](#六聊天-api-chat)
7. [聊天记录 API (Chats)](#七聊天记录-api-chats)
8. [支付 API (Payment)](#八支付-api-payment)
9. [TTS 语音 API](#九tts-语音-api)
10. [Provider 配置 API](#十provider-配置-api)
11. [Skills API (Agent)](#十一skills-api-agent)
12. [记忆 API (Memory)](#十二记忆-api-memory)
13. [主动消息 API (Proactive)](#十三主动消息-api-proactive)
14. [O2O API](#十四o2o-api)
15. [限频说明](#十五限频说明)

---

## 一、认证说明

### 用户认证 (authGuard)

通过 better-auth 管理的 Session Cookie 认证。适用于所有用户端 API。

```
Cookie: better-auth.session_token=<session-token>
```

或通过 Authorization Header：

```
Authorization: Bearer <session-token>
```

### Agent 认证 (Gateway Token)

通过 `X-OpenClaw-Token` 请求头认证。适用于 Skills/Memory/Proactive/O2O API。

```
X-OpenClaw-Token: <openclaw-gateway-token>
```

### 认证失败响应

```json
// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Unauthorized"
}

// 403 Forbidden
{
  "error": "FORBIDDEN",
  "message": "Skills disabled: OPENCLAW_TOKEN not configured"
}
```

---

## 二、钱包 API (Wallet)

**路由前缀：** `/api/wallet`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/wallet.ts`

### GET /api/wallet

查询当前用户钱包余额。

**限频：** 60 次/分钟 (queryRateLimiter)

**响应示例：**

```json
{
  "id": "wallet_abc123",
  "userId": "user_xyz",
  "coinBalance": 860,
  "pocketMoney": 34.0,
  "totalCharged": 6800,
  "totalSpent": 50,
  "subscriptionTier": "none",
  "isFirstCharge": false,
  "createdAt": "2026-03-05T08:00:00.000Z",
  "updatedAt": "2026-03-05T10:30:00.000Z"
}
```

---

### POST /api/wallet/charge

充值爱心币。

**限频：** 5 次/分钟 (chargeRateLimiter)

**请求体：**

```json
{
  "packId": "pack_68",
  "idempotencyKey": "charge_20260305_001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| packId | string | 是 | 充值套餐 ID：`pack_1` / `pack_6` / `pack_30` / `pack_68` / `pack_128` / `pack_328` / `pack_648` |
| idempotencyKey | string(1-64) | 是 | 幂等键，防止重复充值 |

**响应（201 Created / 200 OK 重复请求）：**

```json
{
  "coinBalance": 1540,
  "charged": 1360,
  "bonus": 180,
  "firstCharge": true,
  "duplicate": false
}
```

---

### POST /api/wallet/gift

向角色送礼。

**限频：** 10 次/分钟 (giftRateLimiter)

**请求体：**

```json
{
  "characterId": "char_xiaoxing",
  "giftTier": "warm",
  "idempotencyKey": "gift_20260305_001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| characterId | string | 是 | 目标角色 ID |
| giftTier | string | 是 | 礼物档位：`small`(10币+8信赖) / `warm`(50币+45信赖) / `love`(200币+200信赖) / `forever`(520币+550信赖) |
| idempotencyKey | string(1-64) | 是 | 幂等键 |

**响应（201 Created / 200 OK 重复请求）：**

```json
{
  "giftResult": {
    "cost": 50,
    "trustGain": 45,
    "pocketMoneyGain": 20.0
  },
  "newBalance": 810,
  "duplicate": false
}
```

**错误（400）：**

```json
{
  "error": "GIFT_FAILED",
  "message": "Insufficient balance"
}
```

---

### GET /api/wallet/history

查询交易记录。

**限频：** 60 次/分钟 (queryRateLimiter)

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number | 20 | 每页条数（1-50） |
| offset | number | 0 | 偏移量 |

**响应示例：**

```json
{
  "transactions": [
    {
      "id": "tx_001",
      "type": "charge",
      "amount": 1360,
      "description": "充值 真心以待",
      "createdAt": "2026-03-05T10:00:00.000Z"
    },
    {
      "id": "tx_002",
      "type": "gift",
      "amount": -50,
      "description": "送礼 暖暖的",
      "createdAt": "2026-03-05T10:30:00.000Z"
    }
  ],
  "total": 2
}
```

---

## 三、信赖 API (Trust)

**路由前缀：** `/api/trust`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/trust.ts`

### GET /api/trust/:characterId

查询与指定角色的信赖状态。

**限频：** 60 次/分钟 (queryRateLimiter)

**路径参数：**

| 参数 | 说明 |
|------|------|
| characterId | 角色 ID |

**响应示例：**

```json
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "trustPoints": 380,
  "trustLevel": 3,
  "levelName": "熟悉",
  "consecutiveDays": 5,
  "lastCheckinDate": "2026-03-05",
  "lastInteractionAt": "2026-03-05T10:30:00.000Z",
  "createdAt": "2026-03-01T08:00:00.000Z"
}
```

---

### POST /api/trust/checkin

每日签到（+5 信赖值 + 连续签到加成）。

**限频：** 5 次/分钟 (chargeRateLimiter)

**请求体：**

```json
{
  "characterId": "char_xiaoxing"
}
```

**响应（201 Created）：**

```json
{
  "success": true,
  "trustGain": 5,
  "consecutiveBonus": 3,
  "totalGain": 8,
  "consecutiveDays": 3,
  "newTrustPoints": 388,
  "alreadyCheckedIn": false
}
```

---

### POST /api/trust/update

手动更新信赖值（管理接口）。

**限频：** 5 次/分钟 (chargeRateLimiter)

**请求体：**

```json
{
  "characterId": "char_xiaoxing",
  "event": "deep_chat",
  "value": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| characterId | string | 是 | 角色 ID |
| event | string | 是 | 事件类型：`chat` / `deep_chat` / `share_mood` / `daily_task` / `gift` / `checkin` |
| value | number | 否 | 自定义增量（默认按事件类型自动计算） |

**响应：**

```json
{
  "newTrustPoints": 398,
  "trustLevel": 3,
  "levelChanged": false
}
```

---

## 四、惊喜 API (Surprises)

**路由前缀：** `/api/surprises`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/surprises.ts`

### GET /api/surprises

查询惊喜记录。

**限频：** 60 次/分钟 (queryRateLimiter)

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number | 20 | 每页条数（1-50） |
| offset | number | 0 | 偏移量 |

**响应示例：**

```json
{
  "surprises": [
    {
      "id": "surprise_001",
      "type": "virtual",
      "message": "送你一个可爱的桌面壁纸~",
      "amount": 0,
      "status": "sent",
      "createdAt": "2026-03-05T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### POST /api/surprises/check

触发惊喜条件检查（确定性阈值，零概率）。

**限频：** 5 次/分钟 (chargeRateLimiter)

**请求体：**

```json
{
  "characterId": "char_xiaoxing"
}
```

**响应：**

```json
{
  "canTrigger": true,
  "type": "electronic",
  "reason": "零花钱 >= 15元 且信赖 Lv.6+",
  "budget": { "min": 5, "max": 15 },
  "cooldownRemaining": 0
}
```

或不满足条件时：

```json
{
  "canTrigger": false,
  "reason": "冷却期内（剩余 3 天）",
  "cooldownRemaining": 3
}
```

---

### PATCH /api/surprises/:id/status

更新惊喜状态。

**限频：** 5 次/分钟 (chargeRateLimiter)

**路径参数：**

| 参数 | 说明 |
|------|------|
| id | 惊喜记录 ID |

**请求体：**

```json
{
  "status": "completed",
  "feedback": "太喜欢了，谢谢小星！"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 是 | `sent` / `clicked` / `completed` |
| feedback | string(0-500) | 否 | 用户反馈 |

---

## 五、角色 API (Characters)

**路由前缀：** `/api/characters`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/characters.ts`

### GET /api/characters

查询角色列表。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| all | boolean | `true` = 查询全部角色；默认仅查询当前用户的角色 |

### GET /api/characters/:id

查询单个角色详情。

### POST /api/characters

创建新角色。

### PATCH /api/characters/:id

更新角色信息（仅角色所有者）。

### DELETE /api/characters/:id

删除角色（仅角色所有者）。返回 204 No Content。

### POST /api/characters/:id/like

为角色点赞。

### POST /api/characters/:id/bookmark

收藏角色。

---

## 六、聊天 API (Chat)

**路由前缀：** `/api/chat`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/chat.ts`

### POST /api/chat

发送消息，接收 SSE 流式回复。

**双通道架构：**
1. **主通道 (OpenClaw)：** WebSocket JSON-RPC → token 级流式
2. **降级通道 (Fallback)：** 直连 LLM → SSE 流式

**请求体：**

```json
{
  "agentId": "agent_xiaoxing",
  "message": "你好小星，今天天气真好！",
  "characterId": "char_xiaoxing"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | OpenClaw Agent ID |
| message | string | 是 | 用户消息 |
| characterId | string | 否 | 角色 ID（降级时用于上下文） |

**SSE 响应流：**

```
event: channel
data: {"channel":"openclaw"}

event: token
data: {"token":"你"}

event: token
data: {"token":"好"}

event: token
data: {"token":"呀"}

event: done
data: {"channel":"openclaw"}
```

**错误事件：**

```
event: error
data: {"error":"Connection failed","channel":"openclaw","canRetry":true}
```

---

### GET /api/chat/status

查询聊天通道连接状态。

**响应示例：**

```json
{
  "channel": "openclaw",
  "openclaw": {
    "connected": true,
    "shouldFallback": false
  },
  "fallbackManager": {
    "mode": "openclaw"
  },
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

---

## 七、聊天记录 API (Chats)

**路由前缀：** `/api/chats`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/chats.ts`

### POST /api/chats/sync

同步聊天记录。

**请求体：** 遵循 `ChatSyncSchema` 校验。

---

## 八、支付 API (Payment)

**路由前缀：** `/api/payment`
**认证方式：** 混合（见各端点说明）
**源文件：** `apps/server/src/routes/payment.ts`

### POST /api/payment/create-order

创建支付订单。

**认证：** authGuard

**请求体：**

```json
{
  "packId": "pack_68",
  "provider": "mock",
  "idempotencyKey": "order_20260305_001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| packId | string | 是 | 充值套餐 ID |
| provider | string | 否 | 支付渠道：`mock`(默认) / `wechat` / `alipay` |
| idempotencyKey | string | 否 | 幂等键 |

**响应：**

```json
{
  "order": {
    "orderId": "order_abc123",
    "userId": "user_xyz",
    "packId": "pack_68",
    "amount": 6800,
    "provider": "mock",
    "status": "created",
    "paymentParams": { "payUrl": "..." },
    "expireAt": "2026-03-05T12:30:00.000Z"
  },
  "duplicate": false
}
```

---

### POST /api/payment/callback/wechat

微信支付回调（无需用户认证，通过签名验证）。

**请求头：**

```
Wechatpay-Signature: <signature>
Content-Type: application/json
```

**响应：**

```json
{ "code": "SUCCESS" }
```

---

### POST /api/payment/callback/alipay

支付宝回调（无需用户认证，通过签名验证）。

**请求头：**

```
sign: <signature>
```

**响应：** `success` 或 `fail`（纯文本）

---

### GET /api/payment/order/:id

查询订单状态。

**认证：** authGuard

**响应：**

```json
{
  "order": {
    "orderId": "order_abc123",
    "status": "paid",
    "paidAt": "2026-03-05T12:05:00.000Z"
  }
}
```

---

### POST /api/payment/mock-pay/:id

Mock 完成支付（仅开发环境）。

**认证：** authGuard

**响应：**

```json
{
  "order": { "orderId": "order_abc123", "status": "paid" },
  "charged": true
}
```

---

## 九、TTS 语音 API

**路由前缀：** `/api/tts`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/tts.ts`

### POST /api/tts/synthesize

文本转语音合成。**需要信赖等级 Lv.7+。**

**请求体：**

```json
{
  "text": "你好呀，今天心情怎么样？",
  "characterId": "char_xiaoxing",
  "characterTemplate": "mystic_spirit"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | 是 | 要合成的文本 |
| characterId | string | 是 | 角色 ID（用于信赖等级校验） |
| characterTemplate | string | 是 | 角色模板 ID（决定音色） |

**响应：**

```json
{
  "audio": "<base64-encoded-audio>",
  "format": "mp3",
  "duration": 2.5,
  "mockMode": false
}
```

**错误（403 信赖等级不足）：**

```json
{
  "error": "FORBIDDEN",
  "message": "Voice messages require Trust Level 7+"
}
```

---

### GET /api/tts/voices

获取可用音色列表（无信赖等级限制）。

**响应：**

```json
{
  "voices": [
    { "id": "longxiaochun", "name": "温柔女声", "template": "gentle_healer" },
    { "id": "longxiaoxia", "name": "活泼女声", "template": "cheerful_girl" },
    { "id": "longlaotie", "name": "知性女声", "template": "elegant_scholar" },
    { "id": "longshu", "name": "冷酷女声", "template": "cool_tsundere" },
    { "id": "longmiao", "name": "灵动女声", "template": "mystic_spirit" },
    { "id": "longfei", "name": "阳光男声", "template": "sunny_boy" }
  ],
  "mockMode": true
}
```

---

## 十、Provider 配置 API

**路由前缀：** `/api/providers`
**认证方式：** authGuard（全局）
**源文件：** `apps/server/src/routes/providers.ts`

### GET /api/providers

查询当前用户的 LLM Provider 配置列表。

### GET /api/providers/:id

查询单个 Provider 配置详情。

### POST /api/providers

创建新的 Provider 配置。

### PATCH /api/providers/:id

更新 Provider 配置（仅所有者）。

### DELETE /api/providers/:id

删除 Provider 配置（仅所有者）。返回 204 No Content。

---

## 十一、Skills API (Agent)

**路由前缀：** `/api/skills`
**认证方式：** Gateway Token (`X-OpenClaw-Token`)
**源文件：** `apps/server/src/routes/skills.ts`

> 此 API 仅供 OpenClaw Agent 通过 curl 调用。所有端点需要 Gateway Token。

### 信赖引擎

#### POST /api/skills/trust/calculate-daily

Agent 触发每日信赖签到。

```json
// 请求
{ "userId": "user_xyz", "characterId": "char_xiaoxing" }

// 响应 (201)
{ "success": true, "trustGain": 5, "consecutiveBonus": 0 }
```

#### POST /api/skills/trust/check-decay

检查并应用信赖衰减。

```json
// 请求
{ "userId": "user_xyz", "characterId": "char_xiaoxing" }

// 响应
{ "decayed": true, "amount": -3, "newTrustPoints": 377 }
```

#### GET /api/skills/trust/level-info

查询用户信赖等级信息。

```
GET /api/skills/trust/level-info?userId=user_xyz&characterId=char_xiaoxing
```

### 经济引擎

#### POST /api/skills/economy/process-gift

Agent 代用户处理送礼。

```json
// 请求
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "giftTier": "warm",
  "idempotencyKey": "agent_gift_001"
}

// 响应 (201)
{
  "giftResult": { "cost": 50, "trustGain": 45 },
  "duplicate": false
}
```

#### GET /api/skills/economy/balance

查询用户余额。

```
GET /api/skills/economy/balance?userId=user_xyz
```

#### GET /api/skills/economy/pocket-money

查询角色零花钱。

```
GET /api/skills/economy/pocket-money?userId=user_xyz
```

### 惊喜引擎

#### POST /api/skills/surprise/check-trigger

Agent 检查惊喜触发条件。

```json
// 请求
{ "userId": "user_xyz", "characterId": "char_xiaoxing" }

// 响应
{ "canTrigger": true, "type": "electronic" }
```

#### POST /api/skills/surprise/plan

Agent 创建惊喜方案。

```json
// 请求
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "type": "electronic",
  "content": "给你准备了一套可爱的表情包~",
  "cost": 10
}

// 响应 (201)
{ "id": "surprise_002", "status": "sent" }
```

#### GET /api/skills/surprise/history

查询用户惊喜历史。

```
GET /api/skills/surprise/history?userId=user_xyz&limit=10
```

### 记忆引擎

#### POST /api/skills/memory/search

语义搜索用户记忆。

```json
// 请求
{
  "userId": "user_xyz",
  "query": "用户喜欢什么颜色",
  "limit": 5
}

// 响应
{ "results": [...], "total": 3 }
```

#### POST /api/skills/memory/save

保存新记忆。

```json
// 请求
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "type": "preference",
  "content": "用户喜欢蓝色",
  "importance": 7
}

// 响应 (201)
{ "id": "mem_001", "saved": true }
```

---

## 十二、记忆 API (Memory)

**路由前缀：** `/api/memory`
**认证方式：** Gateway Token (`X-OpenClaw-Token`)
**源文件：** `apps/server/src/routes/memory.ts`

### POST /api/memory/save

保存记忆条目。

```json
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "content": "用户提到明天是她的生日",
  "type": "event",
  "importance": 9,
  "level": 1,
  "tags": ["birthday", "important_date"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| content | string | 是 | 记忆内容 |
| type | string | 是 | 类型：`event` / `preference` / `emotion` / `fact` |
| importance | number(1-10) | 否 | 重要性（默认 3） |
| level | number | 否 | 记忆层级：1=永久 / 2=可过期(7天) |
| tags | string[] | 否 | 标签列表 |

### POST /api/memory/search

语义搜索记忆。

```json
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "query": "生日",
  "limit": 5,
  "level": 1
}
```

### GET /api/memory/recent

获取最近记忆。

```
GET /api/memory/recent?userId=user_xyz&characterId=char_xiaoxing&days=7
```

### DELETE /api/memory/:id

删除记忆（仅 Level 2 可过期记忆可删除）。

---

## 十三、主动消息 API (Proactive)

**路由前缀：** `/api/proactive`
**认证方式：** Gateway Token (`X-OpenClaw-Token`)
**源文件：** `apps/server/src/routes/proactive.ts`

### POST /api/proactive/send

Agent 推送主动消息给用户（通过 WebSocket）。

```json
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "type": "greeting",
  "content": "早上好呀！新的一天开始了，今天有什么打算吗？",
  "emotion": "happy"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 目标用户 ID |
| characterId | string | 是 | 角色 ID |
| type | string | 是 | 消息类型：`greeting` / `reminder` / `surprise` / `system` |
| content | string | 是 | 消息内容 |
| emotion | string | 否 | 情感状态：`happy` / `calm` / `caring` / `curious` / `missing` / `clingy` / `shy` / `touched` |

**响应：**

```json
{
  "success": true,
  "online": true
}
```

### GET /api/proactive/status

查询推送系统状态。

```json
{
  "onlineUsers": 42
}
```

---

## 十四、O2O API

**路由前缀：** `/api/o2o`
**认证方式：** Gateway Token (`X-OpenClaw-Token`)
**源文件：** `apps/server/src/routes/o2o.ts`

### POST /api/o2o/recommend

根据预算和偏好推荐商品。

```json
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "budget": 30,
  "preferences": ["甜食", "饮品", "水果"],
  "location": "上海浦东"
}
```

**响应：**

```json
{
  "recommendations": [
    {
      "name": "草莓蛋糕",
      "category": "甜食",
      "priceRange": "15-25元",
      "matchScore": 0.92
    }
  ]
}
```

### POST /api/o2o/generate-link

生成外卖平台搜索链接。

```json
{
  "productName": "草莓蛋糕",
  "platform": "meituan",
  "location": "上海浦东"
}
```

**响应：**

```json
{
  "url": "https://waimai.meituan.com/search?q=草莓蛋糕&location=上海浦东",
  "platform": "meituan",
  "productName": "草莓蛋糕"
}
```

### POST /api/o2o/send-surprise

将 O2O 惊喜推送给用户（通过 WebSocket）。

```json
{
  "userId": "user_xyz",
  "characterId": "char_xiaoxing",
  "productName": "草莓蛋糕",
  "message": "嘿嘿，我用零花钱给你买了个小蛋糕~",
  "searchUrl": "https://waimai.meituan.com/search?q=草莓蛋糕",
  "emotion": "happy"
}
```

**响应：**

```json
{
  "success": true,
  "productName": "草莓蛋糕",
  "searchUrl": "https://waimai.meituan.com/search?q=草莓蛋糕"
}
```

---

## 十五、限频说明

### 限频器配置

| 名称 | 窗口 | 最大请求数 | 适用端点 |
|------|------|-----------|---------|
| chargeRateLimiter | 60s | 5 | 充值、签到、信赖更新、惊喜检查/更新 |
| giftRateLimiter | 60s | 10 | 送礼 |
| queryRateLimiter | 60s | 60 | 钱包查询、交易记录、信赖查询、惊喜列表 |

### 限频响应

```json
// 429 Too Many Requests
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "retryAfter": 45
}
```

`retryAfter` 字段表示需要等待的秒数。

### 通用错误格式

```json
// 400 Bad Request
{
  "error": "INVALID_REQUEST",
  "message": "Invalid Request",
  "issues": [...]
}

// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Unauthorized"
}

// 403 Forbidden
{
  "error": "FORBIDDEN",
  "message": "..."
}

// 404 Not Found
{
  "error": "NOT_FOUND",
  "message": "Not Found"
}
```
