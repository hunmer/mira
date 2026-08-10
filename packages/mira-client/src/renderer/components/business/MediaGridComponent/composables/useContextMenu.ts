import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FileInfo } from '../../../../../shared/types'
import type { MenuItem } from '@/renderer/types/menu'
import { appService } from '@renderer/services'
import { useLibraryStore } from '@renderer/stores/library'
import { useTagStore } from '@renderer/stores/tag'
import { useFolderStore } from '@renderer/stores/folder'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { runBatchOperation } from '@renderer/composables/useBatchOperation'
import { copyToClipboard } from '@renderer/utils/helpers'
import { getPluginFileFormats } from '@renderer/plugins/instanceManager'

interface UseContextMenuProps {
  selectedItems: string[]
  items: FileInfo[]
  isTrash?: boolean
}

interface UseContextMenuEmits {
  (e: 'media-context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'media-info', item: FileInfo): void
  (e: 'media-set-folder', item: FileInfo): void
  (e: 'media-set-tags', item: FileInfo): void
  (e: 'media-delete', item: FileInfo): void
  (e: 'media-restore', item: FileInfo): void
}

export function useContextMenu(props: UseContextMenuProps, emit: UseContextMenuEmits) {
  const router = useRouter()
  const { t } = useI18n()
  const currentContextItem = ref<FileInfo | null>(null)
  const folderPopoverOpen = ref(false)
  const tagPopoverOpen = ref(false)
  const coverCropOpen = ref(false)
  const popoverPosition = ref({ x: 0, y: 0 })
  const tagStore = useTagStore()
  const folderStore = useFolderStore()
  const libraryStore = useLibraryStore()
  const menuVersion = ref(0)
  const menuTimer = setInterval(() => { menuVersion.value++ }, 500)
  onBeforeUnmount(() => clearInterval(menuTimer))

  watch([folderPopoverOpen, tagPopoverOpen], ([folderOpen, tagOpen]) => {
    const libId = libraryStore.currentLibrary?.id || 'default'
    if (folderOpen) folderStore.fetchFolders(libId)
    if (tagOpen) tagStore.fetchTags(libId)
  })

  const folderTreeNodes = computed(() =>
    folderStore.folders.map((f: any) => ({
      id: String(f.id),
      label: f.title,
      icon: 'folder',
      count: f.fileCount,
      children: f.children?.map((c: any) => ({
        id: String(c.id),
        label: c.title,
        icon: 'folder',
        count: c.fileCount,
      })),
      originalData: f,
    }))
  )

  const getTargetFiles = (): FileInfo[] => {
    if (props.selectedItems.length <= 1 || !currentContextItem.value) {
      return currentContextItem.value ? [currentContextItem.value] : []
    }
    const idSet = new Set(props.selectedItems)
    return props.items.filter(f => idSet.has(f.id))
  }

  const handleFolderSelect = async (folderItem: any) => {
    const client = (miraSDKService as any).client
    if (!client) return
    const files = getTargetFiles()
    if (files.length === 0) return
    folderPopoverOpen.value = false
    await runBatchOperation(files, async (file) => {
      const libId = file.libraryId || 'default'
      await client.folders().setFileFolder({ libraryId: libId, fileId: parseInt(file.id), folder: parseInt(folderItem.id) })
      file.folderId = String(folderItem.id)
      emit('media-set-folder', file)
    }, { label: t('business.contextMenu.setFolder') })
  }

  const handleTagSelect = async (tagData: any) => {
    const client = (miraSDKService as any).client
    if (!client) return
    const tagName = tagData.title || tagData.name
    const files = getTargetFiles()
    if (files.length === 0) return
    tagPopoverOpen.value = false
    await runBatchOperation(files, async (file) => {
      const libId = file.libraryId || 'default'
      await client.tags().addTagsToFile(libId, parseInt(file.id), [tagName])
      if (!file.tags) file.tags = []
      if (!file.tags.includes(tagName)) file.tags.push(tagName)
      emit('media-set-tags', file)
    }, { label: t('business.contextMenu.setTags') })
  }

  const runWithCurrentItem = async (handler: (item: FileInfo) => void | Promise<void>) => {
    const item = currentContextItem.value
    if (!item) {
      console.warn('Context menu command ignored: no current media item')
      return
    }

    await handler(item)
  }

  // 复制当前文件信息的 JSON 到剪贴板
  const copyFileInfoJSON = (item: FileInfo) => {
    const json = JSON.stringify(item, null, 2)
    copyToClipboard(json)
  }

  const openFileInNewWindow = (item: FileInfo) => {
    const query = new URLSearchParams({
      id: String(item.id),
      libraryId: String(item.libraryId || libraryStore.currentLibrary?.id || ''),
      title: item.name || '',
      path: item.path || item.url || '',
      mimeType: item.mimeType || '',
    })
    const url = new URL(window.location.href)
    url.hash = `/file-preview?${query}`
    if (appService.isElectron) {
      void window.electronAPI?.invoke('window:open-url', url.href, {
        width: 1280,
        height: 800,
        title: item.name || t('business.contextMenu.filePreview'),
      }).then((result) => {
        if (!result?.success) console.warn('[media-preview] 新窗口打开失败:', result?.message)
      }).catch((error) => console.warn('[media-preview] 新窗口打开失败:', error))
    } else {
      if (!window.open(url.href, '_blank', 'noopener,noreferrer')) {
        console.warn('[media-preview] 新标签页被浏览器拦截')
      }
    }
  }

  // 插件回调跨 IPC 传递时必须是普通可克隆对象，不能把 Vue reactive Proxy 传出去。
  const getSerializableTargetFiles = (): FileInfo[] => {
    const files = getTargetFiles()
    try {
      return JSON.parse(JSON.stringify(files))
    } catch (error) {
      console.warn('[plugin-context-menu] failed to serialize selected files', error)
      return files.map(file => ({ ...file }))
    }
  }

  const pluginContextMenus = computed((): MenuItem[] => {
    void menuVersion.value
    const ps: any = (window as any).pluginSystem
    const menus = ps?.mediaContextMenus?.getAll?.() || []
    const contributions = ps?.contributions?.getContributions?.() || []
    const groups = new Map<string, any>()
    for (const menu of menus) {
      if (!menu?.id || !menu?.label || typeof menu.onSelect !== 'function') continue
      let group = groups.get(menu.pluginId)
      if (!group) {
        const contribution = contributions.find((c: any) => c.pluginId === menu.pluginId)
        group = {
          label: contribution?.title || ps?.getPlugin?.(menu.pluginId)?.pluginName || menu.pluginId,
          items: [],
        }
        groups.set(menu.pluginId, group)
      }
      group.items.push({
        label: menu.label,
        command: async () => {
          const files = getSerializableTargetFiles()
          if (files.length === 0) return
          await menu.onSelect(files)
        },
      })
    }
    return Array.from(groups.values()).map((group: any) => ({ ...group, items: group.items }))
  })

  const openWithItems = computed((): MenuItem[] => {
    void menuVersion.value
    const file = currentContextItem.value
    if (!file) return []
      return getPluginFileFormats(file)
      .filter(format => format.getPreviewUrl || format.open)
      .map(format => ({
        label: format.title || t('business.contextMenu.pluginDefault'),
        command: () => runWithCurrentItem(async item => {
          if (format.getPreviewUrl) {
            await router.push({
              path: '/file-preview',
              query: {
                id: String(item.id),
                libraryId: String(item.libraryId || libraryStore.currentLibrary?.id || ''),
                title: item.name || '',
                path: item.path || item.url || '',
                mimeType: item.mimeType || '',
                viewer: format.id,
              },
            })
            return
          }
          await format.open?.(item)
        }),
      }))
  })

  const contextMenuItems = computed((): MenuItem[] => {
    // 复制文件信息 JSON —— 统一放入【更多】子菜单
    const moreItems: MenuItem[] = [
      {
        label: t('business.contextMenu.copyFileInfoJson'),
        command: () => runWithCurrentItem((item) => copyFileInfoJSON(item))
      },
    ]
    const moreMenu: MenuItem = {
      label: t('business.contextMenu.more'),
      items: moreItems,
    }

    // 回收站视图：只提供恢复（+ 定位）
    if (props.isTrash) {
      return [
        { separator: true },
        {
          label: props.selectedItems.length > 1 ? t('business.contextMenu.restoreFileCount', { count: props.selectedItems.length }) : t('business.contextMenu.restoreFile'),
          shortcut: 'Ctrl+R',
          command: () => runWithCurrentItem(async () => {
            const files = getTargetFiles()
            if (files.length === 0) return
            await runBatchOperation(files, async (file) => {
              const libraryId = file.libraryId || libraryStore.currentLibrary?.id
              if (!libraryId) return
              await appService.restoreFile(libraryId, file.id)
              emit('media-restore', file)
            }, { label: t('business.contextMenu.restoreFile') })
          })
        },
        {
          label: props.selectedItems.length > 1 ? t('business.contextMenu.permanentDeleteCount', { count: props.selectedItems.length }) : t('business.contextMenu.permanentDelete'),
          command: () => runWithCurrentItem(async () => {
            const files = getTargetFiles()
            if (files.length === 0) return
            await runBatchOperation(files, async (file) => {
              const libraryId = file.libraryId || libraryStore.currentLibrary?.id
              if (!libraryId) return
              await appService.deleteFile(libraryId, file.id, false)
              emit('media-delete', file)
            }, { label: t('business.contextMenu.permanentDelete') })
          })
        },
        moreMenu
      ]
    }

    // 普通文件视图：原有菜单
    return [
      {
        label: t('business.contextMenu.openInNewWindow'),
        command: () => runWithCurrentItem((item) => openFileInNewWindow(item))
      },
      ...(openWithItems.value.length ? [{
        label: t('business.contextMenu.otherOpenWith'),
        items: openWithItems.value,
      }] : []),
      {
        separator: true
      },
      ...(
        pluginContextMenus.value.length
          ? [{ label: t('business.contextMenu.invokePlugin'), items: pluginContextMenus.value }, { separator: true }]
          : []
      ),
      {
        label: props.selectedItems.length > 1 ? t('business.contextMenu.setFolderCount', { count: props.selectedItems.length }) : t('business.contextMenu.setFolder'),
        shortcut: 'Ctrl+M',
        command: () => runWithCurrentItem(() => {
          setTimeout(() => { folderPopoverOpen.value = true }, 100)
        })
      },
      {
        label: props.selectedItems.length > 1 ? t('business.contextMenu.setTagsCount', { count: props.selectedItems.length }) : t('business.contextMenu.setTags'),
        shortcut: 'Ctrl+T',
        command: () => runWithCurrentItem(() => {
          setTimeout(() => { tagPopoverOpen.value = true }, 100)
        })
      },
      {
        label: t('business.contextMenu.setCover'),
        command: () => runWithCurrentItem(() => {
          coverCropOpen.value = true
        })
      },
      {
        separator: true
      },
      ...([
        currentContextItem.value?.localFile && {
          label: t('business.contextMenu.locateFolder'),
          command: () => {
            const api = (window as any).electronAPI
            api?.fs?.showItemInFolder(currentContextItem.value!.localFile!)
          }
        }
      ].filter(Boolean) as MenuItem[]),
      {
        label: props.selectedItems.length > 1 ? t('business.contextMenu.deleteCount', { count: props.selectedItems.length }) : t('business.contextMenu.delete'),
        shortcut: 'Delete',
        command: () => runWithCurrentItem(async () => {
          const files = getTargetFiles()
          if (files.length === 0) return
          await runBatchOperation(files, async (file) => {
            const libraryId = file.libraryId || libraryStore.currentLibrary?.id
            if (!libraryId) return
            await appService.deleteFile(libraryId, file.id)
            emit('media-delete', file)
          }, { label: t('business.contextMenu.delete') })
        })
      },
      moreMenu
    ]
  })

  const handleContextMenu = (item: FileInfo, event: MouseEvent) => {
    currentContextItem.value = item
    popoverPosition.value = { x: event.clientX, y: event.clientY }
    emit('media-context-menu', item, event)
  }

  return {
    currentContextItem,
    contextMenuItems,
    handleContextMenu,
    folderPopoverOpen,
    tagPopoverOpen,
    coverCropOpen,
    popoverPosition,
    folderTreeNodes,
    handleFolderSelect,
    handleTagSelect,
    tagStore,
  }
}
