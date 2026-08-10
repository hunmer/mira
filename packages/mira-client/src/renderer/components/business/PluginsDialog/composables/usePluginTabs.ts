import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePluginStore } from '@renderer/stores/plugin'
import { useSettingsStore } from '@renderer/stores/settings'
import { useLibraryStore } from '@renderer/stores/library'

export type PluginTabValue = 'local' | 'server' | 'online'

/**
 * 顶部 tab + 类别栏 + 搜索框 的状态与副作用。
 * 主组件调用一次，通过 provide 共享给所有子组件。
 * @param clearSelection 切换 tab / 关闭对话框时清空右侧详情栏选中
 */
export function usePluginTabs(clearSelection: () => void) {
  const { t } = useI18n()
  const pluginStore = usePluginStore()
  const settingsStore = useSettingsStore()
  const libraryStore = useLibraryStore()

  const activeTab = ref<PluginTabValue>('local')
  const selectedCategory = ref('all')
  const searchQuery = ref('')

  // 顶部插件类型 tab 配置
  const pluginTabs: { value: PluginTabValue; labelKey: string }[] = [
    { value: 'local', labelKey: 'business.pluginsDialog.tabLocal' },
    { value: 'server', labelKey: 'business.pluginsDialog.tabServer' },
    { value: 'online', labelKey: 'business.pluginsDialog.tabMarket' }
  ]

  // 已知类别的图标映射（装饰用，不影响动态提取）
  const knownCategoryIcons: Record<string, string> = {
    communication: 'chat_bubble_outline',
    documentation: 'description',
    productivity: 'trending_up',
    development: 'code'
  }

  // 从当前 tab 的插件列表动态提取类别（去重），unknown/空 归为 'other'
  const categories = computed<{ value: string; label: string; icon: string }[]>(() => {
    const set = new Set<string>()
    if (activeTab.value === 'online') {
      ;(pluginStore.marketplacePlugins || []).forEach(e => {
        set.add((e.category || '').trim() || 'other')
      })
    } else {
      const list = activeTab.value === 'server'
        ? (pluginStore.serverPlugins || [])
        : (pluginStore.localPlugins || [])
      list.forEach(p => {
        set.add((p.config.category || '').trim() || 'other')
      })
    }
    // 'other' 始终排到最后，其余按字母序
    const arr = [...set].sort((a, b) => {
      if (a === 'other') return 1
      if (b === 'other') return -1
      return a.localeCompare(b)
    })
    return [
      { value: 'all', label: t('business.pluginsDialog.allIntegrations'), icon: 'all_inclusive' },
      ...arr.map(c => ({
        value: c,
        label: knownCategoryIcons[c] ? t(`business.pluginsDialog.${c}`) : c,
        icon: knownCategoryIcons[c] || 'extension'
      }))
    ]
  })

  // 插件市场相关
  const marketplaceUrl = computed(() => (settingsStore.settings.clientPluginMarketUrl || '').trim())
  const marketplaceUrlList = computed(() => {
    const list = settingsStore.settings.clientPluginMarketUrls || []
    return list.map((u) => (u || '').trim()).filter((u) => !!u)
  })

  // 本地插件可更新数量
  const pluginUpdateCount = computed(() => pluginStore.pluginUpdates?.size || 0)

  // 过滤后的本地插件列表
  const filteredLocalPlugins = computed(() => {
    let plugins = pluginStore.localPlugins || []
    if (selectedCategory.value !== 'all') {
      const cat = selectedCategory.value
      plugins = plugins.filter(plugin => {
        const category = (plugin.config.category || '').trim() || 'other'
        return category === cat
      })
    }
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      plugins = plugins.filter(plugin =>
        plugin.config.pluginName.toLowerCase().includes(query) ||
        plugin.config.description.toLowerCase().includes(query) ||
        plugin.config.author.toLowerCase().includes(query)
      )
    }
    return plugins
  })

  // 过滤后的服务器插件列表
  const filteredServerPlugins = computed(() => {
    let plugins = pluginStore.serverPlugins || []
    if (selectedCategory.value !== 'all') {
      const cat = selectedCategory.value
      plugins = plugins.filter(plugin => {
        const category = (plugin.config.category || '').trim() || 'other'
        return category === cat
      })
    }
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      plugins = plugins.filter(plugin =>
        plugin.config.pluginName.toLowerCase().includes(query) ||
        plugin.config.description.toLowerCase().includes(query) ||
        plugin.config.author.toLowerCase().includes(query)
      )
    }
    return plugins
  })

  // 过滤后的市场插件列表
  const filteredMarketplacePlugins = computed(() => {
    let plugins = pluginStore.marketplacePlugins || []
    if (selectedCategory.value !== 'all') {
      const cat = selectedCategory.value
      plugins = plugins.filter(entry => {
        const category = (entry.category || '').trim() || 'other'
        return category === cat
      })
    }
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      plugins = plugins.filter(entry =>
        entry.pluginName.toLowerCase().includes(query) ||
        (entry.description || '').toLowerCase().includes(query) ||
        (entry.author || '').toLowerCase().includes(query)
      )
    }
    return plugins
  })

  // 按需初始化标志
  const isMarketplaceInitialized = ref(false)
  const isServerPluginsInitialized = ref(false)

  /**
   * 拉取插件市场目录
   */
  const loadMarketplace = async () => {
    if (!marketplaceUrl.value) return
    await pluginStore.fetchMarketplaceCatalog()
  }

  /**
   * 切换当前生效的插件市场源
   * 写入设置后，既有 watch(marketplaceUrl) 会自动触发重新加载目录
   */
  const switchMarketSource = async (value: any) => {
    const url = typeof value === 'string' ? value.trim() : ''
    if (!url || url === marketplaceUrl.value) return
    await settingsStore.updateSetting('clientPluginMarketUrl', url)
  }

  // 切换 tab 时清空右侧栏选中，并重置类别过滤（不同 tab 类别集合不同）；按需加载市场/服务器/静默检查更新
  watch(activeTab, async (tab) => {
    clearSelection()
    selectedCategory.value = 'all'
    if (tab === 'online' && !isMarketplaceInitialized.value) {
      isMarketplaceInitialized.value = true
      await loadMarketplace()
    } else if (tab === 'server' && !isServerPluginsInitialized.value) {
      isServerPluginsInitialized.value = true
      const libraryId = libraryStore.currentLibrary?.id
      if (libraryId) await pluginStore.syncServerPlugins(libraryId)
    } else if (tab === 'local' && marketplaceUrl.value && !pluginStore.isCheckingUpdates) {
      // 后台静默检查更新（不弹 toast，仅刷新徽章）
      pluginStore.checkPluginUpdates().catch(() => {})
    }
  })

  // 市场源地址变化时，若已切到市场标签则重新加载
  watch(marketplaceUrl, async (url, oldUrl) => {
    if (url !== oldUrl && activeTab.value === 'online') {
      await loadMarketplace()
    }
  })

  return {
    activeTab,
    selectedCategory,
    searchQuery,
    pluginTabs,
    categories,
    marketplaceUrl,
    marketplaceUrlList,
    pluginUpdateCount,
    filteredLocalPlugins,
    filteredServerPlugins,
    filteredMarketplacePlugins,
    loadMarketplace,
    switchMarketSource
  }
}

export type UsePluginTabsReturn = ReturnType<typeof usePluginTabs>
