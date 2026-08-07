import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { logger } from './Logger'

/**
 * 窗口状态持久化数据
 */
export interface WindowStateData {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
  isFullScreen: boolean
}

/**
 * 窗口状态管理器选项
 */
export interface WindowStateKeeperOptions {
  defaultWidth: number
  defaultHeight: number
  file: string
  maximize?: boolean
  fullScreen?: boolean
}

/**
 * 窗口状态管理器：负责持久化窗口的位置、尺寸、最大化/全屏状态。
 * 行为对齐原 main.ts 顶部的 createWindowStateKeeper。
 */
export interface WindowStateKeeper {
  x: number | undefined
  y: number | undefined
  width: number
  height: number
  isMaximized: boolean
  isFullScreen: boolean
  /** 绑定窗口事件，自动持久化状态 */
  manage(win: BrowserWindow): void
  /** 手动保存窗口状态 */
  saveState(win: BrowserWindow): void
}

/**
 * 创建一个窗口状态管理器。
 * 读取 userData 下指定文件恢复状态，未读到时使用传入的默认值。
 */
export function createWindowStateKeeper(options: WindowStateKeeperOptions): WindowStateKeeper {
  const fs = require('node:fs')
  const stateFile = join(app.getPath('userData'), options.file)
  let state: WindowStateData = {
    width: options.defaultWidth,
    height: options.defaultHeight,
    isMaximized: options.maximize ?? false,
    isFullScreen: options.fullScreen ?? false,
  }

  try {
    state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) }
  } catch {}

  return {
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    isMaximized: state.isMaximized,
    isFullScreen: state.isFullScreen,
    manage(win: BrowserWindow) {
      const save = () => {
        try {
          const bounds = win.getBounds()
          const s: WindowStateData = {
            ...bounds,
            isMaximized: win.isMaximized(),
            isFullScreen: win.isFullScreen(),
          }
          fs.writeFileSync(stateFile, JSON.stringify(s))
        } catch {}
      }
      win.on('close', save)
      win.on('resize', save)
      win.on('move', save)
    },
    saveState(win: BrowserWindow) {
      const bounds = win.getBounds()
      const s: WindowStateData = {
        ...bounds,
        isMaximized: win.isMaximized(),
        isFullScreen: win.isFullScreen(),
      }
      try {
        fs.writeFileSync(stateFile, JSON.stringify(s))
      } catch {}
    },
  }
}

/** 便捷封装：强制保存窗口状态并记录日志 */
export function saveWindowState(keeper: WindowStateKeeper | null, win: BrowserWindow | null): void {
  if (!keeper || !win) return
  try {
    keeper.saveState(win)
    logger.debug('WindowStateKeeper', 'Window state saved manually')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('WindowStateKeeper', 'Failed to save window state: ' + errorMessage)
  }
}
