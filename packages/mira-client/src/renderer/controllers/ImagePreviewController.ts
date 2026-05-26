import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api as viewerApi } from 'v-viewer'  // 保留备用，现在主要使用内嵌组件
import 'viewerjs/dist/viewer.css'
import { useMediaStore } from '../stores/media'
import { useLibraryStore } from '../stores/library'
import type { FileInfo } from '../../shared/types'

export class ImagePreviewController {
  private router = useRouter()
  private route = useRoute()
  private mediaStore = useMediaStore()
  private libraryStore = useLibraryStore()

  // 响应式状态
  public currentImageId = ref<string>('')
  public zoom = ref<number>(1)
  public rotation = ref<number>(0)
  public similarImages = ref<FileInfo[]>([])
  public loading = ref<boolean>(false)
  public error = ref<string | null>(null)
  public viewerInstance = ref<any>(null)

  constructor() {
    // 初始化当前图片ID
    if (this.route.params.id) {
      this.currentImageId.value = this.route.params.id as string
    } else if (this.imageItems.value.length > 0) {
      this.currentImageId.value = this.imageItems.value[0].id
    }
    
    // 延迟初始化 - 将在实际需要时调用 initializeIfNeeded
  }

  /**
   * 按需初始化数据 - 只在确实需要预览时才加载
   */
  private async initializeIfNeeded(): Promise<void> {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      // 只在预览时按需加载，避免初始化时的全量获取
      if (this.mediaStore.files.length === 0) {
        // 可以考虑使用 fetchFilesForTab 的方式按需加载
        // 或者在这里添加一个轻量级的图片文件获取方法
        console.log('Image preview may need data, consider lazy loading implementation')
      }
    }
  }

  /**
   * 获取所有图片类型的媒体项目
   */
  public imageItems = computed<FileInfo[]>(() => {
    return this.mediaStore.files
      .filter(file => this.getFileType(file.name) === 'image')
  })

  /**
   * 解析JSON格式的标签
   */
  // private parseTags = (tagsJson?: string): string[] => {
  //   if (!tagsJson) return []
  //   try {
  //     const parsed = JSON.parse(tagsJson)
  //     return Array.isArray(parsed) ? parsed : []
  //   } catch {
  //     return []
  //   }
  // }

  /**
   * 获取文件类型
   */
  private getFileType = (fileName: string): string => {
    if (!fileName) return 'document'
    
    const name = fileName.toLowerCase()
    
    if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(name)) {
      return 'image'
    } else if (/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(name)) {
      return 'video'
    } else if (/\.(mp3|wav|flac|aac|ogg|wma)$/i.test(name)) {
      return 'audio'
    } else {
      return 'document'
    }
  }

  /**
   * 获取文件扩展名
   */
  // private getFileExtension = (fileName: string): string => {
  //   const lastDotIndex = fileName.lastIndexOf('.')
  //   return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : ''
  // }

  /**
   * 当前图片
   */
  public currentImage = computed(() => {
    return this.imageItems.value.find((img: FileInfo) => img.id === this.currentImageId.value) || this.imageItems.value[0]
  })

  /**
   * 当前图片索引
   */
  public currentImageIndex = computed(() => {
    return this.imageItems.value.findIndex((img: FileInfo) => img.id === this.currentImageId.value)
  })

  /**
   * 返回上一页
   */
  public goBack = (): void => {
    this.router.back()
  }

  /**
   * 关闭预览
   */
  public closePreview = (): void => {
    this.router.push('/')
  }

  /**
   * 选择图片
   */
  public handleImageSelect = (imageId: string): void => {
    if (this.currentImageId.value === imageId) return
    this.currentImageId.value = imageId
    this.zoom.value = 1
    this.rotation.value = 0
  }

  // URL 同步：不使用 router.replace，避免同路由参数变化导致组件重挂载、controller 重建
  // 图片切换只改 reactive state，不走路由

  /**
   * 放大
   */
  public handleZoomIn = (): void => {
    this.zoom.value = Math.min(this.zoom.value * 1.2, 5)
  }

  /**
   * 缩小
   */
  public handleZoomOut = (): void => {
    this.zoom.value = Math.max(this.zoom.value / 1.2, 0.1)
  }

  /**
   * 重置缩放
   */
  public handleZoomReset = (): void => {
    this.zoom.value = 1
  }

  /**
   * 向左旋转
   */
  public handleRotateLeft = (): void => {
    this.rotation.value = (this.rotation.value - 90) % 360
  }

  /**
   * 向右旋转
   */
  public handleRotateRight = (): void => {
    this.rotation.value = (this.rotation.value + 90) % 360
  }

  /**
   * 切换全屏
   */
  public handleToggleFullscreen = (): void => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  /**
   * 上一张图片
   */
  public previousImage = (): void => {
    const currentIndex = this.currentImageIndex.value
    if (currentIndex > 0) {
      this.handleImageSelect(this.imageItems.value[currentIndex - 1].id)
    }
  }

  /**
   * 下一张图片
   */
  public nextImage = (): void => {
    const currentIndex = this.currentImageIndex.value
    if (currentIndex < this.imageItems.value.length - 1) {
      this.handleImageSelect(this.imageItems.value[currentIndex + 1].id)
    }
  }

  /**
   * 搜索相似图片
   */
  public handleSearchSimilar = async (): Promise<void> => {
    this.loading.value = true
    try {
      // 这里将来会集成 mira-server-sdk 的以图搜图功能
      console.log('Search similar images for:', this.currentImage.value?.name)
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟相似图片搜索结果
      this.similarImages.value = this.imageItems.value.filter((img: FileInfo) => img.id !== this.currentImageId.value)
    } catch (error) {
      console.error('Search similar images failed:', error)
      this.error.value = '搜索相似图片失败'
    } finally {
      this.loading.value = false
    }
  }

  /**
   * 添加标签
   */
  public handleTagAdd = (tag: string): void => {
    if (this.currentImage.value && !this.currentImage.value.tags?.includes(tag)) {
      if (!this.currentImage.value.tags) {
        this.currentImage.value.tags = []
      }
      this.currentImage.value.tags.push(tag)
      console.log('Tag added:', tag)
    }
  }

  /**
   * 移除标签
   */
  public handleTagRemove = (tag: string): void => {
    if (this.currentImage.value?.tags) {
      this.currentImage.value.tags = this.currentImage.value.tags.filter((t: string) => t !== tag)
      console.log('Tag removed:', tag)
    }
  }

  /**
   * 使用v-viewer打开图片查看器
   */
  public openWithViewer = (initialIndex?: number): void => {
    const images = this.imageItems.value.map(item => ({
      src: item.url || '',
      'data-source': item.url || '', // 高分辨率图片源
      alt: item.name
    }))

    if (images.length === 0) {
      console.warn('No images to display')
      return
    }

    const startIndex = initialIndex !== undefined 
      ? initialIndex 
      : this.currentImageIndex.value >= 0 
        ? this.currentImageIndex.value 
        : 0

    this.viewerInstance.value = viewerApi({
      options: {
        toolbar: true,
        navbar: true,
        title: true,
        keyboard: true,
        focus: true,
        backdrop: true,
        loading: true,
        loop: true,
        transition: true,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        toggleOnDblclick: true,
        tooltip: true,
        url: 'data-source',
        initialViewIndex: startIndex,
        zIndex: 9999,
        zIndexInline: 999,
        viewed: (event: any) => {
          // 当切换图片时更新当前图片ID
          const index = event.detail.index
          if (this.imageItems.value[index]) {
            this.currentImageId.value = this.imageItems.value[index].id
            this.router.replace(`/image-preview/${this.imageItems.value[index].id}`)
          }
        },
        hide: () => {
          // 当关闭查看器时的回调
          console.log('Viewer closed')
        }
      },
      images
    })
  }

  /**
   * 关闭v-viewer查看器
   */
  public closeViewer = (): void => {
    if (this.viewerInstance.value) {
      this.viewerInstance.value.hide()
      this.viewerInstance.value = null
    }
  }
  /**
   * 预加载相邻图片
   */
  public preloadAdjacentImages = (): void => {
    const currentIndex = this.currentImageIndex.value
    const imagesToPreload: string[] = []

    // 预加载前一张
    if (currentIndex > 0) {
      const prevImage = this.imageItems.value[currentIndex - 1]
      if (prevImage.url) imagesToPreload.push(prevImage.url)
    }

    // 预加载后一张
    if (currentIndex < this.imageItems.value.length - 1) {
      const nextImage = this.imageItems.value[currentIndex + 1]
      if (nextImage.url) imagesToPreload.push(nextImage.url)
    }

    // 预加载图片
    imagesToPreload.forEach((url: string) => {
      const img = new Image()
      img.src = url
    })
  }
}

/**
 * 创建ImagePreviewController实例
 */
export function useImagePreviewController(): ImagePreviewController {
  return new ImagePreviewController()
}
