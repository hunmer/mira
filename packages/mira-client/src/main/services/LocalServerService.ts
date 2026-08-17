import { app } from 'electron'
import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'

export interface LocalServerScriptOptions {
  onOutput?: (line: string) => void
}

let serverStartPromise: Promise<void> | null = null

/**
 * 本地服务的数据目录必须与 mira-app-server CLI 的 --autostart 默认值一致。
 * 状态文件仍保存在 Electron userData 下，避免服务运行状态和业务数据混用。
 */
export function getLocalServerDataPath(): string {
  return path.join(app.getPath('home'), '.mira-data')
}

function getScriptPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'scripts', 'mira-server-service.mjs')
    : path.join(app.getAppPath(), 'scripts', 'mira-server-service.mjs')
}

function getScriptArgs(command: 'start' | 'stop' | 'status'): string[] {
  const stateDir = path.join(app.getPath('userData'), 'mira-app-server')
  return [
    getScriptPath(),
    command,
    '--state-dir', stateDir,
    '--data-path', getLocalServerDataPath(),
    '--http-port', '8081',
    '--ws-port', '8018',
  ]
}

function getScriptEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  }
}

export function runLocalServerScript(
  command: 'start' | 'stop' | 'status',
  options: LocalServerScriptOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, getScriptArgs(command), {
      windowsHide: true,
      env: getScriptEnvironment(),
    })
    let settled = false
    const emitChunk = (chunk: Buffer | string) => {
      String(chunk)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => options.onOutput?.(line))
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
      else reject(new Error(`Local server script exited with code ${exitCode ?? -1}`))
    })
  })
}

export function ensureLocalServerStarted(options: LocalServerScriptOptions = {}): Promise<void> {
  if (!serverStartPromise) {
    serverStartPromise = runLocalServerScript('start', options).catch(error => {
      serverStartPromise = null
      throw error
    })
  }
  return serverStartPromise
}

export function runLocalServerScriptSync(command: 'stop'): string {
  return execFileSync(process.execPath, getScriptArgs(command), {
    encoding: 'utf8',
    env: getScriptEnvironment(),
    timeout: 10000,
    windowsHide: true,
  }).trim()
}

/**
 * 服务端运行状态（由 mira-server-service.mjs status 解析得到）。
 */
export interface LocalServerStatus {
  /** /health 是否返回 ok */
  healthy: boolean
  /** 是否存在脚本托管（service.json 中记录了存活的 PID） */
  managed: boolean
  /** 托管进程 PID（无则 null） */
  pid: number | null
  httpPort: number
  dataPath: string
  logFile: string
}

/**
 * 重启本地后端：stop → start。重启会清空 ensureLocalServerStarted 的单次缓存，
 * 以便再次拉起新进程。
 */
export async function restartLocalServer(options: LocalServerScriptOptions = {}): Promise<void> {
  try {
    await runLocalServerScript('stop', options)
  } catch (error) {
    // stop 失败不阻断 start（可能进程已不在）
    options.onOutput?.(`stop 阶段警告：${error instanceof Error ? error.message : String(error)}`)
  }
  // 重置单次启动缓存，强制下次 start 真正拉起
  serverStartPromise = null
  await runLocalServerScript('start', options)
}

/**
 * 查询本地后端状态：运行 `mira-server-service.mjs status`，解析其输出的 JSON 行。
 * status 命令的 stdout 最后会打印一行 JSON（见脚本 showStatus）。
 */
export async function getLocalServerStatus(): Promise<LocalServerStatus> {
  return new Promise<LocalServerStatus>((resolve, reject) => {
    const child = spawn(process.execPath, getScriptArgs('status'), {
      windowsHide: true,
      env: getScriptEnvironment(),
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    child.stdout?.on('data', chunk => { stdout += String(chunk) })
    child.stderr?.on('data', chunk => { stderr += String(chunk) })
    child.once('error', error => {
      if (settled) return
      settled = true
      reject(error)
    })
    child.once('close', () => {
      if (settled) return
      settled = true
      // 脚本在 unhealthy 时以 exitCode 1 退出，但 stdout 仍含 JSON，故不按退出码判定
      const jsonLine = stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .reverse()
        .find(line => line.startsWith('{') && line.endsWith('}'))
      if (!jsonLine) {
        reject(new Error('无法解析本地后端状态输出' + (stderr ? `：${stderr.trim()}` : '')))
        return
      }
      try {
        const parsed = JSON.parse(jsonLine)
        resolve({
          healthy: Boolean(parsed.healthy),
          managed: Boolean(parsed.managed),
          pid: typeof parsed.pid === 'number' ? parsed.pid : null,
          httpPort: parsed.httpPort,
          dataPath: parsed.dataPath,
          logFile: parsed.logFile,
        })
      } catch (error) {
        reject(new Error(`解析本地后端状态失败：${error instanceof Error ? error.message : String(error)}`))
      }
    })
  })
}
