/**
 * 图片工具：按「显示所见」裁剪种子图为 dataURL。
 *
 * 换算不可依赖 naturalWidth/naturalHeight：EXIF 方向照片(手机竖拍等)在 <img> 中
 * 按方向旋转显示，natural 值却是未旋转的，坐标会横竖互换错位。
 * 这里先 fetch 成 blob(避免直接 drawImage 跨源图污染 canvas)，经 <img> 解码
 * (方向处理与界面显示一致)后整图绘制到显示尺寸快照，再按显示坐标裁剪——所见即所得。
 * 输出分辨率为显示分辨率(对 Pinterest 视觉搜索足够，其服务端本就会压缩种子图)。
 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplaySize {
  width: number
  height: number
}

/** objectURL 加载 <img>(EXIF 方向已应用,与界面显示一致) */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image decode failed'))
    image.src = url
  })
}

export async function cropToDataUrl(
  url: string,
  rect: CropRect,
  display: DisplaySize,
  type = 'image/jpeg',
  quality = 0.92,
): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch (${response.status})`)
  const objectUrl = URL.createObjectURL(await response.blob())
  try {
    const image = await loadImage(objectUrl)
    // 快照:img 完整绘制到显示尺寸(内容与界面所见一致,含 EXIF 方向)
    const snapshot = document.createElement('canvas')
    snapshot.width = Math.max(1, Math.round(display.width))
    snapshot.height = Math.max(1, Math.round(display.height))
    snapshot.getContext('2d')!.drawImage(image, 0, 0, snapshot.width, snapshot.height)

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(rect.width))
    canvas.height = Math.max(1, Math.round(rect.height))
    canvas.getContext('2d')!.drawImage(
      snapshot,
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
    URL.revokeObjectURL(objectUrl)
  }
}

export function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-US')
}
