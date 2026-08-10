import type { LayerNode, LayerNodeData, ParsedPsdData } from '@/types'
import { psdToData } from '@/composables/psdSerialize'

let idSeq = 0
function nextId() {
  return `layer-${++idSeq}`
}

/** 把 Uint8ClampedArray 像素数据转成可绘制的 canvas */
function imageDataToCanvas(img: LayerNodeData['imageData']): HTMLCanvasElement | undefined {
  if (!img || img.width <= 0 || img.height <= 0) return undefined
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(img.width, img.height)
  imageData.data.set(img.data)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/** 把 worker 返回的可序列化节点转成主线程响应式节点（imageData → canvas） */
export function convertNode(node: LayerNodeData): LayerNode {
  const canvas = imageDataToCanvas(node.imageData)
  return {
    id: nextId(),
    name: node.name,
    visible: node.visible,
    opacity: node.opacity,
    left: node.left,
    top: node.top,
    width: node.width,
    height: node.height,
    canvas,
    isGroup: node.isGroup,
    children: node.isGroup ? (node.children || []).map(convertNode) : undefined,
  }
}

/** 从 ParsedPsdData 构建 LayerNode 树 */
function buildTree(data: ParsedPsdData): LayerNode[] {
  return data.children.map(convertNode)
}

/** 主线程 fallback：动态 import ag-psd 同步解析（file:// 下 worker 不可用时） */
async function parseInline(
  buffer: ArrayBuffer,
): Promise<{ width: number; height: number; tree: LayerNode[] }> {
  const { readPsd } = await import('ag-psd')
  const psd = readPsd(buffer, { useImageData: true })
  const data = psdToData(psd)
  return { width: data.width, height: data.height, tree: buildTree(data) }
}

/**
 * 通过 Web Worker 解析 PSD，避免大文件阻塞主线程。
 * worker 内用 useImageData 生成纯数据，主线程再重建 canvas。
 * worker 不可用（如 file:// 协议下无法加载 module worker）时回退到主线程解析。
 */
export function parsePsdFile(
  buffer: ArrayBuffer,
): Promise<{ width: number; height: number; tree: LayerNode[] }> {
  idSeq = 0
  let worker: Worker | null = null
  try {
    // vite 原生支持：构建时把 worker 打包为独立 chunk
    worker = new Worker(new URL('@/workers/psdWorker.ts', import.meta.url), { type: 'module' })
  } catch {
    // 构造即失败（旧环境）→ fallback
    return parseInline(buffer)
  }

  return new Promise((resolve) => {
    let settled = false
    const cleanup = () => worker?.terminate()
    worker!.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg?.type === 'done') {
        settled = true
        const data = msg.data as ParsedPsdData
        cleanup()
        resolve({ width: data.width, height: data.height, tree: buildTree(data) })
      } else if (msg?.type === 'error') {
        settled = true
        cleanup()
        // worker 内解析失败也走 fallback（可能是 useImageData 选项问题）
        resolve(parseInline(buffer))
      }
    }
    worker!.onerror = () => {
      if (settled) return
      // worker 加载/执行失败（如 file:// 协议）→ 回退主线程
      console.warn('[PsdPreview] worker 不可用，回退主线程解析')
      cleanup()
      resolve(parseInline(buffer))
    }
    // 注意：不 transfer buffer 所有权，否则 worker 失败后主线程无法回退解析（buffer 被 detach）
    worker!.postMessage({ type: 'parse', buffer })
  })
}

/**
 * 简单合成：从下到上绘制可见图层（仅 normal + opacity）
 * 复杂混合模式/效果不支持，仅作预览演示
 *
 * 顺序约定（ag-psd）：children[0] 为顶层，children[n-1] 为底层。
 * 绘制时底层先画、顶层后画（后画者覆盖），与 PS 视觉一致。
 */
export function compositeLayers(
  nodes: LayerNode[],
  width: number,
  height: number,
  target?: HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = target || document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)

  const drawList = flattenVisibleBottomUp(nodes)

  for (const node of drawList) {
    if (!node.canvas || node.width <= 0 || node.height <= 0) continue
    ctx.save()
    ctx.globalAlpha = node.opacity
    try {
      ctx.drawImage(node.canvas, node.left, node.top)
    } catch {
      // 某些已释放 canvas 可能失败，忽略
    }
    ctx.restore()
  }

  return canvas
}

/**
 * 把可见图层按「绘制顺序」展开：底层在前、顶层在后。
 * ag-psd 的 children[0]=顶层，故从数组末尾（底层）开始收集。
 */
function flattenVisibleBottomUp(nodes: LayerNode[]): LayerNode[] {
  const result: LayerNode[] = []
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    if (!node.visible) continue
    if (node.isGroup && node.children) {
      result.push(...flattenVisibleBottomUp(node.children))
    } else if (!node.isGroup) {
      result.push(node)
    }
  }
  return result
}
