# 记忆管理 Skill (memory-manager)

> Skill 名称：memory-manager
> 版本：v1.5
> 引擎服务地址：由环境变量 `API_SERVER_URL` 决定（默认 `http://localhost:3000`）

---

## 概述

管理与用户的对话记忆。你应该在以下时机使用此Skill：
- 对话中发现用户重要信息（偏好、习惯、日程、重要日期）
- 对话开始时检索与当前话题相关的记忆
- 对话结束时保存今天的关键信息摘要

---

## 记忆层级

### Level 1: 工作记忆（OpenClaw内置）
- 当前对话上下文，最近20轮
- 无需调用API

### Level 2: 短期记忆
- 今天的事件摘要
- 对话结束时自动提取保存
- 保留7天，到期自动清理

### Level 3: 长期记忆
- 用户偏好、习惯、重要日子
- 向量DB持久化
- 永久保留

### Level 4: 灵魂记忆（只读）
- 角色性格、禁区、不变的东西
- SOUL.md 定义，不可修改

---

## 认证

所有请求必须携带 Gateway Token 请求头：

```
X-OpenClaw-Token: <你的 OPENCLAW_TOKEN>
```

---

## API端点

### POST /api/memory/save

保存一条记忆。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| content | string | 是 | 记忆内容 |
| type | string | 是 | 类型：`preference` / `habit` / `event` / `emotion` / `date` |
| importance | number | 否 | 重要程度 1-5（默认 3） |
| tags | string[] | 否 | 可选标签 |
| level | number | 否 | 记忆层级：2（短期）或 3（长期，默认） |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/memory/save \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "characterId": "xiaonuan",
    "content": "用户下周三有数学考试",
    "type": "date",
    "importance": 4,
    "level": 3,
    "tags": ["考试", "日程"]
  }'
```

**成功响应（201）：**

```json
{
  "id": "abc123...",
  "userId": "user_abc123",
  "characterId": "xiaonuan",
  "content": "用户下周三有数学考试",
  "type": "date",
  "importance": 4,
  "level": 3,
  "tags": ["考试", "日程"],
  "expiresAt": null,
  "createdAt": "2026-03-05T12:00:00Z",
  "updatedAt": "2026-03-05T12:00:00Z"
}
```

### POST /api/memory/search

搜索相关记忆。

**请求体（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| query | string | 是 | 搜索关键词或语义描述 |
| limit | number | 否 | 返回条数（默认 5，最大 20） |
| level | number | 否 | 层级过滤：2 或 3，不传则搜索全部 |

**示例调用：**

```bash
curl -X POST http://localhost:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN" \
  -d '{
    "userId": "user_abc123",
    "characterId": "xiaonuan",
    "query": "考试",
    "limit": 5
  }'
```

**成功响应（200）：**

```json
{
  "results": [
    {
      "id": "abc123...",
      "content": "用户下周三有数学考试",
      "type": "date",
      "importance": 4,
      "level": 3,
      "tags": ["考试", "日程"],
      "createdAt": "2026-03-05T12:00:00Z"
    }
  ],
  "total": 1
}
```

### GET /api/memory/recent?userId=xxx&characterId=xxx&days=7

获取最近N天的记忆。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| characterId | string | 是 | 角色 ID |
| days | number | 否 | 天数（默认 7，最大 30） |

**成功响应（200）：**

```json
{
  "results": [...],
  "total": 5,
  "days": 7
}
```

### DELETE /api/memory/:id

删除一条记忆（仅Level 2可删）。

**成功响应（200）：**

```json
{
  "deleted": true,
  "memory": { ... }
}
```

---

## 错误响应

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数校验失败 |
| 401 | UNAUTHORIZED | Gateway Token 缺失或不匹配 |
| 403 | SKILLS_DISABLED | Skills 功能未启用 |
| 404 | NOT_FOUND | 记忆不存在 |

---

## 使用场景示例

- 用户说"我下周三有考试" -> 保存为 type=date, importance=4, level=3
- 用户说"我喜欢吃草莓" -> 保存为 type=preference, importance=3, level=3
- 对话结束 -> 提取关键信息保存为 level=2 短期记忆
- 次日对话开始 -> 搜索昨天的记忆注入上下文
- 用户说"我今天心情不好" -> 保存为 type=emotion, importance=2, level=2

---

## 注意事项

- 当前版本使用 LIKE 关键词搜索，后续将集成 pgvector 向量搜索（70%）+ BM25（30%）混合检索
- 记忆类型说明：
  - `preference`：偏好喜好（"用户喜欢抹茶味"）
  - `habit`：习惯模式（"用户每晚11点睡觉"）
  - `event`：事件记录（"用户通过了面试"）
  - `emotion`：情感记忆（"用户今天很开心"）
  - `date`：重要日期（"用户3月10日生日"）
- 重要程度（importance 1-5）影响搜索结果的排序权重
- Level 2 短期记忆7天后自动过期清理
- Level 3 长期记忆永久保留，不可通过 DELETE 端点删除
