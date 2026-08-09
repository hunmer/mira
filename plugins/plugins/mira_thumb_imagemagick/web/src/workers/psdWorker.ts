/// <reference lib="webworker" />
/**
 * PSD 解析 Web Worker。
 *
 * 作用：在后台线程执行 ag-psd.readPsd，避免大文件解析阻塞主线程（UI 卡顿）。
 * 通信约定：
 *   主线程 → worker：{ type: 'parse', buffer: ArrayBuffer }
 *   worker → 主线程：{ type: 'done', data: ParsedPsdData } | { type: 'error', message }
 *
 * 关键点：ag-psd 默认给每个图层生成 HTMLCanvasElement，但 canvas 无法跨线程传递；
 *         因此这里用 useImageData:true 选项让它生成纯数据 PixelData，
 *         worker 只回传可结构化克隆的数据，主线程再重建 canvas。
 */
import { readPsd } from 'ag-psd'
import { psdToData } from '@/composables/psdSerialize'

self.onmessage = (e: MessageEvent) => {
  const msg = e.data
  if (!msg || msg.type !== 'parse') return
  try {
    const psd = readPsd(msg.buffer as ArrayBuffer, {
      // worker 无 DOM，用纯数据 PixelData；主线程再重建 canvas
      useImageData: true,
    })
    ;(self as unknown as Worker).postMessage({ type: 'done', data: psdToData(psd) })
  } catch (err: any) {
    ;(self as unknown as Worker).postMessage({ type: 'error', message: err?.message || 'PSD 解析失败' })
  }
}
