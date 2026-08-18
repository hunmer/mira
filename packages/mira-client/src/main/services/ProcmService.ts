/**
 * procm room 集成 —— 可选初始化（Electron 主进程）。
 *
 * 由 procm 托管启动（注入 PROCM_ROOM_ID / PROCM_WS_URL）时创建房间客户端，
 * 供 Logger 桥接输出结构化日志帧；直接运行（无环境变量）时全部 API 退化为
 * no-op，行为不变。渲染层不直接持有客户端，遵循 contextIsolation。
 */
import type { JsonValue, Logger, ProcmClient } from '@hunmer/procm-mcp-sdk'
import type { BrowserWindow } from 'electron'
import log from 'electron-log'

export type ProcmLoggerLike = Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>

let procmClient: ProcmClient | null = null
let procmLogger: ProcmLoggerLike = createNoopLogger()
let mainWindow: BrowserWindow | null = null
let stopUiExecution: (() => void) | null = null

export function setProcmMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

function createNoopLogger(): ProcmLoggerLike {
  return {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }
}

// 帧写入原始流（procm 从进程 stdout/stderr 文件解析），
// 可读输出仍由 electron-log 的 console transport 负责。
const rawConsole = {
  debug: (text: string) => writeLine(process.stdout, text),
  info: (text: string) => writeLine(process.stdout, text),
  warn: (text: string) => writeLine(process.stderr, text),
  error: (text: string) => writeLine(process.stderr, text),
}

function writeLine(stream: NodeJS.WriteStream, text: string): void {
  try {
    stream.write(`${text}\n`)
  } catch {
    // 日志写入失败不得影响业务
  }
}

export async function initProcm(): Promise<void> {
  if (procmClient) return
  if (process.env.NODE_ENV !== 'development') return
  const { createProcmClient, setupLogger, exposeCustomExecution } = await import('@hunmer/procm-mcp-sdk')
  // procm SDK 会写入带结构化 marker 的唯一日志帧；关闭 electron-log 的
  // 普通 console transport，避免同一条日志以纯文本副本污染 dashboard。
  log.transports.console.level = false
  // 即使没有 room 环境变量，也保留结构化 stdout 日志；这样由 procm
  // 启动但未注入 room 的子进程仍可按 level 过滤历史日志。
  if (!process.env.PROCM_ROOM_ID || !process.env.PROCM_WS_URL) {
    procmLogger = setupLogger({ console: rawConsole, clientName: 'mira-client' })
    return
  }
  try {
    procmClient = createProcmClient({ clientName: 'mira-client' })
  } catch (error) {
    console.warn('procm client init failed:', error)
    return
  }
  procmLogger = setupLogger({ client: procmClient, console: rawConsole })
  procmLogger.info('procm room enabled', { roomId: procmClient.roomId })
  procmClient.onState((state) => {
    if (state === 'open') {
      stopUiExecution ??= exposeCustomExecution(procmClient!, {
        target: 'mira-client',
        context: {
          runUiTest: async (name: string, ...args: JsonValue[]) => {
            const window = mainWindow
            if (!window || window.isDestroyed()) throw new Error('Mira main window is not ready')
            if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) throw new Error('invalid UI test name')
            const serializedArgs = JSON.stringify(args)
            return window.webContents.executeJavaScript(
              `(() => { const test = window.__procmUiTests?.[${JSON.stringify(name)}]; if (typeof test !== 'function') throw new Error('UI test is not registered: ${name}'); return test(...${serializedArgs}); })()`,
              true,
            )
          },
        },
      })
    } else if (stopUiExecution) {
      stopUiExecution()
      stopUiExecution = null
    }
  })
}

export function getProcmClient(): ProcmClient | null {
  return procmClient
}

export function getProcmLogger(): ProcmLoggerLike {
  return procmLogger
}

export function publishAppEvent(topic: string, payload: JsonValue): void {
  const client = procmClient
  if (!client || client.connectionState !== 'open') return
  try {
    client.publish(topic, payload)
  } catch {
    // 未连接时跳过
  }
}

export function closeProcm(): void {
  stopUiExecution?.()
  stopUiExecution = null
  procmClient?.close()
  procmClient = null
  mainWindow = null
  procmLogger = createNoopLogger()
}
