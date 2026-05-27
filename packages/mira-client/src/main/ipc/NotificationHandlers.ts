import { ipcMain, Notification } from 'electron'

export class NotificationHandlers {
  constructor() {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    ipcMain.handle('notification:show', this.handleShow.bind(this))
    ipcMain.handle('notification:is-supported', this.handleIsSupported.bind(this))
  }

  private async handleShow(
    _event: any,
    options: { title: string; body?: string; silent?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    if (!Notification.isSupported()) {
      return { success: false, error: 'Notifications not supported' }
    }

    try {
      const notification = new Notification({
        title: options.title,
        body: options.body || '',
        silent: options.silent ?? false,
      })
      notification.show()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async handleIsSupported(): Promise<boolean> {
    return Notification.isSupported()
  }
}
