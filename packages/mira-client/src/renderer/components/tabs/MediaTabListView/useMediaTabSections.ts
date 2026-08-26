import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLibraryPrefs, saveMediaTabLayout } from '@renderer/composables/LibraryPrefs'
import { getRegisteredTabSections, resolveSectionTitle } from './tabSections'

/**
 * 区块（内置 folders / media + 外部注册区块）：排序与隐藏
 * 布局偏好存全部区块 id，`!` 前缀表示隐藏；未收录的新注册区块默认追加显示
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export interface MediaTabSection { id: string; title: string; icon: string }

export function useMediaTabSections(deps: {
  viewType: () => 'files' | 'trash'
}) {
  const { viewType } = deps
  const { t } = useI18n()

  // 内置区块：回收站视图没有子文件夹区
  const builtinTabSections = computed<MediaTabSection[]>(() => {
    const media = { id: 'media', title: t('views.sidebarModuleList.media'), icon: 'photo_library' }
    return viewType() === 'trash'
      ? [media]
      : [{ id: 'folders', title: t('views.sidebarModuleList.folders'), icon: 'folder' }, media]
  })
  // registry 为响应式 Map，运行时注册/注销区块会触发区块列表重算
  const registeredTabSections = computed(() => getRegisteredTabSections())
  const allTabSections = computed<MediaTabSection[]>(() => [
    ...builtinTabSections.value,
    ...registeredTabSections.value.map(def => ({ id: def.id, title: resolveSectionTitle(def), icon: def.icon || 'extension' })),
  ])
  const registeredSectionById = (id: string) => registeredTabSections.value.find(def => def.id === id)

  // 空布局 = 全部按默认顺序显示
  const enabledSections = computed<MediaTabSection[]>(() => {
    const order = getLibraryPrefs().mediaTabLayout
    if (!order.length) return allTabSections.value
    const enabledIds = order.filter(id => !id.startsWith('!'))
    const knownIds = new Set(order.map(id => id.replace(/^!/, '')))
    const list = enabledIds
      .map(id => allTabSections.value.find(section => section.id === id))
      .filter(Boolean) as MediaTabSection[]
    allTabSections.value.forEach(section => {
      if (!knownIds.has(section.id)) list.push(section)
    })
    return list
  })
  const disabledSections = computed(() => {
    const hidden = new Set(
      getLibraryPrefs().mediaTabLayout.filter(id => id.startsWith('!')).map(id => id.slice(1))
    )
    return allTabSections.value.filter(section => hidden.has(section.id))
  })

  const sectionLayoutDialogOpen = ref(false)
  const updateSectionLayout = (items: MediaTabSection[]) => {
    const enabledIds = items.map(item => item.id)
    void saveMediaTabLayout([
      ...enabledIds,
      ...allTabSections.value.filter(section => !enabledIds.includes(section.id)).map(section => `!${section.id}`),
    ])
  }

  return {
    builtinTabSections,
    registeredTabSections,
    allTabSections,
    registeredSectionById,
    enabledSections,
    disabledSections,
    sectionLayoutDialogOpen,
    updateSectionLayout
  }
}
