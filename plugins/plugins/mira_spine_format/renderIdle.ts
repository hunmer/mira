/**
 * spine-canvaskit 无头渲染：把 .skel 的指定动画首帧渲染为 PNG。
 *
 * 基于 spine-ts/spine-canvaskit/example/headless.js（官方示例）。
 * 仅支持 Spine 4.2+（spine-canvaskit npm 包无 3.8 版本）。
 *
 * 关键点：
 *  - spine-canvaskit / canvaskit-wasm 为 ESM，CommonJS 插件用动态 import() 加载。
 *  - Node 下 CanvasKitInit 需 locateFile 定位 canvaskit.wasm。
 *  - 渲染单帧后用 surface.makeImageSnapshot().encodeToBytes() 导出 PNG。
 */
import fs from 'fs';
import path from 'path';

export interface RenderOptions {
  /** 优先动画名（找不到则首个动画） */
  animation?: string;
  width?: number;
  height?: number;
  /** 背景色（十六进制，如 #eef0f3） */
  background?: string;
  /** 超时（ms） */
  timeoutMs?: number;
}

/** 按超时包裹 Promise */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} 超时 (${ms}ms)`)), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

/**
 * 渲染 .skel/.json 指定动画首帧到 destPath（PNG）。
 * @param srcPath .skel 或 .json 骨架文件路径
 * @param atlasPath .atlas 文件路径（其引用的 png 由 loadTextureAtlas 自动加载，需与 atlas 同目录）
 * @param destPath 输出 PNG 路径
 */
export async function renderIdleFrame(
  srcPath: string,
  atlasPath: string,
  destPath: string,
  opts: RenderOptions = {},
): Promise<void> {
  const animation = opts.animation || 'idle'
  const width = opts.width || 512
  const height = opts.height || 512
  const background = opts.background || '#eef0f3'
  const timeoutMs = opts.timeoutMs || 60000

  const atlasDir = path.dirname(atlasPath)
  // readFile 回调：loadTextureAtlas 传来的可能是相对 atlas 目录的文件名（如 spineboy.png），
  // 也可能是绝对/原始路径。先试原路径，失败再拼 atlas 目录。
  const readFile = (p: string) => {
    try {
      return fs.readFileSync(p)
    } catch {
      return fs.readFileSync(path.join(atlasDir, p))
    }
  }

  // 动态加载 ESM 依赖（spine-canvaskit / canvaskit-wasm）
  // 注意：canvaskit 的 JS glue 与 wasm 必须同一版本（默认 bin/ 与 full/ 不能混用），
  // 否则 wasm 表索引不匹配（WebAssembly.Table invalid index）。
  // @ts-ignore - canvaskit-wasm/full 子路径导出需 node16+ moduleResolution
  const CanvasKitInitModule: any = await import('canvaskit-wasm/full')
  const CanvasKitInit: any = CanvasKitInitModule.default || CanvasKitInitModule
  const spine: any = await import('@esotericsoftware/spine-canvaskit')
  const { loadTextureAtlas, loadSkeletonData, SkeletonDrawable, SkeletonRenderer } = spine

  // Node 下定位 canvaskit.wasm（与上方 JS 同为 full 版）
  const wasmPath = require.resolve('canvaskit-wasm/bin/full/canvaskit.wasm')
  const ck: any = await withTimeout(CanvasKitInit({ locateFile: () => wasmPath }), timeoutMs, 'CanvasKitInit')

  const surface = ck.MakeSurface(width, height)
  if (!surface) throw new Error('CanvasKit MakeSurface 失败')

  try {
    const atlas = await loadTextureAtlas(ck, atlasPath, (p: string) => Promise.resolve(readFile(p)))
    const skeletonData = await loadSkeletonData(srcPath, atlas, (p: string) => Promise.resolve(readFile(p)))

    const drawable = new SkeletonDrawable(skeletonData)
    const skel = drawable.skeleton

    // 选动画：优先 idle，否则首个
    const animNames = skeletonData.animations.map((a: any) => a.name)
    const target = animNames.includes(animation) ? animation : animNames[0]
    if (!target) throw new Error('骨架无动画')
    drawable.animationState.setAnimation(0, target, true)

    // 适配画布：让角色居中
    skel.x = width / 2
    skel.y = height * 0.85
    // 先 update 一次让 skeleton 计算 bounds，再按 bounds 缩放
    drawable.update(0)

    // bounds 适配缩放
    const bounds = computeBounds(ck, skel, width, height)
    skel.scaleX = bounds.scale
    skel.scaleY = bounds.scale
    // 缩放后重新 update 让 bounds 生效
    drawable.update(0)

    const renderer = new SkeletonRenderer(ck)
    const canvas = surface.getCanvas()
    canvas.clear(parseColor(ck, background))
    renderer.render(canvas, drawable)

    const image = surface.makeImageSnapshot()
    const pngBytes = image.encodeToBytes()
    if (!pngBytes || pngBytes.length === 0) throw new Error('PNG 编码为空')
    fs.writeFileSync(destPath, Buffer.from(pngBytes))
  } finally {
    surface.dispose?.()
    ck.Dispose?.()
  }
}

/** 解析十六进制颜色为 CanvasKit Color */
function parseColor(ck: any, hex: string): any {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return ck.WHITE
  const v = parseInt(m[1], 16)
  const r = ((v >> 16) & 0xff) / 255
  const g = ((v >> 8) & 0xff) / 255
  const b = (v & 0xff) / 255
  return ck.Color(r, g, b, 1)
}

/**
 * 计算 skeleton 在画布中的适配缩放。
 * pixi-spine 的 skeleton 有 getBounds();spine-canvaskit 4.2 同样。
 */
function computeBounds(_ck: any, skel: any, width: number, height: number): { scale: number } {
  let scale = 0.8
  try {
    const b = skel.getBounds?.() // [x, y, w, h]
    if (b && b.length >= 4 && b[2] > 0 && b[3] > 0) {
      const pad = 40
      scale = Math.min((width - pad * 2) / b[2], (height - pad * 2) / b[3])
      if (!Number.isFinite(scale) || scale <= 0) scale = 0.8
      scale = Math.min(scale, 3)
    }
  } catch {
    /* ignore, use default scale */
  }
  return { scale }
}
