import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMediaStore } from '../stores/media'
import type { FileInfo } from '../../shared/types'
import { getFileType } from '../utils/fileUtils'

export class VideoPreviewController {
  private router = useRouter()
  private route = useRoute()
  private mediaStore = useMediaStore()

  // 响应式状态
  public currentVideoId = ref<string>('')
  public isPlaying = ref<boolean>(false)
  public currentTime = ref<number>(0)
  public duration = ref<number>(0)
  public volume = ref<number>(1)
  public playbackRate = ref<number>(1)
  public isFullscreen = ref<boolean>(false)
  public loading = ref<boolean>(false)
  public error = ref<string | null>(null)

  // 视频数据 - 从媒体存储获取
  public videos = computed<FileInfo[]>(() => {
    return this.mediaStore.files.filter((file: FileInfo) => getFileType(file.name) === 'video')
  })

  constructor() {
    // 初始化当前视频ID
    if (this.route.params.id) {
      this.currentVideoId.value = this.route.params.id as string
    } else if (this.videos.value.length > 0) {
      this.currentVideoId.value = this.videos.value[0].id
    }
  }

  /**
   * 当前视频
   */
  public currentVideo = computed(() => {
    return this.videos.value.find((video: FileInfo) => video.id === this.currentVideoId.value) || this.videos.value[0]
  })

  /**
   * 当前视频索引
   */
  public currentVideoIndex = computed(() => {
    return this.videos.value.findIndex((video: FileInfo) => video.id === this.currentVideoId.value)
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
   * 选择视频
   */
  public handleVideoSelect = (videoId: string): void => {
    this.currentVideoId.value = videoId
    this.isPlaying.value = false
    this.currentTime.value = 0
    this.duration.value = 0
    // 更新URL
    this.router.replace(`/video-preview/${videoId}`)
  }

  /**
   * 播放视频
   */
  public handlePlay = (): void => {
    this.isPlaying.value = true
  }

  /**
   * 暂停视频
   */
  public handlePause = (): void => {
    this.isPlaying.value = false
  }

  /**
   * 切换播放/暂停
   */
  public togglePlayPause = (): void => {
    if (this.isPlaying.value) {
      this.handlePause()
    } else {
      this.handlePlay()
    }
  }

  /**
   * 跳转到指定时间
   */
  public handleSeek = (time: number): void => {
    this.currentTime.value = time
  }

  /**
   * 调整音量
   */
  public handleVolumeChange = (volume: number): void => {
    this.volume.value = Math.max(0, Math.min(1, volume))
  }

  /**
   * 调整播放速度
   */
  public handlePlaybackRateChange = (rate: number): void => {
    this.playbackRate.value = rate
  }

  /**
   * 切换全屏
   */
  public handleToggleFullscreen = (): void => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      this.isFullscreen.value = false
    } else {
      document.documentElement.requestFullscreen()
      this.isFullscreen.value = true
    }
  }

  /**
   * 时间更新
   */
  public handleTimeUpdate = (time: number): void => {
    this.currentTime.value = time
  }

  /**
   * 时长变化
   */
  public handleDurationChange = (duration: number): void => {
    this.duration.value = duration
  }

  /**
   * 上一个视频
   */
  public previousVideo = (): void => {
    const currentIndex = this.currentVideoIndex.value
    if (currentIndex > 0) {
      this.handleVideoSelect(this.videos.value[currentIndex - 1].id)
    }
  }

  /**
   * 下一个视频
   */
  public nextVideo = (): void => {
    const currentIndex = this.currentVideoIndex.value
    if (currentIndex < this.videos.value.length - 1) {
      this.handleVideoSelect(this.videos.value[currentIndex + 1].id)
    }
  }

  /**
   * 初始化视频数据
   */
  public initializeVideoData = (): void => {
    // 初始化逻辑，如果需要的话
  }

  /**
   * 清理资源
   */
  public cleanup = (): void => {
    this.isPlaying.value = false
    this.currentTime.value = 0
    this.duration.value = 0
  }
}

/**
 * 创建VideoPreviewController实例
 */
export function useVideoPreviewController(): VideoPreviewController {
  return new VideoPreviewController()
}
