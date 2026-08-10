import type { Layer, Psd } from 'ag-psd'
import type { LayerNodeData, ParsedPsdData } from '@/types'

/**
 * 把 ag-psd 的 Layer（含 imageData / canvas）转成可序列化节点。
 * worker 与主线程 fallback 共用此逻辑。
 *
 * 关键：剥离 HTMLCanvasElement（无法跨线程传递），只保留 imageData 纯数据；
 *       普通图层若只有 canvas 无 imageData，则从 canvas 抽取像素。
 */
function extractImageData(layer: Layer): LayerNodeData['imageData'] {
  if (layer.imageData) return layer.imageData
  // 兜底：useImageData 模式下理论上不会走到这里
  const canvas = layer.canvas
  if (canvas && canvas.width > 0 && canvas.height > 0) {
    const ctx = canvas.getContext('2d')!
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  return undefined
}

export function toNodeData(layer: Layer): LayerNodeData {
  const isGroup = Array.isArray(layer.children)
  const left = layer.left ?? 0
  const top = layer.top ?? 0
  const right = layer.right ?? left
  const bottom = layer.bottom ?? top
  return {
    name: layer.name || (isGroup ? '组' : '图层'),
    visible: !layer.hidden,
    opacity: typeof layer.opacity === 'number' ? layer.opacity : 1,
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    isGroup,
    imageData: isGroup ? undefined : extractImageData(layer),
    children: isGroup ? normalizeOrder(layer.children || []).map(toNodeData) : undefined,
  }
}

/**
 * 统一图层顺序：让 children[0] = 顶层（画面最上方）。
 *
 * 重要发现（用真实 Photoshop 导出的 PSD 验证）：
 *   ag-psd 的 readPsd 返回的 children[0] 是「底层」，children[n-1] 是「顶层」，
 *   与 Photoshop 图层面板的视觉顺序相反。例如 PS 里「文字层在图片层上方」时，
 *   ag-psd 返回 children = [图片(底), 文字(顶)]。
 *
 *   本函数把每一层 children 反转，使全树统一为 children[0]=顶层，
 *   这样列表正序显示即「顶层在上」（符合 PS 习惯），合成时从数组末尾（底层）先画也正确。
 *
 *   （注：ag-psd 自身的 writePsd→readPsd 往返是自洽的，但与真实 PS 导出的文件约定相反，
 *    故必须以真实 PSD 为准。）
 */
function normalizeOrder(children: Layer[]): Layer[] {
  return [...children].reverse()
}

export function psdToData(psd: Psd): ParsedPsdData {
  return {
    width: psd.width,
    height: psd.height,
    children: normalizeOrder(psd.children || []).map(toNodeData),
  }
}
