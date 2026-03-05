# AI 伴侣桌面版 - 构建指南

基于 AIRI stage-tamagotchi Electron 应用，集成 AI 伴侣经济系统功能。

## 前置条件

- Node.js >= 20.x
- pnpm >= 9.x
- 项目根目录执行 `pnpm install` 完成依赖安装

## 开发模式

```bash
# 在 monorepo 根目录
pnpm --filter @proj-airi/stage-tamagotchi dev

# 或进入目录直接运行
cd apps/stage-tamagotchi
pnpm dev
```

开发模式下 DevTools 自动打开，支持热更新。

## 构建打包

### Windows NSIS 安装包

```bash
pnpm --filter @proj-airi/stage-tamagotchi build:win
```

配置要点（`electron-builder.config.ts`）：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `nsis.oneClick` | `false` | 非一键安装，用户可选安装路径 |
| `nsis.allowToChangeInstallationDirectory` | `true` | 允许修改安装目录 |
| `nsis.createDesktopShortcut` | `'always'` | 始终创建桌面快捷方式 |
| `nsis.deleteAppDataOnUninstall` | `true` | 卸载时清除应用数据 |
| `win.executableName` | `'airi'` | 可执行文件名 |

输出路径：`apps/stage-tamagotchi/dist/`

产物命名：`AIRI-{version}-windows-{arch}-setup.exe`

### macOS DMG 镜像

```bash
pnpm --filter @proj-airi/stage-tamagotchi build:mac
```

配置要点：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `mac.hardenedRuntime` | `true` | 启用强化运行时（正式发布必需） |
| `mac.notarize` | `true` | 启用公证（需 Apple Developer 账号） |
| `mac.entitlementsInherit` | `build/entitlements.mac.plist` | 继承权限配置 |

本地测试时如无 Apple Developer 账号，需在 `electron-builder.config.ts` 中将 `hardenedRuntime` 和 `notarize` 改为 `false`。

产物命名：`AIRI-{version}-darwin-{arch}.dmg`

### Linux 打包

```bash
pnpm --filter @proj-airi/stage-tamagotchi build:linux
```

默认生成 `.deb` 和 `.rpm` 两种格式。

## 自动更新机制

自动更新使用 `electron-updater` + GitHub Releases：

```
publish:
  provider: github
  owner: moeru-ai
  repo: airi
```

### 更新流程

1. **检查更新**：应用启动时自动调用 `autoUpdater.checkForUpdates()`
2. **下载更新**：发现新版本后后台下载，通过 `download-progress` 事件报告进度
3. **安装更新**：下载完成后提示用户，调用 `quitAndInstall()` 退出并安装
4. **状态流转**：`idle → checking → available → downloading → downloaded`

### 本地测试更新

开发模式下使用 `MockAutoUpdater`（见 `src/main/services/electron/mock-auto-updater.ts`），不会触发真实更新。

测试真实更新流程需：
1. 配置 `dev-app-update.yml` 指向测试 Release
2. 打包正式版（非 dev）运行

## 环境变量

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `PORT` | WebSocket 服务端口 | `6121` |
| `SERVER_RUNTIME_HOSTNAME` | 服务监听地址 | `0.0.0.0` |
| `MAIN_APP_DEBUG` | 强制开启主窗口 DevTools | - |
| `APP_DEBUG` | 强制开启 DevTools + 调试菜单 | - |

### AI 伴侣专用变量

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `COMPANION_API_URL` | AI 伴侣后端 API 地址 | `http://localhost:3003/api` |
| `COMPANION_WS_URL` | Agent 推送通知 WebSocket 地址 | `ws://localhost:3003/ws/notifications` |
| `COMPANION_AUTH_TOKEN` | 认证令牌 | - |
| `COMPANION_AUTO_START` | 是否默认开机自启 | `false` |

## 开机自启

通过 `setupAutoStart()` 配置：

- **Windows**：写入注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- **macOS**：添加到 Login Items
- **Linux**：创建 `~/.config/autostart/` 下的 .desktop 文件

开发模式下自动跳过开机自启配置。

## 项目结构（AI 伴侣扩展部分）

```
apps/stage-tamagotchi/
├── src/
│   ├── main/
│   │   ├── companion/               # AI 伴侣经济系统模块
│   │   │   ├── index.ts             # 模块聚合入口
│   │   │   ├── notifications.ts     # 系统通知集成
│   │   │   ├── tray.ts              # 系统托盘扩展
│   │   │   ├── window-manager.ts    # 窗口管理（角色/对话/置顶/自启）
│   │   │   └── ipc-bridge.ts        # IPC 通信桥（钱包/信赖/推送/通知）
│   │   ├── index.ts                 # Electron 主入口（AIRI 原有）
│   │   └── tray/                    # AIRI 原有托盘
│   ├── shared/
│   │   └── eventa.ts                # IPC 事件定义（含伴侣系统扩展）
│   └── preload/
│       └── index.ts                 # Preload 脚本
├── electron-builder.config.ts       # 打包配置
└── BUILD_GUIDE.md                   # 本文档
```

## 与 AIRI 原有模块的关系

AI 伴侣模块设计为**非侵入式扩展**：

1. **不修改** AIRI 原有的 `src/main/tray/index.ts`，而是提供 `buildCompanionMenuItems()` 可组合菜单
2. **不修改** AIRI 原有的 `src/main/index.ts` 入口，通过 `injeca` 依赖注入挂载
3. **共享** eventa 事件定义，在 `src/shared/eventa.ts` 中追加伴侣系统事件
4. **复用** AIRI 的窗口管理模式（`createReusableWindow`）和持久化配置（`createConfig`）
