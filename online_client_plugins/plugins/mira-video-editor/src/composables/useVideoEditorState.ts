import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { VideoData, VideoClip } from '@/types/video-editor'
import { toast } from '@/lib/toast'
import { localVideoStorage } from '@/lib/localVideoStorage'
import { getHost, isHostAvailable } from '@/lib/host'
import { useClipManagement } from './useClipManagement'
import { useSceneSplit } from './useSceneSplit'
import { useThumbnails } from './useThumbnails'
import type VideoPlayer from '@/components/VideoPlayer.vue'
import type VideoListSidebar from '@/components/VideoListSidebar.vue'
import type WatermarkTab from '@/components/WatermarkTab.vue'
import type ExportClipsDialog from '@/components/ExportClipsDialog.vue'

/** 素材库导入激活事件：App.vue 导入完成后派发，编辑器切换到文件列表并播放指定视频 */
export const ACTIVATE_MEDIA_EVENT = 'mira-video-editor:activate-media'

export function useVideoEditorState() {
  // ===== Core State =====
  const isDragging = ref(false)
  const selectedVideo = ref<VideoData | null>(null)
  const currentListId = ref('')
  const activeToolTab = ref('clip')
  const currentPlayTime = ref(0)
  // 导入激活流程置位：VideoPlayer 挂载后自动播放一次，手动选择视频时复位
  const autoplayNextVideo = ref(false)
  let activatingImport = false

  // ===== Template Refs =====
  const videoPlayerRef = ref<InstanceType<typeof VideoPlayer>>()
  const videoListSidebarRef = ref<InstanceType<typeof VideoListSidebar>>()
  const watermarkTabRef = ref<InstanceType<typeof WatermarkTab>>()
  const descriptionInputRef = ref<{ $el?: HTMLInputElement } | HTMLInputElement | undefined>()
  const exportClipsDialogRef = ref<InstanceType<typeof ExportClipsDialog>>()

  // ===== Clip Form State =====
  const clipStartTime = ref(0)
  const clipEndTime = ref(0)
  const clipDescription = ref('')
  const clipTags = ref('')

  // ===== Composable Initialization =====
  const clipState = useClipManagement(
    () => selectedVideo.value,
    () => currentListId.value,
    clipStartTime,
    clipEndTime,
    clipDescription,
    clipTags
  )

  const sceneState = useSceneSplit(
    () => selectedVideo.value,
    () => currentListId.value,
    () => clipStartTime.value,
    () => clipEndTime.value,
    clipState.updateVideoClips,
    () => clipState.isValidClipTime.value
  )

  const thumbnailState = useThumbnails(
    () => selectedVideo.value,
    clipStartTime,
    clipEndTime,
    clipState.createClip,
    videoPlayerRef
  )

  // ===== Drag & Drop =====
  function handleDragOver(event: DragEvent) {
    isDragging.value = true
    const items = event.dataTransfer?.items
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('video/') || item.kind === 'file') return
      }
      isDragging.value = false
    }
  }

  function handleDragLeave(event: DragEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement
    if (!relatedTarget || !event.currentTarget || !(event.currentTarget as HTMLElement).contains(relatedTarget)) {
      isDragging.value = false
    }
  }

  async function handleDrop(event: DragEvent) {
    isDragging.value = false
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return

    let targetListId = currentListId.value
    if (!targetListId) {
      const localLists = localVideoStorage.getLocalLists()
      if (localLists.length === 0) {
        const defaultList = localVideoStorage.createLocalList('默认列表', '拖放视频自动创建')
        targetListId = defaultList.id
        toast.info('已创建默认列表', '提示')
      } else {
        targetListId = localLists[0].id
      }
      currentListId.value = targetListId
    }

    videoListSidebarRef.value?.loadLists()

    let successCount = 0
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/') && !/\.(mp4|avi|mov|mkv|wmv|flv|webm|m4v|3gp)$/i.test(file.name)) {
        continue
      }
      try {
        await addVideoFromFile(file, targetListId)
        successCount++
      } catch (error) {
        errors.push(file.name)
        console.error('Failed to add video:', file.name, error)
      }
    }

    if (successCount > 0) {
      toast.success(`成功添加 ${successCount} 个视频`, '完成')
      videoListSidebarRef.value?.refreshLocalLists()
    }
    if (errors.length > 0) {
      toast.warning(`添加失败 ${errors.length} 个视频: ${errors.join(', ')}`, '警告')
    }
  }

  async function addVideoFromFile(file: File, listId: string) {
    const fileName = file.name
    const fileSize = file.size
    let filePath: string | undefined

    const host = getHost()
    if (host?.fs?.getPathForFile) {
      try {
        filePath = host.fs.getPathForFile(file) || undefined
      } catch (error) {
        console.warn('获取文件路径失败:', error)
      }
    }

    const videoData: VideoData = {
      id: crypto.randomUUID(),
      title: fileName,
      duration: 0,
      size: fileSize,
      path: filePath || URL.createObjectURL(file),
      originalPath: filePath || undefined,
      clips: {},
      metadata: {},
      thumbnail: undefined,
      create_date: new Date().toISOString()
    }

    localVideoStorage.addVideoToLocalList(listId, videoData)

    if (!filePath && host) {
      console.warn('未能获取文件的实际路径，导出功能可能不可用')
    }
  }

  // ===== Video Selection =====
  async function handleVideoSelected(video: VideoData, listId?: string) {
    // 非导入激活触发的选择（用户手动点击/恢复上次选中）取消待自动播放标记
    if (!activatingImport) {
      autoplayNextVideo.value = false
    }
    selectedVideo.value = video
    if (listId) {
      currentListId.value = listId
    }

    clipState.resetClipForm()
    sceneState.resetSplitState()
    thumbnailState.clearThumbnails()
    clipState.restoreClipThumbnails(video)

    if (activeToolTab.value === 'split') {
      await sceneState.autoLoadSceneData()
    }
  }

  // ===== 素材库导入激活 =====
  function handleActivateMediaEvent(event: Event) {
    const detail = (event as CustomEvent).detail as { listId?: string; videoId?: string }
    if (!detail?.listId) return
    // 切换到文件列表 Tab 并驱动侧栏选中列表与视频（经 videoSelected 回到本 composable）
    activeToolTab.value = 'files'
    activatingImport = true
    autoplayNextVideo.value = true
    try {
      videoListSidebarRef.value?.activateList(detail.listId, detail.videoId)
    } finally {
      activatingImport = false
    }
  }

  onMounted(() => {
    window.addEventListener(ACTIVATE_MEDIA_EVENT, handleActivateMediaEvent as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener(ACTIVATE_MEDIA_EVENT, handleActivateMediaEvent as EventListener)
  })

  // ===== Clip Time Helpers =====
  function handleCreateClip(start: number, end: number) {
    clipStartTime.value = start
    clipEndTime.value = end
    return clipState.createClip()
  }

  function handleTimeUpdate(currentTime: number) {
    currentPlayTime.value = currentTime
  }

  function setClipStartToCurrent() {
    clipStartTime.value = currentPlayTime.value
  }

  function setClipEndToCurrent() {
    clipEndTime.value = currentPlayTime.value
  }

  function setClipStartToZero() {
    clipStartTime.value = 0
  }

  function setClipEndToMax() {
    if (selectedVideo.value) {
      clipEndTime.value = selectedVideo.value.duration
    }
  }

  function validateClipTime() {
    if (!selectedVideo.value) return
    if (clipStartTime.value < 0) clipStartTime.value = 0
    if (clipEndTime.value < 0) clipEndTime.value = 0
  }

  // ===== Preview =====
  function previewClip(clip: VideoClip) {
    videoPlayerRef.value?.previewClipSegment(clip)
  }

  function previewScene(scene: { id: string; startTime: number; endTime: number }) {
    videoPlayerRef.value?.previewClipSegment({
      start: scene.startTime,
      end: scene.endTime,
      desc: `场景片段 ${scene.startTime}s-${scene.endTime}s`
    })
  }

  // ===== Metadata =====
  async function handleDurationLoaded(duration: number) {
    if (!selectedVideo.value) return
    selectedVideo.value.duration = duration
    await saveDurationToStorage(duration)
  }

  async function handleMetadataLoaded(metadata: { width: number; height: number }) {
    if (!selectedVideo.value) return
    if (!selectedVideo.value.metadata) {
      selectedVideo.value.metadata = {}
    }
    selectedVideo.value.metadata.width = metadata.width
    selectedVideo.value.metadata.height = metadata.height

    if (selectedVideo.value.path.startsWith('blob:') || selectedVideo.value.path.startsWith('file://')) {
      const { localVideoStorage } = await import('@/lib/localVideoStorage')
      localVideoStorage.updateVideoInLocalList(currentListId.value, selectedVideo.value.id, {
        metadata: selectedVideo.value.metadata
      })
    }
  }

  async function saveDurationToStorage(duration: number) {
    if (!selectedVideo.value || !currentListId.value) return
    if (selectedVideo.value.path.startsWith('blob:') || selectedVideo.value.path.startsWith('file://')) {
      const { localVideoStorage } = await import('@/lib/localVideoStorage')
      localVideoStorage.updateVideoInLocalList(currentListId.value, selectedVideo.value.id, {
        duration
      })
    }
  }

  // ===== UI Helpers =====
  function focusDescriptionInput() {
    nextTick(() => {
      const inputEl = descriptionInputRef.value?.$el as HTMLInputElement | undefined
      if (inputEl && inputEl.focus) {
        inputEl.focus()
      } else {
        activeToolTab.value = 'clip'
      }
    })
  }

  function triggerAddClip() {
    if (activeToolTab.value !== 'clip') {
      activeToolTab.value = 'clip'
    }
    clipState.createClip()
  }

  function exportAllClips() {
    if (!selectedVideo.value) return
    if (!isHostAvailable()) {
      toast.error('此功能需要在 Mira 客户端的插件窗口中使用', '错误')
      return
    }
    const clips = Object.values(selectedVideo.value.clips)
    if (clips.length === 0) {
      toast.warning('没有可导出的片段', '提示')
      return
    }
    exportClipsDialogRef.value?.open()
  }

  // ===== Watchers =====
  watch(selectedVideo, (newVideo, oldVideo) => {
    if (newVideo && oldVideo?.id !== newVideo?.id) {
      thumbnailState.hasAutoLoadedThumbnails.value = false
      nextTick(() => {
        if (activeToolTab.value === 'split' && !sceneState.hasAutoLoaded.value && !sceneState.isSplitting.value) {
          sceneState.autoLoadSceneData()
        }
      })
    }
  })

  watch([clipStartTime, clipEndTime], () => {
    if (!clipState.isValidClipTime.value && sceneState.useSelectedRange.value) {
      sceneState.useSelectedRange.value = false
    }
  })

  watch(() => sceneState.minSceneDuration.value, async (newValue, oldValue) => {
    if (sceneState.sceneSegments.value.length > 0 && newValue !== oldValue && selectedVideo.value) {
      await sceneState.checkExistingSceneData?.()
    }
  })

  watch(activeToolTab, async (newTab) => {
    if (newTab === 'split' && selectedVideo.value && !sceneState.isSplitting.value && !sceneState.hasAutoLoaded.value) {
      await sceneState.autoLoadSceneData()
    }
    if (newTab === 'thumbnails' && selectedVideo.value && !thumbnailState.isLoadingThumbnails.value) {
      await thumbnailState.loadExistingThumbnails()
    }
  })

  return {
    // Core state
    isDragging,
    selectedVideo,
    currentListId,
    activeToolTab,
    currentPlayTime,
    autoplayNextVideo,
    // Template refs
    videoPlayerRef,
    videoListSidebarRef,
    watermarkTabRef,
    descriptionInputRef,
    exportClipsDialogRef,
    // Clip form
    clipStartTime,
    clipEndTime,
    clipDescription,
    clipTags,
    // Composables
    clipState,
    sceneState,
    thumbnailState,
    // Drag & drop
    handleDragOver,
    handleDragLeave,
    handleDrop,
    // Video selection
    handleVideoSelected,
    // Clip time
    handleCreateClip,
    handleTimeUpdate,
    setClipStartToCurrent,
    setClipEndToCurrent,
    setClipStartToZero,
    setClipEndToMax,
    validateClipTime,
    // Preview
    previewClip,
    previewScene,
    // Metadata
    handleDurationLoaded,
    handleMetadataLoaded,
    // UI
    focusDescriptionInput,
    triggerAddClip,
    exportAllClips,
  }
}
