import { ref } from 'vue'
import { toast } from '@/lib/toast'
import { getTempDir, readDir } from '@/lib/exec'
import { generateAllThumbnails as ffmpegAllThumbnails } from '@/lib/ffmpeg'
import { isHostAvailable } from '@/lib/host'
import { pathJoin, toFileUrl, fromFileUrl } from '@/lib/path'
import type { VideoData, VideoClip } from '@/types/video-editor'
import type { ThumbnailItem } from '../types'
import { formatTime } from '../utils/formatters'

/**
 * 缩略图预览组合式函数
 * 处理视频缩略图生成、加载和交互
 */
export function useThumbnails(
  selectedVideo: () => VideoData | null,
  clipStartTime: { value: number },
  clipEndTime: { value: number },
  createClip: (resetForm?: boolean) => Promise<void>,
  videoPlayerRef?: { value?: { seek: (time: number) => void } }
) {
  // 缩略图预览状态
  const thumbnails = ref<ThumbnailItem[]>([])
  const isLoadingThumbnails = ref(false)
  const thumbnailProgress = ref(0)
  const thumbnailProgressMessage = ref('')
  const thumbnailTempDir = ref('')
  const hasAutoLoadedThumbnails = ref(false) // 追踪缩略图是否已经自动加载过

  // 轮询定时器
  let thumbnailPollTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 检查时间点是否在已有片段中
   */
  function isInExistingClip(time: number): boolean {
    return !!findClipAtTime(time)
  }

  function findClipAtTime(time: number): { id: string; clip: VideoClip } | null {
    const video = selectedVideo()
    if (!video?.clips) return null
    const entry = Object.entries(video.clips).find(
      ([, clip]) => time >= clip.start && time <= clip.end
    )
    return entry ? { id: entry[0], clip: entry[1] } : null
  }

  /**
   * 处理缩略图点击
   */
  function handleThumbnailClick(time: number, event: MouseEvent) {
    if (videoPlayerRef?.value?.seek) {
      videoPlayerRef.value.seek(time)
    }

    if (event.ctrlKey) {
      clipStartTime.value = time
    } else if (event.altKey) {
      clipEndTime.value = time

      const nextStartTime = clipEndTime.value
      createClip(false)

      const video = selectedVideo()
      if (video) {
        clipEndTime.value = video.duration
      }
      clipStartTime.value = nextStartTime
    } else if (videoPlayerRef?.value?.seek) {
      videoPlayerRef.value.seek(time)
    }
  }

  /** 解析视频本地路径（blob 不支持缩略图生成） */
  function resolveLocalVideoPath(video: VideoData): string | null {
    let videoPath = video.originalPath || video.path
    if (!videoPath) return null
    if (/^file:\/\//i.test(videoPath)) {
      videoPath = fromFileUrl(videoPath)
    } else if (videoPath.startsWith('blob:')) {
      return null
    }
    return videoPath
  }

  /** 读取目录下的 jpg 缩略图（按帧序号排序的文件名列表） */
  async function listJpgFiles(dir: string): Promise<string[]> {
    try {
      const files = await readDir(dir)
      return files
        .filter((f) => f.endsWith('.jpg'))
        .sort((a, b) => parseInt(a.replace('.jpg', ''), 10) - parseInt(b.replace('.jpg', ''), 10))
    } catch {
      // 目录可能还不存在
      return []
    }
  }

  /**
   * 加载缩略图
   */
  async function loadThumbnails() {
    const video = selectedVideo()
    if (!video || isLoadingThumbnails.value) return

    if (!isHostAvailable()) {
      toast.error('此功能需要在 Mira 客户端的插件窗口中使用', '错误')
      return
    }

    isLoadingThumbnails.value = true
    thumbnailProgress.value = 0
    thumbnailProgressMessage.value = '正在初始化...'
    thumbnails.value = [] // 清空现有缩略图

    try {
      const videoPath = resolveLocalVideoPath(video)
      if (!videoPath) {
        toast.error('此视频无法生成缩略图：请重新添加视频文件以获取完整路径', '错误')
        isLoadingThumbnails.value = false
        return
      }

      // 创建临时目录（每视频一个子目录）
      if (!thumbnailTempDir.value) {
        thumbnailTempDir.value = await getTempDir('video-thumbnails')
      }
      const outputDir = pathJoin(thumbnailTempDir.value, video.id)

      const maxThumbnails = Math.ceil(video.duration)
      let lastCount = 0

      // 启动轮询，实时加载已生成的缩略图
      const pollNewThumbnails = async () => {
        try {
          const jpgFiles = await listJpgFiles(outputDir)
          // 添加新的缩略图
          if (jpgFiles.length > lastCount) {
            const newFiles = jpgFiles.slice(lastCount)
            for (const file of newFiles) {
              const timeIndex = parseInt(file.replace('.jpg', ''), 10)
              thumbnails.value.push({
                time: timeIndex,
                url: toFileUrl(pathJoin(outputDir, file)),
              })
            }
            lastCount = jpgFiles.length
            thumbnailProgressMessage.value = `正在生成缩略图: ${lastCount} 帧`
            thumbnailProgress.value = Math.min((lastCount / maxThumbnails) * 100, 100)
          }

          // 检查是否完成
          if (lastCount >= maxThumbnails || !isLoadingThumbnails.value) {
            stopPolling()
          }
        } catch {
          // 目录可能还不存在，忽略错误
        }
      }

      const stopPolling = () => {
        if (thumbnailPollTimer) {
          clearInterval(thumbnailPollTimer)
          thumbnailPollTimer = null
        }
        isLoadingThumbnails.value = false
        if (thumbnails.value.length > 0) {
          thumbnailProgressMessage.value = `已生成 ${thumbnails.value.length} 个缩略图`
        }
      }

      // 启动轮询（每200ms检查一次）
      thumbnailPollTimer = setInterval(pollNewThumbnails, 200)

      // 异步启动 ffmpeg 生成任务（进度经 onProgress 回调）
      ffmpegAllThumbnails({
        inputPath: videoPath,
        outputDir,
        fps: 1, // 每秒一帧
        width: 320,
        height: 180,
        maxThumbnails,
      }, (progress) => {
        thumbnailProgressMessage.value = progress.message
        thumbnailProgress.value = Math.min((progress.current / Math.max(progress.total, 1)) * 100, 100)
      }).then(() => {
        // ffmpeg 完成，停止轮询
        setTimeout(() => {
          pollNewThumbnails() // 最后一次检查
          stopPolling()
        }, 500)
      }).catch((error: Error) => {
        console.error('生成缩略图失败:', error)
        stopPolling()
        toast.error(`生成缩略图失败: ${error.message}`, '错误')
      })

    } catch (error) {
      console.error('生成缩略图失败:', error)
      toast.error(`生成缩略图失败: ${(error as Error).message}`, '错误')
      isLoadingThumbnails.value = false
    }
  }

  /**
   * 清空缩略图
   */
  function clearThumbnails() {
    // 停止轮询
    if (thumbnailPollTimer) {
      clearInterval(thumbnailPollTimer)
      thumbnailPollTimer = null
    }
    thumbnails.value = []
    thumbnailProgress.value = 0
    thumbnailProgressMessage.value = ''
    isLoadingThumbnails.value = false
  }

  /**
   * 加载已存在的缩略图
   */
  async function loadExistingThumbnails(): Promise<boolean> {
    const video = selectedVideo()
    if (!video || !isHostAvailable()) {
      return false
    }

    try {
      // 创建临时目录（如果还没有）
      if (!thumbnailTempDir.value) {
        thumbnailTempDir.value = await getTempDir('video-thumbnails')
      }
      const outputDir = pathJoin(thumbnailTempDir.value, video.id)

      const jpgFiles = await listJpgFiles(outputDir)
      if (jpgFiles.length > 0) {
        thumbnails.value = []
        for (const file of jpgFiles) {
          const timeIndex = parseInt(file.replace('.jpg', ''), 10)
          thumbnails.value.push({
            time: timeIndex,
            url: toFileUrl(pathJoin(outputDir, file)),
          })
        }
        thumbnailProgressMessage.value = `已加载 ${thumbnails.value.length} 个缩略图`
        console.log(`已加载 ${thumbnails.value.length} 个已有缩略图`)
        return true
      }
      return false
    } catch {
      // 目录可能不存在，返回 false
      return false
    }
  }

  return {
    thumbnails,
    isLoadingThumbnails,
    thumbnailProgress,
    thumbnailProgressMessage,
    hasAutoLoadedThumbnails,
    isInExistingClip,
    findClipAtTime,
    handleThumbnailClick,
    loadThumbnails,
    clearThumbnails,
    loadExistingThumbnails
  }
}
