import { ref, computed, onUnmounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { toast } from '@/lib/toast'
import { getTempDir } from '@/lib/exec'
import { generateThumbnail as ffmpegGenerateThumbnail } from '@/lib/ffmpeg'
import { isHostAvailable } from '@/lib/host'
import { pathJoin, toFileUrl, fromFileUrl, sanitizeFileName } from '@/lib/path'
import { downloadToLocalFile } from '@/lib/download'
import { loadSettings } from '@/lib/settings'
import type { VideoData, VideoClip } from '@/types/video-editor'
import { exportQueueManager, type ExportProgressCallback, type ExportCompleteCallback } from '../utils/exportQueueManager'

/**
 * 剪辑管理组合式函数
 * 处理视频片段的创建、编辑、删除和导出
 */
export function useClipManagement(
  selectedVideo: () => VideoData | null,
  currentListId: () => string,
  clipStartTime: { value: number },
  clipEndTime: { value: number },
  clipDescription: { value: string },
  clipTags: { value: string }
) {
  // 片段封面状态管理
  const clipThumbnails = ref<{ [key: string]: string }>({}) // 片段ID -> 封面URL
  const thumbnailLoading = ref<{ [key: string]: boolean }>({}) // 片段ID -> 是否正在加载
  const clipTempDir = ref<string>('') // 片段封面临时目录

  // 导出状态
  const isExporting = ref(false)
  const exportProgress = ref<{ message: string; percent: number } | null>(null)

  // 从插件配置读取设置（localStorage）
  const ffmpegPath = computed(() => '')
  const defaultOutputFormat = computed(() => loadSettings().defaultOutputFormat || 'mp4')
  const defaultQuality = computed(() => loadSettings().defaultQuality || 'original')

  /**
   * 计算属性 - 检查片段时间是否有效
   */
  const isValidClipTime = computed(() => {
    if (!selectedVideo()) return false
    return clipStartTime.value >= 0 && clipEndTime.value >= 0
  })

  /**
   * 创建片段
   */
  async function createClip(resetForm = true) {
    const video = selectedVideo()
    if (!video || !isValidClipTime.value) return

    // 自动使用 min/max 区分起始点
    const start = Math.min(clipStartTime.value, clipEndTime.value)
    const end = Math.max(clipStartTime.value, clipEndTime.value)

    const newClip: VideoClip = {
      clip_id: uuidv4(),
      start,
      end,
      desc: clipDescription.value,
      tags: clipTags.value ? clipTags.value.split(',').map(t => t.trim()).filter(Boolean) : []
    }

    try {
      const updatedClips = {
        ...video.clips,
        [newClip.clip_id]: newClip
      }

      await updateVideoClips(updatedClips)

      // 仅重置描述和标签，保留时间以便连续添加
      if (resetForm) {
        resetClipForm()
      } else {
        // 只清空描述和标签
        clipDescription.value = ''
        clipTags.value = ''
      }

      // 自动生成封面（异步，不阻塞用户操作）
      autoGenerateThumbnail(newClip)
    } catch (error) {
      console.error('创建片段失败:', error)
      toast.error('创建片段失败', '错误')
    }
  }

  /**
   * 重置剪辑表单
   */
  function resetClipForm() {
    const video = selectedVideo()
    clipStartTime.value = 0
    clipEndTime.value = video?.duration || 0
    clipDescription.value = ''
    clipTags.value = ''
  }

  /**
   * 编辑片段
   */
  function editClip(clip: VideoClip, setActiveTab: (tab: string) => void) {
    clipStartTime.value = clip.start
    clipEndTime.value = clip.end
    clipDescription.value = clip.desc
    clipTags.value = clip.tags.join(', ')
    setActiveTab('clip')
  }

  /**
   * 删除片段
   */
  async function deleteClip(clipId: string) {
    const video = selectedVideo()
    if (!video) return

    try {
      const updatedClips = { ...video.clips }
      delete updatedClips[clipId]

      await updateVideoClips(updatedClips)
    } catch (error) {
      console.error('删除片段失败:', error)
      toast.error('删除片段失败', '错误')
    }
  }

  /**
   * 导出单个片段（输出到插件导出目录，完成后自动触发浏览器下载）
   */
  async function exportClip(clip: VideoClip) {
    const video = selectedVideo()
    if (!video) return
    if (!isHostAvailable()) {
      toast.error('此功能需要在 Mira 客户端的插件窗口中使用', '错误')
      return
    }

    // 检查是否为 blob URL 且没有 originalPath
    if (!video.originalPath && video.path.startsWith('blob:')) {
      toast.error('此视频无法导出：请重新添加视频文件以获取完整路径', '错误')
      return
    }

    try {
      // 输出到插件导出临时目录，完成后由 completeCallback 触发下载
      const outputDir = await getTempDir('exports/clips')
      const fileName = sanitizeFileName(clip.desc || 'clip') || 'clip'
      const outputPath = pathJoin(outputDir, `${fileName}_${Date.now()}.${defaultOutputFormat.value || 'mp4'}`)

      // 优先使用 originalPath
      const inputPath = video.originalPath || video.path

      isExporting.value = true
      exportProgress.value = { message: '正在导出片段...', percent: 0 }
      toast.info('正在导出片段...', '处理中', 0)

      // 添加到导出队列
      const jobId = await exportQueueManager.addTask({
        id: uuidv4(),
        type: 'single',
        inputPath,
        clips: [{
          startTime: clip.start,
          endTime: clip.end,
          outputPath,
          desc: clip.desc || '片段'
        }],
        options: {
          quality: defaultQuality.value as 'original' | 'low' | 'medium' | 'high',
          includeAudio: true,
          ffmpegPath: ffmpegPath.value,
          watermarkRegions: video.watermarks?.enabled
            ? video.watermarks.regions.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }))
            : undefined,
          videoWidth: video.metadata.width || 1920,
          videoHeight: video.metadata.height || 1080
        }
      })

      // 存储当前任务ID以便取消
      ;(exportClip as any).currentJobId = jobId

    } catch (error) {
      isExporting.value = false
      exportProgress.value = null
      console.error('Failed to export clip:', error)
      toast.error(`导出片段失败: ${error}`, '错误')
    }
  }

  /**
   * 取消当前导出
   */
  function cancelExportClip() {
    const jobId = (exportClip as any).currentJobId
    if (jobId) {
      exportQueueManager.cancelJob(jobId)
      isExporting.value = false
      exportProgress.value = null
    }
  }

  // 进度回调
  const progressCallback: ExportProgressCallback = (progressData) => {
    const jobId = (exportClip as any).currentJobId
    if (jobId && progressData.jobId === jobId) {
      exportProgress.value = {
        message: progressData.message,
        percent: progressData.progress
      }
    }
  }

  // 完成回调
  const completeCallback: ExportCompleteCallback = (result) => {
    const jobId = (exportClip as any).currentJobId
    if (jobId && result.jobId === jobId) {
      isExporting.value = false
      exportProgress.value = null

      if (result.status === 'completed') {
        const filePath = result.completedPaths[0]
        toast.success('片段导出完成，已开始下载到本机', '成功')
        // 自动触发浏览器下载
        downloadToLocalFile(filePath).catch((err) => {
          console.error('下载导出文件失败:', err)
          toast.error(`下载导出文件失败: ${(err as Error).message}`, '错误')
        })
      } else if (result.status === 'cancelled') {
        toast.info('导出已取消', '提示')
      } else {
        toast.error(`导出片段失败: ${result.error}`, '错误')
      }

      // 清除任务ID
      delete (exportClip as any).currentJobId
    }
  }

  // 注册回调
  const unregisterProgress = exportQueueManager.onProgress(progressCallback)
  const unregisterComplete = exportQueueManager.onComplete(completeCallback)

  // 清理
  onUnmounted(() => {
    unregisterProgress()
    unregisterComplete()
    cancelExportClip()
  })

  /**
   * 更新视频片段数据（本地存储，唯一通道）
   */
  async function updateVideoClips(clips: { [key: string]: VideoClip }) {
    const video = selectedVideo()
    const listId = currentListId()
    if (!video || !listId) return

    const { localVideoStorage } = await import('@/lib/localVideoStorage')
    const success = localVideoStorage.updateVideoInLocalList(listId, video.id, { clips })

    if (success) {
      video.clips = clips
      await handleClipUpdated()
    } else {
      throw new Error('更新视频片段失败')
    }
  }

  /**
   * 处理片段更新后的刷新逻辑
   */
  async function handleClipUpdated(videoListSidebarRef?: { refreshLocalLists: () => void }) {
    const video = selectedVideo()
    const listId = currentListId()
    if (!video || !listId) return

    try {
      const { localVideoStorage } = await import('@/lib/localVideoStorage')
      const localList = localVideoStorage.getLocalList(listId)
      const updatedVideo = localList?.videos.find(v => v.id === video.id)
      if (updatedVideo) {
        Object.assign(video, updatedVideo)
      }

      // 刷新侧边栏的本地列表数据
      if (videoListSidebarRef) {
        videoListSidebarRef.refreshLocalLists()
      }

      // 恢复封面状态
      restoreClipThumbnails(video)
    } catch (error) {
      console.error('Failed to refresh video data:', error)
    }
  }

  /**
   * 从视频数据中恢复片段封面状态
   */
  function restoreClipThumbnails(video: VideoData | null) {
    clipThumbnails.value = {}
    if (video?.clips) {
      for (const [clipId, clip] of Object.entries(video.clips)) {
        if (clip.thumbnail) {
          clipThumbnails.value[clipId] = clip.thumbnail
        }
      }
    }
  }

  /**
   * 生成本地封面文件的公共实现（输出到插件临时目录，返回 file:// URL）
   */
  async function renderClipThumbnail(clipId: string, timestamp: number): Promise<string> {
    const video = selectedVideo()
    if (!video) throw new Error('请先选择一个视频')

    let videoPath = video.originalPath || video.path
    if (!videoPath) throw new Error('视频路径为空')
    if (/^file:\/\//i.test(videoPath)) {
      videoPath = fromFileUrl(videoPath)
    } else if (videoPath.startsWith('blob:')) {
      throw new Error('无法为 Blob 视频生成封面')
    }

    if (!clipTempDir.value) {
      clipTempDir.value = await getTempDir('clip-thumbs')
    }

    const thumbnailFileName = `clip_${clipId.slice(0, 8)}_${Date.now()}.jpg`
    const thumbnailPath = pathJoin(clipTempDir.value, thumbnailFileName)

    await ffmpegGenerateThumbnail({
      inputPath: videoPath,
      outputPath: thumbnailPath,
      timestamp,
      width: 320,
      height: 180,
    })
    return toFileUrl(thumbnailPath)
  }

  /** 持久化封面到片段数据 */
  async function persistClipThumbnail(clipId: string, thumbnailUrl: string) {
    const video = selectedVideo()
    if (video?.clips[clipId]) {
      const updatedClip = { ...video.clips[clipId], thumbnail: thumbnailUrl }
      const updatedClips = { ...video.clips, [clipId]: updatedClip }
      await updateVideoClips(updatedClips)
    }
  }

  /**
   * 自动生成片段封面（静默执行，不阻塞主流程）
   */
  async function autoGenerateThumbnail(clip: VideoClip) {
    const clipId = clip.clip_id
    const video = selectedVideo()

    if (!isHostAvailable() || !video) {
      return
    }

    try {
      thumbnailLoading.value[clipId] = true
      const thumbnailUrl = await renderClipThumbnail(clipId, clip.start)
      clipThumbnails.value[clipId] = thumbnailUrl
      await persistClipThumbnail(clipId, thumbnailUrl)
      console.log('封面生成成功:', clipId)
    } catch (error) {
      console.warn('自动生成封面失败:', clipId, error)
      // 静默失败，不显示错误提示
    } finally {
      delete thumbnailLoading.value[clipId]
    }
  }

  /**
   * 生成片段封面（用户手动触发）
   */
  async function generateClipThumbnail(clip: VideoClip, clipId: string) {
    const video = selectedVideo()
    if (!video) {
      toast.error('请先选择一个视频', '错误')
      return
    }

    if (!isHostAvailable()) {
      toast.info('此功能需要在 Mira 客户端的插件窗口中使用', '提示')
      return
    }

    try {
      thumbnailLoading.value[clipId] = true
      const thumbnailUrl = await renderClipThumbnail(clipId, clip.start)
      clipThumbnails.value[clipId] = thumbnailUrl
      await persistClipThumbnail(clipId, thumbnailUrl)
      toast.success('封面生成成功', '完成')
    } catch (error) {
      console.error('生成封面失败:', error)
      toast.error('生成封面失败: ' + (error as Error).message, '错误')
    } finally {
      delete thumbnailLoading.value[clipId]
    }
  }

  /**
   * 封面加载失败处理
   */
  function handleClipThumbnailError(clipId: string) {
    console.warn('封面加载失败:', clipId)
    // 移除无效的封面缓存
    delete clipThumbnails.value[clipId]
  }

  return {
    clipThumbnails,
    thumbnailLoading,
    isExporting,
    exportProgress,
    isValidClipTime,
    createClip,
    resetClipForm,
    editClip,
    deleteClip,
    exportClip,
    cancelExportClip,
    updateVideoClips,
    handleClipUpdated,
    restoreClipThumbnails,
    generateClipThumbnail,
    handleClipThumbnailError
  }
}
