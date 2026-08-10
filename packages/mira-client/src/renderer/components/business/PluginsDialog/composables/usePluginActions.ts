import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/renderer/composables/useToast'
import { useConfirm } from '@/renderer/composables/useConfirm'
import { usePluginStore } from '@renderer/stores/plugin'
import { useLibraryStore } from '@renderer/stores/library'
import type { PluginRuntime, MarketplacePluginEntry } from '@/shared/types'
import { getPluginUpdate } from '../utils'

/**
 * 插件操作集合：安装/卸载/启用禁用/重载/检查更新等。
 * 这些操作在卡片、详情栏、工具栏多处触发，由主组件调用一次后 provide 共享。
 */
export function usePluginActions() {
  const { t } = useI18n()
  const toast = useToast()
  const confirm = useConfirm()
  const pluginStore = usePluginStore()
  const libraryStore = useLibraryStore()

  // 正在安装中的插件 id 集合（市场安装流程的本地 UI 状态）
  const installingIds = ref<Set<string>>(new Set())

  // 「添加插件」子对话框开关
  const showAddPluginDialog = ref(false)

  /**
   * 刷新当前 tab 的插件列表
   * @param activeTab 当前激活的 tab
   */
  const refreshPlugins = async (activeTab: 'local' | 'server' | 'online') => {
    const result = activeTab === 'online'
      ? await pluginStore.fetchMarketplaceCatalog()
      : activeTab === 'server'
        ? await pluginStore.syncServerPlugins(libraryStore.currentLibrary?.id || '')
        : await pluginStore.discoverLocalPlugins()
    if (!result.success) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.refreshFailed'),
        detail: result.message || t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    }
    return result
  }

  const isInstalling = (pluginId: string): boolean => installingIds.value.has(pluginId)

  /**
   * 安装/更新市场插件
   */
  const installMarketplacePlugin = async (entry: MarketplacePluginEntry) => {
    installingIds.value.add(entry.pluginId)
    try {
      const result = await pluginStore.installMarketplacePlugin(entry)
      if (result.success) {
        toast.add({
          severity: 'success',
          summary: t('business.pluginsDialog.marketInstallSuccess'),
          detail: t('business.pluginsDialog.marketInstallSuccessDetail', { name: entry.pluginName }),
          life: 4000
        })
      } else if ((result as any).cancelled) {
        toast.add({
          severity: 'info',
          summary: t('business.pluginsDialog.installCancelled'),
          detail: t('business.pluginsDialog.installCancelledDetail', { name: entry.pluginName }),
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: t('business.pluginsDialog.installFailed'),
          detail: (result as any).message || (result as any).error || t('business.pluginsDialog.unknownError'),
          life: 5000
        })
      }
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.installFailed'),
        detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    } finally {
      installingIds.value.delete(entry.pluginId)
    }
  }

  /**
   * 取消正在进行的插件安装
   */
  const cancelInstall = (entry: MarketplacePluginEntry) => {
    pluginStore.cancelMarketInstall(entry.pluginId).catch(() => {})
  }

  /**
   * 更新单个本地插件（走市场安装流程覆盖）
   */
  const updateLocalPlugin = async (pluginId: string) => {
    const update = getPluginUpdate(pluginId)
    if (!update?.entry) return
    await installMarketplacePlugin(update.entry)
    // 更新完成后清除该插件的更新标记
    if (pluginStore.pluginUpdates) {
      pluginStore.pluginUpdates.delete(pluginId)
    }
  }

  const togglePlugin = async (plugin: PluginRuntime) => {
    try {
      if (plugin.status !== 'disabled') {
        await pluginStore.disableLocalPlugin(plugin.config.pluginId)
        toast.add({
          severity: 'success',
          summary: t('business.pluginsDialog.disableSuccess'),
          detail: plugin.config.pluginName,
          life: 3000
        })
      } else {
        await pluginStore.enableLocalPlugin(plugin.config.pluginId)
        toast.add({
          severity: 'success',
          summary: t('business.pluginsDialog.enableSuccess'),
          detail: plugin.config.pluginName,
          life: 3000
        })
      }
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.toggleFailed'),
        detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    }
  }

  const toggleServerPlugin = async (plugin: PluginRuntime) => {
    try {
      const result = plugin.status !== 'disabled'
        ? await pluginStore.disableServerPlugin(plugin.config.pluginId)
        : await pluginStore.enableServerPlugin(plugin.config.pluginId)
      if (!result.success) throw new Error(result.message)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.toggleFailed'),
        detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    }
  }

  const reloadPlugin = async (plugin: PluginRuntime) => {
    try {
      await pluginStore.reloadLocalPlugin(plugin.config.pluginId)
      toast.add({
        severity: 'success',
        summary: t('business.pluginsDialog.reloadSuccess'),
        detail: plugin.config.pluginName,
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.reloadFailed'),
        detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    }
  }

  const removePlugin = (plugin: PluginRuntime) => {
    confirm.require({
      message: t('business.pluginsDialog.confirmUninstallMsg', { name: plugin.config.pluginName }),
      header: t('business.pluginsDialog.confirmUninstallHeader'),
      accept: async () => {
        try {
          await pluginStore.uninstallLocalPlugin(plugin.config.pluginId, plugin.directory, plugin.config.pluginName)
          toast.add({
            severity: 'success',
            summary: t('business.pluginsDialog.uninstallSuccess'),
            detail: plugin.config.pluginName,
            life: 3000
          })
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: t('business.pluginsDialog.uninstallFailed'),
            detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
            life: 5000
          })
        }
      }
    })
  }

  /**
   * 手动触发检查更新
   */
  const checkUpdates = async () => {
    try {
      const result = await pluginStore.checkPluginUpdates()
      if ((result as any).success) {
        const count = (result as any).data?.count ?? 0
        toast.add({
          severity: count > 0 ? 'info' : 'success',
          summary: count > 0 ? t('business.pluginsDialog.updatesFoundTitle') : t('business.pluginsDialog.upToDateTitle'),
          detail: count > 0 ? t('business.pluginsDialog.updatesFoundDetail', { count }) : t('business.pluginsDialog.upToDateDetail'),
          life: 3000
        })
      } else {
        toast.add({
          severity: 'warn',
          summary: t('business.pluginsDialog.checkUpdatesTitle'),
          detail: (result as any).message || (result as any).error || t('business.pluginsDialog.cannotCheck'),
          life: 4000
        })
      }
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.checkFailed'),
        detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    }
  }

  const selectPluginDirectory = async (activeTab: 'local' | 'server' | 'online') => {
    showAddPluginDialog.value = false
    try {
      const result = await pluginStore.selectPluginDirectory(t('business.pluginsDialog.selectFolderTitle'))
      if (result.success && result.data) {
        toast.add({
          severity: 'success',
          summary: t('business.pluginsDialog.pluginAdded'),
          detail: t('business.pluginsDialog.scanningPlugin'),
          life: 3000
        })
        await refreshPlugins(activeTab)
      }
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: t('business.pluginsDialog.addFailed'),
        detail: error instanceof Error ? error.message : t('business.pluginsDialog.unknownError'),
        life: 5000
      })
    }
  }

  const installPluginFromFile = async () => {
    showAddPluginDialog.value = false
    toast.add({
      severity: 'info',
      summary: t('business.pluginsDialog.developingTitle'),
      detail: t('business.pluginsDialog.developingDesc'),
      life: 3000
    })
  }

  return {
    installingIds,
    showAddPluginDialog,
    isInstalling,
    refreshPlugins,
    installMarketplacePlugin,
    cancelInstall,
    updateLocalPlugin,
    togglePlugin,
    toggleServerPlugin,
    reloadPlugin,
    removePlugin,
    checkUpdates,
    selectPluginDirectory,
    installPluginFromFile
  }
}

export type UsePluginActionsReturn = ReturnType<typeof usePluginActions>
