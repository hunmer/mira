/**
 * 图片工具：裁剪种子图为 dataURL。
 * 跨域图片直接 drawImage 会污染 canvas 导致 toDataURL 抛错，
 * 因此先 fetch 成 blob 再 createImageBitmap 绘制（fetch 失败按连接错误处理）。
 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export async function cropToDataUrl(url: string, rect: CropRect, type = 'image/jpeg', quality = 0.92): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch (${response.status})`)
  const bitmap = await createImageBitmap(await response.blob())
  try {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(rect.width))
    canvas.height = Math.max(1, Math.round(rect.height))
    canvas.getContext('2d')!.drawImage(
      bitmap,
      Math.round(rect.x),
      Math.round(rect.y),
      Math.round(rect.width),
      Math.round(rect.height),
      0,
      0,
      canvas.width,
      canvas.height,
    )
    return canvas.toDataURL(type, quality)
  } finally {
    bitmap.close()
  }
}

export function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-US')
}
