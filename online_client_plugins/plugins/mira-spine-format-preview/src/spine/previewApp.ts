/**
 * SpinePreviewApp：Spine 展示节点的轻量 PIXI 渲染封装（仅 3.8）。
 *
 * 从 game-asset-canvas 的 SpinePreviewApp.js 移植：
 *   init / setSpine / setAnimation / setSkin / setPlaybackSpeed / play|pause / _onTick / fitView / destroy
 *
 * 与原版的差异：
 *   - 默认动画优先选 idle（原版选 stand2）
 *   - 用 TS 类型（PIXI/spine 为 any）
 *   - fitView 内联（不依赖 ViewUtils.calculateFitTransform）
 */
import { PIXI } from './runtime'

/** 把 spine bounds 适配进画布的缩放/平移 */
function calculateFitTransform(
  bounds: any,
  screen: any,
  opts: { padding?: number; minScale?: number; maxScale?: number } = {},
): { scale: number; x: number; y: number } | null {
  const padding = Math.max(0, Number(opts.padding) || 0)
  const minScale = Math.max(0.01, Number(opts.minScale) || 0.1)
  const maxScale = Math.max(minScale, Number(opts.maxScale) || 2)
  const width = Number(bounds?.width)
  const height = Number(bounds?.height)
  const sw = Number(screen?.width)
  const sh = Number(screen?.height)
  if (![width, height, sw, sh].every(Number.isFinite) || width <= 0 || height <= 0 || sw <= 0 || sh <= 0) return null
  const availW = Math.max(1, sw - padding * 2)
  const availH = Math.max(1, sh - padding * 2)
  const scale = Math.max(minScale, Math.min(availW / width, availH / height, maxScale))
  const cx = Number(bounds.x || 0) + width / 2
  const cy = Number(bounds.y || 0) + height / 2
  return { scale, x: sw / 2 - cx * scale, y: sh / 2 - cy * scale }
}

export class SpinePreviewApp {
  /** PIXI 创建并挂载的真实 canvas（app.view） */
  canvasElement: HTMLCanvasElement | null = null
  app: any = null
  spine: any = null
  spineContainer: any = null

  playing = true
  currentAnimation: string | null = null
  currentSkin: string | null = null
  playbackSpeed = 1

  private viewScale = 1
  private viewX = 0
  private viewY = 0
  private tickerBound: (() => void) | null = null

  constructor(public container: HTMLElement) {}

  /** 初始化 PIXI Application（自建 canvas，不接收外部 view） */
  async init() {
    const rect = this.container.getBoundingClientRect()
    const initWidth = Math.max(1, Math.floor(rect.width) || 300)
    const initHeight = Math.max(1, Math.floor(rect.height) || 180)
    this.app = new PIXI.Application({
      width: initWidth,
      height: initHeight,
      background: '#eef0f3',
      antialias: true,
      preserveDrawingBuffer: true, // 截图需要
      resizeTo: this.container,
    })
    this.canvasElement = this.app.view as HTMLCanvasElement
    this.canvasElement.classList.add('spine-canvas')
    this.canvasElement.style.width = '100%'
    this.canvasElement.style.height = '100%'
    this.canvasElement.style.display = 'block'
    this.container.appendChild(this.canvasElement)

    this.spineContainer = new PIXI.Container()
    this.app.stage.addChild(this.spineContainer)

    this.tickerBound = () => this.onTick()
    this.app.ticker.add(this.tickerBound)
  }

  private applyView() {
    if (!this.spineContainer) return
    this.spineContainer.scale.set(this.viewScale)
    this.spineContainer.position.set(this.viewX, this.viewY)
  }

  /** 把 spine 居中适配画布 */
  fitView() {
    if (!this.spine) return
    this.viewScale = 1
    this.viewX = 0
    this.viewY = 0
    this.applyView()
    this.spineContainer.updateTransform()
    const bounds = this.spine.getBounds()
    const transform = calculateFitTransform(bounds, this.app.screen, {
      padding: 40,
      minScale: 0.1,
      maxScale: 5,
    })
    if (!transform) return
    this.viewScale = transform.scale
    this.viewX = transform.x
    this.viewY = transform.y
    this.applyView()
  }

  /** 加载 Spine 实例并放入容器；默认选 idle 动画 */
  setSpine(spine: any) {
    if (this.spine) {
      this.spineContainer.removeChild(this.spine)
      this.spine.destroy()
    }
    this.spine = spine
    try {
      this.spineContainer.addChild(spine)
      spine.state.timeScale = this.playbackSpeed
      // 先更新一次计算 mesh 顶点 + bounds，否则 fitView 拿到空 bounds
      spine.skeleton.setToSetupPose()
      spine.update(0)
      this.app.render()
      this.spineContainer.updateTransform()
    } catch (err) {
      console.error('[SpinePreview.setSpine] FAILED', err)
      try {
        this.spineContainer.removeChild(spine)
      } catch {
        /* ignore */
      }
      this.spine = null
      throw err
    }

    // 默认选 idle 动画（优先），否则第一个
    const anims = spine.spineData.animations
    if (anims && anims.length) {
      const idle = anims.find((a: any) => a.name === 'idle')
      this.currentAnimation = idle ? idle.name : anims[0].name
    }

    this.viewScale = 1
    this.viewX = 0
    this.viewY = 0
    this.applyView()
    this.fitView()
  }

  setAnimation(name: string) {
    this.currentAnimation = name
    if (this.playing && this.spine && name) {
      this.spine.state.setAnimation(0, name, true)
    }
  }

  setPlaying(playing: boolean) {
    this.playing = playing
    if (!this.spine) return
    if (playing) {
      if (this.currentAnimation) this.spine.state.setAnimation(0, this.currentAnimation, true)
    } else {
      this.spine.state.clearTracks()
    }
  }

  setPlaybackSpeed(speed: number) {
    if (!Number.isFinite(speed) || speed <= 0) return
    this.playbackSpeed = speed
    if (this.spine?.state) this.spine.state.timeScale = speed
  }

  setSkin(name: string) {
    this.currentSkin = name
    if (!this.spine) return
    this.spine.skeleton.setSkinByName(name)
    this.spine.skeleton.setSlotsToSetupPose()
    this.spine.skeleton.updateWorldTransform()
  }

  /** 渲染循环：playing 时推进动画 state */
  private onTick() {
    const dt = this.app.ticker.deltaMS / 1000
    if (this.spine) {
      if (this.playing) this.spine.update(dt)
      else this.spine.skeleton.updateWorldTransform()
      this.spineContainer.updateTransform()
    }
  }

  destroy() {
    if (this.tickerBound) this.app?.ticker.remove(this.tickerBound)
    this.app?.destroy(true)
    this.app = null
    this.spine = null
    this.spineContainer = null
    this.canvasElement = null
    this.tickerBound = null
  }
}
