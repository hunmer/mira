import type { Layer as AgLayer, PixelData } from 'ag-psd'

/**
 * Worker 返回的可序列化图层节点。
 *
 * ag-psd 在 worker 内默认生成 HTMLCanvasElement，无法跨线程传递；
 * 因此 worker 用 useImageData 选项生成纯数据 PixelData，主线程再转成 canvas。
 */
export interface LayerNodeData {
  name: string
  visible: boolean
  opacity: number
  left: number
  top: number
  width: number
  height: number
  isGroup: boolean
  /** 图层像素（RGBA），普通图层才有；组为空。data 类型取决于 PSD 位深 */
  imageData?: PixelData
  children?: LayerNodeData[]
}

/** worker 返回给主线程的解析结果 */
export interface ParsedPsdData {
  width: number
  height: number
  children: LayerNodeData[]
}

/** 主线程使用的响应式图层节点（imageData 已转成 canvas） */
export interface LayerNode {
  id: string
  name: string
  visible: boolean
  opacity: number
  left: number
  top: number
  width: number
  height: number
  /** 由 imageData 重建的 canvas（组或空图层为 undefined） */
  canvas?: HTMLCanvasElement
  children?: LayerNode[]
  /** 是否为组 */
  isGroup: boolean
  /** 原始引用，调试用 */
  raw?: AgLayer
}
