/**
 * AI 伴侣 - 经济系统桌面版集成入口
 *
 * 本模块聚合 AI 伴侣经济系统在 Electron 桌面版中的所有功能：
 * - 系统通知：接收 Agent 推送 → 转为原生通知
 * - 系统托盘：钱包/信赖等级菜单
 * - 窗口管理：角色窗口/对话弹窗/置顶/开机自启
 * - IPC 通信桥：主进程 ↔ 渲染进程双向通信
 */

export {
  pushAgentMessage,
  setupNotificationChannel,
  setupNotificationIpcHandlers,
  showAgentNotification,
} from './notifications'

export {
  buildCompanionMenuItems,
  refreshTrayMenu,
  setupCompanionTray,
  updateCachedBalance,
  updateCachedTrustLevel,
} from './tray'

export {
  createChatPopup,
  createCompanionWindow,
  getAutoStartEnabled,
  setupAlwaysOnTop,
  setupAutoStart,
} from './window-manager'

export {
  getCurrentBalance,
  getCurrentTrustLevel,
  pushAgentMessageFromMain,
  setupIpcHandlers,
  updateTrustLevel,
  updateWalletBalance,
} from './ipc-bridge'
