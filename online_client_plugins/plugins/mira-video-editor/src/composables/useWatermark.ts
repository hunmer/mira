import { ref, computed, watch } from 'vue'
import type { WatermarkRegion, WatermarkPreset } from '@/types/watermark'
import type { VideoData } from '@/types/video-editor'

// 预设存储键
const WATERMARK_PRESETS_KEY = 'mira-video-editor:watermark-presets'

// 默认预设
const DEFAULT_PRESETS: WatermarkPreset[] = []

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `wm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 水印状态管理 Composable
 */
export function useWatermark() {
  // 响应式状态
  const enabled = ref(false)
  const regions = ref<WatermarkRegion[]>([])
  const presets = ref<WatermarkPreset[]>([])
  const selectedPresetId = ref<string | undefined>(undefined)
  const hoveredRegionId = ref<string | undefined>(undefined)

  // 计算属性
  const selectedPreset = computed(() =>
    presets.value.find(p => p.id === selectedPresetId.value)
  )

  const hasRegions = computed(() => regions.value.length > 0)

  // 从 localStorage 加载预设
  function loadPresets() {
    try {
      const stored = localStorage.getItem(WATERMARK_PRESETS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        presets.value = [...DEFAULT_PRESETS, ...parsed]
      } else {
        presets.value = [...DEFAULT_PRESETS]
      }
    } catch (error) {
      console.warn('加载水印预设失败:', error)
      presets.value = [...DEFAULT_PRESETS]
    }
  }

  // 保存预设到 localStorage
  function savePresets() {
    try {
      // 只保存用户自定义的预设（排除默认预设）
      const customPresets = presets.value.filter(p =>
        !DEFAULT_PRESETS.some(dp => dp.id === p.id)
      )
      localStorage.setItem(WATERMARK_PRESETS_KEY, JSON.stringify(customPresets))
    } catch (error) {
      console.warn('保存水印预设失败:', error)
    }
  }

  /**
   * 从视频数据加载水印状态
   */
  function loadFromVideo(video: VideoData) {
    if (video.watermarks) {
      enabled.value = video.watermarks.enabled
      regions.value = video.watermarks.regions || []
    } else {
      // 首次加载时初始化默认状态
      enabled.value = false
      regions.value = []
    }
  }

  /**
   * 保存水印状态到视频数据
   */
  function saveToVideo(video: VideoData) {
    if (!video.watermarks) {
      video.watermarks = { enabled: false, regions: [] }
    }
    video.watermarks.enabled = enabled.value
    video.watermarks.regions = regions.value
  }

  /**
   * 添加水印区域
   */
  function addRegion(region: Omit<WatermarkRegion, 'id'>) {
    const newRegion: WatermarkRegion = {
      id: generateId(),
      ...region
    }
    regions.value.push(newRegion)
    return newRegion
  }

  /**
   * 更新水印区域
   */
  function updateRegion(id: string, updates: Partial<WatermarkRegion>) {
    const index = regions.value.findIndex(r => r.id === id)
    if (index !== -1) {
      regions.value[index] = { ...regions.value[index], ...updates }
    }
  }

  /**
   * 删除水印区域
   */
  function removeRegion(id: string) {
    const index = regions.value.findIndex(r => r.id === id)
    if (index !== -1) {
      regions.value.splice(index, 1)
    }
    // 清除 hover 状态
    if (hoveredRegionId.value === id) {
      hoveredRegionId.value = undefined
    }
  }

  /**
   * 清空所有区域
   */
  function clearRegions() {
    regions.value = []
    hoveredRegionId.value = undefined
  }

  /**
   * 应用预设
   */
  function applyPreset(presetId: string) {
    const preset = presets.value.find(p => p.id === presetId)
    if (preset) {
      selectedPresetId.value = presetId
      regions.value = preset.regions.map(r => ({
        ...r,
        id: generateId() // 重新生成 ID 避免冲突
      }))
    }
  }

  /**
   * 保存当前区域为预设
   */
  function saveAsPreset(name: string) {
    const preset: WatermarkPreset = {
      id: generateId(),
      name,
      regions: regions.value.map(r => ({ ...r }))
    }
    presets.value.push(preset)
    savePresets()
    return preset
  }

  /**
   * 删除预设
   */
  function deletePreset(presetId: string) {
    const index = presets.value.findIndex(p => p.id === presetId)
    if (index !== -1) {
      presets.value.splice(index, 1)
      savePresets()
    }
    if (selectedPresetId.value === presetId) {
      selectedPresetId.value = undefined
    }
  }

  /**
   * 设置 hover 状态
   */
  function setHoveredRegion(id: string | undefined) {
    hoveredRegionId.value = id
  }

  // 初始化
  loadPresets()

  return {
    // 状态
    enabled,
    regions,
    presets,
    selectedPresetId,
    hoveredRegionId,

    // 计算属性
    selectedPreset,
    hasRegions,

    // 方法
    loadFromVideo,
    saveToVideo,
    addRegion,
    updateRegion,
    removeRegion,
    clearRegions,
    applyPreset,
    saveAsPreset,
    deletePreset,
    setHoveredRegion,
    loadPresets,
    savePresets
  }
}
