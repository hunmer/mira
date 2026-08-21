/**
 * 水印去除功能类型定义
 */

/**
 * 水印区域（归一化坐标 0-1）
 */
export interface WatermarkRegion {
  id: string
  x: number  // 0-1
  y: number  // 0-1
  w: number  // 0-1
  h: number  // 0-1
  desc?: string
}

/**
 * 水印预设
 */
export interface WatermarkPreset {
  id: string
  name: string
  regions: WatermarkRegion[]
}

/**
 * 水印配置
 */
export interface WatermarkConfig {
  enabled: boolean
  regions: WatermarkRegion[]
  presets: WatermarkPreset[]
  selectedPreset?: string
}
