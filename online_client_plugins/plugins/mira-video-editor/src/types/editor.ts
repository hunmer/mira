// 视频编辑器类型定义

/**
 * 场景片段类型
 */
export interface SceneSegment {
  id: string
  startTime: number
  endTime: number
  thumbnail?: string
  isMerged?: boolean // 是否是合并后的场景
  mergedIds?: string[] // 合并的原始场景ID列表
}

/**
 * 右键菜单状态
 */
export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  scene: SceneSegment | null
  mergeScenes: Array<{ id: string; title: string; timeRange: string }>
  subMenuX: number
  subMenuY: number
}

/**
 * 合并状态映射
 */
export type SceneMergeStates = { [key: string]: Array<{
  mergedId: string
  mergedIds: string[]
}> }

/**
 * 分割进度
 */
export interface SplitProgress {
  message: string
  percent: number
}

/**
 * 缩略图项
 */
export interface ThumbnailItem {
  time: number
  url: string
}

/**
 * 片段封面状态
 */
export interface ClipThumbnails {
  [clipId: string]: string
}

/**
 * 片段加载状态
 */
export interface ThumbnailLoading {
  [clipId: string]: boolean
}
