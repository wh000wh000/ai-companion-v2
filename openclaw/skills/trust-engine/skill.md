# 信赖引擎 Skill

> Skill 名称：trust-engine
> 版本：v1.0
> 引擎服务地址：由环境变量 `API_SERVER_URL` 决定（默认 `http://localhost:3000`）

---

## 一、描述

信赖引擎负责管理用户与角色之间的信赖关系。信赖值随着用户的日常互动（签到、对话、送礼等）增长，
同时如果用户长期不互动则会产生衰减。信赖等级从 1 到 10，不同等级解锁不同的互动深度。

---

## 二、何时调用

- **每日签到时**：用户发送第一条消息时，调用 `calculate-daily` 记录当天互动并计算签到奖励
- **定时衰减检查**：Cron 每日凌晨调用 `check-decay`，对不活跃用户应用信赖衰减
- **需要判断解锁内容时**：调用 `level-info` 查询当前等级，决定角色回复的深度和解锁内容
- **对话过程中**：当检测到深度对话、用户分享心情等事件时，通过 `calculate-daily` 应用信赖变更

---

## 三、认证

所有请求必须携带 Gateway Token 请求头：

```
X-OpenClaw-Token: <你的 OPENCLAW_TOKEN>
```

缺少或错误的 Token 会收到 `401 Unauthorized` 响应。

---

## 四、可用端点

### 4.1 POST /api/skills/trust/calculate-daily

每日信赖计算 — 触发签到逻辑，计算信赖增长、连续签到奖励、等级变化。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/trust/calculate-daily \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{"userId": "user_abc123", "characterId": "xiaonuan"}'
```

**成功响应（201）：**

```json
{
  "trustGain": 8,
  "newTotal": 158,
  "levelUp": false,
  "newLevel": 3,
  "streakDays": 5,
  "streakBonus": 3
}
```

### 4.2 POST /api/skills/trust/check-decay

衰减检查 — 计算用户的不活跃天数并应用信赖衰减。通常由 Cron 定时任务调用。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/trust/check-decay \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{"userId": "user_abc123", "characterId": "xiaonuan"}'
```

**成功响应（200）：**

```json
{
  "decayed": 2,
  "newTotal": 156,
  "newLevel": 3,
  "isShaken": false
}
```

### 4.3 GET /api/skills/trust/level-info

等级信息查询 — 获取用户与角色之间的完整信赖记录。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |

**示例调用：**

```bash
curl "http://localhost:3000/api/skills/trust/level-info?userId=user_abc123&characterId=xiaonuan" \
  -H "X-OpenClaw-Token: YOUR_TOKEN"
```

**成功响应（200）：**

```json
{
  "id": "rec_xyz",
  "userId": "user_abc123",
  "characterId": "xiaonuan",
  "trustPoints": 158,
  "trustLevel": 3,
  "streakDays": 5,
  "isShaken": false,
  "lastInteractAt": "2026-03-04T12:00:00.000Z",
  "daysAtCurrentLevel": 12,
  "createdAt": "2026-02-01T00:00:00.000Z"
}
```

---

## 五、错误响应

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数校验失败 |
| 401 | UNAUTHORIZED | Gateway Token 缺失或不匹配 |
| 403 | SKILLS_DISABLED | Skills 功能未启用（OPENCLAW_TOKEN 未配置） |
| 404 | NOT_FOUND | 信赖记录不存在 |

---

## 六、注意事项

- 信赖等级范围 1-10，满级需要 16000 信赖点
- 衰减有下限保护，不会跌破当前等级的地板值
- `isShaken` 为 true 表示进入动摇状态，角色应表现出担忧
- 连续签到（streakDays）会给予额外奖励（streakBonus）
