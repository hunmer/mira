import { join } from 'node:path'
import { inspect } from 'node:util'
import { getProcmLogger } from '../services/ProcmService'

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
    getProcmLogger().debug(formatMessage(category, message), toProcmData(data))
  },
  info: (category: string, message: string, data?: any) => {
    getProcmLogger().info(formatMessage(category, message), toProcmData(data))
  },
  warn: (category: string, message: string, data?: any) => {
    getProcmLogger().warn(formatMessage(category, message), toProcmData(data))
  },
  error: (category: string, message: string, errorOrData?: any, data?: any) => {
    const isError = errorOrData instanceof Error
    getProcmLogger().error(
      formatMessage(category, message),
      toProcmData(errorOrData !== undefined ? errorOrData : data)
    )
  },
  getLogFilePath: () => join(process.cwd(), 'mira.log'),
  getLogDirectory: () => process.cwd()
}
