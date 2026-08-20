/** 宿主传入的媒体项（index.js 序列化后经 query.media 到达窗口） */
export interface MediaInput {
  id?: string
  name?: string
  ext?: string
  width?: number
  height?: number
  thumbnailURL?: string
  url?: string
}

/** Pinterest 视觉搜索结果项（已规范化） */
export interface ResultItem {
  key: string
  id: string
  title: string
  /** 中等质量图（瀑布流默认用） */
  url: string
  largeUrl: string
  squareUrl: string
  width: number
  height: number
  saved: boolean
}

export type TaskState = 'waiting' | 'processing' | 'success' | 'failed'

/** 一次搜索任务（一张种子图） */
export interface SearchTask {
  id: string
  name: string
  ext: string
  width: number
  height: number
  /** 种子图地址（http(s) 或 data:） */
  imageUrl: string
  /** 原始种子图（创建任务时）；裁剪后可一键恢复 */
  originalUrl: string
  /** 缩略图地址（左栏列表展示；素材库任务用缩略图直链，省流量） */
  thumbUrl?: string
  state: TaskState
  /** failed 时的错误信息（'Failed to fetch' 视为网络错误） */
  error?: string
  results: ResultItem[]
  /** 分页游标（每任务独立，修复原版全局 bookmark 串任务的缺陷） */
  bookmark?: string
  /** 无限滚动的种子游标：取 results[seedIndex] 作为下一页种子 */
  seedIndex: number
  loadingMore: boolean
  /** 切换任务时保留滚动位置 */
  scroll: number
}

/** 宿主（plugin-window-preload）注入的 Eagle 兼容 API 子集 */
export interface MiraHostApi {
  app: {
    platform?: string
    isMac?: boolean
    theme?: string
    isDarkColors?: () => boolean
  }
  log?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }
  shell?: { openExternal?: (url: string) => Promise<any> }
  window?: {
    setAlwaysOnTop?: (flag: boolean) => Promise<any>
    isAlwaysOnTop?: () => Promise<boolean>
  }
  clipboard?: {
    readImage?: () => { isEmpty: () => boolean; getSize: () => { width: number; height: number }; toDataURL?: () => string; toJPEG?: () => Uint8Array } | null
  }
  item?: {
    getSelected?: () => Promise<MediaInput[]>
    addFromURL?: (url: string, options?: { website?: string; name?: string }) => Promise<any>
  }
  onThemeChanged?: (callback: (theme: string) => void) => void
}
