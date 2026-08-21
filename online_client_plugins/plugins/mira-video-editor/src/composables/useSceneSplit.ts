import { ref, watch, nextTick } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { toast } from '@/lib/toast'
import videoEditorApi from '@/lib/videoEditorApi'
import { loadSettings } from '@/lib/settings'
import { downloadToLocalFile } from '@/lib/download'
import type { VideoData, VideoClip } from '@/types/video-editor'
import type { SceneSegment, ContextMenuState, SplitProgress, SceneMergeStates } from '../types'
import { formatTime, formatThumbnailUrl } from '../utils/formatters'

/**
 * 智能分割组合式函数
 * 处理视频场景检测、分割、合并等功能
 */
export function useSceneSplit(
  selectedVideo: () => VideoData | null,
  currentListId: () => string,
  clipStartTime: () => number,
  clipEndTime: () => number,
  updateVideoClips: (clips: { [key: string]: VideoClip }) => Promise<void>,
  isValidClipTime: () => boolean
) {
  // 视频分割状态
  const splitSensitivity = ref('medium')
  const minSceneDuration = ref(0)
  const useSelectedRange = ref(false)
  const isSplitting = ref(false)
  const splitAbortController = ref<AbortController | null>(null)
  const splitProgress = ref<SplitProgress>({ message: '', percent: -1 })
  const sceneSegments = ref<SceneSegment[]>([])
  const selectedScenes = ref<string[]>([])
  const sceneTempDir = ref<string>('') // 保存场景检测的临时目录
  const hasAutoLoaded = ref(false) // 追踪是否已经自动加载过
  const showSplitSettingsDialog = ref(false)

  // 原始场景数据备份（用于取消合并）
  const originalScenes = ref<{ [key: string]: SceneSegment[] }>({})

  // 合并状态映射：视频ID -> 合并状态
  const sceneMergeStates = ref<SceneMergeStates>(localStorage.getItem('mira-video-editor:sceneMergeStates')
    ? JSON.parse(localStorage.getItem('mira-video-editor:sceneMergeStates')!)
    : {})

  // 右键菜单状态
  const contextMenu = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    scene: null,
    mergeScenes: [],
    subMenuX: 0,
    subMenuY: 0
  })

  const showMergeSubMenu = ref(false)

  /**
   * 重置智能分割状态（仅清空内存状态，不删除磁盘缓存）
   */
  function resetSplitState() {
    const video = selectedVideo()

    // 清空分割结果
    sceneSegments.value = []
    selectedScenes.value = []
    sceneTempDir.value = ''
    hasAutoLoaded.value = false

    // 重置分割相关状态
    isSplitting.value = false
    splitProgress.value = { message: '', percent: -1 }
    useSelectedRange.value = false

    // 清理 AbortController
    if (splitAbortController.value) {
      splitAbortController.value.abort()
      splitAbortController.value = null
    }

    // 清理合并状态
    if (video) {
      delete originalScenes.value[video.id]
      if (sceneMergeStates.value[video.id]) {
        delete sceneMergeStates.value[video.id]
        localStorage.setItem('mira-video-editor:sceneMergeStates', JSON.stringify(sceneMergeStates.value))
      }
    }
  }

  /**
   * 清除场景检测缓存（删除磁盘缓存 + 重置内存状态）
   */
  async function clearSceneCacheAndReset() {
    const video = selectedVideo()

    if (video) {
      try {
        await videoEditorApi.clearSceneCache({
          videoId: video.id
        })
      } catch (error) {
        console.warn('[clearSceneCacheAndReset] 清除场景缓存失败:', error)
      }
    }

    resetSplitState()
  }

  /**
   * 检查是否已有现存的场景数据
   */
  async function checkExistingSceneData(): Promise<boolean> {
    const video = selectedVideo()
    if (!video) return false

    const videoId = video.id

    try {
      // 使用API检查现有场景数据
      const result = await videoEditorApi.checkExistingScenes({
        videoId,
        videoPath: video.originalPath || video.path,
        minSceneDuration: minSceneDuration.value
      })

      if (result.success && result.scenes && result.scenes.length > 0) {
        // 加载现有的场景数据
        const newSegments = result.scenes.map((scene: any, index: number) => ({
          id: uuidv4(),
          startTime: scene.startTime,
          endTime: scene.endTime,
          thumbnail: scene.thumbnail ? formatThumbnailUrl(scene.thumbnail) : undefined
        }))

        sceneSegments.value = newSegments
        sceneTempDir.value = result.tempDir || ''
        selectedScenes.value = []

        console.log('[useSceneSplit] 场景数据加载完成，数量:', sceneSegments.value.length)

        // 恢复合并状态
        restoreMergeStates(videoId, result.scenes)

        return true
      }
    } catch (error) {
      console.warn('检查现有场景数据失败:', error)
    }

    return false
  }

  /**
   * 恢复合并状态
   */
  function restoreMergeStates(videoId: string, originalScenesData: any[]) {
    const videoMergeState = sceneMergeStates.value[videoId]
    console.log('[restoreMergeStates] 开始恢复合并状态, videoId:', videoId, 'mergeState:', videoMergeState)
    if (!videoMergeState || videoMergeState.length === 0) {
      console.log('[restoreMergeStates] 没有合并状态需要恢复')
      return
    }

    // 重建原始场景数据备份
    originalScenes.value[videoId] = originalScenesData.map((scene: any) => ({
      id: uuidv4(),
      startTime: scene.startTime,
      endTime: scene.endTime,
      thumbnail: scene.thumbnail ? formatThumbnailUrl(scene.thumbnail) : undefined
    }))

    // 应用合并状态
    const newSegments = [...sceneSegments.value]

    // 按照合并的原始场景ID来匹配并应用合并
    for (const mergeState of videoMergeState) {
      // 找到所有合并场景在当前列表中的索引
      const indicesToRemove: number[] = []
      let startTime = 0
      let endTime = 0
      let thumbnail: string | undefined = undefined

      // 按时间顺序查找匹配的场景
      for (let i = 0; i < newSegments.length; i++) {
        const segment = newSegments[i]
        // 检查此场景的时间范围是否与合并状态中的某个原始场景匹配
        const originalScene = originalScenes.value[videoId]?.find(
          os => Math.abs(os.startTime - segment.startTime) < 0.1 && Math.abs(os.endTime - segment.endTime) < 0.1
        )

        if (originalScene && mergeState.mergedIds.includes(originalScene.id)) {
          indicesToRemove.push(i)
          if (startTime === 0 || segment.startTime < startTime) {
            startTime = segment.startTime
          }
          if (segment.endTime > endTime) {
            endTime = segment.endTime
          }
          if (!thumbnail && segment.thumbnail) {
            thumbnail = segment.thumbnail
          }
        }
      }

      // 如果找到了要合并的场景，执行合并
      if (indicesToRemove.length > 0) {
        const mergedScene: SceneSegment = {
          id: mergeState.mergedId,
          startTime,
          endTime,
          thumbnail,
          isMerged: true,
          mergedIds: [...mergeState.mergedIds]
        }

        // 从后往前删除，避免索引变化
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          newSegments.splice(indicesToRemove[i], 1)
        }

        // 插入合并后的场景（使用第一个被删除场景的索引位置）
        newSegments.splice(indicesToRemove[0], 0, mergedScene)
      }
    }

    console.log('[restoreMergeStates] 恢复完成，最终场景数:', newSegments.length)
    sceneSegments.value = newSegments
  }

  /**
   * 开始场景检测
   */
  async function startSceneDetection() {
    const video = selectedVideo()
    const listId = currentListId()
    if (!video || !listId) {
      toast.error('请先选择一个视频', '错误')
      return
    }

    // 先检查是否有现有的场景数据
    const hasExisting = await checkExistingSceneData()
    console.log('hasExisting:', hasExisting)
    if (hasExisting) {
      return // 如果有现有数据，直接返回
    }

    try {
      isSplitting.value = true
      splitProgress.value = { message: '初始化场景检测...', percent: 0 }

      // 创建 AbortController 用于取消操作
      splitAbortController.value = new AbortController()

      // 清空之前的结果
      sceneSegments.value = []
      selectedScenes.value = []
      sceneTempDir.value = '' // 清空临时目录

      // 模拟进度更新
      splitProgress.value = { message: '正在分析视频内容...', percent: 20 }

      // 场景检测
      const detectOptions: any = {
        videoPath: video.originalPath || video.path,
        sensitivity: splitSensitivity.value as 'low' | 'medium' | 'high',
        minSceneDuration: minSceneDuration.value,
        videoId: video.id, // 传递视频ID
        signal: splitAbortController.value?.signal // 传递 AbortSignal
      }

      // 如果启用了使用选中范围，添加时间参数
      if (useSelectedRange.value && isValidClipTime()) {
        detectOptions.startTime = clipStartTime()
        detectOptions.endTime = clipEndTime()
        console.log('使用选中范围:', {
          useSelectedRange: useSelectedRange.value,
          isValidClipTime: isValidClipTime(),
          startTime: clipStartTime(),
          endTime: clipEndTime(),
          detectOptions
        })
        splitProgress.value = {
          message: `正在分析选中范围 ${formatTime(clipStartTime())} - ${formatTime(clipEndTime())}...`,
          percent: 20
        }
      } else {
        console.log('未使用选中范围:', {
          useSelectedRange: useSelectedRange.value,
          isValidClipTime: isValidClipTime(),
          clipStartTime: clipStartTime(),
          clipEndTime: clipEndTime()
        })
      }

      const result = await videoEditorApi.splitVideoScenes(detectOptions)

      splitProgress.value = { message: '处理检测结果...', percent: 80 }

      if (result.scenes) {
        // 保存临时目录信息
        sceneTempDir.value = result.tempDir || ''

        sceneSegments.value = result.scenes.map((scene: any) => ({
          id: uuidv4(),
          startTime: scene.startTime,
          endTime: scene.endTime,
          thumbnail: scene.thumbnail ? formatThumbnailUrl(scene.thumbnail) : undefined
        }))

        splitProgress.value = { message: `检测完成，找到 ${sceneSegments.value.length} 个场景`, percent: 100 }
        toast.success(`成功检测到 ${sceneSegments.value.length} 个场景`, '完成')
      } else {
        throw new Error('场景检测失败')
      }
    } catch (error) {
      console.error('场景检测失败:', error)
      // 检查是否是取消操作
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('场景检测已被取消', '信息')
        splitProgress.value = { message: '已取消', percent: -1 }
      } else {
        toast.error('场景检测失败: ' + (error as Error).message, '错误')
        splitProgress.value = { message: '检测失败', percent: -1 }
      }
    } finally {
      isSplitting.value = false
      splitAbortController.value = null // 清理 AbortController
      // 3秒后隐藏进度条
      setTimeout(() => {
        if (!isSplitting.value) {
          splitProgress.value = { message: '', percent: -1 }
        }
      }, 3000)
    }
  }

  /**
   * 取消场景检测
   */
  function cancelSceneDetection() {
    if (!isSplitting.value) return

    try {
      // 如果有 AbortController，则调用 abort
      if (splitAbortController.value) {
        splitAbortController.value.abort()
        splitAbortController.value = null
      }

      // 重置状态
      isSplitting.value = false
      splitProgress.value = { message: '已取消分割', percent: -1 }

      toast.info('场景检测已取消', '信息')

      // 3秒后隐藏进度条
      setTimeout(() => {
        if (!isSplitting.value) {
          splitProgress.value = { message: '', percent: -1 }
        }
      }, 3000)
    } catch (error) {
      console.error('取消场景检测失败:', error)
      toast.error('取消场景检测失败', '错误')
    }
  }

  /**
   * 全选场景
   */
  function selectAllScenes() {
    selectedScenes.value = sceneSegments.value.map(scene => scene.id)
  }

  /**
   * 清除场景选择
   */
  function clearSceneSelection() {
    selectedScenes.value = []
  }

  /**
   * 切换场景选择状态
   */
  function toggleSceneSelection(sceneId: string) {
    const index = selectedScenes.value.indexOf(sceneId)
    if (index > -1) {
      selectedScenes.value.splice(index, 1)
    } else {
      selectedScenes.value.push(sceneId)
    }
  }

  /**
   * Shift+点击 checkbox：先范围选中（锚点到点击位置），再合并连续选中的片段
   */
  function handleShiftClickScene(sceneId: string) {
    const clickedIndex = sceneSegments.value.findIndex(s => s.id === sceneId)
    if (clickedIndex === -1) return

    // 找锚点：selectedScenes 中最后加入的（最近一次手动选中的）
    let anchorIndex = -1
    if (selectedScenes.value.length > 0) {
      const lastSelectedId = selectedScenes.value[selectedScenes.value.length - 1]
      anchorIndex = sceneSegments.value.findIndex(s => s.id === lastSelectedId)
    }

    if (anchorIndex === -1) {
      // 没有已选中的，只选中当前
      selectedScenes.value.push(sceneId)
      return
    }

    // 第一步：范围选中，把锚点到点击位置之间的全部选中
    const rangeStart = Math.min(anchorIndex, clickedIndex)
    const rangeEnd = Math.max(anchorIndex, clickedIndex)
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const id = sceneSegments.value[i].id
      if (!selectedScenes.value.includes(id)) {
        selectedScenes.value.push(id)
      }
    }

    // 第二步：从点击位置向前找连续已选中的非合并场景，确定合并区间
    // 已合并场景作为边界，不可跨越
    let mergeStart = clickedIndex
    for (let i = clickedIndex - 1; i >= 0; i--) {
      const seg = sceneSegments.value[i]
      if (seg.isMerged) break
      if (selectedScenes.value.includes(seg.id)) {
        mergeStart = i
      } else {
        break
      }
    }

    // 只有1个连续选中的非合并场景，不合并
    if (mergeStart === clickedIndex) return

    // 合并时间范围
    const mergedStartTime = sceneSegments.value[mergeStart].startTime
    const mergedEndTime = sceneSegments.value[clickedIndex].endTime

    // 收集要合并的场景信息
    const mergedIds: string[] = []
    const scenesToMerge: SceneSegment[] = []
    for (let i = mergeStart; i <= clickedIndex; i++) {
      const scene = sceneSegments.value[i]
      mergedIds.push(scene.id)
      scenesToMerge.push({
        id: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        thumbnail: scene.thumbnail
      })
    }

    // 创建合并场景
    const mergedScene: SceneSegment = {
      id: uuidv4(),
      startTime: mergedStartTime,
      endTime: mergedEndTime,
      thumbnail: scenesToMerge[0].thumbnail,
      isMerged: true,
      mergedIds
    }

    // 备份原始场景
    const videoId = selectedVideo()?.id || ''
    if (!originalScenes.value[videoId]) {
      originalScenes.value[videoId] = []
    }
    originalScenes.value[videoId].push(...scenesToMerge)

    // 替换场景列表
    const newSegments = [...sceneSegments.value]
    for (let i = clickedIndex; i >= mergeStart; i--) {
      newSegments.splice(i, 1)
    }
    newSegments.splice(mergeStart, 0, mergedScene)
    sceneSegments.value = newSegments

    // 更新选中状态：移除被合并的，保留合并结果
    const newSelected = selectedScenes.value.filter(id => !mergedIds.includes(id))
    newSelected.push(mergedScene.id)
    selectedScenes.value = newSelected

    // 持久化合并状态
    if (videoId) {
      if (!sceneMergeStates.value[videoId]) {
        sceneMergeStates.value[videoId] = []
      }
      sceneMergeStates.value[videoId].push({
        mergedId: mergedScene.id,
        mergedIds: [...mergedIds]
      })
      localStorage.setItem('mira-video-editor:sceneMergeStates', JSON.stringify(sceneMergeStates.value))
    }

    toast.success(`已合并 ${mergedIds.length} 个场景`, '完成')
  }

  /**
   * 添加选中的场景到片段列表
   */
  async function addSelectedScenesToClips() {
    const video = selectedVideo()
    const listId = currentListId()
    if (!video || !listId) {
      toast.error('请先选择视频', '错误')
      return
    }

    if (!Array.isArray(selectedScenes.value) || selectedScenes.value.length === 0) {
      toast.error('请选择要添加的场景', '错误')
      return
    }

    try {
      // 按照用户选择的顺序获取场景数据
      const selectedSceneData = selectedScenes.value
        .map(id => {
          const index = sceneSegments.value.findIndex(s => s.id === id)
          const scene = sceneSegments.value[index]
          return { scene, index }
        })
        .filter(item => item.scene !== undefined)

      if (selectedSceneData.length === 0) {
        toast.error('找不到选中的场景数据', '错误')
        return
      }

      // 为每个场景创建片段
      const updatedClips = { ...video.clips }
      for (const { scene, index } of selectedSceneData) {
        const newClip: VideoClip = {
          clip_id: uuidv4(),
          start: scene.startTime,
          end: scene.endTime,
          desc: `场景 ${index + 1}`,
          tags: [],
          thumbnail: scene.thumbnail // 直接使用场景缩略图作为片段封面
        }
        updatedClips[newClip.clip_id] = newClip
      }

      // 更新视频片段
      await updateVideoClips(updatedClips)
      toast.success(`成功添加 ${selectedSceneData.length} 个场景到片段列表`, '完成')
      clearSceneSelection()
    } catch (error) {
      console.error('添加场景到片段列表失败:', error)
      toast.error('添加场景到片段列表失败: ' + (error as Error).message, '错误')
    }
  }

  /**
   * 自动加载场景数据
   */
  async function autoLoadSceneData() {
    const video = selectedVideo()

    if (!video || hasAutoLoaded.value) {
      return
    }

    // 如果正在分割中，不加载已有数据，避免冲突
    if (isSplitting.value) {
      return
    }

    hasAutoLoaded.value = true // 标记已经尝试过自动加载

    try {
      // 先检查是否已有现存的场景数据
      const hasExisting = await checkExistingSceneData()
      if (hasExisting) {
        // 确保分割状态为 false，因为这是已加载的已完成数据
        isSplitting.value = false
        splitProgress.value = { message: '', percent: -1 }
        return
      }

      // 如果没有现有数据，不自动开始场景检测（让用户手动触发）
    } catch (error) {
      console.warn('自动加载场景数据失败:', error)
      // 静默失败，不显示错误提示
    }
  }

  /**
   * 右键菜单处理
   */
  function handleSceneContextMenu(event: MouseEvent, scene: SceneSegment) {
    const mergeScenes: Array<{ id: string; title: string; timeRange: string }> = []

    // 查找当前场景前后的选中场景
    const sceneIndex = sceneSegments.value.findIndex(s => s.id === scene.id)
    if (sceneIndex !== -1) {
      // 查找前面所有连续的选中场景
      for (let i = sceneIndex - 1; i >= 0; i--) {
        if (selectedScenes.value.includes(sceneSegments.value[i].id)) {
          mergeScenes.push({
            id: sceneSegments.value[i].id,
            title: `场景 ${i + 1}`,
            timeRange: `${formatTime(sceneSegments.value[i].startTime)} - ${formatTime(sceneSegments.value[i].endTime)}`
          })
        } else {
          // 遇到未选中的场景，停止向前查找
          break
        }
      }

      // 查找后面所有连续的选中场景
      for (let i = sceneIndex + 1; i < sceneSegments.value.length; i++) {
        if (selectedScenes.value.includes(sceneSegments.value[i].id)) {
          mergeScenes.push({
            id: sceneSegments.value[i].id,
            title: `场景 ${i + 1}`,
            timeRange: `${formatTime(sceneSegments.value[i].startTime)} - ${formatTime(sceneSegments.value[i].endTime)}`
          })
        } else {
          // 遇到未选中的场景，停止向后查找
          break
        }
      }
    }

    contextMenu.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      scene,
      mergeScenes,
      subMenuX: 0,
      subMenuY: 0
    }
    showMergeSubMenu.value = false

    // 确保菜单不超出视口
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        const menu = document.querySelector('.scene-context-menu') as HTMLElement
        if (menu) {
          const rect = menu.getBoundingClientRect()
          if (event.clientX + rect.width > window.innerWidth) {
            contextMenu.value.x = event.clientX - rect.width
          }
          if (event.clientY + rect.height > window.innerHeight) {
            contextMenu.value.y = event.clientY - rect.height
          }
        }
      })
    })
  }

  /**
   * 处理菜单包装器离开事件
   */
  function handleMenuWrapperLeave(event: MouseEvent) {
    const wrapper = event.currentTarget as HTMLElement
    const relatedTarget = event.relatedTarget as HTMLElement

    // 如果鼠标还在包装器内，不隐藏子菜单
    if (relatedTarget && wrapper.contains(relatedTarget)) {
      return
    }

    showMergeSubMenu.value = false
  }

  /**
   * 隐藏右键菜单
   */
  function hideContextMenu() {
    contextMenu.value.visible = false
    contextMenu.value.scene = null
    contextMenu.value.mergeScenes = []
    showMergeSubMenu.value = false
  }

  /**
   * 合并场景
   */
  function handleMergeScenes(targetScene: { id: string; title: string; timeRange: string }) {
    const currentScene = contextMenu.value.scene
    if (!currentScene) {
      hideContextMenu()
      return
    }

    const targetIndex = sceneSegments.value.findIndex(s => s.id === targetScene.id)
    if (targetIndex === -1) {
      hideContextMenu()
      return
    }

    const currentIndex = sceneSegments.value.findIndex(s => s.id === currentScene.id)
    if (currentIndex === -1) {
      hideContextMenu()
      return
    }

    // 获取要合并的场景范围
    const startIndex = Math.min(currentIndex, targetIndex)
    const endIndex = Math.max(currentIndex, targetIndex)

    // 合并时间范围
    const mergedStartTime = sceneSegments.value[startIndex].startTime
    const mergedEndTime = sceneSegments.value[endIndex].endTime

    // 获取要合并的所有场景ID
    const mergedIds: string[] = []
    const scenesToMerge: SceneSegment[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      const scene = sceneSegments.value[i]
      mergedIds.push(scene.id)
      scenesToMerge.push({
        id: scene.id,
        startTime: scene.startTime,
        endTime: scene.endTime,
        thumbnail: scene.thumbnail
      })
    }

    // 创建新的合并场景
    const mergedScene: SceneSegment = {
      id: uuidv4(),
      startTime: mergedStartTime,
      endTime: mergedEndTime,
      thumbnail: currentScene.thumbnail,
      isMerged: true,
      mergedIds
    }

    // 保存原始场景数据到备份
    const videoId = selectedVideo()?.id || ''
    if (!originalScenes.value[videoId]) {
      originalScenes.value[videoId] = []
    }
    originalScenes.value[videoId].push(...scenesToMerge)

    // 替换原场景为合并后的场景
    const newSegments = [...sceneSegments.value]
    // 删除原场景
    for (let i = endIndex; i >= startIndex; i--) {
      newSegments.splice(i, 1)
    }
    // 在原位置插入合并后的场景
    newSegments.splice(startIndex, 0, mergedScene)

    sceneSegments.value = newSegments

    // 更新选中状态：移除被合并的场景ID，添加合并后的场景ID
    const newSelected = selectedScenes.value.filter(id => !mergedIds.includes(id))
    newSelected.push(mergedScene.id)
    selectedScenes.value = newSelected

    // 持久化合并状态
    if (videoId) {
      if (!sceneMergeStates.value[videoId]) {
        sceneMergeStates.value[videoId] = []
      }
      sceneMergeStates.value[videoId].push({
        mergedId: mergedScene.id,
        mergedIds: [...mergedIds]
      })
      localStorage.setItem('mira-video-editor:sceneMergeStates', JSON.stringify(sceneMergeStates.value))
    }

    hideContextMenu()
    toast.success(`已合并 ${mergedIds.length} 个场景`, '完成')
  }

  /**
   * 取消合并
   */
  function handleUnmergeScene() {
    const currentScene = contextMenu.value.scene
    if (!currentScene || !currentScene.isMerged || !currentScene.mergedIds) {
      hideContextMenu()
      return
    }

    const videoId = selectedVideo()?.id
    if (!videoId) {
      hideContextMenu()
      return
    }

    // 从原始数据中恢复场景
    const restoredScenes: SceneSegment[] = []
    const videoOriginalScenes = originalScenes.value[videoId] || []

    for (const mergedId of currentScene.mergedIds) {
      const originalScene = videoOriginalScenes.find(s => s.id === mergedId)
      if (originalScene) {
        restoredScenes.push(originalScene)
      }
    }

    if (restoredScenes.length === 0) {
      hideContextMenu()
      toast.error('无法恢复原始场景数据', '错误')
      return
    }

    // 查找当前合并场景的索引
    const mergedSceneIndex = sceneSegments.value.findIndex(s => s.id === currentScene.id)
    if (mergedSceneIndex === -1) {
      hideContextMenu()
      return
    }

    // 替换合并场景为原始场景
    const newSegments = [...sceneSegments.value]
    newSegments.splice(mergedSceneIndex, 1, ...restoredScenes)
    sceneSegments.value = newSegments

    // 更新选中状态
    const newSelected = selectedScenes.value.filter(id => id !== currentScene.id)
    newSelected.push(...currentScene.mergedIds)
    selectedScenes.value = newSelected

    // 从持久化状态中移除此合并
    if (sceneMergeStates.value[videoId]) {
      sceneMergeStates.value[videoId] = sceneMergeStates.value[videoId].filter(
        m => m.mergedId !== currentScene.id
      )
      localStorage.setItem('mira-video-editor:sceneMergeStates', JSON.stringify(sceneMergeStates.value))
    }

    // 清理原始数据备份
    originalScenes.value[videoId] = videoOriginalScenes.filter(
      s => !currentScene.mergedIds?.includes(s.id)
    )

    hideContextMenu()
    toast.success('已取消合并', '完成')
  }

  /**
   * 导出合并片段
   */
  async function handleExportMergedScene() {
    const scene = contextMenu.value.scene
    if (!scene) {
      hideContextMenu()
      return
    }

    if (!scene.isMerged || !scene.mergedIds || scene.mergedIds.length === 0) {
      hideContextMenu()
      toast.error('未找到合并的原始场景', '错误')
      return
    }

    hideContextMenu()

    const video = selectedVideo()
    const listId = currentListId()
    if (!video || !listId) {
      toast.error('请先选择视频', '错误')
      return
    }

    if (!sceneTempDir.value) {
      toast.error('场景检测数据丢失，请重新进行场景分割', '错误')
      return
    }

    // 从插件配置读取设置
    const settings = loadSettings()
    const defaultOutputFormat = settings.defaultOutputFormat || 'mp4'
    const defaultQuality = settings.defaultQuality || 'original'

    try {
      toast.info('正在使用 ffmpeg 合并视频片段...', '处理中')

      // 合并并导出片段（输出到插件导出目录）
      const result = await videoEditorApi.mergeAndExportScenes({
        videoPath: video.originalPath || video.path, // 原视频路径，用于 ffmpeg 裁切
        mergedScene: {
          startTime: scene.startTime,
          endTime: scene.endTime
        },
        options: {
          format: defaultOutputFormat as 'mp4' | 'webm' | 'avi' | 'mov',
          quality: defaultQuality as 'original' | 'low' | 'medium' | 'high',
          includeAudio: true
        },
        watermarkRegions: video.watermarks?.enabled
          ? video.watermarks.regions.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }))
          : undefined,
        videoWidth: video.metadata.width || 1920,
        videoHeight: video.metadata.height || 1080
      })

      toast.success(`成功导出合并片段（包含 ${scene.mergedIds.length} 个原始场景），已开始下载`, '完成')
      downloadToLocalFile(result.outputPath).catch((err) => {
        console.error('下载导出文件失败:', err)
        toast.error(`下载导出文件失败: ${(err as Error).message}`, '错误')
      })
    } catch (error) {
      console.error('导出合并片段失败:', error)
      toast.error('导出合并片段失败: ' + (error as Error).message, '错误')
    }
  }

  /**
   * 导出单个场景
   */
  async function handleExportSingleScene() {
    const scene = contextMenu.value.scene
    if (!scene) {
      hideContextMenu()
      return
    }

    hideContextMenu()

    const video = selectedVideo()
    const listId = currentListId()
    if (!video || !listId) {
      toast.error('请先选择视频', '错误')
      return
    }

    if (!sceneTempDir.value) {
      toast.error('场景检测数据丢失，请重新进行场景分割', '错误')
      return
    }

    // 从插件配置读取设置
    const settings = loadSettings()
    const defaultOutputFormat = settings.defaultOutputFormat || 'mp4'
    const defaultQuality = settings.defaultQuality || 'original'

    try {
      toast.info(`正在导出场景: ${formatTime(scene.startTime)} - ${formatTime(scene.endTime)}`, '处理中')

      // 导出单个场景（输出到插件导出目录）
      const result = await videoEditorApi.exportScenes({
        videoPath: video.originalPath || video.path, // 原视频路径，用于 ffmpeg 裁切
        scenes: [{
          startTime: scene.startTime,
          endTime: scene.endTime
        }],
        options: {
          quality: defaultQuality as 'original' | 'low' | 'medium' | 'high',
          includeAudio: true
        },
        watermarkRegions: video.watermarks?.enabled
          ? video.watermarks.regions.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }))
          : undefined,
        videoWidth: video.metadata.width || 1920,
        videoHeight: video.metadata.height || 1080
      })

      toast.success('成功导出场景，已开始下载', '完成')
      for (const outputPath of result.outputPaths) {
        downloadToLocalFile(outputPath).catch((err) => {
          console.error('下载导出文件失败:', err)
          toast.error(`下载导出文件失败: ${(err as Error).message}`, '错误')
        })
      }
    } catch (error) {
      console.error('导出场景失败:', error)
      toast.error('导出场景失败: ' + (error as Error).message, '错误')
    }
  }

  /**
   * 缩略图加载失败时的处理
   */
  function handleThumbnailError(scene: { id: string; thumbnail?: string }) {
    // 缩略图加载失败时的处理
    console.warn('[useSceneSplit] 缩略图加载失败:', {
      originalPath: scene.thumbnail,
      formattedPath: scene.thumbnail ? formatThumbnailUrl(scene.thumbnail) : null,
      sceneId: scene.id
    })

    // 尝试重新格式化URL
    if (scene.thumbnail) {
      const formattedUrl = formatThumbnailUrl(scene.thumbnail)
      if (formattedUrl !== scene.thumbnail) {
        console.log('[useSceneSplit] 尝试使用重新格式化的URL:', formattedUrl)
      }
    }
  }

  // 点击页面其他地方关闭右键菜单
  watch(() => contextMenu.value.visible, (visible) => {
    if (visible) {
      document.addEventListener('click', hideContextMenu)
    } else {
      document.removeEventListener('click', hideContextMenu)
    }
  })

  return {
    // 状态
    splitSensitivity,
    minSceneDuration,
    useSelectedRange,
    isSplitting,
    splitProgress,
    sceneSegments,
    selectedScenes,
    showSplitSettingsDialog,
    hasAutoLoaded,
    contextMenu,
    showMergeSubMenu,

    // 方法
    resetSplitState,
    clearSceneCacheAndReset,
    checkExistingSceneData,
    startSceneDetection,
    cancelSceneDetection,
    selectAllScenes,
    clearSceneSelection,
    toggleSceneSelection,
    handleShiftClickScene,
    addSelectedScenesToClips,
    autoLoadSceneData,
    handleSceneContextMenu,
    handleMenuWrapperLeave,
    hideContextMenu,
    handleMergeScenes,
    handleUnmergeScene,
    handleExportMergedScene,
    handleExportSingleScene,
    handleThumbnailError
  }
}
