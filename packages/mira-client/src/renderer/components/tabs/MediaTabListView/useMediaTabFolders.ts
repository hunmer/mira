import { computed, ref, watch } from 'vue'
import { useFolderStore } from '@renderer/stores/folder'
import { useLibraryStore } from '@renderer/stores/library'
import { useTabs } from '@renderer/composables/useTabs'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { miraEventBus } from '@renderer/services/EventBus'
import type { useHomeController } from '@renderer/controllers/HomeController'
import type { BrowserItem } from '@renderer/components/business/GroupedCardBrowserDialog.vue'
import type { FolderItem } from '@renderer/types/components'

/**
 * 子文件夹区：文件夹卡片数据、封面加载、尺寸计算、新建文件夹对话框
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useMediaTabFolders(deps: {
  props: {
    tabId: string
    viewType?: 'files' | 'trash'
    libraryId?: string
    filters?: Record<string, any>
  }
  homeController: ReturnType<typeof useHomeController>
  handleRefresh: (preserveSelection?: boolean) => Promise<void>
}) {
  const { props, homeController, handleRefresh } = deps
  const folderStore = useFolderStore()
  const libraryStore = useLibraryStore()
  const { activeTabId } = useTabs()

  const showFolderDialog = ref(false)
  const availableFolders = computed(() => folderStore.folders as any[])
  const folderEditAvailableFolders = computed<FolderItem[]>(() => {
    const source = folderStore.folders || []
    const nodes = new Map<number, FolderItem & { parent_id?: number }>()

    source.forEach(folder => {
      nodes.set(folder.id, {
        id: String(folder.id),
        label: folder.title || String(folder.id),
        icon: folder.icon || 'folder',
        path: folder.path,
        originalData: folder,
        children: [],
        parent_id: folder.parent_id,
      })
    })

    const roots: FolderItem[] = []
    nodes.forEach(node => {
      const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
      if (parent) parent.children!.push(node)
      else roots.push(node)
    })
    return roots
  })
  const currentFolder = computed<FolderItem | null>(() => {
    const rawFolder = props.filters?.folder
    if (rawFolder === undefined || rawFolder === null || rawFolder === '=null') return null
    const folderId = Number(rawFolder)
    const folder = Number.isFinite(folderId) ? folderStore.getFolderById(folderId) : undefined
    return folder
      ? {
        id: String(folder.id),
        label: folder.title,
        icon: folder.icon || 'folder',
        path: folder.path,
        originalData: folder,
      }
      : null
  })

  async function handleFolderSave(data: { title: string; parentId?: number; color?: number; description?: string }) {
    const libraryId = props.libraryId || libraryStore.currentLibrary?.id
    if (!libraryId) return
    const result = await folderStore.createFolder(libraryId, data.title, data.parentId, data.color, data.description)
    if (result.success) {
      showFolderDialog.value = false
      await handleRefresh(true)
    }
  }

  const childFolderItems = computed<BrowserItem[]>(() => {
    if (props.viewType === 'trash') return []
    const rawFolder = props.filters?.folder
    const currentId = rawFolder === undefined || rawFolder === null || rawFolder === '=null'
      ? null
      : Number(rawFolder)
    if (rawFolder !== undefined && rawFolder !== null && rawFolder !== '=null' && !Number.isFinite(currentId)) return []

    return (folderStore.folders || [])
      .filter((folder: any) => {
        const parentId = folder.parent_id == null || folder.parent_id === 0 ? null : Number(folder.parent_id)
        return parentId === currentId
      })
      .map((folder: any) => ({
        raw: folder,
        label: folder.title || folder.name || `Folder ${folder.id}`,
        count: folder.fileCount ?? folder.file_count ?? 0,
        icon: folder.icon || 'folder',
        color: folder.color,
        description: folder.description,
      }))
  })

  // 与媒体网格列数/卡片模式保持一致，避免文件夹卡片固定尺寸导致布局脱节。
  const folderCardSize = computed(() => {
    const modeScale = homeController.cardSize?.value === 'small' ? 0.82 : homeController.cardSize?.value === 'large' ? 1.12 : 1
    return Math.round(Math.max(140, Math.min(260, (homeController.dynamicColumnWidth?.value || 200) * modeScale)))
  })

  const folderCardUiSize = computed<'sm' | 'md' | 'lg'>(() => {
    if (folderCardSize.value <= 160) return 'sm'
    if (folderCardSize.value <= 215) return 'md'
    return 'lg'
  })

  const folderGridItemSize = computed(() => ({ sm: 96, md: 128, lg: 160 }[folderCardUiSize.value]))

  const folderCoverUrls = ref<Record<string, string>>({})
  let folderCoverLoadToken = 0
  const loadFolderCovers = async () => {
    const token = ++folderCoverLoadToken
    if (activeTabId.value !== props.tabId) return

    const libraryId = props.libraryId || libraryStore.currentLibrary?.id
    if (!libraryId || childFolderItems.value.length === 0) {
      folderCoverUrls.value = {}
      return
    }
    try {
      const covers = await miraSDKService.getFolderCovers(
        libraryId,
        childFolderItems.value.map(item => Number(item.raw.id)),
      )
      if (token === folderCoverLoadToken && activeTabId.value === props.tabId) {
        folderCoverUrls.value = Object.fromEntries(
          covers.map(cover => [String(cover.folderId), cover.coverUrl || '']),
        )
      }
    } catch {
      if (token === folderCoverLoadToken) folderCoverUrls.value = {}
    }
  }

  watch(
    [childFolderItems, () => props.libraryId || libraryStore.currentLibrary?.id, activeTabId],
    loadFolderCovers,
    { immediate: true },
  )

  function handleChildFolderSelect(folder: any, event?: MouseEvent | KeyboardEvent) {
    const title = folder.title || folder.name
    if (event && (event.ctrlKey || event.metaKey)) {
      miraEventBus.emit('home-route-folder', {
        folderId: folder.id,
        libraryId: props.libraryId || libraryStore.currentLibrary?.id,
        title,
      })
      return
    }

    miraEventBus.emit('home-tab-replace', {
      kind: 'folder',
      payload: { id: String(folder.id), title },
    })
  }

  function getFolderColor(color: unknown): string | undefined {
    if (typeof color !== 'number' || !Number.isFinite(color)) return undefined
    return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`
  }

  return {
    showFolderDialog,
    availableFolders,
    folderEditAvailableFolders,
    currentFolder,
    handleFolderSave,
    childFolderItems,
    folderCardSize,
    folderCardUiSize,
    folderGridItemSize,
    folderCoverUrls,
    handleChildFolderSelect,
    getFolderColor
  }
}
