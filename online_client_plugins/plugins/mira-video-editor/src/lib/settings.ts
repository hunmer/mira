/**
 * 插件配置（localStorage 持久化）+ 宿主白名单命令二进制路径管理。
 * 替代原版的 useHybridConfig / configManager（只为读 videoEditor 分区的几个字段）。
 */

import { checkCommand, setBinaryPath, getBinaryPaths, type CommandName } from './exec'

const SETTINGS_KEY = 'mira-video-editor:settings'

export interface EditorSettings {
  defaultOutputFormat: 'mp4' | 'webm' | 'avi' | 'mov'
  defaultQuality: 'low' | 'medium' | 'high' | 'original'
  splitSensitivity: 'low' | 'medium' | 'high'
  minSceneDuration: number
}

const DEFAULT_SETTINGS: EditorSettings = {
  defaultOutputFormat: 'mp4',
  defaultQuality: 'original',
  splitSensitivity: 'medium',
  minSceneDuration: 0,
}

export function loadSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(updates: Partial<EditorSettings>): EditorSettings {
  const next = { ...loadSettings(), ...updates }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  return next
}

/** 便捷读取（同步，供 composables 中替代原 electronAPI.getConfig().videoEditor） */
export function getVideoEditorConfig() {
  const settings = loadSettings()
  return {
    defaultOutputFormat: settings.defaultOutputFormat,
    defaultQuality: settings.defaultQuality,
    ffmpegPath: '', // 由宿主管理，仅作占位保持调用方兼容
  }
}

// ---------- 二进制路径（存宿主 userData/plugin-exec.json） ----------

export async function checkBinary(name: CommandName) {
  return checkCommand(name)
}

export async function configureBinaryPath(name: CommandName, filePath: string) {
  await setBinaryPath(name, filePath)
}

export async function listBinaryPaths() {
  return getBinaryPaths()
}
