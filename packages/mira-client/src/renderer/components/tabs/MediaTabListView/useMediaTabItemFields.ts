import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@renderer/stores/settings'
import type { ItemField } from '@renderer/stores/settings'

/**
 * 展示字段开关（控制三个视图下媒体项展示哪些信息）
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabItemFields() {
  const { t } = useI18n()
  const settingsStore = useSettingsStore()

  // ============================================
  // 展示字段开关（控制三个视图下媒体项展示哪些信息）
  // ============================================
  const itemFieldOptions = computed<{ key: ItemField; label: string }[]>(() => [
    { key: 'filename', label: t('tabs.mediaTabListView.fieldFilename') },
    { key: 'format', label: t('tabs.mediaTabListView.fieldFormat') },
    { key: 'size', label: t('tabs.mediaTabListView.fieldSize') },
    { key: 'folder', label: t('tabs.mediaTabListView.fieldFolder') },
    { key: 'tags', label: t('tabs.mediaTabListView.fieldTags') },
    { key: 'videoPlayIcon', label: t('tabs.mediaTabListView.fieldVideoPlayIcon') }
  ])

  const isItemFieldVisible = (field: ItemField) => {
    return settingsStore.settings.visibleItemFields.includes(field)
  }

  const toggleItemField = async (field: ItemField, checked: boolean) => {
    const current = settingsStore.settings.visibleItemFields
    const next = checked
      ? [...current, field]
      : current.filter(f => f !== field)
    await settingsStore.updateSetting('visibleItemFields', next)
  }

  return {
    itemFieldOptions,
    isItemFieldVisible,
    toggleItemField
  }
}
