import { ipcMain, IpcMainInvokeEvent, BrowserWindow, app } from 'electron'
import { execFile, spawn } from 'child_process'
import { mkdir } from 'fs/promises'
import path from 'path'
import { runLocalServerScript } from '../services/LocalServerService'

/**
 * 后端部署 (mira-app-server) IPC 处理器
 *
 * 提供在主进程执行 npm 命令的能力（渲染进程无 child_process 访问权限）：
 * - 检测已安装版本（npm ls -g --json，读 package.json 真实版本，不用 --version）
 * - 查询 npm registry 最新版本
 * - 一键更新（npm install -g mira-app-server@latest，实时推送进度）
 * - 完整部署（环境检查、安装、数据目录、启动、健康检查）
 *
 */

const PACKAGE_NAME = 'mira-app-server'
const REGISTRY_LATEST_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`

// Windows 下 npm 是 npm.cmd shim。Node.js 在 CVE-2024-27980 修复后，
// 不带 shell:true 直接 spawn .cmd/.bat 文件会抛 EINVAL，因此统一用 'npm' + shell:true
// 让系统解析；非 Windows 直接执行无需 shell。
const NPM_BIN = 'npm'
const SERVER_BIN = 'mira-app-server'
const IS_WIN = process.platform === 'win32'
const HTTP_PORT = 8081
const WS_PORT = 8018
const DEFAULT_ADMIN_USERNAME = 'admin'
const DEFAULT_ADMIN_PASSWORD = 'admin123'
const DEFAULT_LIBRARY_NAME = '默认素材库'
interface NpmOptions { registry?: string; proxy?: string }

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

export interface DeploymentProgress {
  stepId: number
  type: 'status' | 'output'
  status?: 'running' | 'success' | 'failed'
  line?: string
}

export class ServerDeployHandlers {
  private mainWindow: BrowserWindow | null = null
  private deploymentInProgress = false

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
    ipcMain.handle('server-deploy:deploy', this.handleDeploy.bind(this))
  }

  private runCommand(
    command: string,
    args: string[],
    onOutput: (line: string) => void,
    env?: NodeJS.ProcessEnv,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: IS_WIN, windowsHide: true, env })
      let settled = false

      const emitChunk = (chunk: Buffer | string) => {
        String(chunk)
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .forEach(onOutput)
      }

      child.stdout?.on('data', emitChunk)
      child.stderr?.on('data', emitChunk)
      child.once('error', error => {
        if (settled) return
        settled = true
        reject(error)
      })
      child.once('close', exitCode => {
        if (settled) return
        settled = true
        if (exitCode === 0) resolve()
        else reject(new Error(`${command} 退出码 ${exitCode ?? -1}`))
      })
    })
  }

  private npmEnv(options?: NpmOptions): NodeJS.ProcessEnv {
    const env = { ...process.env }
    const setUrl = (value: string | undefined, keys: string[]) => {
      if (!value?.trim()) return
      const url = new URL(value.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('npm 镜像和代理仅支持 http/https 地址')
      }
      keys.forEach(key => { env[key] = url.toString() })
    }
    setUrl(options?.registry, ['npm_config_registry'])
    setUrl(options?.proxy, ['npm_config_proxy', 'npm_config_https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY'])
    return env
  }

  /**
   * 运行 mira-app-server doctor --install
   * 由后端 CLI 自检 ffmpeg / ImageMagick / exiftool，缺失时按平台自动安装。
   * 必须在 npm install -g mira-app-server 完成后调用。
   */
  private async runDoctor(onOutput: (line: string) => void): Promise<void> {
    onOutput(`执行 ${SERVER_BIN} doctor --install`)
    await this.runCommand(SERVER_BIN, ['doctor', '--install'], onOutput)
  }

  private async checkHealth(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const response = await fetch(`http://127.0.0.1:${HTTP_PORT}/health`, {
        signal: AbortSignal.timeout(2000),
      })
      const text = await response.text()
      let isMiraHealthy = false
      try {
        const body = JSON.parse(text)
        isMiraHealthy = body?.status === 'ok'
      } catch {
        isMiraHealthy = false
      }
      return {
        ok: response.ok && isMiraHealthy,
        detail: text || `HTTP ${response.status}`,
      }
    } catch {
      return { ok: false }
    }
  }

  private async requestServer<T>(pathname: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`http://127.0.0.1:${HTTP_PORT}${pathname}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: AbortSignal.timeout(10000),
    })
    const text = await response.text()
    let body: any = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    if (!response.ok) {
      throw new Error(body?.message || body?.error || `HTTP ${response.status}`)
    }
    return body as T
  }

  private async ensureDefaultLibrary(dataPath: string, onOutput: (line: string) => void): Promise<string> {
    const login = await this.requestServer<{ data?: { accessToken?: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: DEFAULT_ADMIN_USERNAME,
        password: DEFAULT_ADMIN_PASSWORD,
      }),
    })
    const token = login.data?.accessToken
    if (!token) throw new Error('默认管理员登录成功但未返回访问令牌')
    onOutput(`已使用默认管理员 ${DEFAULT_ADMIN_USERNAME} 登录`)

    const headers = { Authorization: `Bearer ${token}` }
    const libraryPath = path.join(dataPath, 'default-library')
    await mkdir(libraryPath, { recursive: true })
    const libraries = await this.requestServer<Array<{ id: string; name: string; path?: string }>>(
      '/api/libraries',
      { headers },
    )
    const existing = libraries.find(library =>
      library.path === libraryPath || library.name === DEFAULT_LIBRARY_NAME,
    )
    if (existing) {
      onOutput(`默认素材库已存在：${existing.name} (${existing.id})`)
      return existing.id
    }

    const created = await this.requestServer<{ id: string; name: string }>('/api/libraries', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: DEFAULT_LIBRARY_NAME,
        path: libraryPath,
        description: 'Mira 自动部署创建的默认素材库',
        customFields: { enableAutoSync: true },
      }),
    })
    if (!created.id) throw new Error('默认素材库创建成功但未返回 ID')
    onOutput(`已创建 ${created.name} (${created.id})`)
    onOutput(`素材库目录：${libraryPath}`)
    return created.id
  }

  private async startServer(onOutput: (line: string) => void): Promise<void> {
    await runLocalServerScript('start', { onOutput })
  }

  private async handleDeploy(
    event: IpcMainInvokeEvent,
    options?: NpmOptions,
  ): Promise<{ success: boolean; data?: { defaultLibraryId: string }; message?: string }> {
    if (this.deploymentInProgress) {
      return { success: false, message: '已有部署任务正在执行' }
    }
    this.deploymentInProgress = true

    const emit = (progress: DeploymentProgress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('server-deploy:deploy-progress', progress)
      }
    }
    const runStep = async (stepId: number, action: (output: (line: string) => void) => Promise<void>) => {
      emit({ stepId, type: 'status', status: 'running' })
      const output = (line: string) => emit({ stepId, type: 'output', line })
      try {
        await action(output)
        emit({ stepId, type: 'status', status: 'success' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        output(message)
        emit({ stepId, type: 'status', status: 'failed' })
        throw error
      }
    }

    try {
      await runStep(1, async output => {
        const major = Number(process.versions.node.split('.')[0])
        output(`Node.js ${process.version}`)
        if (major < 18) throw new Error('需要 Node.js 18 或更高版本')
        await this.runCommand(NPM_BIN, ['--version'], line => output(`npm ${line}`))
      })

      await runStep(2, async output => {
        output(`执行 npm install -g ${PACKAGE_NAME}@latest`)
        if (options?.registry?.trim()) output(`npm 镜像：${options.registry.trim()}`)
        if (options?.proxy?.trim()) output('npm 代理：已启用')
        await this.runCommand(NPM_BIN, ['install', '-g', `${PACKAGE_NAME}@latest`], output, this.npmEnv(options))
      })

      await runStep(3, async output => {
        await this.runDoctor(output)
      })

      const dataPath = path.join(app.getPath('userData'), PACKAGE_NAME)
      await mkdir(dataPath, { recursive: true })

      await runStep(4, async output => {
        output(`启动 ${SERVER_BIN}，HTTP ${HTTP_PORT} / WebSocket ${WS_PORT}`)
        await this.startServer(output)
        const health = await this.checkHealth()
        if (!health.ok) throw new Error('健康检查失败')
      })

      let defaultLibraryId = ''
      await runStep(5, async output => {
        defaultLibraryId = await this.ensureDefaultLibrary(dataPath, output)
      })

      return { success: true, data: { defaultLibraryId } }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      }
    } finally {
      this.deploymentInProgress = false
    }
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
        { maxBuffer: 2 * 1024 * 1024, shell: IS_WIN },
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
    options?: NpmOptions,
  ): Promise<{ success: boolean; data?: UpdateResult; message?: string }> {
    return new Promise(resolve => {
      const child = spawn(NPM_BIN, ['install', '-g', `${PACKAGE_NAME}@latest`], {
        // Windows 需 shell:true 才能解析 npm.cmd（CVE-2024-27980 后强制）
        shell: IS_WIN,
        env: this.npmEnv(options),
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
            { maxBuffer: 2 * 1024 * 1024, shell: IS_WIN },
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
    ipcMain.removeAllListeners('server-deploy:deploy')
  }
}
