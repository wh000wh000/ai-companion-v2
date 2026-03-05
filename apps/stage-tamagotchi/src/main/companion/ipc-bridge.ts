/**
 * AI 伴侣 - IPC 通信桥
 *
 * 主进程 <-> 渲染进程之间的通信桥接层。
 * 基于 AIRI 的 eventa 事件系统实现类型安全的 IPC 通信。
 *
 * 通信渠道：
 * - wallet:getBalance      获取钱包余额
 * - wallet:recharge        发起充值
 * - trust:getLevel         获取信赖等级
 * - agent:push             Agent 推送消息（主进程 → 渲染进程）
 * - agent:getPending       获取待处理推送消息
 * - agent:dismiss          确认/清除推送消息
 * - notification:show      显示系统原生通知
 */

import type { BrowserWindow } from 'electron'

import type {
  AgentPushMessage,
  NotificationPayload,
  TrustLevel,
  WalletBalance,
  WalletRechargePayload,
  WalletRechargeResult,
} from '../../shared/eventa'

import { useLogg } from '@guiiai/logg'
import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { ipcMain } from 'electron'

import {
  agentDismissMessage,
  agentGetPendingMessages,
  agentPush,
  notificationShow,
  trustGetLevel,
  trustLevelChanged,
  walletBalanceChanged,
  walletGetBalance,
  walletRecharge,
} from '../../shared/eventa'
import { showAgentNotification } from './notifications'
import { updateCachedBalance, updateCachedTrustLevel } from './tray'

const log = useLogg('companion/ipc-bridge').useGlobalConfig()

// ============================================================================
// 数据存储（内存中，后续可替换为持久化层）
// ============================================================================

/** 钱包余额 */
let currentBalance: WalletBalance = {
  balance: 0,
  currency: 'CNY',
  isFirstCharge: true,
}

/** 信赖等级 */
let currentTrustLevel: TrustLevel = {
  currentValue: 0,
  levelName: '陌生人',
  levelIndex: 0,
  nextLevelThreshold: 100,
  progressPercent: 0,
}

/** 待处理的 Agent 推送消息 */
const pendingAgentMessages: AgentPushMessage[] = []

// ============================================================================
// 充值档位配置（对应 TRUTH_TABLE 中的7档定义）
// ============================================================================

/** 充值档位定义 */
const RECHARGE_TIERS = [
  { index: 0, price: 100, coins: 100, label: '1 元' },       // 1元 = 100分
  { index: 1, price: 600, coins: 600, label: '6 元' },       // 6元
  { index: 2, price: 2800, coins: 2800, label: '28 元' },    // 28元
  { index: 3, price: 6800, coins: 6800, label: '68 元' },    // 68元
  { index: 4, price: 12800, coins: 12800, label: '128 元' }, // 128元
  { index: 5, price: 32800, coins: 32800, label: '328 元' }, // 328元
  { index: 6, price: 64800, coins: 64800, label: '648 元' }, // 648元
] as const

// ============================================================================
// IPC 处理器设置
// ============================================================================

/**
 * 设置所有 IPC 通信处理器
 *
 * 将 eventa 定义的事件绑定到具体的处理逻辑。
 * 返回清理函数，在窗口销毁时调用以避免内存泄漏。
 *
 * @param mainWindow - 主窗口实例，用于建立 eventa context
 * @returns 清理函数
 */
export function setupIpcHandlers(mainWindow: BrowserWindow): () => void {
  const { context } = createContext(ipcMain, mainWindow)
  const cleanups: Array<() => void> = []

  log.log('正在注册 AI 伴侣 IPC 处理器...')

  // --------------------------------------------------------------------------
  // 钱包相关处理器
  // --------------------------------------------------------------------------

  // 获取钱包余额
  cleanups.push(
    defineInvokeHandler(context, walletGetBalance, () => {
      log.log('渲染进程请求钱包余额', { balance: currentBalance.balance })
      return currentBalance
    }),
  )

  // 发起充值
  cleanups.push(
    defineInvokeHandler(context, walletRecharge, (payload: WalletRechargePayload) => {
      log.log('渲染进程发起充值请求', { tierIndex: payload.tierIndex, paymentMethod: payload.paymentMethod })

      // 验证充值档位
      const tier = RECHARGE_TIERS[payload.tierIndex]
      if (!tier) {
        return {
          success: false,
          newBalance: currentBalance.balance,
          message: `无效的充值档位: ${payload.tierIndex}`,
        }
      }

      // 计算实际到账金额（首充双倍）
      let actualCoins = tier.coins
      if (currentBalance.isFirstCharge) {
        actualCoins *= 2
        log.log('首充双倍生效', { originalCoins: tier.coins, actualCoins })
      }

      // 更新余额（实际项目中这里应调用支付服务）
      currentBalance = {
        balance: currentBalance.balance + actualCoins,
        currency: currentBalance.currency,
        isFirstCharge: false, // 首充标记消费后置为 false
      }

      // 同步更新托盘缓存
      updateCachedBalance(currentBalance)

      // 通知渲染进程余额已变化
      if (!mainWindow.isDestroyed()) {
        context.emit(walletBalanceChanged, currentBalance)
      }

      log.log('充值成功', { newBalance: currentBalance.balance, added: actualCoins })

      const result: WalletRechargeResult = {
        success: true,
        newBalance: currentBalance.balance,
        message: currentBalance.isFirstCharge
          ? undefined
          : `充值成功！到账 ${actualCoins} 币`,
      }

      return result
    }),
  )

  // --------------------------------------------------------------------------
  // 信赖等级相关处理器
  // --------------------------------------------------------------------------

  // 获取信赖等级
  cleanups.push(
    defineInvokeHandler(context, trustGetLevel, () => {
      log.log('渲染进程请求信赖等级', { level: currentTrustLevel.levelName })
      return currentTrustLevel
    }),
  )

  // --------------------------------------------------------------------------
  // Agent 推送相关处理器
  // --------------------------------------------------------------------------

  // 获取待处理推送消息
  cleanups.push(
    defineInvokeHandler(context, agentGetPendingMessages, () => {
      return [...pendingAgentMessages]
    }),
  )

  // 确认/清除推送消息
  cleanups.push(
    defineInvokeHandler(context, agentDismissMessage, (params: { id: string }) => {
      const index = pendingAgentMessages.findIndex(m => m.id === params.id)
      if (index !== -1) {
        pendingAgentMessages.splice(index, 1)
        log.log('Agent 消息已确认', { id: params.id })
      }
    }),
  )

  // --------------------------------------------------------------------------
  // 通知相关处理器
  // --------------------------------------------------------------------------

  // 显示系统通知
  cleanups.push(
    defineInvokeHandler(context, notificationShow, (payload: NotificationPayload) => {
      showAgentNotification(payload.title, payload.body, payload.icon)
    }),
  )

  log.log('AI 伴侣 IPC 处理器注册完成', {
    handlerCount: cleanups.length,
  })

  // --------------------------------------------------------------------------
  // 返回清理函数
  // --------------------------------------------------------------------------

  const cleanup = () => {
    log.log('正在清理 AI 伴侣 IPC 处理器...')
    for (const fn of cleanups) fn()
    log.log('AI 伴侣 IPC 处理器已清理')
  }

  mainWindow.on('closed', cleanup)

  return cleanup
}

// ============================================================================
// 供主进程内部调用的辅助方法
// ============================================================================

/**
 * 从主进程侧更新信赖等级（例如 Agent 回调触发）
 *
 * @param newLevel - 新的信赖等级数据
 * @param mainWindow - 主窗口实例，用于通知渲染进程
 */
export function updateTrustLevel(newLevel: TrustLevel, mainWindow?: BrowserWindow): void {
  const oldLevel = currentTrustLevel.levelIndex
  currentTrustLevel = newLevel

  // 同步更新托盘缓存
  updateCachedTrustLevel(newLevel)

  // 升级时发送系统通知
  if (newLevel.levelIndex > oldLevel) {
    showAgentNotification(
      '信赖等级提升！',
      `恭喜！信赖等级提升至「${newLevel.levelName}」`,
    )
  }

  // 通知渲染进程
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { context } = createContext(ipcMain, mainWindow)
    context.emit(trustLevelChanged, newLevel)
  }

  log.log('信赖等级已更新', {
    level: newLevel.levelName,
    value: newLevel.currentValue,
  })
}

/**
 * 从主进程侧更新钱包余额（例如服务端同步）
 *
 * @param newBalance - 新的钱包余额
 * @param mainWindow - 主窗口实例
 */
export function updateWalletBalance(newBalance: WalletBalance, mainWindow?: BrowserWindow): void {
  currentBalance = newBalance
  updateCachedBalance(newBalance)

  if (mainWindow && !mainWindow.isDestroyed()) {
    const { context } = createContext(ipcMain, mainWindow)
    context.emit(walletBalanceChanged, newBalance)
  }

  log.log('钱包余额已更新', { balance: newBalance.balance })
}

/**
 * 从主进程侧推送 Agent 消息
 *
 * @param message - 推送消息（不含 id 和 timestamp，自动生成）
 * @param mainWindow - 主窗口实例
 */
export function pushAgentMessageFromMain(
  message: Omit<AgentPushMessage, 'id' | 'timestamp'>,
  mainWindow?: BrowserWindow,
): AgentPushMessage {
  const fullMessage: AgentPushMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  // 添加到待处理队列
  pendingAgentMessages.push(fullMessage)
  if (pendingAgentMessages.length > 100) {
    pendingAgentMessages.splice(0, pendingAgentMessages.length - 100)
  }

  // 显示系统通知
  showAgentNotification(fullMessage.title, fullMessage.body, fullMessage.icon)

  // 转发给渲染进程
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { context } = createContext(ipcMain, mainWindow)
    context.emit(agentPush, fullMessage)
  }

  log.log('Agent 消息已推送', { id: fullMessage.id, type: fullMessage.type })

  return fullMessage
}

/**
 * 获取当前钱包余额（供主进程内部使用）
 */
export function getCurrentBalance(): WalletBalance {
  return { ...currentBalance }
}

/**
 * 获取当前信赖等级（供主进程内部使用）
 */
export function getCurrentTrustLevel(): TrustLevel {
  return { ...currentTrustLevel }
}
