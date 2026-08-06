import { inject } from 'vue'
import { WOVEN_CANVAS_KEY, useQuery } from '@woven-canvas/vue'
import { Asset, Block, Image as CanvasImage } from '@woven-canvas/core'

export interface CanvasImageTransferPayload {
  data: ArrayBuffer
  previewData: ArrayBuffer
  fileName: string
  mimeType: string
}

interface PluginWindowImageTransferApi {
  copyImage?: (payload: CanvasImageTransferPayload) => Promise<{ success: boolean; message?: string }>
  startImageDrag?: (payload: CanvasImageTransferPayload) => void
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

function getPluginWindowApi(): PluginWindowImageTransferApi | undefined {
  return (window as any).electronAPI?.pluginWindow
}

function normalizeFileName(name: string, mimeType: string) {
  const trimmed = name.trim() || 'image'
  const extension = MIME_EXTENSIONS[mimeType]
  if (!extension) return /\.[a-z0-9]{1,8}$/i.test(trimmed) ? trimmed : `${trimmed}.png`
  const baseName = trimmed.replace(/\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i, '') || 'image'
  return `${baseName}.${extension}`
}

async function createPngPreview(blob: Blob): Promise<ArrayBuffer> {
  if (blob.type === 'image/png') return blob.arrayBuffer()
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建图片画布')
    context.drawImage(bitmap, 0, 0)
    const previewBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('无法转换图片')), 'image/png')
    })
    return previewBlob.arrayBuffer()
  } finally {
    bitmap.close()
  }
}

export function useCanvasImageTransfer() {
  const wovenCanvas = inject(WOVEN_CANVAS_KEY)
  if (!wovenCanvas) throw new Error('useCanvasImageTransfer must be used within WovenCanvas')
  const canvas = wovenCanvas

  const imageEntities = useQuery([Block, CanvasImage, Asset] as const)

  function isImageEntity(entityId: number) {
    return imageEntities.value.some((item) => item.entityId === entityId)
  }

  async function resolveImageTransfer(entityId: number): Promise<CanvasImageTransferPayload> {
    const item = imageEntities.value.find((entry) => entry.entityId === entityId)
    if (!item) throw new Error('未找到图片')

    const assetManager = canvas.getAssetManager()
    const identifier = item.asset.value.identifier
    if (!assetManager || !identifier) throw new Error('图片资源不可用')

    const image = item.image.value
    const url = await assetManager.getDisplayUrl(identifier, {
      width: image.width || Math.max(1, Math.round(item.block.value.size[0])),
      height: image.height || Math.max(1, Math.round(item.block.value.size[1])),
    })
    if (!url) throw new Error('图片资源不可用')

    const response = await fetch(url)
    if (!response.ok) throw new Error(`读取图片失败 (${response.status})`)
    const blob = await response.blob()
    const mimeType = blob.type || 'image/png'

    return {
      data: await blob.arrayBuffer(),
      previewData: await createPngPreview(blob),
      fileName: normalizeFileName(image.alt || 'image', mimeType),
      mimeType,
    }
  }

  async function copyImage(entityId: number) {
    const api = getPluginWindowApi()
    if (!api?.copyImage) throw new Error('当前窗口不支持复制图片')
    const result = await api.copyImage(await resolveImageTransfer(entityId))
    if (!result.success) throw new Error(result.message || '复制图片失败')
  }

  return {
    copyImage,
    isImageEntity,
    resolveImageTransfer,
    startImageDrag(payload: CanvasImageTransferPayload) {
      const api = getPluginWindowApi()
      if (!api?.startImageDrag) throw new Error('当前窗口不支持拖拽图片')
      api.startImageDrag(payload)
    },
  }
}
