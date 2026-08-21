import { BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron'
import { join } from 'node:path'

type ScreenshotPayload = { data: ArrayBuffer; name: string; mime: string }
type ScreenshotSettings = { format?: 'png' | 'jpeg' | 'webp'; copyToClipboard?: boolean }

/** Owns the independent screenshot overlay and the display source it edits. */
export class ScreenshotHandlers {
  private mainWindow: BrowserWindow | null = null
  private screenshotWindow: BrowserWindow | null = null
  private sourceData = ''
  private sourceDisplayId = ''
  private sessionSettings: Required<ScreenshotSettings> = { format: 'png', copyToClipboard: true }

  constructor() {
    ipcMain.handle('screenshot:start', this.start.bind(this))
    ipcMain.handle('screenshot:get-source', this.getSource.bind(this))
    ipcMain.handle('screenshot:get-settings', () => ({ success: true, settings: this.sessionSettings }))
    ipcMain.handle('screenshot:capture', this.getSource.bind(this))
    ipcMain.handle('screenshot:complete', this.complete.bind(this))
    ipcMain.handle('screenshot:cancel', this.cancel.bind(this))
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private async captureDisplay(): Promise<{ data: string; displayId: string; bounds: Electron.Rectangle }> {
    const point = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(point)
    const scaleFactor = display.scaleFactor || 1
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: {
        width: Math.max(1, Math.round(display.bounds.width * scaleFactor)),
        height: Math.max(1, Math.round(display.bounds.height * scaleFactor)),
      },
      fetchWindowIcons: false,
    })

    // Prefer the screen source matching the cursor display. Window sources are
    // retained in the detection pass, but a screen source is what lets the
    // user capture pixels outside Mira and across other applications.
    const screenSources = sources.filter(source => source.id.startsWith('screen:'))
    const source = screenSources.find(item => item.display_id === String(display.id)) || screenSources[0]
    if (!source || source.thumbnail.isEmpty()) throw new Error('No capturable display source found')
    return { data: source.thumbnail.toDataURL(), displayId: String(display.id), bounds: display.bounds }
  }

  private async start(_event: Electron.IpcMainInvokeEvent, settings?: ScreenshotSettings): Promise<{ success: boolean; message?: string }> {
    try {
      if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
        this.screenshotWindow.show()
        this.screenshotWindow.focus()
        return { success: true }
      }

      const capture = await this.captureDisplay()
      this.sessionSettings = {
        format: settings?.format === 'jpeg' || settings?.format === 'webp' ? settings.format : 'png',
        copyToClipboard: settings?.copyToClipboard !== false,
      }
      this.sourceData = capture.data
      this.sourceDisplayId = capture.displayId
      const { x, y, width, height } = capture.bounds
      this.screenshotWindow = new BrowserWindow({
        x, y, width, height,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: true,
        skipTaskbar: true,
        hasShadow: false,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: false,
          preload: join(__dirname, '../dist-preload/preload.js'),
        },
      })
      this.screenshotWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      this.screenshotWindow.once('ready-to-show', () => {
        this.screenshotWindow?.show()
        this.screenshotWindow?.focus()
      })
      this.screenshotWindow.on('closed', () => {
        this.screenshotWindow = null
        this.sourceData = ''
        this.sourceDisplayId = ''
      })
      // Screenshot UI is always a standalone file page. Loading it from the
      // renderer output keeps the capture window independent from the Vite dev
      // server and avoids a localhost URL (and accidental double slashes).
      if (this.screenshotWindow) {
        await this.screenshotWindow.loadFile(join(__dirname, '../dist-renderer/screenshot-window.html'))
      }
      return { success: true }
    } catch (error) {
      this.closeWindow()
      return { success: false, message: error instanceof Error ? error.message : 'Failed to start screenshot window' }
    }
  }

  private async getSource(): Promise<{ success: boolean; data?: string; displayId?: string; message?: string }> {
    if (!this.sourceData) return { success: false, message: 'Screenshot session is not active' }
    return { success: true, data: this.sourceData, displayId: this.sourceDisplayId }
  }

  private async complete(_event: Electron.IpcMainInvokeEvent, payload: ScreenshotPayload): Promise<{ success: boolean }> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.webContents.send('screenshot:complete', payload)
    this.closeWindow()
    return { success: true }
  }

  private async cancel(): Promise<{ success: boolean }> {
    this.closeWindow()
    return { success: true }
  }

  private closeWindow(): void {
    if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) this.screenshotWindow.close()
    else {
      this.sourceData = ''
      this.sourceDisplayId = ''
    }
  }

  cleanup(): void {
    this.closeWindow()
    for (const channel of ['screenshot:start', 'screenshot:get-source', 'screenshot:get-settings', 'screenshot:capture', 'screenshot:complete', 'screenshot:cancel']) {
      ipcMain.removeHandler(channel)
    }
  }
}
