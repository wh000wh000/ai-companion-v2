# 美团下单 Skill（v1 — 链接分享模式）

> 教 Agent 生成外卖平台搜索链接，引导用户自行下单

## 背景

v1 版本采用链接分享模式，不直接对接美团/饿了么 API。Agent 生成商品搜索链接后，以角色口吻推送给用户，用户点击链接后自行在外卖平台下单。

## API 端点

### 链接生成

```
POST /api/skills/o2o/generate-link
Headers: X-OpenClaw-Token: <gateway_token>

Body:
{
  "productName": "珍珠奶茶",
  "platform": "meituan",    // meituan | eleme
  "location": "杭州"        // 可选
}

Response:
{
  "url": "https://waimai.meituan.com/search?q=珍珠奶茶&city=杭州",
  "platform": "meituan",
  "productName": "珍珠奶茶"
}
```

## 角色文案模板

根据角色性格调整推送文案：

### 小星（神秘灵动型）
- "嘘...星星告诉我你今天需要一杯{productName}～ 快去看看吧！{url}"
- "我用零花钱帮你挑了个小礼物...{productName}，希望你喜欢～ {url}"

### 阿烈（活泼阳光型）
- "嘿！我攒了零花钱给你买{productName}！冲！{url}"
- "哈哈哈，交给我吧！我帮你选了{productName}，赶紧去看看！{url}"

### 其他角色
请根据 SOUL.md 中定义的说话方式和口癖，生成符合角色性格的文案。

## 使用流程

```
1. 调用 /api/skills/o2o/recommend 获取推荐列表
2. 选择最合适的商品
3. 调用 /api/skills/o2o/generate-link 生成链接（可选，recommend 已返回链接）
4. 用角色口吻编写推送文案
5. 调用 /api/skills/o2o/send-surprise 推送给用户
6. 等待用户反馈 → 根据反馈调整下次选品偏好
```

## 未来升级路径

- v2: 接入美团开放平台 API，实现代下单
- v3: 接入饿了么 API，支持平台比价
- v4: 根据历史反馈训练个性化推荐模型
