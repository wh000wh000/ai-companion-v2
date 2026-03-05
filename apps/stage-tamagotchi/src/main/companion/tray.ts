/**
 * AI 伴侣 - 系统托盘配置
 *
 * 在 AIRI 原有系统托盘基础上，扩展 AI 伴侣经济系统相关菜单项：
 * - 显示/隐藏主窗口
 * - 打开钱包
 * - 查看信赖等级
 * - 退出
 *
 * 注意：本模块不替换 AIRI 原有托盘，而是提供可组合的菜单项生成器，
 * 允许在原有托盘菜单中插入伴侣系统条目。
 */

import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'

import type { TrustLevel, WalletBalance } from '../../shared/eventa'

import { useLogg } from '@guiiai/logg'
import { app, Menu, nativeImage, Tray } from 'electron'
import { isMacOS } from 'std-env'

import { onAppBeforeQuit } from '../libs/bootkit/lifecycle'
import { toggleWindowShow } from '../windows/shared/window'

const log = useLogg('companion/tray').useGlobalConfig()

/** 信赖等级名称映射 */
const TRUST_LEVEL_NAMES: Record<number, string> = {
  0: '陌生人',
  1: '认识',
  2: '熟悉',
  3: '朋友',
  4: '好友',
  5: '挚友',
  6: '知己',
  7: '灵魂伴侣',
}

/** 钱包余额缓存 */
let cachedBalance: WalletBalance | null = null

/** 信赖等级缓存 */
let cachedTrustLevel: TrustLevel | null = null

/**
 * 格式化钱包余额显示文本
 */
function formatBalance(balance: WalletBalance): string {
  const yuan = (balance.balance / 100).toFixed(2)
  return `${yuan} 元`
}

/**
 * 格式化信赖等级显示文本
 */
function formatTrustLevel(trust: TrustLevel): string {
  const name = trust.levelName || TRUST_LEVEL_NAMES[trust.levelIndex] || '未知'
  return `${name} (${trust.currentValue}/${trust.nextLevelThreshold})`
}

/**
 * 更新缓存的钱包余额
 */
export function updateCachedBalance(balance: WalletBalance): void {
  cachedBalance = balance
}

/**
 * 更新缓存的信赖等级
 */
export function updateCachedTrustLevel(trust: TrustLevel): void {
  cachedTrustLevel = trust
}

/**
 * 生成 AI 伴侣经济系统专属的菜单项
 * 可以在 AIRI 原有托盘菜单中插入这些条目
 */
export function buildCompanionMenuItems(params: {
  mainWindow: BrowserWindow
  onOpenWallet?: () => void
  onOpenTrustDetail?: () => void
}): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [
    { type: 'separator' },
    {
      type: 'submenu',
      label: 'AI 伴侣',
      submenu: Menu.buildFromTemplate([
        {
          label: cachedBalance
            ? `钱包余额: ${formatBalance(cachedBalance)}`
            : '钱包余额: 加载中...',
          enabled: !!params.onOpenWallet,
          click: () => params.onOpenWallet?.(),
        },
        {
          label: cachedTrustLevel
            ? `信赖等级: ${formatTrustLevel(cachedTrustLevel)}`
            : '信赖等级: 加载中...',
          enabled: !!params.onOpenTrustDetail,
          click: () => params.onOpenTrustDetail?.(),
        },
        { type: 'separator' },
        {
          label: cachedBalance?.isFirstCharge === false ? '首充双倍！' : '充值',
          click: () => params.onOpenWallet?.(),
        },
      ]),
    },
  ]

  return items
}

/**
 * 创建独立的 AI 伴侣系统托盘
 *
 * 包含完整的伴侣系统菜单：
 * - 显示/隐藏主窗口
 * - 打开钱包
 * - 查看信赖等级
 * - 退出应用
 *
 * @param params - 托盘配置参数
 * @returns Tray 实例
 */
export function setupCompanionTray(params: {
  mainWindow: BrowserWindow
  iconPath: string
  onOpenWallet?: () => void
  onOpenTrustDetail?: () => void
  onOpenChat?: () => void
}): Tray {
  const trayImage = nativeImage.createFromPath(params.iconPath).resize({ width: 16 })
  if (isMacOS) {
    trayImage.setTemplateImage(true)
  }

  const tray = new Tray(trayImage)

  // 构建托盘右键菜单
  function rebuildMenu(): void {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => toggleWindowShow(params.mainWindow),
      },
      { type: 'separator' },
      {
        label: '打开对话',
        click: () => {
          params.onOpenChat?.()
          toggleWindowShow(params.mainWindow)
        },
      },
      { type: 'separator' },
      {
        label: cachedBalance
          ? `钱包: ${formatBalance(cachedBalance)}`
          : '钱包: --',
        click: () => params.onOpenWallet?.(),
      },
      {
        label: cachedTrustLevel
          ? `信赖: ${formatTrustLevel(cachedTrustLevel)}`
          : '信赖: --',
        click: () => params.onOpenTrustDetail?.(),
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => app.quit(),
      },
    ])

    tray.setContextMenu(contextMenu)
  }

  // 初始构建菜单
  rebuildMenu()

  // 设置提示文本
  tray.setToolTip('AI 伴侣')

  // 单击托盘图标显示/隐藏主窗口
  tray.addListener('click', () => toggleWindowShow(params.mainWindow))

  // macOS 双击事件
  if (isMacOS) {
    tray.addListener('double-click', () => toggleWindowShow(params.mainWindow))
  }

  // 应用退出时销毁托盘
  onAppBeforeQuit(() => {
    tray.destroy()
  })

  log.log('AI 伴侣系统托盘已创建')

  // 返回托盘实例，外部可用于后续更新菜单
  return tray
}

/**
 * 刷新托盘菜单（当余额或信赖等级变化时调用）
 *
 * 注意：Electron 的 Tray 不支持动态更新单个菜单项，
 * 需要重建整个菜单。此函数供外部在数据变化时重建。
 */
export function refreshTrayMenu(tray: Tray, params: {
  mainWindow: BrowserWindow
  onOpenWallet?: () => void
  onOpenTrustDetail?: () => void
  onOpenChat?: () => void
}): void {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => toggleWindowShow(params.mainWindow),
    },
    { type: 'separator' },
    {
      label: '打开对话',
      click: () => {
        params.onOpenChat?.()
        toggleWindowShow(params.mainWindow)
      },
    },
    { type: 'separator' },
    {
      label: cachedBalance
        ? `钱包: ${formatBalance(cachedBalance)}`
        : '钱包: --',
      click: () => params.onOpenWallet?.(),
    },
    {
      label: cachedTrustLevel
        ? `信赖: ${formatTrustLevel(cachedTrustLevel)}`
        : '信赖: --',
      click: () => params.onOpenTrustDetail?.(),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)
}
