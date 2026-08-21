import { ipcMain, app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as path from 'path'
import { randomUUID } from 'node:crypto'
import { logger } from '../utils/Logger'

/**
 * 插件窗口受控执行处理器
 *
 * 为插件窗口（plugin-window-preload）提供两类宿主能力：
 *   1. exec:* —— 白名单外部命令执行（ffmpeg / ffprobe / scenedetect）。
 *      二进制路径只来自主进程配置（userData/plugin-exec.json）、环境变量
 *      或系统 PATH，插件只能按命令名调用并传命令行参数，不能指定任意
 *      可执行文件；stdout/stderr 以流式事件推回发起窗口，便于解析 ffmpeg
 *      进度。视频剪辑器等工具型插件的导出/截图/场景检测均基于此实现。
 *   2. plugin-fs:* —— 最小文件原语（插件专属临时目录 / 列目录 / 读文件 /
 *      stat）。读操作接受绝对路径，用于消费 exec 产物（缩略图、CSV、
 *      导出文件下载），不提供写任意路径能力。
 */

/** 允许执行的外部命令白名单 */
const WHITELISTED_COMMANDS = ['ffmpeg', 'ffprobe', 'scenedetect'] as const
type CommandName = (typeof WHITELISTED_COMMANDS)[number]

/** 命令名 → 候选环境变量 */
const COMMAND_ENV_VARS: Record<CommandName, string[]> = {
  ffmpeg: ['FFMPEG_PATH', 'FFmpeg_PATH'],
  ffprobe: ['FFPROBE_PATH'],
  scenedetect: ['SCENEDETECT_PATH', 'PYSCENEDETECT_PATH'],
}

/** 单个输出流（stdout/stderr）累计转发上限，防止失控输出撑爆 IPC */
const MAX_STREAM_BYTES = 32 * 1024 * 1024
/** readFile 大小上限（导出产物下载用） */
const MAX_READ_FILE_BYTES = 500 * 1024 * 1024
/** exec 默认超时：30 分钟（长视频转码足够） */
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

interface ExecJob {
  child: ChildProcess
  timer: NodeJS.Timeout | null
}

interface RunPayload {
  name: string
  args: unknown[]
  jobId?: string
  cwd?: string
  timeoutMs?: number
}

export class PluginExecHandlers {
  private jobs = new Map<string, ExecJob>()
  private configPath: string
  /** 命令名 → 用户配置的绝对路径 */
  private binaryConfig: Record<string, string> = {}

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'plugin-exec.json')
    this.loadConfig()
  }

  public registerHandlers(): void {
    ipcMain.handle('plugin-exec:run', this.handleRun.bind(this))
    ipcMain.handle('plugin-exec:abort', this.handleAbort.bind(this))
    ipcMain.handle('plugin-exec:check', this.handleCheck.bind(this))
    ipcMain.handle('plugin-exec:set-binary-path', this.handleSetBinaryPath.bind(this))
    ipcMain.handle('plugin-exec:get-binary-paths', this.handleGetBinaryPaths.bind(this))
    ipcMain.handle('plugin-fs:get-temp-dir', this.handleGetTempDir.bind(this))
    ipcMain.handle('plugin-fs:read-dir', this.handleReadDir.bind(this))
    ipcMain.handle('plugin-fs:read-file', this.handleReadFile.bind(this))
    ipcMain.handle('plugin-fs:stat', this.handleStat.bind(this))
    ipcMain.handle('plugin-fs:remove', this.handleRemove.bind(this))
    logger.info('PluginExecHandlers', 'Plugin exec IPC handlers registered')
  }

  public cleanup(): void {
    for (const [jobId, job] of this.jobs) {
      if (job.timer) clearTimeout(job.timer)
      try {
        job.child.kill()
      } catch {
        /* 已退出 */
      }
      this.jobs.delete(jobId)
    }
  }

  // ---------- 配置 ----------

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const saved = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
        if (saved && typeof saved === 'object') this.binaryConfig = saved
      }
    } catch (err) {
      logger.warn('PluginExecHandlers', '读取 plugin-exec.json 失败，使用默认配置', err)
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.binaryConfig, null, 2))
    } catch (err) {
      logger.error('PluginExecHandlers', '写入 plugin-exec.json 失败', err)
    }
  }

  private assertCommandName(name: unknown): CommandName {
    if (typeof name !== 'string' || !WHITELISTED_COMMANDS.includes(name as CommandName)) {
      throw new Error(`不允许执行的命令: ${String(name)}（白名单: ${WHITELISTED_COMMANDS.join(', ')}）`)
    }
    return name as CommandName
  }

  /**
   * 解析命令的二进制路径：用户配置 > 环境变量 > 系统 PATH（返回命令名本身）。
   * 配置的路径失效时自动回退，避免插件被陈旧配置卡死。
   */
  private resolveBinary(name: CommandName): string {
    const configured = this.binaryConfig[name]
    if (configured && path.isAbsolute(configured) && fs.existsSync(configured)) {
      return configured
    }
    for (const envVar of COMMAND_ENV_VARS[name]) {
      const value = process.env[envVar]
      if (value && path.isAbsolute(value) && fs.existsSync(value)) {
        return value
      }
    }
    return name
  }

  // ---------- exec handlers ----------

  private async handleRun(event: Electron.IpcMainInvokeEvent, payload: RunPayload) {
    const name = this.assertCommandName(payload?.name)
    if (!Array.isArray(payload?.args) || payload.args.some((arg) => typeof arg !== 'string')) {
      throw new Error('args 必须为字符串数组')
    }
    const args = payload.args as string[]
    const cwd = typeof payload?.cwd === 'string' && payload.cwd ? payload.cwd : undefined
    if (cwd && !fs.existsSync(cwd)) {
      throw new Error(`工作目录不存在: ${cwd}`)
    }

    const jobId = typeof payload?.jobId === 'string' && payload.jobId ? payload.jobId : randomUUID()
    if (this.jobs.has(jobId)) {
      throw new Error(`jobId 已存在: ${jobId}`)
    }

    const binary = this.resolveBinary(name)
    const timeoutMs = Math.max(1000, Math.min(payload?.timeoutMs ?? DEFAULT_TIMEOUT_MS, 24 * 60 * 60 * 1000))

    let child: ChildProcess
    try {
      child = spawn(binary, args, {
        windowsHide: true,
        shell: false,
        ...(cwd ? { cwd } : {}),
      })
    } catch (err) {
      throw new Error(`启动 ${name} 失败: ${(err as Error).message}`)
    }

    const sender = event.sender
    const job: ExecJob = { child, timer: null }
    this.jobs.set(jobId, job)

    const send = (channel: string, data: unknown) => {
      if (sender.isDestroyed()) {
        // 发起窗口已关闭：终止任务，避免孤儿进程
        this.terminateJob(jobId)
        return
      }
      sender.send(channel, data)
    }

    const wireStream = (stream: NodeJS.ReadableStream | null, streamName: 'stdout' | 'stderr') => {
      if (!stream) return
      let total = 0
      stream.on('data', (chunk: Buffer) => {
        total += chunk.length
        if (total > MAX_STREAM_BYTES) {
          send('plugin-exec:output', {
            jobId,
            stream: streamName,
            data: `\n[输出超过 ${MAX_STREAM_BYTES} 字节，已停止转发]`,
          })
          this.terminateJob(jobId)
          return
        }
        send('plugin-exec:output', { jobId, stream: streamName, data: chunk.toString('utf-8') })
      })
    }
    wireStream(child.stdout, 'stdout')
    wireStream(child.stderr, 'stderr')

    child.on('error', (err) => {
      if (job.timer) clearTimeout(job.timer)
      this.jobs.delete(jobId)
      send('plugin-exec:exit', { jobId, code: -1, error: err.message })
    })

    child.on('close', (code) => {
      if (job.timer) clearTimeout(job.timer)
      this.jobs.delete(jobId)
      send('plugin-exec:exit', { jobId, code: code ?? -1, error: null })
    })

    job.timer = setTimeout(() => {
      send('plugin-exec:output', { jobId, stream: 'stderr', data: `\n[执行超过 ${timeoutMs}ms，已终止]` })
      this.terminateJob(jobId)
    }, timeoutMs)

    logger.info('PluginExecHandlers', `exec ${name} job=${jobId} args=${payload.args.join(' ').slice(0, 200)}`)
    return { success: true, jobId, command: binary }
  }

  private terminateJob(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (!job) return
    if (job.timer) clearTimeout(job.timer)
    this.jobs.delete(jobId)
    try {
      job.child.kill()
    } catch {
      /* 已退出 */
    }
  }

  private handleAbort(_event: Electron.IpcMainInvokeEvent, jobId: string) {
    this.terminateJob(jobId)
    return { success: true }
  }

  /** 探测命令可用性：spawn `<bin> -version`，返回解析路径与版本首行 */
  private handleCheck(_event: Electron.IpcMainInvokeEvent, name: string) {
    const command = this.assertCommandName(name)
    return new Promise((resolve) => {
      const binary = this.resolveBinary(command)
      const child = spawn(binary, ['-version'], { windowsHide: true, shell: false })
      let out = ''
      let settled = false
      const timer = setTimeout(() => {
        child.kill()
        finish(false, '探测超时')
      }, 10_000)
      const finish = (available: boolean, version?: string) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ available, command: binary, version: version || null })
      }
      child.stdout?.on('data', (chunk: Buffer) => {
        out += chunk.toString('utf-8')
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        out += chunk.toString('utf-8')
      })
      child.on('error', (err) => finish(false, err.message))
      child.on('close', (code) => {
        if (code === 0) finish(true, out.split('\n')[0]?.trim())
        else finish(false, out.split('\n')[0]?.trim() || `退出码 ${code}`)
      })
    })
  }

  private async handleSetBinaryPath(_event: Electron.IpcMainInvokeEvent, name: string, filePath: string) {
    const command = this.assertCommandName(name)
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      throw new Error('必须提供可执行文件的绝对路径')
    }
    const stat = await fsp.stat(filePath).catch(() => null)
    if (!stat?.isFile()) {
      throw new Error(`文件不存在: ${filePath}`)
    }
    // 命名校验：仅接受与命令名匹配的可执行文件（如 ffmpeg.exe / scenedetect.exe）
    const base = path.basename(filePath).toLowerCase()
    if (!base.includes(command)) {
      throw new Error(`文件名与命令不匹配: 期望包含 "${command}"，实际 "${base}"`)
    }
    this.binaryConfig[command] = filePath
    this.saveConfig()
    logger.info('PluginExecHandlers', `${command} 路径已设置为 ${filePath}`)
    return { success: true, path: filePath }
  }

  private handleGetBinaryPaths(_event: Electron.IpcMainInvokeEvent) {
    const result: Record<string, { configured: string | null; resolved: string }> = {}
    for (const name of WHITELISTED_COMMANDS) {
      result[name] = {
        configured: this.binaryConfig[name] || null,
        resolved: this.resolveBinary(name),
      }
    }
    return result
  }

  // ---------- plugin-fs handlers ----------

  private async handleGetTempDir(_event: Electron.IpcMainInvokeEvent, pluginId?: string, sub?: string) {
    const safePlugin = typeof pluginId === 'string' && pluginId ? pluginId.replace(/[^\w.-]/g, '_') : 'default'
    const segments = [app.getPath('userData'), 'plugin-temp', safePlugin]
    if (typeof sub === 'string' && sub) segments.push(sub.replace(/[^\w.-]/g, '_'))
    const dir = path.join(...segments)
    await fsp.mkdir(dir, { recursive: true })
    return { dir }
  }

  private async handleReadDir(_event: Electron.IpcMainInvokeEvent, dirPath: string) {
    if (typeof dirPath !== 'string' || !path.isAbsolute(dirPath)) {
      throw new Error('必须提供绝对路径')
    }
    const entries = await fsp.readdir(dirPath, { withFileTypes: true })
    const result = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dirPath, entry.name)
        const stat = await fsp.stat(full).catch(() => null)
        return {
          name: entry.name,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          size: stat?.size ?? 0,
          mtimeMs: stat?.mtimeMs ?? 0,
        }
      }),
    )
    return { entries: result }
  }

  private async handleReadFile(_event: Electron.IpcMainInvokeEvent, filePath: string) {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      throw new Error('必须提供绝对路径')
    }
    const stat = await fsp.stat(filePath).catch(() => null)
    if (!stat?.isFile()) {
      throw new Error(`文件不存在: ${filePath}`)
    }
    if (stat.size > MAX_READ_FILE_BYTES) {
      throw new Error(`文件过大（${(stat.size / 1024 / 1024).toFixed(1)}MB，上限 ${MAX_READ_FILE_BYTES / 1024 / 1024}MB）`)
    }
    const buffer = await fsp.readFile(filePath)
    // IPC 结构化克隆 Uint8Array；返回后由渲染侧转 Blob 下载
    return new Uint8Array(buffer)
  }

  private async handleStat(_event: Electron.IpcMainInvokeEvent, filePath: string) {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
      throw new Error('必须提供绝对路径')
    }
    const stat = await fsp.stat(filePath).catch(() => null)
    if (!stat) return { exists: false }
    return {
      exists: true,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    }
  }

  /**
   * 受限删除：仅允许删除插件临时目录树（userData/plugin-temp/...）内的
   * 文件/目录，供插件清理自己的缓存（如场景检测产物）。
   */
  private async handleRemove(_event: Electron.IpcMainInvokeEvent, targetPath: string) {
    if (typeof targetPath !== 'string' || !path.isAbsolute(targetPath)) {
      throw new Error('必须提供绝对路径')
    }
    const tempRoot = path.join(app.getPath('userData'), 'plugin-temp')
    const resolved = path.resolve(targetPath)
    if (resolved !== tempRoot && !resolved.startsWith(tempRoot + path.sep)) {
      throw new Error('只允许删除插件临时目录内的文件')
    }
    await fsp.rm(resolved, { recursive: true, force: true })
    return { success: true }
  }
}
