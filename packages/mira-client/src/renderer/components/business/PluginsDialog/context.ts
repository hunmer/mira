import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { UsePluginTabsReturn } from './composables/usePluginTabs'
import type { UsePluginSelectionReturn } from './composables/usePluginSelection'
import type { UsePluginActionsReturn } from './composables/usePluginActions'

/**
 * PluginsDialog 内部通过 provide/inject 共享的上下文。
 * 仅在 PluginsDialog 组件树内有效，避免逐层 props 透传。
 * showAddPluginDialog / 各类操作方法由 usePluginActions 提供。
 */
export interface PluginsDialogContext
  extends UsePluginTabsReturn, UsePluginSelectionReturn, UsePluginActionsReturn {}

export const PLUGINS_DIALOG_KEY: InjectionKey<PluginsDialogContext> = Symbol('PluginsDialogContext')

/**
 * 在 PluginsDialog 子组件中调用，获取共享上下文。
 * 若未在 PluginsDialog 内使用则抛错（开发期发现问题）。
 */
export function usePluginsDialog(): PluginsDialogContext {
  const ctx = inject(PLUGINS_DIALOG_KEY, null)
  if (!ctx) {
    throw new Error('usePluginsDialog() must be used within <PluginsDialog>')
  }
  return ctx
}
