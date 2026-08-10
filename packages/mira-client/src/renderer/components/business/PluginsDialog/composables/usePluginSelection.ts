import { ref, computed } from 'vue'
import { usePluginStore } from '@renderer/stores/plugin'
import type { PluginRuntime, MarketplacePluginEntry } from '@/shared/types'

export type SelectedKind = 'local' | 'server' | 'market'

/**
 * 插件选中状态管理：右侧详情栏据此展示。
 * 主组件调用一次，通过 provide 共享给所有子组件，确保选中状态在对话框内单例。
 */
export function usePluginSelection() {
  const pluginStore = usePluginStore()

  const selectedKind = ref<SelectedKind | null>(null)
  const selectedPluginId = ref<string | null>(null)

  // 选中插件（点击卡片或详情按钮）；再次点击同一项则收起
  const selectPlugin = ({ kind, pluginId }: { kind: SelectedKind; pluginId: string }) => {
    if (selectedKind.value === kind && selectedPluginId.value === pluginId) {
      clearSelection()
      return
    }
    selectedKind.value = kind
    selectedPluginId.value = pluginId
  }

  const clearSelection = () => {
    selectedKind.value = null
    selectedPluginId.value = null
  }

  const isSelected = (kind: SelectedKind, pluginId: string): boolean =>
    selectedKind.value === kind && selectedPluginId.value === pluginId

  // 当前选中的运行时插件（local/server）
  const selectedRuntime = computed<PluginRuntime | null>(() => {
    if (!selectedPluginId.value) return null
    if (selectedKind.value === 'local') {
      return (pluginStore.localPlugins || []).find(p => p.config.pluginId === selectedPluginId.value) || null
    }
    if (selectedKind.value === 'server') {
      return (pluginStore.serverPlugins || []).find(p => p.config.pluginId === selectedPluginId.value) || null
    }
    return null
  })

  // 当前选中的市场插件
  const selectedMarket = computed<MarketplacePluginEntry | null>(() => {
    if (selectedKind.value !== 'market' || !selectedPluginId.value) return null
    return (pluginStore.marketplacePlugins || []).find(e => e.pluginId === selectedPluginId.value) || null
  })

  // 右侧详情栏是否展示
  const selectedDetail = computed<boolean>(() => selectedRuntime.value !== null || selectedMarket.value !== null)

  // 详情栏标签（依赖或 tags）
  const detailTags = computed<string[]>(() => {
    if (selectedRuntime.value) {
      return selectedRuntime.value.config.dependencies || []
    }
    if (selectedMarket.value) {
      return selectedMarket.value.tags || []
    }
    return []
  })

  return {
    selectedKind,
    selectedPluginId,
    selectPlugin,
    clearSelection,
    isSelected,
    selectedRuntime,
    selectedMarket,
    selectedDetail,
    detailTags
  }
}

export type UsePluginSelectionReturn = ReturnType<typeof usePluginSelection>
