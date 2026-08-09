import { useMediaStore } from '../../stores/media'
import { useRouter } from 'vue-router'
import type { SearchService } from '../../types/search'

/**
 * 文件搜索服务
 * 搜索文件名、描述和内容
 */
export const fileSearchService: SearchService = {
  id: 'files',
  title: 'services.searchServices.files.title',
  desc: 'services.searchServices.files.desc',
  icon: 'description',
  
  /**
   * 获取所有文件总数
   * @returns 文件数组
   */
  getTotal: () => {
    const mediaStore = useMediaStore()
    return mediaStore.files
  },

  /**
   * 执行文件搜索
   * @param keyword 搜索关键词
   * @returns 搜索结果数组
   */
  search: async (keyword: string) => {
    const mediaStore = useMediaStore()
    const query = keyword.toLowerCase().trim()
    
    if (!query) {
      return []
    }

    // 搜索文件
    const results = mediaStore.files.filter(file => {
      // 文件名匹配
      const nameMatch = file.name.toLowerCase().includes(query)
      
      // 文件扩展名匹配
      const extensionMatch = file.metadata?.extension?.toLowerCase().includes(query)
      
      // MIME类型匹配
      const mimeMatch = file.mimeType?.toLowerCase().includes(query)
      
      // 标签匹配
      const tagsMatch = Array.isArray(file.tags) && 
        file.tags.some(tag => tag.toLowerCase().includes(query))
      
      // 路径匹配
      const pathMatch = file.path?.toLowerCase().includes(query)

      return nameMatch || extensionMatch || mimeMatch || tagsMatch || pathMatch
    })

    // 按相关性排序
    return results.sort((a, b) => {
      // 文件名精确匹配优先
      const aNameExact = a.name.toLowerCase() === query
      const bNameExact = b.name.toLowerCase() === query
      if (aNameExact && !bNameExact) return -1
      if (!aNameExact && bNameExact) return 1
      
      // 文件名开头匹配优先
      const aNameStart = a.name.toLowerCase().startsWith(query)
      const bNameStart = b.name.toLowerCase().startsWith(query)
      if (aNameStart && !bNameStart) return -1
      if (!aNameStart && bNameStart) return 1
      
      // 按文件名长度排序（短的优先）
      return a.name.length - b.name.length
    })
  },

  /**
   * 处理文件项点击
   * @param item 文件项
   */
  itemClick: (item: any) => {
    const router = useRouter()
    
    if (!item || !item.id) {
      console.warn('Invalid file item:', item)
      return
    }

    // 根据文件类型导航到不同的预览页面
    const mimeType = item.mimeType || ''
    
    if (mimeType.startsWith('image/')) {
      // 图片预览
      router.push(`/image-preview/${item.id}`)
    } else if (mimeType.startsWith('video/')) {
      // 视频预览
      router.push(`/video-preview/${item.id}`)
    } else if (mimeType.startsWith('audio/')) {
      // 音频预览
      router.push(`/audio-preview/${item.id}`)
    } else {
      // 通用文件预览
      router.push(`/file-preview/${item.id}`)
    }
  },

  template: null // 模板将在组件中动态引用
}
