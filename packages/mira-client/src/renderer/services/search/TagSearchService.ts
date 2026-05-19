import { useTagStore } from '../../stores/tag'
import { useRouter } from 'vue-router'
import type { SearchService } from '../../types/search'

/**
 * 标签搜索服务
 * 搜索标签名称和描述
 */
export const tagSearchService: SearchService = {
  id: 'tags',
  title: '标签',
  desc: '搜索标签名称和描述',
  icon: 'label',
  
  /**
   * 获取所有标签总数
   * @returns 标签数组
   */
  getTotal: () => {
    const tagStore = useTagStore()
    return tagStore.tags
  },

  /**
   * 执行标签搜索
   * @param keyword 搜索关键词
   * @returns 搜索结果数组
   */
  search: async (keyword: string) => {
    const tagStore = useTagStore()
    const query = keyword.toLowerCase().trim()
    
    if (!query) {
      return []
    }

    // 搜索标签
    const results = tagStore.tags.filter(tag => {
      // 标签名称匹配
      const titleMatch = tag.title.toLowerCase().includes(query)
      
      // 标签描述匹配
      const descMatch = tag.description?.toLowerCase().includes(query)
      
      return titleMatch || descMatch
    })

    // 按相关性排序
    return results.sort((a, b) => {
      // 标签名精确匹配优先
      const aTitleExact = a.title.toLowerCase() === query
      const bTitleExact = b.title.toLowerCase() === query
      if (aTitleExact && !bTitleExact) return -1
      if (!aTitleExact && bTitleExact) return 1
      
      // 标签名开头匹配优先
      const aTitleStart = a.title.toLowerCase().startsWith(query)
      const bTitleStart = b.title.toLowerCase().startsWith(query)
      if (aTitleStart && !bTitleStart) return -1
      if (!aTitleStart && bTitleStart) return 1
      
      // 按文件数量排序（多的优先）
      const aFileCount = a.fileCount || 0
      const bFileCount = b.fileCount || 0
      if (aFileCount !== bFileCount) {
        return bFileCount - aFileCount
      }
      
      // 按标签名长度排序（短的优先）
      return a.title.length - b.title.length
    })
  },

  /**
   * 处理标签项点击
   * @param item 标签项
   */
  itemClick: (item: any) => {
    const router = useRouter()
    
    if (!item || !item.id) {
      console.warn('Invalid tag item:', item)
      return
    }

    // 导航到标签过滤页面，显示该标签下的所有文件
    router.push({
      path: '/',
      query: {
        tag: item.id.toString(),
        tagName: item.title
      }
    })
  },

  template: null // 模板将在组件中动态引用
}
