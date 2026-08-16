import log from 'electron-log'
import { join } from 'node:path'
import { inspect } from 'node:util'
import { getProcmLogger } from '../services/ProcmService'
import type { JsonValue } from '@hunmer/procm-mcp-sdk'

// Electron 由 Vite 启动时，父进程退出会先关闭 stdout/stderr 管道。
// 忽略此时的终端写入错误，文件日志仍可正常完成退出记录。
const handleTerminalError = (error: NodeJS.ErrnoException) => {
  if (error.code === 'EIO' || error.code === 'EPIPE') {
    log.transports.console.level = false
  }
}
process.stdout.on('error', handleTerminalError)
process.stderr.on('error', handleTerminalError)

if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding('utf8')
  process.stderr.setDefaultEncoding('utf8')
}

log.transports.file.level = 'silly'
log.transports.file.maxSize = 10 * 1024 * 1024
log.transports.file.fileName = 'mira.log'
log.transports.console.level = 'debug'

function formatArgs(args: any[]): string {
  return args.map(a =>
    typeof a === 'object' && a !== null
      ? inspect(a, { showHidden: true, depth: null, colors: false })
      : String(a)
  ).join(' ')
}

const origLog = log.log.bind(log)
const origInfo = log.info.bind(log)
const origWarn = log.warn.bind(log)
const origError = log.error.bind(log)
const origDebug = log.debug.bind(log)
log.log = (...args: any[]) => origLog(formatArgs(args))
log.info = (...args: any[]) => origInfo(formatArgs(args))
log.warn = (...args: any[]) => origWarn(formatArgs(args))
log.error = (...args: any[]) => origError(formatArgs(args))
log.debug = (...args: any[]) => origDebug(formatArgs(args))

// procm 托管时把日志同步为结构化帧（写入原始流，由 procm 解析）；
// 未初始化时为 no-op。序列化失败（循环引用等）只丢帧，不影响 electron-log。
const toProcmData = (data?: any): JsonValue | undefined => {
  if (data === undefined) return undefined
  if (data instanceof Error) {
    return { name: data.name, message: data.message, stack: data.stack ?? null }
  }
  if (typeof data === 'object' && data !== null) {
    try {
      JSON.stringify(data)
      return data as JsonValue
    } catch {
      return inspect(data, { depth: 2 })
    }
  }
  return data
}

const bridgeProcm = (level: 'debug' | 'info' | 'warn' | 'error', category: string, message: string, data?: any) => {
  try {
    getProcmLogger()[level](`[${category}] ${message}`, toProcmData(data))
  } catch {
    // procm 日志失败不影响主流程
  }
}

export const logger = {
  setLogLevel: (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') => {
    const m = { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' } as const
    log.transports.file.level = m[level]
    log.transports.console.level = m[level]
  },
  debug: (category: string, message: string, data?: any) => {
    log.debug(`[${category}] ${message}`, data ?? '')
    bridgeProcm('debug', category, message, data)
  },
  info: (category: string, message: string, data?: any) => {
    log.info(`[${category}] ${message}`, data ?? '')
    bridgeProcm('info', category, message, data)
  },
  warn: (category: string, message: string, data?: any) => {
    log.warn(`[${category}] ${message}`, data ?? '')
    bridgeProcm('warn', category, message, data)
  },
  error: (category: string, message: string, errorOrData?: any, data?: any) => {
    const isError = errorOrData instanceof Error
    log.error(`[${category}] ${message}`, isError ? errorOrData : errorOrData ?? '', data ?? '')
    bridgeProcm('error', category, message, errorOrData !== undefined ? errorOrData : data)
  },
  getLogFilePath: () => log.transports.file.getFile().path,
  getLogDirectory: () => join(log.transports.file.getFile().path, '..')
}
