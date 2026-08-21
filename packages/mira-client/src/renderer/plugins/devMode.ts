/**
 * 插件 dev 模式配置（localStorage 持久化，纯配置模块无窗口打开副作用）。
 *
 * dev 拦截在 plugins/openPluginWindow 入口统一执行：
 * 所有插件打开窗口的路径（图标点击、右键菜单调用插件、PluginService ctx 等）
 * 只要插件 dev 开启，一律改开 dev url。
 */
import { ref } from 'vue'

export interface PluginDevConfig {
  enabled: boolean
  url: string
}

const DEV_CONFIG_KEY = 'mira-plugin-dev-config'

function loadDevConfigs(): Record<string, PluginDevConfig> {
  try {
    const raw = localStorage.getItem(DEV_CONFIG_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 全局共享的 dev 配置（模块级单例，各消费方响应式同步） */
export const devConfigs = ref<Record<string, PluginDevConfig>>(loadDevConfigs())

export function getPluginDevConfig(pluginId: string): PluginDevConfig | undefined {
  return devConfigs.value[pluginId]
}

/** dev 模式生效：开关开启且配置了有效 url */
export function isPluginDevEnabled(pluginId: string): boolean {
  const c = devConfigs.value[pluginId]
  return !!(c?.enabled && c.url?.trim())
}

/** 保存（upsert）某插件的 dev 配置并持久化 */
export function savePluginDevConfig(pluginId: string, config: PluginDevConfig) {
  devConfigs.value = { ...devConfigs.value, [pluginId]: config }
  try {
    localStorage.setItem(DEV_CONFIG_KEY, JSON.stringify(devConfigs.value))
  } catch { /* ignore */ }
}

