# 伪春菜 v3.0 — 安全审计报告

> 审计日期：2026-03-05
> 审计范围：Round 1-12 全部代码
> 审计版本：v3.0 Final
> 审计人：Round 12-C 终极验证工程师

---

## 一、总体评估

| 指标 | 评级 |
|------|------|
| 总体安全性 | **中等偏上** |
| 支付安全 | **中等**（Mock 模式安全，生产支付 Skeleton 待完善） |
| 认证鉴权 | **良好**（双层认证：authGuard + Gateway Token） |
| 输入校验 | **良好**（全端点 Valibot 校验覆盖） |
| 数据隔离 | **良好**（userId 绑定 + 所有权校验） |
| 基础设施 | **中等**（Docker 容器化，需加固） |

### 风险总览

| 级别 | 数量 | 说明 |
|------|------|------|
| Critical | 0 | 无关键安全漏洞 |
| High | 2 | 支付回调验签 Skeleton、CORS 未显式限制 |
| Medium | 5 | 限频绕过风险、环境变量管理、日志脱敏等 |
| Low | 4 | 建议性增强项 |
| Info | 3 | 信息性注意事项 |

---

## 二、支付接口安全

### 2.1 签名验证

**当前状态：** Skeleton（Mock 模式默认）

| 支付渠道 | 验签实现 | 状态 | 风险 |
|---------|---------|------|------|
| Mock | 始终通过 | 正常（开发用） | 仅限开发环境 |
| 微信支付 | `wechat.ts` — `verifyCallback()` 返回 `false`（未实现） | **Skeleton** | 生产环境必须实现 |
| 支付宝 | `alipay.ts` — `verifyCallback()` 返回 `false`（未实现） | **Skeleton** | 生产环境必须实现 |

**文件位置：**
- `apps/server/src/libs/payment/wechat.ts`
- `apps/server/src/libs/payment/alipay.ts`

**风险评级：** **HIGH**（生产部署前必须完成）

**修复建议：**
1. 微信支付：使用 `WechatPay-Signature` 头 + V3 API 证书验签
2. 支付宝：使用 RSA2 公钥验签
3. 添加证书轮换机制
4. 实现签名失败告警

### 2.2 金额校验

**当前状态：** 良好

```
位置: apps/server/src/services/payment.ts
```

| 检查项 | 实现情况 | 状态 |
|--------|---------|------|
| 套餐 ID 校验 | `getChargePack(packId)` — 仅允许预定义的 7 档套餐 | 通过 |
| 金额来源 | 从 `soul-engine` 的 `CHARGE_PACKS` 常量获取，非用户输入 | 通过 |
| 金额单位 | 使用整数分（cents），避免浮点精度问题 | 通过 |
| 超额限制 | 未实现未成年人消费限额的运行时校验 | **需补充** |

**修复建议：**
- 添加未成年人消费限额中间件（单日/单月累计）
- 回调金额与订单金额交叉校验

### 2.3 防重复支付

**当前状态：** 良好

| 机制 | 实现方式 | 状态 |
|------|---------|------|
| 幂等键 | `idempotencyKey` 字段 + 数据库查重 | 通过 |
| 订单状态机 | `created → paying → paid → fulfilled / closed` | 通过 |
| 重复回调 | `order.status === 'paid'` 检查，防止重复处理 | 通过 |
| 充值幂等 | `economyService.processCharge` 使用 `payment:{orderId}` 作为幂等键 | 通过 |

**文件位置：**
- `apps/server/src/services/payment.ts` — 订单创建幂等
- `apps/server/src/services/economy.ts` — 充值到账幂等

---

## 三、API 认证

### 3.1 authGuard 覆盖率

| 路由模块 | 认证方式 | 覆盖情况 | 备注 |
|---------|---------|---------|------|
| `/api/wallet/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/trust/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/surprises/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/characters/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/providers/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/chat/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/chats/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/tts/*` | authGuard（全局） | 100% | `.use('*', authGuard)` |
| `/api/payment/create-order` | authGuard | 100% | 每端点独立 |
| `/api/payment/order/:id` | authGuard | 100% | 每端点独立 |
| `/api/payment/mock-pay/:id` | authGuard | 100% | 每端点独立 |
| `/api/payment/callback/*` | **无认证** | N/A | 正确 — 支付回调无法携带用户 session |
| `/api/skills/*` | Gateway Token | 100% | `X-OpenClaw-Token` |
| `/api/memory/*` | Gateway Token | 100% | `X-OpenClaw-Token` |
| `/api/proactive/*` | Gateway Token | 100% | `X-OpenClaw-Token` |
| `/api/o2o/*` | Gateway Token | 100% | `X-OpenClaw-Token` |

**评估：** 认证覆盖率 100%。所有用户端点使用 `authGuard`，所有 Agent 端点使用 Gateway Token。支付回调端点无认证是正确设计（通过签名验证替代）。

### 3.2 Gateway Token 保护

**当前状态：** 良好

```
位置: apps/server/src/routes/skills.ts (skillsGuard)
      apps/server/src/routes/memory.ts (memoryGuard)
      apps/server/src/routes/proactive.ts (proactiveGuard)
      apps/server/src/routes/o2o.ts (o2oGuard)
```

| 检查项 | 状态 |
|--------|------|
| Token 未配置时禁用功能 | 通过 — 返回 403 `OPENCLAW_TOKEN not configured` |
| Token 不匹配时拒绝 | 通过 — 返回 401 `Invalid or missing X-OpenClaw-Token` |
| Token 通过请求头传递 | 通过 — `X-OpenClaw-Token` header |
| Token 非硬编码 | 通过 — 从环境变量 `OPENCLAW_TOKEN` 读取 |

**风险：**
- Token 是静态字符串，无过期机制 — **Medium**
- 建议：添加 Token 轮换支持或使用 JWT

### 3.3 所有权校验

| 资源 | 校验方式 | 状态 |
|------|---------|------|
| 角色 | `existing.ownerId !== user.id` → 403 | 通过 |
| Provider 配置 | `existing.ownerId !== user.id` → 403 | 通过 |
| 钱包 | `userId` 直接绑定当前用户 | 通过 |
| 信赖记录 | `userId + characterId` 组合查询 | 通过 |
| 支付订单 | `getOrder(orderId, user.id)` — userId 过滤 | 通过 |

---

## 四、限频策略

### 4.1 各端点限频配置

```
位置: apps/server/src/middlewares/rate-limit.ts
```

| 限频器 | 窗口 | 最大请求 | 应用端点 |
|--------|------|---------|---------|
| `chargeRateLimiter` | 60s | 5 | POST /wallet/charge, POST /trust/checkin, POST /trust/update, POST /surprises/check, PATCH /surprises/:id/status |
| `giftRateLimiter` | 60s | 10 | POST /wallet/gift |
| `queryRateLimiter` | 60s | 60 | GET /wallet, GET /wallet/history, GET /surprises, GET /trust/:id |

### 4.2 限频机制分析

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 实现方式 | 内存计数器 | 单实例有效，集群需换 Redis |
| Key 策略 | `userId:windowMs:maxRequests` | 按用户隔离 |
| 过期清理 | 每 60s 清理过期条目 | 防内存泄漏 |
| 响应格式 | 429 + retryAfter 秒数 | 符合 HTTP 标准 |
| 未认证请求 | 跳过限频 | 依赖 authGuard 在前 |

**风险评级：** **Medium**

**已发现问题：**
1. **Key 不含路径** — 同一用户的不同端点共享同一限频窗口（如果 windowMs 和 maxRequests 相同）。但目前三个限频器的参数不同，实际影响有限。
2. **无 IP 限频** — 未认证的端点（支付回调）无限频保护
3. **集群扩展** — 内存计数器在多实例部署时失效

**修复建议：**
1. Key 中添加路由前缀区分：`${user.id}:${routePrefix}:${windowMs}`
2. 支付回调端点添加 IP 级限频
3. 生产环境使用 Redis 替代内存计数器

### 4.3 未受限频保护的端点

| 端点 | 原因 | 风险 |
|------|------|------|
| POST /payment/callback/wechat | 支付回调，由签名验证保护 | Low（签名验证补偿） |
| POST /payment/callback/alipay | 支付回调，由签名验证保护 | Low |
| POST /payment/create-order | 未加限频 | **Medium** — 建议添加 |
| POST /payment/mock-pay/:id | 未加限频 | Low（仅开发环境） |
| POST /chat | 未加限频 | **Medium** — 可被恶意刷消息 |
| POST /chats/sync | 未加限频 | Low |
| POST /skills/* | Gateway Token 保护 | Low |
| POST /proactive/* | Gateway Token 保护 | Low |
| POST /o2o/* | Gateway Token 保护 | Low |
| POST /memory/* | Gateway Token 保护 | Low |

---

## 五、XSS/CSRF 防护

### 5.1 CORS 配置

**当前状态：** **未显式配置**

**风险评级：** **HIGH**

| 检查项 | 状态 |
|--------|------|
| Access-Control-Allow-Origin | 未设置（Hono 默认不限制） |
| Access-Control-Allow-Credentials | 未设置 |
| Access-Control-Allow-Headers | 未设置 |

**修复建议：**
```typescript
import { cors } from 'hono/cors'

app.use('*', cors({
  origin: ['https://your-domain.com', 'http://localhost:3003'],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-OpenClaw-Token'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
}))
```

### 5.2 输入校验

**当前状态：** 良好

全部 API 端点使用 Valibot 进行输入校验：

| 模块 | Schema 文件 | 校验覆盖 |
|------|------------|---------|
| Wallet | `api/wallet.schema.ts` | ChargeSchema (7 档 packId) + GiftSchema (4 档 tier) + HistoryQuerySchema |
| Trust | `api/trust.schema.ts` | CheckinSchema + TrustUpdateSchema (6 种事件) |
| Surprises | `api/surprises.schema.ts` | SurpriseCheckSchema + SurpriseQuerySchema + StatusUpdateSchema |
| Payment | `api/payment.schema.ts` | CreatePaymentOrderSchema |
| Characters | `api/characters.schema.ts` | CreateCharacterSchema + UpdateCharacterSchema |
| Providers | `api/providers.schema.ts` | Create + Update Schema |
| Memory | `api/memory.schema.ts` | MemorySaveSchema + MemorySearchSchema |
| TTS | `api/tts.schema.ts` | SynthesizeSchema |
| Chat | 内联 Valibot | ChatSendSchema |
| Skills | 内联 Valibot | 6 个 Schema |
| Proactive | 内联 Valibot | ProactiveMessageSchema |
| O2O | 内联 Valibot | RecommendSchema + GenerateLinkSchema + SendSurpriseSchema |

**XSS 防护注意事项：**
- 输入字符串未做 HTML 转义（依赖前端 Vue/React 框架自动转义）
- 数据库存储为原始文本（无 SQL 注入风险 — Drizzle ORM 参数化查询）

### 5.3 CSRF 防护

| 检查项 | 状态 |
|--------|------|
| Session Cookie | better-auth 管理，HttpOnly + Secure | 通过 |
| CSRF Token | 未实现 | **建议添加** |
| SameSite Cookie | 取决于 better-auth 配置 | 需验证 |

---

## 六、敏感数据管理

### 6.1 环境变量管理

```
位置: apps/server/src/libs/env.ts
```

| 环境变量 | 必填 | 用途 | 安全级别 |
|---------|------|------|---------|
| `DATABASE_URL` | 必填 | PostgreSQL 连接 | **High** — 含密码 |
| `AUTH_GOOGLE_CLIENT_ID` | 必填 | Google OAuth | Medium |
| `AUTH_GOOGLE_CLIENT_SECRET` | 必填 | Google OAuth | **High** |
| `AUTH_GITHUB_CLIENT_ID` | 必填 | GitHub OAuth | Medium |
| `AUTH_GITHUB_CLIENT_SECRET` | 必填 | GitHub OAuth | **High** |
| `OPENCLAW_URL` | 可选 | OpenClaw WebSocket | Low |
| `OPENCLAW_TOKEN` | 可选 | OpenClaw 认证 | **High** |
| `COSYVOICE_API_KEY` | 可选 | TTS API | **High** |
| `COSYVOICE_API_URL` | 可选 | TTS 端点 | Low |

**评估：**
- 使用 Valibot `EnvSchema` 校验，启动时缺少必填变量则退出
- 可选变量缺失时优雅降级（OpenClaw 禁用、TTS Mock 模式）
- **无 `.env.example` 文件** — 建议添加

### 6.2 日志脱敏

**当前状态：** 部分实现

| 服务 | 日志内容 | 脱敏情况 |
|------|---------|---------|
| Payment | orderId, provider, amount | 通过 — 无敏感信息 |
| Economy | 充值/送礼事件 | 通过 — 仅记录 userId 和金额 |
| OpenClaw Fallback | 降级原因 | 通过 — 仅记录错误消息 |
| Auth | Session 信息 | 需验证 better-auth 日志级别 |

**修复建议：**
- 确认生产环境日志级别不会输出完整请求体
- 添加 PII（个人可识别信息）过滤器

### 6.3 代码中的硬编码密钥检查

| 检查项 | 状态 |
|--------|------|
| 代码中无硬编码 API Key | 通过 |
| 代码中无硬编码密码 | 通过 |
| docker-compose.yml 含默认密码 | **注意** — `POSTGRES_PASSWORD=example-PAssw0rd-xHjDYR.b7N` |
| `.gitignore` 排除 `.env*` | 需验证 |

**修复建议：**
- `docker-compose.yml` 中的 PostgreSQL 密码改为环境变量引用
- 确认 `.gitignore` 包含所有敏感文件模式

---

## 七、OpenClaw 安全

### 7.1 容器隔离

| 检查项 | 状态 | 说明 |
|--------|------|------|
| OpenClaw 部署位置 | NAS 内网 (192.168.3.196) | 通过 — 仅 LAN 可达 |
| 网络访问控制 | 内网 Only | 通过 |
| 端口暴露 | 3000（NAS 本地） | 通过 — 不对公网开放 |
| Docker 容器隔离 | OpenClaw 运行在独立容器 | 通过 |

### 7.2 版本锁定

| 组件 | 锁定版本 | 状态 |
|------|---------|------|
| OpenClaw | 2026.2.14 | 已锁定 |
| CVE 状态 | CVE-2026-25253 等已修复 | 已处理 |
| 安全通报 | 73 个（已评估） | 需持续监控 |

### 7.3 Agent 对话安全边界

| 检查项 | 实现方式 | 状态 |
|--------|---------|------|
| System Prompt 注入防护 | SOUL.md 定义角色边界 | 基础保护 |
| 有害内容过滤 | 依赖 LLM 内置安全 | 部分 |
| 用户输入长度限制 | Valibot `nonEmpty` 但无 maxLength | **需补充** |
| 输出内容审核 | 未实现 | **建议添加** |

**修复建议：**
- 聊天输入添加 `maxLength` 限制（建议 2000 字符）
- 考虑添加基于关键词的输出过滤层
- Agent 行为审计日志

---

## 八、事务安全

### 8.1 原子事务

| 操作 | 事务保护 | 状态 |
|------|---------|------|
| 充值到账 | `processCharge` — 单一 INSERT（余额更新 + 交易记录） | 通过 |
| 送礼 | `processGift` — 扣减余额 + 零花钱增加 + 交易记录 | 通过 |
| 信赖变更 | `applyTrustEvent` — 信赖记录更新 | 通过 |
| 支付→充值链路 | 回调验签 → 订单状态更新 → 充值到账 | 通过（幂等键串联） |

### 8.2 并发安全

| 场景 | 防护措施 | 状态 |
|------|---------|------|
| 并发充值 | 幂等键唯一索引 | 通过 |
| 并发送礼 | 幂等键 + 余额校验 | 通过 |
| 并发签到 | `alreadyCheckedIn` 标记 + 日期校验 | 通过 |
| 并发支付回调 | 订单状态机 + 状态前置条件校验 | 通过 |

**注意：** PGlite（测试环境）不支持 `FOR UPDATE`，已在 R6 移除。生产环境 PostgreSQL 建议恢复行级锁。

---

## 九、已知风险和缓解措施

### 9.1 风险矩阵

| ID | 风险描述 | 级别 | 当前状态 | 缓解措施 |
|----|---------|------|---------|---------|
| S1 | 微信/支付宝验签未实现 | **High** | Skeleton | 生产前必须实现完整验签 |
| S2 | CORS 未显式配置 | **High** | 未配置 | 添加 Hono CORS 中间件 |
| S3 | 支付回调端点无 IP 限频 | Medium | 无限频 | 添加 IP 级限频 |
| S4 | Gateway Token 无过期机制 | Medium | 静态 Token | 考虑 JWT 或 Token 轮换 |
| S5 | 聊天输入无最大长度限制 | Medium | 仅 nonEmpty | 添加 maxLength(2000) |
| S6 | 未成年消费限额未运行时校验 | Medium | 仅类型定义 | 添加消费限额中间件 |
| S7 | CSRF Token 未实现 | Medium | 依赖 SameSite Cookie | 添加 CSRF Token |
| S8 | 内存限频器不支持集群 | Low | 单实例 | 生产用 Redis 替代 |
| S9 | Docker Compose 含默认密码 | Low | 开发环境 | 改为环境变量 |
| S10 | Agent 输出无内容审核 | Low | 依赖 LLM | 添加关键词过滤 |
| S11 | 无 .env.example 文件 | Low | 缺失 | 添加示例文件 |

### 9.2 优先修复清单

**生产部署前必须修复（P0）：**
1. 完成微信/支付宝支付验签实现
2. 配置 CORS 白名单
3. 支付回调添加 IP 限频
4. 聊天输入添加长度限制

**建议尽快修复（P1）：**
5. 未成年人消费限额运行时校验
6. Gateway Token 增加过期/轮换机制
7. 添加 CSRF Token

**可在后续迭代中处理（P2）：**
8. 内存限频器升级为 Redis
9. Agent 输出内容审核
10. 审计日志完善

---

## 十、合规性要点

### 10.1 个人信息保护法（PIPL）

| 要求 | 状态 |
|------|------|
| 用户隐私政策 | 需添加 |
| 数据收集告知 | 需添加 |
| 数据删除权 | 数据库支持（需 API 端点） |
| 数据出境 | 无（NAS 部署在国内） |
| 未成年人保护 | 消费限额已定义，运行时校验待补充 |

### 10.2 支付合规

| 要求 | 状态 |
|------|------|
| 支付资质 | 需要微信支付商户资质 |
| 交易记录保存 | 通过（transactions 表） |
| 退款机制 | 待实现（7 天无理由） |
| 充值提示 | 需在前端添加理性消费提醒 |

---

## 附录：审计覆盖的源文件

| 目录 | 文件数 | 审计深度 |
|------|--------|---------|
| `apps/server/src/routes/` | 13 | 完整审计 |
| `apps/server/src/services/` | 11 | 完整审计 |
| `apps/server/src/middlewares/` | 3 | 完整审计 |
| `apps/server/src/libs/` | 6 | 完整审计 |
| `apps/server/src/api/` | 7 | Schema 校验审计 |
| `apps/server/src/schemas/` | 6 | 数据模型审计 |
| `openclaw/` | 13 | Agent 安全边界审计 |
| `packages/soul-engine/` | 12 | 引擎逻辑审计 |
