import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFolderStore } from '@renderer/stores/folder'
import { useTagStore } from '@renderer/stores/tag'
import type { BreadcrumbItem } from '@renderer/controllers/HomeController'

/**
 * 面包屑导航：显示当前 文件夹/标签 的层级路径，点击原地替换当前 Tab 内容
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabBreadcrumb(deps: {
  props: {
    viewType?: 'files' | 'trash'
    filters?: Record<string, any>
  }
}) {
  const { props } = deps
  const { t } = useI18n()
  const folderStore = useFolderStore()
  const tagStore = useTagStore()

  /**
   * 面包屑导航：显示当前 文件夹/标签 的层级路径。
   * - 文件夹：通过 parent_id 向上回溯，得到 全部文件 / 父文件夹 / 子文件夹
   * - 标签：标签为扁平结构，得到 全部文件 / 标签：xxx
   * - 回收站：单条 回收站
   * 最后一项标记为 active（当前位置，不可点击）。
   */
  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = []

    // 回收站：仅一条
    if (props.viewType === 'trash') {
      items.push({ id: 'trash', label: t('tabs.mediaTabListView.trashBreadcrumb'), icon: 'delete', active: true })
      return items
    }

    // 根节点：全部文件（点击会打开 all 文件夹 Tab）
    items.push({ id: 'all', label: t('tabs.mediaTabListView.allFilesBreadcrumb'), icon: 'folder' })

    // 文件夹：沿 parent_id 向上回溯父级链
    const folderRaw = props.filters?.folder
    if (folderRaw !== undefined && folderRaw !== null && folderRaw !== '=null') {
      const folderId = Number(folderRaw)
      if (Number.isFinite(folderId)) {
        const chain: BreadcrumbItem[] = []
        const seen = new Set<number>() // 防止循环引用
        let current = folderStore.getFolderById(folderId)
        while (current && !seen.has(current.id)) {
          seen.add(current.id)
          chain.unshift({
            id: `folder-${current.id}`,
            label: current.title || String(current.id),
            icon: 'folder'
          })
          const parentId = current.parent_id
          if (parentId == null || parentId === 0) break
          current = folderStore.getFolderById(parentId)
        }
        items.push(...chain)
      }
    }

    // 标签：扁平结构，selectedValues 可能有多个
    const tagsValue = props.filters?.tags
    if (tagsValue && typeof tagsValue === 'object' && 'selectedValues' in tagsValue) {
      const selectedValues = (tagsValue as any).selectedValues as (string | number)[] | undefined
      if (Array.isArray(selectedValues)) {
        selectedValues.forEach(tagId => {
          const numericId = Number(tagId)
          const tag = Number.isFinite(numericId)
            ? tagStore.tags.find(t => t.id === numericId)
            : undefined
          const label = tag?.title || t('tabs.mediaTabListView.tagBreadcrumb', { name: tagId })
          items.push({
            id: `tag-${tagId}`,
            label,
            icon: 'label'
          })
        })
      }
    }

    // 最后一项为当前位置
    if (items.length > 0) {
      items[items.length - 1].active = true
    }
    return items
  })

  /**
   * 面包屑点击：原地替换当前 Tab 的内容（不新开/切换 Tab）。
   */
  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    let kind: 'folder' | 'tag' | 'all'
    let payload: { id?: string; title?: string } = {}
    if (item.id === 'all') {
      kind = 'all'
    } else if (item.id.startsWith('folder-')) {
      kind = 'folder'
      payload.id = item.id.slice('folder-'.length)
      payload.title = item.label
    } else if (item.id.startsWith('tag-')) {
      kind = 'tag'
      payload.id = item.id.slice('tag-'.length)
      payload.title = item.label
    } else {
      return
    }
    window.dispatchEvent(new CustomEvent('home-tab-replace', { detail: { kind, payload } }))
  }

  return {
    breadcrumbItems,
    handleBreadcrumbClick
  }
}
