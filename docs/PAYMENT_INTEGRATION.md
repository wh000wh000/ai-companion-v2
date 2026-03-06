# 支付系统集成指南

## 概述

伪春菜 v2 的支付系统采用 **Provider 模式**，通过统一的 `PaymentProviderInterface` 接口适配不同支付渠道。

当前状态:
- **Mock 支付**: ✅ 已实现（开发/Demo 用）
- **微信支付**: 🔲 Skeleton（接口已定义，待实现）
- **支付宝支付**: 🔲 Skeleton（接口已定义，待实现）

## 架构

```
┌─────────────┐
│  前端 Store  │  apps/stage-web/src/stores/payment.ts
│  (payment)  │
└──────┬──────┘
       │ REST API
       ▼
┌─────────────┐
│  路由层     │  apps/server/src/routes/payment.ts
│  (Hono)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  服务层     │  apps/server/src/services/payment.ts
│  (业务逻辑) │  - 订单创建、状态流转、幂等性保证
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Provider   │  apps/server/src/libs/payment/
│  (适配层)   │  - mock.ts / wechat.ts / alipay.ts
└─────────────┘
```

## 订单状态机

```
created → paying → paid → fulfilled
  │                  │
  └── closed         └── refunded
```

| 状态 | 说明 | 触发时机 |
|------|------|----------|
| `created` | 订单已创建 | `POST /api/payment/create-order` |
| `paying` | 用户已唤起支付 | 前端上报 |
| `paid` | 支付成功 | 回调确认 / Mock 确认 |
| `fulfilled` | 已发货 | 爱心币到账后 |
| `closed` | 订单关闭 | 30分钟未支付自动关闭 |
| `refunded` | 已退款 | 管理后台操作 |

## 关键文件

| 文件 | 职责 |
|------|------|
| `libs/payment/types.ts` | 类型定义 + 接口契约 |
| `libs/payment/mock.ts` | Mock 支付实现（开发用） |
| `libs/payment/wechat.ts` | 微信支付 Skeleton |
| `libs/payment/alipay.ts` | 支付宝支付 Skeleton |
| `libs/payment/index.ts` | 工厂函数 + re-exports |
| `services/payment.ts` | 业务逻辑（订单管理） |
| `routes/payment.ts` | HTTP 路由 |
| `schemas/payment-orders.ts` | 数据库 Schema |

## 接入新 Provider 步骤

### 1. 配置环境变量

在 `libs/env.ts` 中添加所需的环境变量（参考 WECHAT_*/ALIPAY_* 占位）。

### 2. 实现 Provider

在 `libs/payment/` 目录下创建新文件，实现 `PaymentProviderInterface`:

```typescript
import type { PaymentProviderInterface } from './types'

export function createXxxProvider(config: XxxConfig): PaymentProviderInterface {
  return {
    async createOrder(input) {
      // 调用第三方 API 创建支付订单
      // 返回前端唤起支付所需的参数
    },
    verifyCallback(rawBody, signature) {
      // 验证回调签名，防伪造
    },
    parseCallback(rawBody) {
      // 解析回调内容，提取订单号和状态
    },
  }
}
```

### 3. 注册到工厂

在 `libs/payment/index.ts` 的 `createPaymentProvider()` 中添��� case。

### 4. 添加回调路由

在 `routes/payment.ts` 中添加回调端点:

```typescript
app.post('/callback/xxx', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('X-Signature') ?? ''

  if (!provider.verifyCallback(rawBody, signature)) {
    return c.text('FAIL', 400)
  }

  const result = provider.parseCallback(rawBody)
  await paymentService.handleCallback(result)
  return c.text('SUCCESS')
})
```

### 5. 前端适配

更新 `stores/payment.ts` 中的 `createOrder` 调用，传入对应 provider 标识。

## 环境变量清单

| 变量 | 必需 | 说明 |
|------|------|------|
| `ENABLE_MOCK_PAY` | 否 | 启用 Mock 支付（默认 false） |
| `WECHAT_APP_ID` | 微信支付时必需 | 微信 AppID |
| `WECHAT_MCH_ID` | 微信支付时必需 | 商户号 |
| `WECHAT_API_KEY` | 微信支付时必需 | APIv3 密钥 |
| `WECHAT_NOTIFY_URL` | 微信支付时必需 | 回调 URL |
| `ALIPAY_APP_ID` | 支付宝时必需 | 支付宝 AppID |
| `ALIPAY_PRIVATE_KEY` | 支付宝时必需 | 应用私钥 |
| `ALIPAY_PUBLIC_KEY` | 支付宝时必需 | 支付宝公钥 |
| `ALIPAY_NOTIFY_URL` | 支付宝时必需 | 回调 URL |

## 安全注意事项

1. **回调验签**: 必须验证所有来自第三方的回调签名，防止伪造通知
2. **幂等性**: 使用 `idempotencyKey` 列保证同一笔订单不会重复处理
3. **金额校验**: 回调中的金额必须与订单创建时的金额一致
4. **HTTPS**: 回调 URL 必须使用 HTTPS
5. **Mock 防护**: 生产环境默认禁用 Mock 支付，需显式设置 `ENABLE_MOCK_PAY=true`
6. **密钥管理**: 私钥/API Key 不要硬编码，使用环境变量或密钥管理服务
