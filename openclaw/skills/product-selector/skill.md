# 智能选品 Skill

> 教 Agent 根据用户偏好和预算进行商品推荐

## 触发时机

当惊喜系统判定可以送出惊喜时（零花钱充足 + 冷却期已过），Agent 应调用此 Skill 为用户挑选合适的商品。

## API 端点

### 1. 商品推荐

```
POST /api/skills/o2o/recommend
Headers: X-OpenClaw-Token: <gateway_token>

Body:
{
  "userId": "用户ID",
  "characterId": "角色ID",
  "budget": 1500,          // 预算（分），通常为零花钱的 80%
  "preferences": ["奶茶", "零食"],  // 从记忆中提取的用户偏好
  "location": "杭州"       // 可选，用于本地化搜索
}

Response:
{
  "recommendations": [
    {
      "name": "珍珠奶茶",
      "price": 1200,
      "category": "饮品",
      "reason": "你之前说过喜欢奶茶～",
      "searchUrl": "https://waimai.meituan.com/search?q=珍珠奶茶&city=杭州",
      "imageUrl": null
    }
  ]
}
```

### 2. 惊喜推送

```
POST /api/skills/o2o/send-surprise
Headers: X-OpenClaw-Token: <gateway_token>

Body:
{
  "userId": "用户ID",
  "characterId": "角色ID",
  "productName": "珍珠奶茶",
  "message": "嘿嘿，我攒了好久的零花钱，给你买了杯珍珠奶茶～快去看看吧！",
  "searchUrl": "https://waimai.meituan.com/search?q=珍珠奶茶",
  "emotion": "clingy"
}
```

## 选品逻辑

1. **预算筛选**: 商品价格不超过可用预算的 80%
2. **偏好匹配**: 从用户记忆中提取关键词（"喜欢奶茶"、"爱吃零食"）
3. **品类权重**: 零食(3) > 饮品(2) > 小物件(1)
4. **返回 Top 3**: 按综合得分降序

## 使用示例

```
当你判断可以送惊喜时：
1. 先调用 /api/skills/surprise-engine/check 检查是否可触发
2. 如果 canTrigger=true，调用 /api/skills/o2o/recommend 获取推荐
3. 从推荐中选择最合适的商品
4. 用角色口吻写一段温暖的留言
5. 调用 /api/skills/o2o/send-surprise 推送给用户
```
