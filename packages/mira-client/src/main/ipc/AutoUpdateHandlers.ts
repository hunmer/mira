import { ipcMain } from 'electron'
import { getAutoUpdater } from '../services/useAutoUpdater'
import { logger } from '../utils/Logger'

export class AutoUpdateHandlers {
  registerHandlers(): void {
    const updater = getAutoUpdater()

    ipcMain.handle('updater:check', async () => {
      return await updater.checkForUpdates()
    })

    ipcMain.handle('updater:download', async () => {
      return await updater.downloadUpdate()
    })

    ipcMain.handle('updater:install', async (_event, isSilent: boolean = false) => {
      updater.quitAndInstall(isSilent)
      return { success: true }
    })

    ipcMain.handle('updater:get-version', () => {
      return { success: true, version: updater.getCurrentVersion() }
    })

    logger.info('AutoUpdateHandlers', 'IPC 处理器已注册')
  }

  cleanup(): void {
    ipcMain.removeAllListeners('updater:check')
    ipcMain.removeAllListeners('updater:download')
    ipcMain.removeAllListeners('updater:install')
    ipcMain.removeAllListeners('updater:get-version')
  }
}
