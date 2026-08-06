import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron'
import { execFile, spawn } from 'child_process'

/**
 * 后端部署 (mira-app-server) IPC 处理器
 *
 * 提供在主进程执行 npm 命令的能力（渲染进程无 child_process 访问权限）：
 * - 检测已安装版本（npm ls -g --json，读 package.json 真实版本，不用 --version）
 * - 查询 npm registry 最新版本
 * - 一键更新（npm install -g mira-app-server@latest，实时推送进度）
 *
 * 注意：mira-app-server 的 CLI 版本号是硬编码的（commander program.version('1.0.17')），
 * 与 package.json 实际版本不一致，因此版本检测走 npm ls 而非 --version。
 */

const PACKAGE_NAME = 'mira-app-server'
const REGISTRY_LATEST_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`

// Windows 下 npm 全局 bin 是 .cmd shim，execFile 需显式指定可执行文件名
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export interface InstalledVersionInfo {
  installed: boolean
  version?: string
  /** npm prefix 全局根路径（用于诊断） */
  prefix?: string
}

export interface LatestVersionInfo {
  latest: string | null
  error?: string
}

export interface UpdateResult {
  success: boolean
  version?: string
  message?: string
}

/** 推送给渲染进程的进度事件 payload */
export interface UpdateProgress {
  /** 'data' = 一行输出，'done' = 结束，'error' = 失败 */
  type: 'data' | 'done' | 'error'
  line?: string
  exitCode?: number
}

export class ServerDeployHandlers {
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.registerHandlers()
  }

  /** 注入主窗口引用（用于推送更新进度事件到渲染进程） */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  private registerHandlers(): void {
    ipcMain.handle('server-deploy:getInstalledVersion', this.handleGetInstalledVersion.bind(this))
    ipcMain.handle('server-deploy:getLatestVersion', this.handleGetLatestVersion.bind(this))
    ipcMain.handle('server-deploy:update', this.handleUpdate.bind(this))
  }

  /**
   * 检测已安装的 mira-app-server 版本
   * 走 npm ls -g --json，读 package.json 真实版本
   */
  private async handleGetInstalledVersion(
    _event: IpcMainInvokeEvent,
  ): Promise<{ success: boolean; data?: InstalledVersionInfo; message?: string }> {
    return new Promise(resolve => {
      execFile(
        NPM_BIN,
        ['ls', '-g', PACKAGE_NAME, '--json', '--depth=0'],
        { maxBuffer: 2 * 1024 * 1024 },
        (error, stdout, stderr) => {
          // npm ls 对未安装/版本不匹配会以非零退出，但 stdout 仍含 JSON
          const out = stdout?.trim()
          if (!out) {
            resolve({
              success: true,
              data: { installed: false },
            })
            return
          }
          try {
            const parsed = JSON.parse(out)
            const dep = parsed?.dependencies?.[PACKAGE_NAME]
            if (dep?.version) {
              resolve({
                success: true,
                data: { installed: true, version: dep.version, prefix: parsed?.prefix },
              })
            } else {
              resolve({ success: true, data: { installed: false } })
            }
          } catch {
            resolve({
              success: false,
              message: '无法解析 npm ls 输出' + (stderr ? `：${stderr.trim()}` : ''),
              data: { installed: false },
            })
          }
          // error 仅用于触发 resolve 已在上面处理；这里避免 TS 未使用告警
          void error
        },
      )
    })
  }

  /**
   * 查询 npm registry 最新版本
   * Node 18+ 提供全局 fetch
   */
  private async handleGetLatestVersion(
    _event: IpcMainInvokeEvent,
  ): Promise<{ success: boolean; data: LatestVersionInfo }> {
    try {
      const resp = await fetch(REGISTRY_LATEST_URL, {
        headers: { Accept: 'application/json' },
      })
      if (!resp.ok) {
        return { success: true, data: { latest: null, error: `registry 返回 ${resp.status}` } }
      }
      const json: any = await resp.json()
      return { success: true, data: { latest: json?.version ?? null } }
    } catch (err) {
      return {
        success: true,
        data: {
          latest: null,
          error: err instanceof Error ? err.message : '网络请求失败',
        },
      }
    }
  }

  /**
   * 一键更新 mira-app-server 到最新版
   * 使用 spawn 实时推送 stdout/stderr 进度，完成后重新检测版本
   */
  private async handleUpdate(
    _event: IpcMainInvokeEvent,
  ): Promise<{ success: boolean; data?: UpdateResult; message?: string }> {
    return new Promise(resolve => {
      const child = spawn(NPM_BIN, ['install', '-g', `${PACKAGE_NAME}@latest`], {
        shell: false,
      })

      const emit = (p: UpdateProgress) => {
        this.mainWindow?.webContents?.send('server-deploy:update-progress', p)
      }

      child.stdout?.on('data', chunk => {
        const text = chunk.toString().trim()
        if (text) emit({ type: 'data', line: text })
      })
      child.stderr?.on('data', chunk => {
        const text = chunk.toString().trim()
        if (text) emit({ type: 'data', line: text })
      })

      child.on('error', err => {
        emit({ type: 'error', line: err.message })
        resolve({
          success: false,
          message: err.message,
          data: { success: false, message: err.message },
        })
      })

      child.on('close', exitCode => {
        if (exitCode === 0) {
          emit({ type: 'done', exitCode: 0 })
          // 重新检测安装版本回填结果
          execFile(
            NPM_BIN,
            ['ls', '-g', PACKAGE_NAME, '--json', '--depth=0'],
            { maxBuffer: 2 * 1024 * 1024 },
            (_err2, stdout) => {
              let version: string | undefined
              try {
                const parsed = JSON.parse(stdout?.trim() || '{}')
                version = parsed?.dependencies?.[PACKAGE_NAME]?.version
              } catch {
                /* 忽略解析失败 */
              }
              resolve({
                success: true,
                data: { success: true, version },
              })
            },
          )
        } else {
          emit({ type: 'done', exitCode: exitCode ?? -1 })
          resolve({
            success: false,
            message: `npm install 退出码 ${exitCode}`,
            data: { success: false, message: `npm install 退出码 ${exitCode}` },
          })
        }
      })
    })
  }

  /** 清理（由 handlers.ts 调用） */
  cleanup(): void {
    ipcMain.removeAllListeners('server-deploy:getInstalledVersion')
    ipcMain.removeAllListeners('server-deploy:getLatestVersion')
    ipcMain.removeAllListeners('server-deploy:update')
  }
}
