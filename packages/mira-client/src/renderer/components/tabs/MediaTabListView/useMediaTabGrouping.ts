import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFolderStore } from '@renderer/stores/folder'
import { useTagStore } from '@renderer/stores/tag'
import {
  getTabGroupingMode,
  resolveDefaultGroupingMode,
  saveTabGroupingMode,
  type MediaGroupingMode
} from '@renderer/composables/LibraryPrefs'
import type { FileInfo } from '@/shared/types'

/** 分组章节（原 ChapterScrubber 的 Chapter，改由 Scrollbar 标注点承接导航） */
export interface GroupChapter {
  id: string
  title: string
  meta: string
  description: string
}

/**
 * 素材分组：按标签 / 文件夹 / 文件类型分组，以及分组章节导航
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabGrouping(deps: {
  tabId: string
  paginatedMediaItems: ComputedRef<any[]>
  rootEl: () => HTMLElement | null
}) {
  const { tabId, paginatedMediaItems, rootEl } = deps
  const { t } = useI18n()
  const tagStore = useTagStore()
  const folderStore = useFolderStore()

  const groupingMode = ref<MediaGroupingMode>(getTabGroupingMode(tabId) || resolveDefaultGroupingMode())
  const groupingOptions: Array<{ value: MediaGroupingMode; label: string }> = [
    { value: 'none', label: '无' },
    { value: 'tags', label: '按标签' },
    { value: 'folders', label: '按文件夹' },
    { value: 'types', label: '按文件类型' },
  ]

  const handleGroupingChange = (mode: MediaGroupingMode) => {
    groupingMode.value = mode
    void saveTabGroupingMode(tabId, mode)
  }

  const mediaGroups = computed(() => {
    const items = paginatedMediaItems.value as FileInfo[]
    if (groupingMode.value === 'none') return [{ key: 'all', label: '', items }]

    const groups = new Map<string, FileInfo[]>()
    const labels = new Map<string, string>()
    const add = (key: string, label: string, item: FileInfo) => {
      groups.set(key, [...(groups.get(key) || []), item])
      labels.set(key, label)
    }

    for (const item of items) {
      if (groupingMode.value === 'tags') {
        const tags = item.tags?.length ? item.tags : ['__untagged__']
        tags.forEach(tagId => {
          const tag = (tagStore.tags || []).find((candidate: any) => String(candidate.id) === String(tagId))
          add(`tag-${tagId}`, tag?.title || (tagId === '__untagged__' ? '无标签' : String(tagId)), item)
        })
      } else if (groupingMode.value === 'folders') {
        const folderId = item.folderId || '__unfiled__'
        const folder = (folderStore.folders || []).find((candidate: any) => String(candidate.id) === String(folderId))
        add(`folder-${folderId}`, folder?.title || (folderId === '__unfiled__' ? '无文件夹' : String(folderId)), item)
      } else {
        const type = item.mimeType?.split('/')[0] || item.extension?.replace('.', '') || '未知类型'
        add(`type-${type}`, type, item)
      }
    }

    return [...groups].map(([key, groupItems]) => ({ key, label: labels.get(key) || key, items: groupItems }))
  })

  const groupChapters = computed<GroupChapter[]>(() => mediaGroups.value.map((group, index) => ({
    id: group.key,
    title: group.label || t('views.sidebarModuleList.media'),
    meta: `${index + 1} / ${mediaGroups.value.length}`,
    description: t('tabs.mediaTabListView.fileCount', { count: group.items.length })
  })))

  const handleGroupChapterSelect = (_chapter: GroupChapter, index: number) => {
    const target = rootEl()?.querySelector(`[data-media-group-index="${index}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return {
    groupingMode,
    groupingOptions,
    handleGroupingChange,
    mediaGroups,
    groupChapters,
    handleGroupChapterSelect
  }
}
