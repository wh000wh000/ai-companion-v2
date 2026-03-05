# v2.5 性能基准报告

> 日期：2026-03-05
> 状态：基准定义完成（待实测填充数据）

---

## 测试环境

| 项目 | 规格 |
|------|------|
| 服务器 | 本地开发环境 (Windows 11) |
| 数据库 | PostgreSQL (PGlite for tests) |
| OpenClaw | 192.168.3.196:3000 (NAS, 待连接) |
| LLM | MiniMax-M2.5 via OpenClaw |
| TTS | CosyVoice V2 (Mock模式) |

---

## API 响应延迟 (目标 / 实测)

| 端点 | 方法 | 目标P99 | 实测P99 | 状态 |
|------|------|--------|---------|------|
| /api/wallet | GET | < 50ms | 待测 | — |
| /api/wallet/charge | POST | < 200ms | 待测 | — |
| /api/wallet/gift | POST | < 300ms | 待测 | — |
| /api/trust/:id | GET | < 50ms | 待测 | — |
| /api/trust/checkin | POST | < 200ms | 待测 | — |
| /api/surprises/check | POST | < 100ms | 待测 | — |
| /api/chat (OpenClaw) | POST | < 3s(首token) | 待测 | — |
| /api/chat (fallback) | POST | < 2s(首token) | 待测 | — |
| /api/tts/synthesize | POST | < 2s | Mock: ~0ms | Mock模式 |
| /api/skills/* | * | < 100ms | 待测 | — |
| /api/memory/search | POST | < 200ms | 待测 | — |

## 内存使用

| 场景 | 目标 | 实测 | 状态 |
|------|------|------|------|
| Server进程空闲 | < 100MB | 待测 | — |
| Server 10并发请求 | < 200MB | 待测 | — |
| Web前端首次加载 | < 50MB | 待测 | — |
| Web + Live2D渲染 | < 300MB | 待测 | — |
| Electron桌面版 | < 300MB | 待测 | — |

## 测试总结

| 指标 | 值 |
|------|------|
| soul-engine 测试 | 559 passed |
| server 测试 | 130 passed |
| 总测试数 | 689 |
| 通过率 | 100% |
| TypeScript错误(新增文件) | 0 |

## 已知瓶颈

1. **数据库迁移**: PGlite(测试)→PostgreSQL(生产)迁移未验证
2. **OpenClaw延迟**: 待实际连接后测量，预期LAN延迟~2ms
3. **TTS延迟**: CosyVoice实际延迟未知(Mock模式中)
4. **Live2D性能**: 移动端帧率需实测
5. **向量搜索**: 当前使用LIKE替代pgvector，性能有差距

## 下一步

- 配置OpenClaw实例后重测Agent相关延迟
- 配置CosyVoice后重测TTS延迟
- 部署PostgreSQL后重测数据库延迟
- 三端(Web/Electron/iOS)性能实测
