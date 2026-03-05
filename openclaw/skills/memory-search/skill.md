# 记忆搜索 Skill

> Skill 名称：memory-search
> 版本：v1.0
> 引擎服务地址：由环境变量 `API_SERVER_URL` 决定（默认 `http://localhost:3000`）

---

## 一、描述

记忆搜索 Skill 提供语义化的记忆检索和保存能力。角色可以通过自然语言查询用户的历史记忆，
也可以将对话中的重要信息保存为新的记忆。记忆系统使用向量搜索（70%）+ BM25 文本搜索（30%）
的混合检索策略，确保既能理解语义又能精准匹配关键词。

---

## 二、何时调��

- **对话中需要回忆过去时**：调用 `search` 搜索相关记忆，让角色自然地引用历史信息
- **用户提到之前说过的事时**：调用 `search` 验证并检索具体记忆内容
- **检测到值得记住的信息时**：调用 `save` 保存新记忆（用户喜好、重要事件、纪念日等）
- **准备惊喜时**：调用 `search` 查找用户喜好和重要日期，制定个性化方案
- **每轮对话开始时**：调用 `search` 加载与当前话题相关的最近记忆

---

## 三、认证

所有请求必须携带 Gateway Token 请求头：

```
X-OpenClaw-Token: <你的 OPENCLAW_TOKEN>
```

---

## 四、可用端点

### 4.1 POST /api/skills/memory/search

语义搜索 — 使用自然语言查询用户记忆库。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| query | string | 是 | 搜索查询（自然语言） |
| type | string | 否 | 记忆类型过滤：`fact` / `emotion` / `event` / `preference` |
| limit | number | 否 | 返回条数（默认 5，最大 20） |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/memory/search \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "query": "用户喜欢什么颜色的花",
    "type": "preference",
    "limit": 5
  }'
```

**成功响应（200）：**

```json
{
  "status": "not_implemented",
  "message": "记忆搜索服务开发中，预计 v1.5 版本上线",
  "results": []
}
```

> 注意：当前版本返回 TODO 占位响应。记忆服务将在 v1.5 版本实现。

### 4.2 POST /api/skills/memory/save

保存记忆 — 将新信息存入用户记忆库。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| type | string | 是 | 记忆类型：`fact` / `emotion` / `event` / `preference` |
| content | string | 是 | 记忆内容 |
| importance | number | 否 | 重要程度 1-10（默认 5） |
| tags | string[] | 否 | 标签列表 |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/skills/memory/save \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "characterId": "xiaonuan",
    "type": "preference",
    "content": "用户最喜欢白色的玫瑰花",
    "importance": 7,
    "tags": ["花", "喜好", "白色"]
  }'
```

**成功响应（200）：**

```json
{
  "status": "not_implemented",
  "message": "记忆保存服务开发中，预计 v1.5 版本上线",
  "saved": false
}
```

> 注意：当前版本返回 TODO 占位响应。记忆服务将在 v1.5 版本实现。

---

## 五、错误响应

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数校验失败 |
| 401 | UNAUTHORIZED | Gateway Token 缺失或不匹配 |
| 403 | SKILLS_DISABLED | Skills 功能未启用 |

---

## 六、注意事项

- **当前版本（v1.0）为占位实现**，所有端点返回 `not_implemented` 状态
- v1.5 版本将实现完整的向量搜索（70%）+ BM25（30%）混合检索
- 记忆类型说明：
  - `fact`：客观事实（"用户在北京工作"）
  - `emotion`：情感记忆（"用户今天很开心"）
  - `event`：事件记录（"用户通过了面试"）
  - `preference`：偏好喜好（"用户喜欢抹茶味"）
- 重要程度（importance）影响记忆的保留优先级，高重要度记忆不易被遗忘
- 即使当前为占位状态，Agent 仍应在对话中标记值得记忆的信息（通过 `[memory:...]` 标签），
  以便 v1.5 上线后自动迁移
