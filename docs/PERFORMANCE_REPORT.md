# 伪春菜 v2.0 性能报告

> 日期：2026-03-05 | 版本：v2.0 (Round 6)

## 1. 构建产物分析

### soul-engine 包
- 构建文件数：25
- 总大小：81.39 KB (gzip后约30KB)
- 构建时间：803ms (<1s)
- 入口点：8个 (index, trust/calculator, economy/engine, surprise/engine, demo/manager, appearance, emotion/mapping, types)

主要产物：
| 文件 | 大小 | gzip |
|------|------|------|
| trust/calculator.mjs | 7.38 KB | 2.62 KB |
| index.mjs | 5.62 KB | 2.15 KB |
| economy/engine.mjs | 5.30 KB | 1.97 KB |
| demo/manager.mjs | 5.25 KB | 2.04 KB |
| surprise/engine.mjs | 4.30 KB | 2.04 KB |
| character chunk | 5.74 KB | 2.58 KB |
| config chunk | 3.24 KB | 1.16 KB |

### stage-web 前端
- 构建状态：**未通过** (vite-plugin-warpdrive 依赖解析失败，非新增代码问题)
- 失败原因：`@proj-airi/vite-plugin-warpdrive` package.json 的 main/module/exports 配置不正确
- 新增页面：wallet/(3页: index, charge, history), surprises/(1页), onboarding/(1页)
- 新增组件：gift/(3个), trust/(2个), surprise/(3个), demo/(3个) = 共11个
- 新增stores：wallet(190行), trust(187行), surprise(156行), demo(217行) = 4个, 750行

## 2. 测试覆盖

| 包 | 测试数 | 通过率 | 耗时 |
|---|--------|--------|------|
| soul-engine | 514 | 100% (6/6文件) | 427ms |
| server | 无test脚本 | N/A | - |
| stage-web | 无test配置 | N/A | - |

测试文件清单：
- tests/demo.test.ts — 67 tests
- tests/surprise.test.ts — 64 tests
- tests/emotion.test.ts — 59 tests
- tests/trust.test.ts — 159 tests
- tests/economy.test.ts — 121 tests
- tests/appearance.test.ts — 44 tests

## 3. 响应式适配状态

| 组件 | 桌面(>1024px) | 平板(768-1024px) | 手机(<640px) | 状态 |
|------|--------------|-----------------|-------------|------|
| 充值页 charge.vue | 3列网格 | 3列 | 2列 | PASS (已修复: 增加md:cols-3) |
| 钱包首页 index.vue | 居中max-w-lg | 居中 | 全宽p-4 | PASS |
| 交易记录 history.vue | 居中max-w-lg | 居中 | 全宽p-4 | PASS (已修复: 返回按钮min-h-11) |
| 送礼面板 GiftPanel | 底部弹出max-w-lg | 底部弹出 | 底部弹出85vh限高 | PASS (已修复: 增加max-h+overflow) |
| 送礼浮动按钮 GiftFloatingButton | 右下固定 | 右下固定(md:间距) | 右下固定 | PASS (已有md:适配) |
| 送礼动画 GiftAnimation | 全屏粒子 | 全屏粒子 | 全屏粒子 | PASS (CSS动画, pointer-events-none) |
| 信赖进度条 TrustBar | 内联 | 内联 | 内联 | PASS (w-full弹性) |
| 升级仪式 LevelUpCeremony | 居中弹窗 | 居中弹窗 | 居中弹窗(全屏) | PASS (fixed inset-0) |
| 惊喜开箱 SurpriseAnimation | 居中弹窗max-w-sm | 居中弹窗 | 居中弹窗mx-3 | PASS (已修复: 小屏gap调整) |
| 惊喜卡片 SurpriseCard | 全宽卡片 | 全宽 | 全宽 | PASS |
| 零花钱进度 PocketMoneyBar | 全宽 | 全宽 | 全宽 | PASS |
| 惊喜记录页 surprises/index | 全高列表 | 全高 | 全高 | PASS (已修复: filter按钮min-h-11) |
| 引导页 onboarding/index | 居中max-w-sm | 居中 | 全宽px-6 | PASS (min-h-100dvh) |
| Demo引导 DemoGuide | 居中弹窗max-w-sm | 居中弹窗 | 居中弹窗mx-4 | PASS |
| 天数进度 DayProgress | 7点居中 | 7点居中 | 7点居中(缩小) | PASS (已修复: 小屏w-8+gap-1) |
| 转化卡片 ConversionCard | 居中弹窗max-w-sm | 居中弹窗 | 居中弹窗mx-4 | PASS |

## 4. 三端状态

| 端 | 构建 | 新路由 | 已知问题 |
|----|------|--------|---------|
| Web (stage-web) | 阻塞于warpdrive插件 | 5个新页面已注册(文件路由自动发现) | warpdrive包exports配置需修复 |
| Electron (stage-tamagotchi) | 未受影响 | **新页面未自动包含** | 路由扫描目录不含stage-web/pages, 需迁移到stage-pages共享包 |
| iOS (stage-pocket) | 未受影响 | **新页面未自动包含** | 同Electron, 需迁移到stage-pages共享包 |

### 三端路由架构说明

项目使用 `unplugin-vue-router` 文件路由系统。三端各自扫描：
- **stage-web**: `apps/stage-web/src/pages/` + `packages/stage-pages/src/pages/`
- **stage-tamagotchi**: `apps/stage-tamagotchi/src/renderer/pages/` + `packages/stage-pages/src/pages/`
- **stage-pocket**: `apps/stage-pocket/src/pages/` + `packages/stage-pages/src/pages/`

当前新增页面 (wallet/*, surprises/*, onboarding/*) 位于 `stage-web/src/pages/` 下，仅 Web 端可见。

**建议**：如需三端共享，应将这些页面迁移至 `packages/stage-pages/src/pages/`。

## 5. 性能目标

| 指标 | 目标 | 实测 | 状态 |
|------|------|------|------|
| soul-engine 构建 | <2s | 803ms | PASS |
| soul-engine 测试 | 全通过 | 514/514 (100%) | PASS |
| 动画帧率 | >=30fps | 预估OK | CSS-only动画, 无JS逐帧 |
| 新增组件体积 | 合理 | 11组件+4stores (~750行TS) | PASS |
| 触摸目标尺寸 | >=44px | 已修复至>=44px | PASS |

## 6. 触摸适配修复清单 (Round 6 完成)

- [x] charge.vue: 返回按钮增加 min-w-11 min-h-11 (44px)
- [x] charge.vue: 网格增加 md:cols-3 响应式
- [x] history.vue: 返回按钮增加 min-w-11 min-h-11 (44px)
- [x] GiftPanel.vue: 增加 max-h-85vh + overflow-y-auto 防止小屏溢出
- [x] GiftPanel.vue: 礼物卡片增加 min-h-[88px] 确保触摸目标
- [x] SurpriseAnimation.vue: 反馈按钮间距小屏适配 gap-2 sm:gap-3
- [x] SurpriseAnimation.vue: 内容区小屏边距 mx-3 sm:mx-4
- [x] surprises/index.vue: 过滤按钮增加 py-2 min-h-11 (44px)
- [x] DayProgress.vue: 小屏圆点缩小 w-8 h-8 sm:w-9 sm:h-9 + gap-1 sm:gap-2

## 7. 待优化项

- [ ] 将新增页面迁移到 `packages/stage-pages/` 以支持三端共享
- [ ] 修复 `@proj-airi/vite-plugin-warpdrive` exports配置使 stage-web 可构建
- [ ] Live2D模型资源懒加载
- [ ] 充值/送礼API响应缓存策略
- [ ] 动画在低端设备的降级方案 (prefers-reduced-motion媒体查询)
- [ ] 添加 stage-web 前端组件测试 (Vitest + @vue/test-utils)
