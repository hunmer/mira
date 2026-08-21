import { ipcMain, BrowserWindow } from 'electron'
export class ScreenshotHandlers {
  private mainWindow: BrowserWindow | null = null
  constructor() { ipcMain.handle('screenshot:capture', this.capture.bind(this)) }
  setMainWindow(window: BrowserWindow) { this.mainWindow = window }
  private async capture() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return { success: false, message: 'Main window unavailable' }
    try { const image = await this.mainWindow.webContents.capturePage(); return { success: true, data: image.toDataURL() } }
    catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Failed to capture screen' } }
  }
}
