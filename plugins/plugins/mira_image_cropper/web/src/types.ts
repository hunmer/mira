/** 选区（原图像素坐标，允许越界为负值，导出时越界区域填透明/白底） */
export interface CropRegion {
  id: string
  x: number
  y: number
  w: number
  h: number
}

/** 宿主右键菜单传入 / query.media 序列化的素材图片 */
export interface MediaInput {
  id?: string
  libraryId?: string
  name: string
  width: number
  height: number
  url: string
  thumbnailURL: string
}

export type ExportFormat = 'png' | 'jpeg'

export interface ExportSettings {
  format: ExportFormat
  quality: number // 0-1，仅 jpeg
  prefix: string // 文件名前缀，默认原图名
}
