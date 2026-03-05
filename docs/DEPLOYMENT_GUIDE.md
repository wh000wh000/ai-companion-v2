# 伪春菜 v3.0 — 部署指南

> 版本：v3.0 Final
> 日期：2026-03-05
> 适用环境：开发 / 预发布 / 生产

---

## 一、环境要求

### 1.1 运行时

| 组件 | 最低版本 | 推荐版本 | 备注 |
|------|---------|---------|------|
| Node.js | 20.x | 22.x LTS | 需支持 ESM |
| pnpm | 9.x | 9.15+ | Monorepo workspace |
| PostgreSQL | 15.x | 18.x + VChord 扩展 | 含 pgvector 支持 |
| Docker | 24.x | 27.x | 可选（容器化部署） |
| Docker Compose | 2.20+ | 2.30+ | 可选 |

### 1.2 硬件建议

| 环境 | CPU | 内存 | 磁盘 | 备注 |
|------|-----|------|------|------|
| 开发 | 4核+ | 8GB+ | 20GB+ | 含 node_modules |
| 预发布 | 2核 | 4GB | 10GB | |
| 生产 | 4核 | 8GB+ | 50GB+ | 含数据库 + 日志 |
| NAS (OpenClaw) | 4核 | 8GB+ | 20GB+ | 独立部署 |

### 1.3 网络要求

| 连接 | 要求 | 备注 |
|------|------|------|
| Server → PostgreSQL | 内网 < 5ms | 同机或同一 VPC |
| Server → OpenClaw (NAS) | LAN < 2ms | 192.168.x.x 内网 |
| Server → CosyVoice | 公网 < 200ms | 阿里云 DashScope |
| Server → 支付网关 | 公网 HTTPS | 微信/支付宝 |
| Client → Server | 公网 < 100ms | HTTPS + WSS |

---

## 二、环境变量配置清单

### 2.1 必填变量

```bash
# ─── 数据库 ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/ai_companion

# ─── OAuth 认证（Google）──────────────────────────────────────────
AUTH_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# ─── OAuth 认证（GitHub）──────────────────────────────────────────
AUTH_GITHUB_CLIENT_ID=your-github-client-id
AUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 2.2 可选变量

```bash
# ─── API 服务器 ───────────────────────────────────────────────────
# 服务器绑定地址（默认 http://localhost:3000）
API_SERVER_URL=http://localhost:3000

# ─── OpenClaw Agent ──────────────────────────────────────────────
# WebSocket 网关地址（未设置则禁用 OpenClaw 通道）
OPENCLAW_URL=ws://192.168.3.196:3000
# 网关认证 Token（未设置则禁用 Skills/Memory/Proactive/O2O API）
OPENCLAW_TOKEN=your-openclaw-gateway-token

# ─── CosyVoice TTS ──────────────────────────────────────────────
# 阿里云 DashScope API Key（未设置则使用 Mock 模式）
COSYVOICE_API_KEY=sk-your-dashscope-api-key
# CosyVoice API 端点（可选，默认阿里云端点）
COSYVOICE_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/generation

# ─── 支付配置 ────────────────────────────────────────────────────
# 微信支付（未设置则使用 Mock）
WECHAT_MCH_ID=your-merchant-id
WECHAT_API_V3_KEY=your-api-v3-key
WECHAT_SERIAL_NO=your-certificate-serial
WECHAT_PRIVATE_KEY_PATH=/path/to/apiclient_key.pem
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/callback/wechat

# 支付宝（未设置则使用 Mock）
ALIPAY_APP_ID=your-app-id
ALIPAY_PRIVATE_KEY=your-rsa2-private-key
ALIPAY_PUBLIC_KEY=alipay-rsa2-public-key
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payment/callback/alipay
```

### 2.3 环境变量文件位置

```
ai-companion-v2/
├── apps/server/.env          # Server 环境变量（gitignore）
├── apps/server/.env.local    # 本地覆盖（gitignore）
└── apps/stage-web/.env       # 前端环境变量（gitignore）
```

---

## 三、数据库初始化

### 3.1 使用 Docker Compose（推荐）

```bash
# 进入 server 目录
cd apps/server

# 启动 PostgreSQL（含 VChord 扩展 + pgvector）
docker compose up -d db

# 等待健康检查通过
docker compose exec db pg_isready -U postgres
```

Docker Compose 配置使用 `ghcr.io/tensorchord/vchord-postgres:pg18-v1.0.0` 镜像，预装 pgvector 扩展。

### 3.2 手动安装 PostgreSQL

```bash
# 创建数据库
createdb ai_companion

# 安装 pgvector 扩展（用于记忆向量搜索）
psql -d ai_companion -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3.3 运行数据库迁移

```bash
cd apps/server

# 生成迁移文件（如有 schema 变更）
pnpm drizzle-kit generate

# 执行迁移
pnpm drizzle-kit migrate

# 或推送 schema（开发环境）
pnpm drizzle-kit push
```

### 3.4 数据库 Schema 概览

| 表名 | 说明 | 来源 |
|------|------|------|
| `user`, `session`, `account` | 用户认证（better-auth） | AIRI 原有 |
| `characters` | 角色数据 | AIRI 原有 |
| `chats`, `chat_messages` | 聊天记录 | AIRI 原有 |
| `provider_configs` | LLM 提供者配置 | AIRI 原有 |
| `wallets` | 用户钱包 | Soul Economy (R2) |
| `transactions` | 交易记录 | Soul Economy (R2) |
| `trust_records` | 信赖记录 | Soul Economy (R2) |
| `surprises` | 惊喜记录 | Soul Economy (R2) |
| `memories` | 长期记忆 | Agent Brain (R9) |
| `payment_orders` | 支付订单 | Payment (R11) |

---

## 四、OpenClaw 对接配置

### 4.1 前置条件

- OpenClaw 实例运行在 NAS（版本 2026.2.14）
- NAS 地址：192.168.3.196:3000（LAN 可达）

### 4.2 获取 Gateway Token

```bash
# 在 NAS 上执行（或通过 OpenClaw Web UI）
# 1. 访问 OpenClaw 管理界面
# 2. 进入 Settings → API Keys
# 3. 生成新的 Gateway Token
# 4. 复制到 OPENCLAW_TOKEN 环境变量
```

### 4.3 Device Pairing（首次配对）

```bash
# 首次连接需要设备配对
# 1. 启动 server 后，OpenClaw 控制台会显示配对请求
# 2. 在 NAS 的 OpenClaw 管理界面确认配对
# 3. 配对成功后自动建立 WebSocket 连接
```

### 4.4 部署 Agent 人格模板

```bash
# 将角色人格文件复制到 OpenClaw 的 agents 目录
cp -r openclaw/agents/* <NAS_OPENCLAW_PATH>/agents/

# Agent 文件结构：
# openclaw/agents/xiaoxing/   — 小星（神秘灵动型，完整 4 文件）
# openclaw/agents/xiaonuan/   — 小暖（温柔治愈型）
# openclaw/agents/keke/       — 可可（元气少女型）
# openclaw/agents/shizhi/     — 诗织（知性优雅型）
# openclaw/agents/bingtang/   — 冰棠（高冷傲娇型）
# openclaw/agents/alie/       — 阿烈（活泼阳光型）
```

### 4.5 部署 Skill 描述文件

```bash
# 将 Skill 文档复制到 OpenClaw 的 skills 目录
cp -r openclaw/skills/* <NAS_OPENCLAW_PATH>/skills/

# Skill 列表：
# trust-engine/skill.md       — 信赖引擎（3 端点）
# economy-engine/skill.md     — 经济引擎（3 端点）
# surprise-engine/skill.md    — 惊喜引擎（3 端点）
# memory-manager/skill.md     — 记忆管理（4 端点）
# memory-search/skill.md      — 记忆搜索（2 端点）
# proactive-message/skill.md  — 主动消息（2 端点）
# product-selector/skill.md   — O2O 选品
# meituan-order/skill.md      — 美团链接分享
```

### 4.6 验证连接

```bash
# 启动 server 后检查连接状态
curl http://localhost:3000/api/chat/status

# 预期响应（连接成功）：
# {
#   "channel": "openclaw",
#   "openclaw": { "connected": true, "shouldFallback": false },
#   "timestamp": "2026-03-05T..."
# }

# 预期响应（未连接）：
# {
#   "channel": "fallback",
#   "openclaw": { "connected": false, "shouldFallback": true },
#   "timestamp": "2026-03-05T..."
# }
```

---

## 五、CosyVoice TTS 配置

### 5.1 获取 API Key

1. 注册阿里云账号
2. 开通 DashScope 服务
3. 在控制台创建 API Key
4. 将 API Key 设置为 `COSYVOICE_API_KEY` 环境变量

### 5.2 音色映射

| 角色模板 | 音色 ID | 音色描述 |
|---------|---------|---------|
| gentle_healer (小暖) | longxiaochun | 温柔女声 |
| cheerful_girl (可可) | longxiaoxia | 活泼女声 |
| elegant_scholar (诗织) | longlaotie | 知性女声 |
| cool_tsundere (冰棠) | longshu | 冷酷女声 |
| mystic_spirit (小星) | longmiao | 灵动女声 |
| sunny_boy (阿烈) | longfei | 阳光男声 |

### 5.3 Mock 模式

未设置 `COSYVOICE_API_KEY` 时，TTS 自动进入 Mock 模式：
- 返回空音频数据
- 响应体包含 `mockMode: true` 标记
- 所有 API 端点正常工作，仅音频内容为空

---

## 六、支付配置

### 6.1 Mock 模式（默认）

默认使用 Mock 支付，无需任何配置：

```bash
# 创建订单（Mock 支付）
curl -X POST http://localhost:3000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session-token>" \
  -d '{"packId": "pack_68"}'

# Mock 完成支付
curl -X POST http://localhost:3000/api/payment/mock-pay/<orderId> \
  -H "Authorization: Bearer <session-token>"
```

### 6.2 切换到生产支付

**微信支付：**

1. 申请微信支付商户资质（需营业执照，5-15 工作日）
2. 获取商户证书和 API V3 密钥
3. 配置环境变量：

```bash
WECHAT_MCH_ID=1234567890
WECHAT_API_V3_KEY=your-32-char-api-v3-key
WECHAT_SERIAL_NO=certificate-serial-number
WECHAT_PRIVATE_KEY_PATH=/etc/ssl/wechat/apiclient_key.pem
WECHAT_NOTIFY_URL=https://api.your-domain.com/api/payment/callback/wechat
```

**支付宝：**

1. 注册支付宝开放平台应用
2. 获取 RSA2 密钥对
3. 配置环境变量：

```bash
ALIPAY_APP_ID=2021000000000000
ALIPAY_PRIVATE_KEY=MIIEvgIBADANBg...
ALIPAY_PUBLIC_KEY=MIIBIjANBgkqhk...
ALIPAY_NOTIFY_URL=https://api.your-domain.com/api/payment/callback/alipay
```

**注意：** 当前微信支付和支付宝的 `verifyCallback()` 为 Skeleton 实现（始终返回 false），生产部署前必须完成验签逻辑。

### 6.3 充值套餐（7 档）

| Pack ID | 价格 | 基础爱心币 | 赠送 | 首充翻倍后 |
|---------|------|-----------|------|-----------|
| pack_1 | ¥1 | 10 | 0 | 20 |
| pack_6 | ¥6 | 60 | +10 | 120+10 |
| pack_30 | ¥30 | 300 | +70 | 600+70 |
| pack_68 | ¥68 | 680 | +180 | 1360+180 |
| pack_128 | ¥128 | 1280 | +420 | 2560+420 |
| pack_328 | ¥328 | 3280 | +1020 | 6560+1020 |
| pack_648 | ¥648 | 6480 | +2520 | 12960+2520 |

---

## 七、Web 部署

### 7.1 Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在 stage-web 目录部署
cd apps/stage-web
vercel

# 设置环境变量
vercel env add VITE_API_URL production
# 输入: https://api.your-domain.com
```

**注意事项：**
- `stage-web` 是纯前端 SPA，可部署到任何静态托管
- 需配置 `VITE_API_URL` 指向后端 API 地址
- 需配置 SPA 路由回退（所有路径 → index.html）

### 7.2 Docker 部署

```bash
# 完整 Docker Compose 部署（DB + Server）
cd apps/server

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写真实配置

# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f server
```

**Server Dockerfile 说明：**
- 构建上下文为 monorepo 根目录
- 使用多阶段构建（build → production）
- 暴露端口 3000
- 健康检查：`curl -f http://localhost:3000/health`

### 7.3 独立部署

```bash
# 1. 安装依赖
pnpm install

# 2. 构建 soul-engine 包
cd packages/soul-engine && pnpm build

# 3. 构建 server
cd apps/server && pnpm build

# 4. 启动 server
node dist/index.js

# 5. 构建 stage-web
cd apps/stage-web && pnpm build

# 6. 使用 nginx/caddy 托管 stage-web/dist/
```

---

## 八、Electron 桌面版构建

### 8.1 前置条件

```bash
# 安装 Electron 二进制（可能需要代理）
cd apps/stage-tamagotchi  # 或 stage-web Electron 配置
pnpm install

# 如果 Electron 下载失败，设置镜像
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

### 8.2 开发模式

```bash
# 启动 Electron 开发模式
cd apps/stage-tamagotchi
pnpm dev
```

### 8.3 构建发布包

```bash
# 构建 Windows
pnpm build:win

# 构建 macOS
pnpm build:mac

# 构建 Linux
pnpm build:linux
```

### 8.4 桌面版特性

| 特性 | 说明 |
|------|------|
| 系统托盘 | 最小化到托盘，后台运行 |
| 系统通知 | Agent 主动消息 → 桌面通知 |
| 窗口管理 | 可调整大小 / Always on Top |
| IPC 桥 | 前端 ↔ Node.js 安全通信 |
| 自动更新 | electron-updater（待配置） |

---

## 九、监控与告警建议

### 9.1 应用监控

| 监控项 | 建议工具 | 告警阈值 |
|--------|---------|---------|
| API 响应时间 | Prometheus + Grafana | P95 > 500ms |
| 错误率 | Sentry | > 1% / 5min |
| 内存使用 | Node.js metrics | > 500MB |
| CPU 使用率 | Node.js metrics | > 80% 持续 5min |
| WebSocket 连接数 | 自定义 metrics | > 1000 |

### 9.2 数据库监控

| 监控项 | 建议工具 | 告警阈值 |
|--------|---------|---------|
| 连接池使用率 | pg_stat_activity | > 80% |
| 慢查询 | pg_stat_statements | > 1s |
| 磁盘使用 | OS metrics | > 80% |
| 死锁检测 | pg_stat_activity | 发生即告警 |

### 9.3 OpenClaw 监控

| 监控项 | 方式 | 告警条件 |
|--------|------|---------|
| WebSocket 连接状态 | GET /api/chat/status | connected = false |
| 降级模式激活 | 日志 + 状态检查 | 进入降级模式 |
| Agent 响应延迟 | SSE 首 token 时间 | > 3s |
| Heartbeat 心跳 | 30s 间隔 | 超时 > 10s |

### 9.4 业务监控

| 监控项 | 说明 | 告警条件 |
|--------|------|---------|
| 充值成功率 | 创建订单 → 到账 | < 95% |
| 支付回调延迟 | 支付 → 回调到达 | > 30s |
| 送礼失败率 | 余额不足 / 系统错误 | > 5% |
| TTS 可用性 | Mock vs 真实 | Mock 模式持续 > 24h |

---

## 十、故障排查指南

### 10.1 常见问题

#### Server 启动失败

```
问题: Invalid environment variables
原因: 必填环境变量缺失
解决: 检查 DATABASE_URL, AUTH_GOOGLE_*, AUTH_GITHUB_* 是否已配置
```

#### 数据库连接失败

```
问题: ECONNREFUSED 5432
原因: PostgreSQL 未启动或地址错误
解决:
1. docker compose up -d db
2. 检查 DATABASE_URL 地址和端口
3. 确认 pg_hba.conf 允许连接
```

#### OpenClaw 连接失败

```
问题: chat/status 返回 "channel": "fallback"
原因: WebSocket 连接未建立
解决:
1. 确认 NAS 网络可达: ping 192.168.3.196
2. 确认 OpenClaw 运行中: curl http://192.168.3.196:3000
3. 检查 OPENCLAW_URL 和 OPENCLAW_TOKEN 配置
4. 检查 Device Pairing 是否完成
```

#### TTS 返回空音频

```
问题: synthesize 返回 mockMode: true
原因: CosyVoice API Key 未配置
解决: 设置 COSYVOICE_API_KEY 环境变量
注意: Mock 模式不影响其他功能
```

#### 支付回调未到达

```
问题: 支付成功但余额未增加
原因: 回调 URL 不可达或验签失败
解决:
1. 确认回调 URL 公网可访问
2. 检查 HTTPS 证书有效性
3. 查看 payment-service 日志
4. Mock 模式下使用 /mock-pay/:id 手动完成
```

#### 限频 429 错误

```
问题: 频繁 429 Too Many Requests
原因: 超过端点限频阈值
解决:
1. charge: 最多 5 次/分钟
2. gift: 最多 10 次/分钟
3. query: 最多 60 次/分钟
4. 等待 retryAfter 秒后重试
```

### 10.2 日志位置

| 日志 | 位置 | 说明 |
|------|------|------|
| Server 应用日志 | stdout/stderr | @guiiai/logg 输出 |
| PostgreSQL 日志 | Docker: /var/lib/postgresql/data/log/ | 数据库日志 |
| Nginx/Caddy 日志 | /var/log/nginx/ 或 /var/log/caddy/ | 反向代理 |
| OpenClaw 日志 | NAS Docker 容器日志 | Agent 行为 |

### 10.3 健康检查端点

```bash
# Server 健康检查
curl http://localhost:3000/health

# OpenClaw 通道状态
curl http://localhost:3000/api/chat/status

# 推送系统状态
curl -H "X-OpenClaw-Token: <token>" http://localhost:3000/api/proactive/status
```

---

## 附录 A：一键启动（开发环境）

```bash
# 克隆项目
git clone <repo-url> ai-companion-v2
cd ai-companion-v2

# 安装依赖（跳过 Electron postinstall 避免超时）
pnpm install --ignore-scripts

# 启动数据库
cd apps/server && docker compose up -d db

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写至少必填变量

# 推送数据库 Schema
pnpm drizzle-kit push

# 构建 soul-engine
cd ../../packages/soul-engine && pnpm build

# 启动 Server（端口 3000）
cd ../../apps/server && pnpm dev

# 新终端：启动前端（端口 3003 或自动分配）
cd apps/stage-web && pnpm dev
```

## 附录 B：生产部署检查清单

- [ ] PostgreSQL 已部署且可连接
- [ ] 数据库迁移已执行
- [ ] 所有必填环境变量已配置
- [ ] CORS 白名单已配置（参见安全审计 S2）
- [ ] HTTPS 证书已配置
- [ ] 支付回调 URL 公网可达
- [ ] 微信/支付宝验签已实现（非 Skeleton）
- [ ] OpenClaw Token 已配置（如需 Agent 功能）
- [ ] CosyVoice API Key 已配置（如需 TTS）
- [ ] 监控告警已配置
- [ ] 日志收集已配置
- [ ] 备份策略已配置
- [ ] 未成年人消费限额已启用
- [ ] 隐私政策已部署
