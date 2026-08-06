import { computed, ref } from 'vue'
import { useMediaStore } from '../../stores/media'
import { useFolderStore } from '../../stores/folder'
import { useTagStore } from '../../stores/tag'
import { useLibraryStore } from '../../stores/library'
import type { NavigationItem, FolderItem, SearchFilter } from '../../types/components'
import type { FileInfo } from '../../../shared/types'
import type { FilterConditions, BreadcrumbItem, QuickFilter } from './types'
import { HomeControllerUtils } from './utils'

/**
 * 数据管理模块
 * 负责处理媒体项目、文件夹树、过滤数据等
 */
export class HomeDataManager {
  private mediaStore = useMediaStore()
  private folderStore = useFolderStore()
  private tagStore = useTagStore()
  private libraryStore = useLibraryStore()

  // 筛选状态
  public filterConditions = ref<FilterConditions>({
    folders: [],
    tags: [],
    urls: '',
    title: '',
    sizeMin: undefined,
    sizeMax: undefined,
    sizePreset: ''
  })

  public searchQuery = ref('')
  public activeFilters = ref<SearchFilter[]>([])
  public selectedFolder = ref<string>('all')

  /**
   * 媒体项目 - 从 store 获取真实数据
   */
  public mediaItems = computed<FileInfo[]>(() => {
    return this.mediaStore.files.map(file => {
      const fileExtension = HomeControllerUtils.getFileExtension(file.name)

      return {
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        extension: fileExtension,
        mimeType: file.mimeType,
        url: file.url || '',
        thumbnailPath: file.thumbnailPath,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        tags: file.tags || [],
        folderId: file.folderId || '',
        hash: file.hash || '',
        libraryId: file.libraryId || '',
        metadata: {
          extension: fileExtension,
          mimeType: file.mimeType,
          ...file.metadata
        }
      }
    })
  })

  /**
   * 文件夹树数据 - 从 store 获取真实数据
   */
  public folderTree = computed<FolderItem[]>(() => {
    const buildFolderTree = (folders: any[], parentId?: number, depth = 0): FolderItem[] => {
      if (!folders || folders.length === 0) {
        return []
      }
      return folders
        .filter((folder: any) => {
          if (!folder || typeof folder.id === 'undefined') {
            return false
          }

          if (parentId === undefined || parentId === null) {
            return folder.parent_id == null || folder.parent_id === 0
          } else {
            return folder.parent_id === parentId
          }
        })
        .map((folder: any) => {
          const children = buildFolderTree(folders, folder.id, depth + 1)

          // badge 显示「含所有子层级的总数」：自身直接文件数 + 所有后代之和
          const selfCount = folder.file_count ?? folder.fileCount ?? 0
          const totalCount = selfCount + children.reduce((s, c) => s + (c.count || 0), 0)

          return {
            id: folder.id.toString(),
            label: folder.title || folder.name || `Folder ${folder.id}`,
            icon: 'folder',
            iconColor: folder.color ? `#${folder.color.toString(16).padStart(6, '0')}` : 'text-gray-500',
            count: totalCount,
            active: this.selectedFolder.value === folder.id.toString(),
            expanded: false,
            level: depth,
            path: folder.path,
            children: children.length > 0 ? children : undefined,
            originalData: folder
          }
        })
    }

    return buildFolderTree(this.folderStore.folders)
  })

  /**
   * 快速过滤器 - 基于真实数据统计
   */
  public quickFilters = computed<QuickFilter[]>(() => {
    const tagCount = this.tagStore.totalTags
    const folderCount = this.folderStore.totalFolders

    return [
      {
        id: 'folders',
        label: `文件夹 (${folderCount})`,
        icon: 'folder',
        active: true
      },
      {
        id: 'tags',
        label: `标签 (${tagCount})`,
        icon: 'label'
      },
      {
        id: 'urls',
        label: '网址',
        icon: 'link'
      },
      {
        id: 'size',
        label: '大小',
        icon: 'aspect_ratio'
      }
    ]
  })

  /**
   * 过滤后的媒体项目（所有数据，不分页）
   */
  public filteredMediaItems = computed(() => {
    let filtered = this.mediaItems.value

    // 应用搜索查询
    if (this.searchQuery.value) {
      const query = this.searchQuery.value.toLowerCase()
      filtered = filtered.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query)
        const tagsMatch = Array.isArray(item.tags)
          ? item.tags.some(tag => tag.toLowerCase().includes(query))
          : false
        return nameMatch || tagsMatch
      })
    }

    // 应用文件夹筛选
    if (this.filterConditions.value.folders.length > 0) {
      filtered = filtered.filter(item =>
        this.filterConditions.value.folders.includes(item.folderId || '')
      )
    }

    // 应用标签筛选
    if (this.filterConditions.value.tags.length > 0) {
      filtered = filtered.filter(item => {
        const itemTags = Array.isArray(item.tags) ? item.tags : []
        return itemTags.some(tag => this.filterConditions.value.tags.includes(tag))
      })
    }

    // 应用网址筛选
    if (this.filterConditions.value.urls.trim()) {
      const urlQuery = this.filterConditions.value.urls.toLowerCase()
      filtered = filtered.filter(item =>
        item.url?.toLowerCase().includes(urlQuery) ||
        item.name.toLowerCase().includes(urlQuery)
      )
    }

    // 应用文件大小筛选
    if (this.filterConditions.value.sizeMin !== undefined || this.filterConditions.value.sizeMax !== undefined) {
      filtered = filtered.filter(item => {
        const size = item.size || 0
        const minValid = this.filterConditions.value.sizeMin === undefined || size >= this.filterConditions.value.sizeMin
        const maxValid = this.filterConditions.value.sizeMax === undefined || size <= this.filterConditions.value.sizeMax
        return minValid && maxValid
      })
    }

    // 应用旧的过滤器（保持向后兼容）
    for (const filter of this.activeFilters.value) {
      if (filter.key === 'type' && filter.value) {
        filtered = filtered.filter(item => HomeControllerUtils.getFileTypeFromInfo(item) === filter.value)
      }
    }

    return filtered
  })

  // 配置数据
  public searchFilters = ref<SearchFilter[]>([
    {
      key: 'type',
      label: '类型',
      value: null,
      type: 'select',
      options: [
        { label: '全部', value: null },
        { label: '图片', value: 'image' },
        { label: '视频', value: 'video' },
        { label: '音频', value: 'audio' }
      ]
    }
  ])

  /**
   * 当前路径
   */
  public currentPath = computed(() => {
    const currentLibrary = this.libraryStore.currentLibrary
    return currentLibrary?.name || '素材库'
  })

  /**
   * 文件总数
   */
  public totalFiles = computed(() => {
    return this.filteredMediaItems.value.length
  })


  /**
   * 检查是否正在加载数据
   */
  public get isLoading(): boolean {
    return this.mediaStore.isLoading || this.folderStore.isLoading || this.tagStore.isLoading
  }

  /**
   * 获取错误信息
   */
  public get errorMessage(): string | null {
    return this.mediaStore.error || this.folderStore.error || this.tagStore.error
  }
}