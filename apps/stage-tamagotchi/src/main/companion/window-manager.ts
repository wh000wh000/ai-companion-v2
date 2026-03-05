/**
 * AI 伴侣 - 桌面版专属窗口管理
 *
 * 提供伴侣系统特有的窗口创建与管理功能：
 * - 半透明角色窗口（桌面宠物模式）
 * - 对话弹窗（快速聊天）
 * - 置顶模式控制
 * - 开机自启配置
 *
 * 遵循 AIRI 现有窗口管理模式（createReusableWindow + injeca）。
 */

import type { BrowserWindow } from 'electron'

import { join, resolve } from 'node:path'

import { is } from '@electron-toolkit/utils'
import { useLogg } from '@guiiai/logg'
import { app, BrowserWindow as ElectronBrowserWindow, screen, shell } from 'electron'
import { isMacOS } from 'std-env'

import icon from '../../../resources/icon.png?asset'

import { baseUrl, getElectronMainDirname, load, withHashRoute } from '../libs/electron/location'
import { createReusableWindow } from '../libs/electron/window-manager'
import { transparentWindowConfig } from '../windows/shared/window'

const log = useLogg('companion/window-manager').useGlobalConfig()

/**
 * 创建半透明角色窗口（桌面宠物模式）
 *
 * 特性：
 * - 无边框、透明背景
 * - 始终置顶（screen-saver 层级）
 * - 可在所有工作区可见
 * - 点击穿透模式（角色区域外的点击传递给下层窗口）
 * - 默认固定在屏幕右下角
 *
 * @returns BrowserWindow 实例
 */
export function createCompanionWindow(): BrowserWindow {
  // 获取主显示器尺寸，计算默认位置（右下角）
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // 角色窗口默认尺寸
  const windowWidth = 300
  const windowHeight = 400

  // 默认位于右下角，留出一定边距
  const defaultX = screenWidth - windowWidth - 20
  const defaultY = screenHeight - windowHeight - 20

  const window = new ElectronBrowserWindow({
    title: 'AI 伴侣 - 角色',
    width: windowWidth,
    height: windowHeight,
    x: defaultX,
    y: defaultY,
    show: false,
    icon,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(getElectronMainDirname(), '../preload/index.mjs'),
      sandbox: false,
    },
    // 透明无边框配置
    ...transparentWindowConfig(),
  })

  // 置顶设置：screen-saver 层级确保在全屏应用之上
  window.setAlwaysOnTop(true, 'screen-saver', 1)
  window.setFullScreenable(false)
  window.setVisibleOnAllWorkspaces(true)

  // macOS 隐藏标题栏按钮
  if (isMacOS) {
    window.setWindowButtonVisibility(false)
  }

  // 开发模式下打开 DevTools
  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  window.on('ready-to-show', () => {
    window.show()
    log.log('角色窗口已显示', { x: defaultX, y: defaultY })
  })

  // 外部链接在系统浏览器中打开
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载角色渲染页面
  const rendererBase = baseUrl(resolve(getElectronMainDirname(), '..', 'renderer'))
  load(window, withHashRoute(rendererBase, '/companion/character'))

  log.log('角色窗口已创建')

  return window
}

/**
 * 创建对话弹窗
 *
 * 轻量级对话窗口，用于快捷聊天交互。
 * 特性：
 * - 标准窗口样式（非透明）
 * - 可调整大小
 * - 使用 createReusableWindow 复用模式（关闭后再次打开不重建）
 *
 * @returns 获取 BrowserWindow 的异步函数
 */
export function createChatPopup(): () => Promise<BrowserWindow> {
  return createReusableWindow(async () => {
    const window = new ElectronBrowserWindow({
      title: 'AI 伴侣 - 对话',
      width: 420,
      height: 640,
      minWidth: 320,
      minHeight: 480,
      show: false,
      icon,
      webPreferences: {
        preload: join(getElectronMainDirname(), '../preload/index.mjs'),
        sandbox: false,
      },
    })

    window.on('ready-to-show', () => {
      window.show()
      log.log('对话弹窗已显示')
    })

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 加载对话渲染页面
    const rendererBase = baseUrl(resolve(getElectronMainDirname(), '..', 'renderer'))
    await load(window, withHashRoute(rendererBase, '/companion/chat'))

    log.log('对话弹窗已创建')

    return window
  }).getWindow
}

/**
 * 设置窗口置顶行为
 *
 * 提供三种置顶模式：
 * - 'always': 始终置顶（screen-saver 层级）
 * - 'normal': 普通置顶（floating 层级，不会遮挡全屏应用）
 * - 'off': 关闭置顶
 *
 * @param win - 目标窗口
 * @param mode - 置顶模式，默认 'always'
 */
export function setupAlwaysOnTop(win: BrowserWindow, mode: 'always' | 'normal' | 'off' = 'always'): void {
  switch (mode) {
    case 'always':
      win.setAlwaysOnTop(true, 'screen-saver', 1)
      win.setVisibleOnAllWorkspaces(true)
      log.log('窗口已设为始终置顶', { mode })
      break
    case 'normal':
      win.setAlwaysOnTop(true, 'floating')
      win.setVisibleOnAllWorkspaces(false)
      log.log('窗口已设为普通置顶', { mode })
      break
    case 'off':
      win.setAlwaysOnTop(false)
      win.setVisibleOnAllWorkspaces(false)
      log.log('窗口置顶已关闭', { mode })
      break
  }
}

/**
 * 配置开机自启
 *
 * 使用 Electron 的 app.setLoginItemSettings API 设置开机自启。
 * 在 Windows 上会添加注册表项，macOS 上添加 Login Items，
 * Linux 上创建 .desktop 文件。
 *
 * @param enabled - 是否启用开机自启
 */
export function setupAutoStart(enabled: boolean = true): void {
  try {
    // 开发模式下不设置开机自启
    if (is.dev) {
      log.log('开发模式下跳过开机自启配置')
      return
    }

    app.setLoginItemSettings({
      openAtLogin: enabled,
      // Windows 专属：最小化启动
      openAsHidden: true,
      // macOS：以隐藏方式启动
      ...(isMacOS ? { openAsHidden: true } : {}),
    })

    log.log('开机自启已配置', { enabled })
  }
  catch (error) {
    log.withError(error).error('配置开机自启失败')
  }
}

/**
 * 获取当前开机自启状态
 *
 * @returns 是否已启用开机自启
 */
export function getAutoStartEnabled(): boolean {
  try {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  }
  catch (error) {
    log.withError(error).error('获取开机自启状态失败')
    return false
  }
}
