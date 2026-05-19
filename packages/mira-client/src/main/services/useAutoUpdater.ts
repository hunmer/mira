import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { logger } from '../utils/Logger'

let mainWindow: BrowserWindow | null = null

export function useAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const sendToRenderer = (channel: string, data?: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data)
    }
  }

  autoUpdater.on('error', (error) => {
    logger.error('AutoUpdater', '更新错误', error)
    sendToRenderer('update:error', { message: error.message || '检查更新失败' })
  })

  autoUpdater.on('checking-for-update', () => {
    logger.info('AutoUpdater', '正在检查更新...')
    sendToRenderer('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info('AutoUpdater', '发现新版本', { version: info.version })
    sendToRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    logger.info('AutoUpdater', '当前已是最新版本')
    sendToRenderer('update:not-available', { version: info.version })
  })

  autoUpdater.on('download-progress', (progressInfo) => {
    sendToRenderer('update:download-progress', {
      percent: progressInfo.percent,
      transferred: progressInfo.transferred,
      total: progressInfo.total,
      bytesPerSecond: progressInfo.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('AutoUpdater', '更新下载完成', { version: info.version })
    sendToRenderer('update:downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  const setMainWindow = (win: BrowserWindow) => {
    mainWindow = win
  }

  const checkForUpdates = async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        success: true,
        updateInfo: result?.updateInfo ? {
          version: result.updateInfo.version,
          releaseDate: result.updateInfo.releaseDate,
          releaseNotes: result.updateInfo.releaseNotes
        } : null
      }
    } catch (error: any) {
      logger.error('AutoUpdater', '检查更新失败', error)
      return { success: false, error: error.message || '检查更新失败' }
    }
  }

  const downloadUpdate = async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error: any) {
      logger.error('AutoUpdater', '下载更新失败', error)
      return { success: false, error: error.message || '下载更新失败' }
    }
  }

  const quitAndInstall = (isSilent: boolean = false) => {
    autoUpdater.quitAndInstall(isSilent, true)
  }

  const getCurrentVersion = () => app.getVersion()

  return { setMainWindow, checkForUpdates, downloadUpdate, quitAndInstall, getCurrentVersion }
}

let instance: ReturnType<typeof useAutoUpdater> | null = null

export function getAutoUpdater() {
  if (!instance) {
    instance = useAutoUpdater()
  }
  return instance
}
