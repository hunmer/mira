import { useFolderStore } from '../../stores/folder'
import { useRouter } from 'vue-router'
import type { SearchService } from '../../types/search'

/**
 * 文件夹搜索服务
 * 搜索文件夹名称、路径和描述
 */
export const folderSearchService: SearchService = {
  id: 'folders',
  title: '文件夹',
  desc: '搜索文件夹名称、路径和描述',
  icon: 'folder',
  
  /**
   * 获取所有文件夹总数
   * @returns 文件夹数组
   */
  getTotal: () => {
    const folderStore = useFolderStore()
    return folderStore.folders
  },

  /**
   * 执行文件夹搜索
   * @param keyword 搜索关键词
   * @returns 搜索结果数组
   */
  search: async (keyword: string) => {
    const folderStore = useFolderStore()
    const query = keyword.toLowerCase().trim()
    
    if (!query) {
      return []
    }

    // 搜索文件夹
    const results = folderStore.folders.filter(folder => {
      // 文件夹名称匹配
      const titleMatch = folder.title.toLowerCase().includes(query)
      
      // 文件夹路径匹配
      const pathMatch = folder.path?.toLowerCase().includes(query)
      
      // 文件夹描述匹配
      const descMatch = folder.description?.toLowerCase().includes(query)
      
      return titleMatch || pathMatch || descMatch
    })

    // 按相关性排序
    return results.sort((a, b) => {
      // 文件夹名精确匹配优先
      const aTitleExact = a.title.toLowerCase() === query
      const bTitleExact = b.title.toLowerCase() === query
      if (aTitleExact && !bTitleExact) return -1
      if (!aTitleExact && bTitleExact) return 1
      
      // 文件夹名开头匹配优先
      const aTitleStart = a.title.toLowerCase().startsWith(query)
      const bTitleStart = b.title.toLowerCase().startsWith(query)
      if (aTitleStart && !bTitleStart) return -1
      if (!aTitleStart && bTitleStart) return 1
      
      // 根文件夹优先（没有parent_id或parent_id为0）
      const aIsRoot = !a.parent_id || a.parent_id === 0
      const bIsRoot = !b.parent_id || b.parent_id === 0
      if (aIsRoot && !bIsRoot) return -1
      if (!aIsRoot && bIsRoot) return 1
      
      // 按文件数量排序（多的优先）
      const aFileCount = a.fileCount || 0
      const bFileCount = b.fileCount || 0
      if (aFileCount !== bFileCount) {
        return bFileCount - aFileCount
      }
      
      // 按文件夹名长度排序（短的优先）
      return a.title.length - b.title.length
    })
  },

  /**
   * 处理文件夹项点击
   * @param item 文件夹项
   */
  itemClick: (item: any) => {
    const router = useRouter()
    
    if (!item || !item.id) {
      console.warn('Invalid folder item:', item)
      return
    }

    // 导航到文件夹过滤页面，显示该文件夹下的所有文件
    router.push({
      path: '/',
      query: {
        folder: item.id.toString(),
        folderName: item.title
      }
    })
  },

  template: null // 模板将在组件中动态引用
}
