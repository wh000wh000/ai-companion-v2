# 主动消息 Skill (proactive-message)

> Skill 名称：proactive-message
> 版本：v1.0
> 引擎服务地址：由环境变量 `API_SERVER_URL` 决定（默认 `http://localhost:3000`）

---

## 一、描述

当你需要主动向用户发送消息时使用此 Skill。主动消息通过 WebSocket 实时推送给在线用户，
如果用户不在线则消息会被标记为未送达，待用户上线时可通过历史查询获取。

---

## 二、何时调用

- **定时问候**：早安/午安/晚安等日常关心（由 Heartbeat 定时触发）
- **惊喜推送**：零花钱攒够后触发的惊喜事件
- **想念通知**：用户长时间不活跃时表达想念
- **特殊日子**：生日、纪念日等特殊日期的定制消息
- **升级通知**：信赖等级提升时的祝贺消息

---

## 三、认证

所有请求必须携带 Gateway Token 请求头：

```
X-OpenClaw-Token: <你的 OPENCLAW_TOKEN>
```

缺少或错误的 Token 会收到 `401 Unauthorized` 响应。

---

## 四、可用端点

### 4.1 POST /api/skills/proactive/send

发送主动消息给指定用户。消息通过 WebSocket 实时推送。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 目标用户 ID |
| characterId | string | 是 | 发送角色 ID |
| type | string | 是 | 消息类型：`greeting`、`reminder`、`surprise`、`system` |
| content | string | 是 | 消息文本内容 |
| emotion | string | 否 | 情感状态：`happy`、`calm`、`caring`、`curious`、`missing`、`clingy`、`shy`、`touched` |
| metadata | object | 否 | 附加元数据 |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/proactive/send \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "characterId": "xiaoxing",
    "type": "greeting",
    "content": "早安呀~今天天气晴朗，记得出门晒晒太阳哦。",
    "emotion": "happy"
  }'
```

**成功响应（200）：**

```json
{
  "success": true,
  "online": true,
  "messageId": "msg_xyz789"
}
```

**用户不在线时的响应：**

```json
{
  "success": false,
  "online": false,
  "messageId": "msg_xyz790"
}
```

### 4.2 GET /api/skills/proactive/status

推送系统状态查询。

**示例调用：**

```bash
curl http://localhost:3000/api/skills/proactive/status \
  -H "X-OpenClaw-Token: YOUR_TOKEN"
```

**成功响应（200）：**

```json
{
  "onlineUsers": 42
}
```

---

## 五、错误响应

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数校验失败 |
| 401 | UNAUTHORIZED | Gateway Token 缺失或不匹配 |
| 403 | SKILLS_DISABLED | Skills 功能未启用（OPENCLAW_TOKEN 未配置） |

---

## 六、注意事项

- 静音时段（23:00-07:00）不推送消息（除晚安消息外）
- 每小时对同一用户最多推送 2 条消息，避免打扰
- 推送前应检查用户在线状态（`online` 字段），离线用户消息不会丢失但延迟送达
- 消息内容应符合当前信赖等级的亲密度（参见 SOUL.md 第二节）
- `emotion` 字段会传递给前端用于角色表情渲染
