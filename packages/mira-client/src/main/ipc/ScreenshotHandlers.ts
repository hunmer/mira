import { BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

type ScreenshotPayload = { data: ArrayBuffer; name: string; mime: string; importToLibrary?: boolean }
type ScreenshotSettings = { format?: 'png' | 'jpeg' | 'webp'; copyToClipboard?: boolean }
type DetectedWindow = { x: number; y: number; width: number; height: number; title: string }
const execFileAsync = promisify(execFile)

/** Owns the independent screenshot overlay and the display source it edits. */
export class ScreenshotHandlers {
  private mainWindow: BrowserWindow | null = null
  private screenshotWindow: BrowserWindow | null = null
  private sourceData = ''
  private sourceDisplayId = ''
  private sourceWindows: DetectedWindow[] = []
  private sourceSize = { width: 0, height: 0 }
  private sessionSettings: Required<ScreenshotSettings> = { format: 'png', copyToClipboard: true }

  constructor() {
    ipcMain.handle('screenshot:start', this.start.bind(this))
    ipcMain.handle('screenshot:get-source', this.getSource.bind(this))
    ipcMain.handle('screenshot:get-settings', () => ({ success: true, settings: this.sessionSettings }))
    ipcMain.handle('screenshot:capture', this.getSource.bind(this))
    ipcMain.handle('screenshot:debug', (_event, payload: unknown) => {
      this.debug('renderer metrics', payload)
      return { success: true }
    })
    ipcMain.handle('screenshot:complete', this.complete.bind(this))
    ipcMain.handle('screenshot:cancel', this.cancel.bind(this))
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private debug(message: string, data?: unknown): void {
    const payload = { message, data, at: new Date().toISOString() }
    console.info('[screenshot-debug]', message, data)
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.webContents.send('screenshot:debug', payload)
  }

  private async detectVisibleWindows(bounds: Electron.Rectangle): Promise<DetectedWindow[]> {
    if (process.platform !== 'win32') return []
    const script = `Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices; using System.Diagnostics;
public static class MiraWindows {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr p);
  delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L; public int T; public int R; public int B; }
  public static void Run() { var own=(uint)Process.GetCurrentProcess().Id; EnumWindows((h,p) => { if (!IsWindowVisible(h)) return true; uint pid; GetWindowThreadProcessId(h,out pid); if (pid==own) return true; RECT r; if (!GetWindowRect(h,out r)) return true; var s=new StringBuilder(512); GetWindowText(h,s,s.Capacity); if (s.Length>0 && r.R-r.L>80 && r.B-r.T>60) Console.WriteLine(String.Join("\t", r.L.ToString(), r.T.ToString(), r.R.ToString(), r.B.ToString(), Convert.ToBase64String(Encoding.UTF8.GetBytes(s.ToString())))); return true; }, IntPtr.Zero); }
}
'@`
    try {
      const result = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${script}\n[MiraWindows]::Run()`], { windowsHide: true, maxBuffer: 1024 * 1024 })
      const windows = result.stdout.split(/\r?\n/).flatMap(line => {
        const [left, top, right, bottom, encodedTitle] = line.split('\t')
        const x = Number(left); const y = Number(top); const width = Number(right) - x; const height = Number(bottom) - y
        if (![x, y, width, height].every(Number.isFinite)) return []
        if (x + width < bounds.x || y + height < bounds.y || x > bounds.x + bounds.width || y > bounds.y + bounds.height) return []
        let title = ''
        try { title = Buffer.from(encodedTitle || '', 'base64').toString('utf8') } catch { title = '' }
        return [{ x: x - bounds.x, y: y - bounds.y, width, height, title }]
      })
      this.debug('visible windows detected', { platform: process.platform, count: windows.length, bounds })
      return windows
    } catch (error) {
      this.debug('visible window detection failed', { message: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  private async captureDisplay(): Promise<{ data: string; displayId: string; bounds: Electron.Rectangle; windows: DetectedWindow[]; sourceSize: { width: number; height: number } }> {
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
    const size = source.thumbnail.getSize()
    const windows = await this.detectVisibleWindows(display.bounds)
    this.debug('display source selected', { displayId: display.id, bounds: display.bounds, scaleFactor, sourceId: source.id, sourceDisplayId: source.display_id, sourceSize: size, sourceCount: sources.length, screenSourceCount: screenSources.length, windowCount: windows.length })
    return { data: source.thumbnail.toDataURL(), displayId: String(display.id), bounds: display.bounds, windows, sourceSize: size }
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
      this.sourceWindows = capture.windows
      this.sourceSize = capture.sourceSize
      this.debug('screenshot session started', { displayId: capture.displayId, sourceSize: capture.sourceSize, windowCount: capture.windows.length })
      const { x, y, width, height } = capture.bounds
      this.screenshotWindow = new BrowserWindow({
        x, y, width, height,
        frame: false,
        fullscreen: true,
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
        this.screenshotWindow.webContents.once('did-finish-load', () => {
          this.screenshotWindow?.webContents.send('screenshot:windows', capture.windows)
        })
        await this.screenshotWindow.loadFile(join(__dirname, '../dist-renderer/screenshot-window.html'))
      }
      return { success: true }
    } catch (error) {
      this.closeWindow()
      return { success: false, message: error instanceof Error ? error.message : 'Failed to start screenshot window' }
    }
  }

  private async getSource(): Promise<{ success: boolean; data?: string; displayId?: string; windows?: DetectedWindow[]; sourceSize?: { width: number; height: number }; message?: string }> {
    if (!this.sourceData) return { success: false, message: 'Screenshot session is not active' }
    return { success: true, data: this.sourceData, displayId: this.sourceDisplayId, windows: this.sourceWindows, sourceSize: this.sourceSize }
  }

  private async complete(_event: Electron.IpcMainInvokeEvent, payload: ScreenshotPayload): Promise<{ success: boolean }> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.webContents.send('screenshot:complete', payload)
    this.debug('screenshot completed', { name: payload?.name, importToLibrary: payload?.importToLibrary })
    this.closeWindow()
    this.debug('screenshot cancelled')
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
        this.sourceWindows = []
        this.sourceSize = { width: 0, height: 0 }
    }
  }

  cleanup(): void {
    this.closeWindow()
    for (const channel of ['screenshot:start', 'screenshot:get-source', 'screenshot:get-settings', 'screenshot:capture', 'screenshot:debug', 'screenshot:complete', 'screenshot:cancel']) {
      ipcMain.removeHandler(channel)
    }
  }
}
