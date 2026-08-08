/**
 * Spine 本地运行时访问层（4.2）。
 *
 * 与参考项目 game-asset-canvas 的 runtime.js 不同：
 * 这里 vendor（pixi-7.3.3 + Spine 4.2）已通过 index.html 的 <script> 标签加载，
 * window.PIXI / window.spine 在应用启动前就绪，无需 fetch + eval。
 *
 * 官方 Spine 4.2 runtime 负责解析 4.2.x 骨架。
 */

/** 同步获取 PIXI 全局对象（UMD 注入） */
export function getPIXI(): any {
  const pixi = (window as any).PIXI
  if (!pixi) throw new Error('PIXI 运行时尚未加载（vendor/pixi 脚本未注入）')
  return pixi
}

/** 同步获取官方 Spine 4.2 Pixi runtime（window.spine） */
export function getSpineRuntime(): any {
  const spine = (window as any).spine
  if (!spine?.Spine || !spine?.SkeletonBinary) {
    throw new Error('Spine 4.2 运行时尚未加载（vendor/spine-pixi 脚本未注入）')
  }
  return spine
}

/** Spine 4.2 要求显式指定物理更新模式；预览器不启用物理模拟。 */
export function updateWorldTransform(skeleton: any): void {
  if (!skeleton) return
  skeleton.updateWorldTransform(getSpineRuntime().Physics.none)
}

/** 等待 vendor 脚本就绪（index.html 同步加载，通常首帧即就绪） */
export async function ensureRuntime(): Promise<void> {
  // UMD 已同步执行，轮询几帧兜底（理论 0 次循环）
  for (let i = 0; i < 60; i++) {
    if ((window as any).spine?.Spine) return
    await new Promise((r) => requestAnimationFrame(() => r(undefined)))
  }
  throw new Error('等待 Spine 运行时超时')
}

/** PIXI 代理：像直接引用 PIXI 一样使用，未就绪时抛错 */
export const PIXI: any = new Proxy(
  {},
  {
    get(_t, key) {
      return getPIXI()[key]
    },
  },
)
