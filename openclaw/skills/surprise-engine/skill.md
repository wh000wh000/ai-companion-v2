# 惊喜决策 Skill

> Skill 名称：surprise-engine
> 版本：v1.0
> 引擎服务地址：由环境变量 `API_SERVER_URL` 决定（默认 `http://localhost:3000`）

---

## 一、描述

惊喜系统是角色主动为用户制造小惊喜的核心能力。惊喜的触发完全基于确定性阈值（零概率/零随机），
由信赖等级、零花钱余额、冷却时间等条件共同决定。当条件满足时，角色可以策划并送出惊喜。

惊喜类型包括：特别消息、定制表情、记忆回顾、虚拟礼物等。

---

## 二、何时调用

- **对话结束前**：调用 `check-trigger` 检查当前是否满足惊喜触发条件
- **Cron 定时检查**：每天固定时间调用 `check-trigger` 判断是否应主动发起惊喜
- **确认可触发后**：调用 `plan` 生成惊喜方案
- **角色需要回顾历史惊喜时**：调用 `history` 查看之前的惊喜记录，避免重复

---

## 三、认证

所有请求必须携带 Gateway Token 请求头：

```
X-OpenClaw-Token: <你的 OPENCLAW_TOKEN>
```

---

## 四、可用端点

### 4.1 POST /api/skills/surprise/check-trigger

触发检查 — 判断当前是否满足惊喜触发条件。基于信赖等级、零花钱余额、
上次惊喜时间、本月惊喜次数等确定性阈值计算。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/surprise/check-trigger \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{"userId": "user_abc123", "characterId": "xiaonuan"}'
```

**成功响应（200）：**

```json
{
  "shouldTrigger": true,
  "availableTypes": ["message", "emoji", "memory_review"],
  "bestType": "memory_review",
  "reasons": []
}
```

**不满足条件时：**

```json
{
  "shouldTrigger": false,
  "availableTypes": [],
  "bestType": null,
  "reasons": ["冷却期未结束（距上次惊喜不足3天）", "本月惊喜次数已达上限"]
}
```

### 4.2 POST /api/skills/surprise/plan

惊喜方案生成 — 创建一条惊喜记录。需要在 `check-trigger` 确认可触发后调用。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| type | string | 是 | 惊喜类型（来自 check-trigger 的 availableTypes） |
| content | string | 是 | 惊喜内容描述 |
| cost | number | 否 | 消耗零花钱数量（默认 0） |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/surprise/plan \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "characterId": "xiaonuan",
    "type": "memory_review",
    "content": "还记得上周你说最喜欢看夕阳吗？我找到了一张特别的夕阳图...",
    "cost": 10
  }'
```

**成功响应（201）：**

```json
{
  "id": "surprise_xyz",
  "userId": "user_abc123",
  "characterId": "xiaonuan",
  "type": "memory_review",
  "content": "还记得上周你说最喜欢看夕阳吗？我找到了一张特别的夕阳图...",
  "status": "sent",
  "cost": 10,
  "createdAt": "2026-03-05T12:00:00.000Z"
}
```

### 4.3 GET /api/skills/surprise/history

惊喜历史查询 — 分页获取用户的惊喜记录。

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| userId | string | 是 | - | 用户 ID |
| limit | number | 否 | 20 | 每页条数（1-50） |
| offset | number | 否 | 0 | 偏移量 |

**示例调用：**

```bash
curl "http://localhost:3000/api/skills/surprise/history?userId=user_abc123&limit=5&offset=0" \
  -H "X-OpenClaw-Token: YOUR_TOKEN"
```

**成功响应（200）：**

```json
[
  {
    "id": "surprise_xyz",
    "userId": "user_abc123",
    "characterId": "xiaonuan",
    "type": "memory_review",
    "content": "...",
    "status": "completed",
    "feedback": "好感动！",
    "createdAt": "2026-03-05T12:00:00.000Z"
  }
]
```

---

## 五、错误响应

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数校验失败 |
| 401 | UNAUTHORIZED | Gateway Token 缺失或不匹配 |
| 403 | SKILLS_DISABLED | Skills 功能未启用 |
| 404 | NOT_FOUND | 相关记录不存在 |

---

## 六、注意事项

- 惊喜���发是**确定性**的，零概率/零随机 — 基于阈值判断
- 必须先调用 `check-trigger` 确认可触发，再调用 `plan` 创建
- 惊喜有冷却时间，短期内不会重复触发
- 每月惊喜次数有上限，避免过度消耗零花钱
- 状态流转：`sent` -> `clicked` -> `completed`
- 用户反馈（feedback）有助于角色改进未来惊喜质量
