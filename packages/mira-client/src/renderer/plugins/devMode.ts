/**
 * 插件 dev 模式公共逻辑：dev 配置持久化（localStorage）+ dev url 插件窗口打开。
 *
 * 消费方：
 *   - PluginContributionBar（HomeView 插件图标点击）
 *   - 媒体右键菜单（useContextMenu 的插件预览器新窗口打开）
 * 两处必须共用同一份配置与打开流程，避免行为不一致。
 */
import { ref } from 'vue'
import i18n from '../i18n'
import { useToast } from '../composables/useToast'
import { openPluginWindow } from './openPluginWindow'

export interface PluginDevConfig {
  enabled: boolean
  url: string
}

const DEV_CONFIG_KEY = 'mira-plugin-dev-config'

const t = i18n.global.t.bind(i18n.global)
const toast = useToast()

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

/**
 * dev 模式下打开自定义 url 的插件窗口。
 * 返回是否已处理：true 表示该插件 dev 已开启且窗口已打开（或已报错提示），
 * 调用方应中止后续正常打开流程。
 */
export async function openPluginDevWindow(target: { pluginId: string; title?: string }): Promise<boolean> {
  const url = getPluginDevConfig(target.pluginId)?.url?.trim()
  if (!url || !isPluginDevEnabled(target.pluginId)) return false
  const result = await openPluginWindow({
    pluginId: target.pluginId,
    url,
    dev: true,
    title: `${target.title || target.pluginId} (dev)`,
  })
  if (result?.success === false) {
    toast.add({
      severity: 'error',
      summary: t('views.pluginContributionBar.windowOpenFailed'),
      detail: result.message || t('views.common.unknownError'),
      life: 5000,
    })
  }
  return true
}
