/**
 * 宿主受控命令执行封装（白名单 ffmpeg / ffprobe / scenedetect）。
 *
 * mira.exec.run 返回 jobId，stdout/stderr 经 'plugin-exec:output' 事件流式推送、
 * 退出经 'plugin-exec:exit' 事件送达；本模块把事件流 Promise 化，并提供
 * onStderr/onStdout 回调（解析 ffmpeg 进度）与 AbortSignal 取消支持。
 */

import { getHost } from './host'

export type CommandName = 'ffmpeg' | 'ffprobe' | 'scenedetect'

export interface RunOptions {
  cwd?: string
  timeoutMs?: number
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  signal?: AbortSignal
}

export interface RunResult {
  code: number
  stdout: string
  stderr: string
  aborted: boolean
}

/** jobId → 分发器 */
const dispatchers = new Map<string, { stdout: string; stderr: string; onStdout?: (c: string) => void; onStderr?: (c: string) => void; resolve: (r: RunResult) => void }>()

let wired = false

function ensureWired(): void {
  if (wired) return
  const host = getHost()
  if (!host) return
  wired = true
  host.exec.onOutput((payload) => {
    const dispatcher = dispatchers.get(payload.jobId)
    if (!dispatcher) return
    if (payload.stream === 'stdout') {
      dispatcher.stdout += payload.data
      dispatcher.onStdout?.(payload.data)
    } else {
      dispatcher.stderr += payload.data
      dispatcher.onStderr?.(payload.data)
    }
  })
  host.exec.onExit((payload) => {
    const dispatcher = dispatchers.get(payload.jobId)
    if (!dispatcher) return
    dispatchers.delete(payload.jobId)
    dispatcher.resolve({
      code: payload.code,
      stdout: dispatcher.stdout,
      stderr: dispatcher.stderr + (payload.error ? `\n${payload.error}` : ''),
      aborted: false,
    })
  })
}

export class CommandError extends Error {
  constructor(
    public command: CommandName,
    public result: RunResult,
  ) {
    const tail = (result.stderr || '').trim().split('\n').slice(-3).join('\n')
    super(`${command} 执行失败 (退出码 ${result.code})${tail ? `:\n${tail}` : ''}`)
    this.name = 'CommandError'
  }
}

/** 执行白名单命令；非零退出码抛 CommandError */
export async function runCommand(command: CommandName, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const host = getHost()
  if (!host) {
    throw new Error('宿主环境不可用（请在 Mira 客户端的插件窗口中使用此功能）')
  }
  ensureWired()

  const { jobId } = await host.exec.run(command, args, { cwd: options.cwd, timeoutMs: options.timeoutMs })

  return new Promise<RunResult>((resolve, reject) => {
    const dispatcher = {
      stdout: '',
      stderr: '',
      onStdout: options.onStdout,
      onStderr: options.onStderr,
      resolve: (result: RunResult) => {
        if (options.signal?.aborted || result.aborted) {
          dispatchers.delete(jobId)
          resolve({ ...result, aborted: true })
          return
        }
        if (result.code === 0) resolve(result)
        else reject(new CommandError(command, result))
      },
    }
    dispatchers.set(jobId, dispatcher)

    const onAbort = () => {
      host.exec.abort(jobId).catch(() => undefined)
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** 探测命令可用性 */
export async function checkCommand(name: CommandName): Promise<{ available: boolean; command: string; version: string | null }> {
  const host = getHost()
  if (!host) return { available: false, command: '', version: null }
  return host.exec.check(name)
}

/** 设置/读取白名单命令的二进制路径 */
export async function setBinaryPath(name: CommandName, filePath: string): Promise<void> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用')
  await host.exec.setBinaryPath(name, filePath)
}

export async function getBinaryPaths(): Promise<Record<string, { configured: string | null; resolved: string }>> {
  const host = getHost()
  if (!host) return {}
  return host.exec.getBinaryPaths()
}

/** 插件临时目录（宿主自动创建） */
export async function getTempDir(sub?: string): Promise<string> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用')
  const { dir } = await host.fs.getTempDir(sub)
  return dir
}

/** 列目录 */
export async function readDir(dirPath: string): Promise<string[]> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用')
  const { entries } = await host.fs.readDir(dirPath)
  return entries.filter((entry) => entry.isFile).map((entry) => entry.name)
}

/** 读文本文件 */
export async function readTextFile(filePath: string): Promise<string> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用')
  const bytes = await host.fs.readFile(filePath)
  return new TextDecoder('utf-8').decode(bytes)
}

/** 删除插件临时目录内的文件/目录（宿主限定 plugin-temp 树内） */
export async function removeTempPath(target: string): Promise<void> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用')
  await host.fs.remove(target)
}

export async function statPath(filePath: string): Promise<{ exists: boolean; isFile?: boolean; isDirectory?: boolean; size?: number }> {
  const host = getHost()
  if (!host) return { exists: false }
  return host.fs.stat(filePath)
}
