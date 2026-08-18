import { join } from 'node:path'
import { inspect } from 'node:util'
import { emitMainLogToRenderer, getProcmLogger } from '../services/ProcmService'

const formatMessage = (category: string, message: string) =>
  category ? `[${category}] ${message}` : message

// 将业务数据转换为 SDK 可编码的 JSON 值；序列化失败时保留简短诊断文本。
const toProcmData = (data?: any): any => {
  if (data === undefined) return undefined
  if (data instanceof Error) {
    return { name: data.name, message: data.message, stack: data.stack ?? null }
  }
  if (typeof data === 'object' && data !== null) {
    try {
      JSON.stringify(data)
      return data
    } catch {
      return inspect(data, { depth: 2 })
    }
  }
  return data
}

export const logger = {
  setLogLevel: (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') => {
    void level
  },
  debug: (category: string, message: string, data?: any) => {
    const formattedMessage = formatMessage(category, message)
    const formattedData = toProcmData(data)
    getProcmLogger().debug(formattedMessage, formattedData)
    emitMainLogToRenderer('debug', formattedMessage, formattedData)
  },
  info: (category: string, message: string, data?: any) => {
    const formattedMessage = formatMessage(category, message)
    const formattedData = toProcmData(data)
    getProcmLogger().info(formattedMessage, formattedData)
    emitMainLogToRenderer('info', formattedMessage, formattedData)
  },
  warn: (category: string, message: string, data?: any) => {
    const formattedMessage = formatMessage(category, message)
    const formattedData = toProcmData(data)
    getProcmLogger().warn(formattedMessage, formattedData)
    emitMainLogToRenderer('warn', formattedMessage, formattedData)
  },
  error: (category: string, message: string, errorOrData?: any, data?: any) => {
    const formattedMessage = formatMessage(category, message)
    const formattedData = toProcmData(errorOrData !== undefined ? errorOrData : data)
    getProcmLogger().error(
      formattedMessage,
      formattedData
    )
    emitMainLogToRenderer('error', formattedMessage, formattedData)
  },
  getLogFilePath: () => join(process.cwd(), 'mira.log'),
  getLogDirectory: () => process.cwd()
}
