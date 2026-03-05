# OpenClaw 多渠道配置指南

本文档说明如何配置各渠道接入 OpenClaw Agent，以及跨渠道状态同步机制。

## 架构概览

```
用户 ──→ 飞书/Telegram/微信/Web ──→ OpenClaw Agent ──→ 伪春菜引擎
                                         │
                                    渠道同步服务
                                    (channel-sync)
                                         │
                                    统一用户身份
                              信赖值/零花钱/记忆共享
```

所有渠道消息最终通过 OpenClaw Agent 路由到同一套引擎，渠道同步服务负责将不同渠道的用户 ID 映射到系统统一用户 ID。

## 飞书 Channel 配置

### 前置条件
- OpenClaw 实例运行中（默认 NAS 192.168.3.196:3000）
- 飞书开放平台应用已创建（需要 Bot 权限）

### 配置步骤

1. **创建飞书应用**
   - 登录 [飞书开放平台](https://open.feishu.cn/)
   - 创建企业自建应用，启用「机器人」能力
   - 记录 App ID 和 App Secret

2. **配置 OpenClaw 飞书 Channel**
   - 在 OpenClaw 管理面板中添加 Feishu Channel
   - 填入飞书应用的 App ID / App Secret
   - 配置消息回调 URL：`https://<openclaw-host>/api/feishu/webhook`
   - 启用事件订阅：`im.message.receive_v1`

3. **绑定用户身份**
   - 用户首次通过飞书与 Bot 对话时，Agent 调用 `/api/channels/resolve` 查找绑定
   - 未绑定时，引导用户通过 Web 端登录后调用 `/api/channels/bind` 完成绑定
   - 绑定后，飞书 `open_id` 与系统用户关联，共享所有状态

### 飞书事件格式
```json
{
  "channel": "feishu",
  "externalId": "ou_xxxxxxxxxxxxxxxxxx",
  "metadata": "{\"name\":\"用户昵称\",\"avatar\":\"https://...\"}"
}
```

## Telegram Bot 配置

### 前置条件
- Telegram Bot Token（通过 @BotFather 创建）
- OpenClaw 实例可被公网访问（或配置 Webhook 转发）

### 配置步骤

1. **创建 Telegram Bot**
   - 与 @BotFather 对话，发送 `/newbot`
   - 记录 Bot Token

2. **配置 OpenClaw Telegram Channel**
   - 在 OpenClaw 管理面板中添加 Telegram Channel
   - 填入 Bot Token
   - 配置 Webhook URL：`https://<openclaw-host>/api/telegram/webhook`

3. **绑定用户身份**
   - 用户首次与 Bot 对话时，Agent 调用 `/api/channels/resolve` 查找绑定
   - 未绑定时，Bot 发送包含绑定链接的消息，引导用户完成 Web 登录绑定
   - 绑定后，Telegram `chat_id` 与系统用户关联

### Telegram 事件格式
```json
{
  "channel": "telegram",
  "externalId": "123456789",
  "metadata": "{\"username\":\"user_name\",\"first_name\":\"名字\"}"
}
```

## 微信 Channel 配置

> **TODO**: 需要微信公众号服务号资质（需企业主体认证）

### 已知要求
- 微信公众平台服务号（非订阅号）
- 需通过微信认证（300元/年）
- 需配置服务器 URL 和 Token
- 使用 `openid` 作为用户唯一标识

### 预计配置流程
1. 申请并认证微信服务号
2. 开启开发者模式，配置消息接口
3. 在 OpenClaw 中添加 WeChat Channel
4. 绑定流程与飞书/Telegram 一致

### 微信事件格式（预计）
```json
{
  "channel": "wechat",
  "externalId": "oXXXXXXXXXXXXXXXXXXXXXX",
  "metadata": "{\"nickname\":\"微信昵称\"}"
}
```

## 跨渠道状态同步说明

### 核心机制

渠道同步服务（`channel-sync`）维护 `channel_bindings` 表，存储映射关系：

| 字段 | 说明 |
|------|------|
| userId | 系统用户 ID（主键关联 user 表） |
| channel | 渠道标识（feishu/telegram/wechat/web） |
| externalId | 渠道方用户 ID |
| metadata | 可选额外信息（JSON） |

### 消息处理流程

1. **渠道收到消息** → OpenClaw Agent 接收
2. **身份解析** → Agent 调用 `POST /api/channels/resolve` 传入 `{channel, externalId}`
3. **查找绑定** → 返回系统 `userId`（若未绑定返回 `null`）
4. **状态读取** → 使用 `userId` 读取信赖值、零花钱、记忆等共享状态
5. **处理 & 回复** → 基于统一状态生成回复，通过原渠道返回

### 共享状态范围

以下数据在所有渠道间完全共享：

- **信赖值** (`trust_records`) — 等级、积分、连续签到
- **零花钱** (`wallets`) — 余额、充值记录、消费记录
- **记忆** (`memories`) — 对话记忆、偏好记忆
- **对话历史** (`chats`) — 所有渠道的对话记录统一存储
- **惊喜** (`surprises`) — 已解锁的惊喜内容

### API 速查

| 接口 | 认证方式 | 说明 |
|------|---------|------|
| `POST /api/channels/bind` | 用户 Session | 绑定当前用户到外部渠道 |
| `GET /api/channels/bindings` | 用户 Session | 查询当前用户的所有绑定 |
| `DELETE /api/channels/unbind` | 用户 Session | 解除指定渠道绑定 |
| `POST /api/channels/resolve` | Gateway Token | 通过外部 ID 查找系统用户 |

### Gateway Token 认证

`/resolve` 接口使用 Gateway Token 认证（`X-OpenClaw-Token` 请求头），仅供 OpenClaw Agent 内部调用：

```bash
curl -X POST http://localhost:3000/api/channels/resolve \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: your-gateway-token" \
  -d '{"channel": "feishu", "externalId": "ou_xxxxx"}'
```

响应：
```json
{
  "userId": "user_abc123",
  "bound": true
}
```
