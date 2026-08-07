import { ipcMain, IpcMainInvokeEvent } from 'electron'
import {
  runLocalServerScript,
  restartLocalServer,
  getLocalServerStatus,
  LocalServerStatus,
  LocalServerScriptOptions,
} from '../services/LocalServerService'

/**
 * 后端运行控制 IPC 处理器
 *
 * 与 ServerDeployHandlers（npm 安装 / 完整部署）职责分离，这里只负责对「已部署的
 * 本地后端」做运行时控制：启用 / 停止 / 重启 / 状态查询。供「服务端」控制对话框使用。
 *
 * 启停过程中的 stdout/stderr 行通过 `server-control:progress` 事件实时推送给
 * 调用方（渲染进程），以便在日志区显示动作反馈。
 */

/** 推送给渲染进程的动作进度事件 payload */
export interface ServerControlProgress {
  /** 'data' = 一行输出；'done' = 动作结束（含成功与否） */
  type: 'data' | 'done'
  action: 'start' | 'stop' | 'restart'
  line?: string
  success?: boolean
  message?: string
}

export interface ServerControlResult {
  success: boolean
  message?: string
}

export class ServerControlHandlers {
  constructor() {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    ipcMain.handle('server-control:start', this.handleStart.bind(this))
    ipcMain.handle('server-control:stop', this.handleStop.bind(this))
    ipcMain.handle('server-control:restart', this.handleRestart.bind(this))
    ipcMain.handle('server-control:status', this.handleStatus.bind(this))
  }

  /** 向调用方渲染进程推送进度行 */
  private emit(event: IpcMainInvokeEvent, progress: ServerControlProgress): void {
    if (!event.sender.isDestroyed()) {
      event.sender.send('server-control:progress', progress)
    }
  }

  /** 构造一个转发输出行的 onOutput 回调 */
  private forwardOutput(
    event: IpcMainInvokeEvent,
    action: ServerControlProgress['action'],
  ): LocalServerScriptOptions['onOutput'] {
    return line => this.emit(event, { type: 'data', action, line })
  }

  private async handleStart(event: IpcMainInvokeEvent): Promise<ServerControlResult> {
    try {
      await runLocalServerScript('start', { onOutput: this.forwardOutput(event, 'start') })
      this.emit(event, { type: 'done', action: 'start', success: true })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.emit(event, { type: 'done', action: 'start', success: false, message })
      return { success: false, message }
    }
  }

  private async handleStop(event: IpcMainInvokeEvent): Promise<ServerControlResult> {
    try {
      await runLocalServerScript('stop', { onOutput: this.forwardOutput(event, 'stop') })
      this.emit(event, { type: 'done', action: 'stop', success: true })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.emit(event, { type: 'done', action: 'stop', success: false, message })
      return { success: false, message }
    }
  }

  private async handleRestart(event: IpcMainInvokeEvent): Promise<ServerControlResult> {
    try {
      await restartLocalServer({ onOutput: this.forwardOutput(event, 'restart') })
      this.emit(event, { type: 'done', action: 'restart', success: true })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.emit(event, { type: 'done', action: 'restart', success: false, message })
      return { success: false, message }
    }
  }

  private async handleStatus(_event: IpcMainInvokeEvent): Promise<ServerControlResult & { status?: LocalServerStatus }> {
    try {
      const status = await getLocalServerStatus()
      return { success: true, status }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, message }
    }
  }

  /** 清理（由 handlers.ts 调用） */
  cleanup(): void {
    ipcMain.removeAllListeners('server-control:start')
    ipcMain.removeAllListeners('server-control:stop')
    ipcMain.removeAllListeners('server-control:restart')
    ipcMain.removeAllListeners('server-control:status')
  }
}
