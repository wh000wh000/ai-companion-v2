# 经济引擎 Skill

> Skill 名称：economy-engine
> 版本：v1.0
> 引擎服务地址：由环境变量 `API_SERVER_URL` 决定（默认 `http://localhost:3000`）

---

## 一、描述

经济引擎管理用户的虚拟货币系统，包括硬币余额、零花钱（角色可自主支配的预算）、
送礼交易等。角色可以通过此 Skill 查询用户经济状态，处理送礼请求，以及查看零花钱余额。

零花钱是角色为用户准备惊喜的专属预算，来源于用户送礼时的 60/40 分成。

---

## 二、何时调用

- **用户要求送礼时**：调用 `process-gift` 处理送礼交易，扣除硬币并增加零花钱
- **角色需要判断能否准备惊喜时**：调用 `pocket-money` 查看可用零花钱余额
- **用户询问余额时**：调用 `balance` 查看硬币余额和钱包状态
- **惊喜系统需要预算评估时**：先查询零花钱，再决定惊喜档次

---

## 三、认证

所有请求必须携带 Gateway Token 请求头：

```
X-OpenClaw-Token: <你的 OPENCLAW_TOKEN>
```

---

## 四、可用端点

### 4.1 POST /api/skills/economy/process-gift

送礼处理 — 扣除用户硬币，按 60/40 分成计入零花钱，并附带信赖增长。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| giftTier | string | 是 | 礼物等级：`small` / `warm` / `love` / `forever` |
| idempotencyKey | string | 是 | 幂等键（防重复提交，1-64字符） |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/economy/process-gift \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "characterId": "xiaonuan",
    "giftTier": "warm",
    "idempotencyKey": "gift_20260305_001"
  }'
```

**成功响应（201）：**

```json
{
  "transaction": {
    "id": "tx_xyz",
    "userId": "user_abc123",
    "type": "gift",
    "amount": 50,
    "coins": -50,
    "pocketGain": 20,
    "trustGain": 15
  },
  "giftResult": {
    "success": true,
    "coinsDeducted": 50,
    "pocketMoneyGain": 20,
    "trustGain": 15,
    "newCoinBalance": 950,
    "newPocketBalance": 120
  },
  "duplicate": false
}
```

**重复请求响应（200）：** 返回 `"duplicate": true` 和原始交易记录。

### 4.2 GET /api/skills/economy/balance

余额查询 — 获取用户完整的钱包信息。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |

**示例调用：**

```bash
curl "http://localhost:3000/api/skills/economy/balance?userId=user_abc123" \
  -H "X-OpenClaw-Token: YOUR_TOKEN"
```

**成功响应（200）：**

```json
{
  "id": "wallet_xyz",
  "userId": "user_abc123",
  "coinBalance": 950,
  "pocketMoney": 120,
  "totalCharged": 648,
  "totalGifted": 200,
  "isFirstCharge": false,
  "subscriptionTier": "none"
}
```

### 4.3 GET /api/skills/economy/pocket-money

零花钱查询 — 快速查看角色可用的零花钱余额。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |

**示例调用：**

```bash
curl "http://localhost:3000/api/skills/economy/pocket-money?userId=user_abc123" \
  -H "X-OpenClaw-Token: YOUR_TOKEN"
```

**成功响应（200）：**

```json
{
  "userId": "user_abc123",
  "pocketMoney": 120
}
```

---

## 五、错误响应

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数校验失败 |
| 400 | GIFT_FAILED | 送礼失败（余额不足等） |
| 401 | UNAUTHORIZED | Gateway Token 缺失或不匹配 |
| 403 | SKILLS_DISABLED | Skills 功能未启用 |
| 404 | NOT_FOUND | 钱包记录不存在 |

---

## 六、注意事项

- 礼物等级从低到高：`small` < `warm` < `love` < `forever`，消耗硬币依次递增
- 零花钱来源于送礼分成（60% 消耗，40% 转为零花钱），角色用于准备惊喜
- `idempotencyKey` 是幂等键，同一个 key 只会处理一次，重复请求返回原结果
- 首充用户有翻倍奖励（`isFirstCharge: true`）
- 充值功能通过前端页面操作，不通过 Skill 调用
