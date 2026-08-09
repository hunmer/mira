import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api as viewerApi } from 'v-viewer'  // 保留备用，现在主要使用内嵌组件
import 'viewerjs/dist/viewer.css'
import { useMediaStore } from '../stores/media'
import { CONVERTED_IMAGE_EXTENSIONS, getPreviewImageSource } from '../utils/fileUtils'
import type { FileInfo } from '../../shared/types'
import i18n from '../i18n'

export class ImagePreviewController {
  private router = useRouter()
  private route = useRoute()
  private mediaStore = useMediaStore()

  // 响应式状态
  public currentImageIndex = ref<number>(0)
  public zoom = ref<number>(1)
  public rotation = ref<number>(0)
  public similarImages = ref<FileInfo[]>([])
  public loading = ref<boolean>(false)
  public error = ref<string | null>(null)
  public viewerInstance = ref<any>(null)
  public imageCacheKey = ref<number>(Date.now())

  private debug = (event: string, payload: Record<string, unknown> = {}): void => {
    console.debug('[ImagePreviewDebug][Controller]', event, payload)
  }

  private describeImage = (image?: FileInfo): Record<string, unknown> | null => {
    if (!image) return null

    return {
      id: image.id,
      name: image.name,
      localFile: image.localFile,
      path: image.path,
      url: image.url,
      thumbnailPath: image.thumbnailPath,
      previewSource: getPreviewImageSource(image),
      updatedAt: image.updatedAt
    }
  }

  constructor() {
    this.setCurrentImageIndexById(typeof this.route.params.id === 'string' ? this.route.params.id : undefined, false)

    this.debug('constructor:init', {
      routeId: this.route.params.id,
      currentImageId: this.currentImageId.value,
      currentImageIndex: this.currentImageIndex.value,
      cacheKey: this.imageCacheKey.value,
      imageCount: this.imageItems.value.length,
      currentImage: this.describeImage(this.currentImage.value)
    })

    watch(
      () => this.route.params.id,
      (imageId) => {
        this.debug('route:param-change', {
          routeId: imageId,
          currentImageId: this.currentImageId.value,
          currentImageIndex: this.currentImageIndex.value,
          cacheKey: this.imageCacheKey.value
        })

        if (typeof imageId === 'string' && imageId && imageId !== this.currentImageId.value) {
          this.setCurrentImageIndexById(imageId)
        }
      }
    )

    // 延迟初始化 - 将在实际需要时调用 initializeIfNeeded
  }

  /**
   * 获取打开预览时当前 Tab 的图片结果集
   */
  public imageItems = computed<FileInfo[]>(() => {
    const previewItems = this.mediaStore.imagePreviewItems.length > 0
      ? this.mediaStore.imagePreviewItems
      : this.mediaStore.files

    return previewItems
      .filter(file => this.getFileType(file.name) === 'image')
  })

  private normalizeImageIndex = (index: number): number => {
    const maxIndex = this.imageItems.value.length - 1
    if (maxIndex < 0) return 0
    return Math.min(Math.max(index, 0), maxIndex)
  }

  private setCurrentImageIndex = (index: number, syncRoute = true): void => {
    const nextIndex = this.normalizeImageIndex(index)
    const previousIndex = this.currentImageIndex.value

    if (previousIndex === nextIndex && this.currentImage.value) {
      return
    }

    this.currentImageIndex.value = nextIndex
    this.imageCacheKey.value = Date.now()
    this.zoom.value = 1
    this.rotation.value = 0

    const image = this.currentImage.value

    this.debug('index:set', {
      previousIndex,
      currentImageIndex: this.currentImageIndex.value,
      currentImageId: this.currentImageId.value,
      cacheKey: this.imageCacheKey.value,
      currentImage: this.describeImage(image)
    })

    if (syncRoute && image?.id) {
      this.router.replace({
        name: 'ImagePreview',
        params: { id: image.id },
        query: this.route.query
      }).then(() => {
        this.debug('index:route-synced', {
          routeId: this.route.params.id,
          currentImageIndex: this.currentImageIndex.value,
          currentImageId: this.currentImageId.value,
          cacheKey: this.imageCacheKey.value
        })
      }).catch((error) => {
        console.error('[ImagePreviewDebug][Controller] index:route-sync-failed', error)
      })
    }
  }

  private setCurrentImageIndexById = (imageId?: string, syncRoute = true): void => {
    const index = imageId
      ? this.imageItems.value.findIndex((image: FileInfo) => image.id === imageId)
      : 0

    this.setCurrentImageIndex(index >= 0 ? index : 0, syncRoute)
  }

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
    
    const extension = name.slice(name.lastIndexOf('.') + 1)
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', ...CONVERTED_IMAGE_EXTENSIONS].includes(extension)) {
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
    return this.imageItems.value[this.normalizeImageIndex(this.currentImageIndex.value)]
  })

  /**
   * 当前图片 ID
   */
  public currentImageId = computed(() => {
    return this.currentImage.value?.id || ''
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
  public handleImageSelect = (imageIndex: number): void => {
    const image = this.imageItems.value[imageIndex]

    this.debug('select:request', {
      requestedImageIndex: imageIndex,
      requestedImage: this.describeImage(image),
      previousImageIndex: this.currentImageIndex.value,
      previousImageId: this.currentImageId.value,
      previousImage: this.describeImage(this.currentImage.value),
      cacheKey: this.imageCacheKey.value
    })

    if (!image) {
      this.debug('select:skip-missing-index', { imageIndex })
      return
    }

    this.setCurrentImageIndex(imageIndex)
  }

  // URL 同步使用 router.replace，避免缩略图切换污染浏览历史。

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
      this.handleImageSelect(currentIndex - 1)
    }
  }

  /**
   * 下一张图片
   */
  public nextImage = (): void => {
    const currentIndex = this.currentImageIndex.value
    if (currentIndex < this.imageItems.value.length - 1) {
      this.handleImageSelect(currentIndex + 1)
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
      this.error.value = i18n.global.t('services.imagePreview.searchSimilarFailed')
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
      src: getPreviewImageSource(item) || '',
      'data-source': getPreviewImageSource(item) || '', // 高分辨率图片源
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
          // 当切换图片时更新唯一索引状态
          const index = event.detail.index
          if (this.imageItems.value[index]) {
            this.setCurrentImageIndex(index)
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
      const prevImageSource = getPreviewImageSource(prevImage)
      if (prevImageSource) imagesToPreload.push(prevImageSource)
    }

    // 预加载后一张
    if (currentIndex < this.imageItems.value.length - 1) {
      const nextImage = this.imageItems.value[currentIndex + 1]
      const nextImageSource = getPreviewImageSource(nextImage)
      if (nextImageSource) imagesToPreload.push(nextImageSource)
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
