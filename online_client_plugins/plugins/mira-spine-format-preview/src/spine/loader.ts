/**
 * Spine 4.2 资源加载器。
 *
 * 从 game-asset-canvas 的 SpineLoader.js 移植，删除 4.2 路由分支：
 *   - 去除 loadSpine42Runtime / useSpine42 / SpineTexture / Physics 相关逻辑
 *   - 保留 SkeletonBinary（.skel 二进制）+ SkeletonJson（.json）双格式
 *   - 保留 loadSpine / getAnimations / getSkins / getBoneTree / BoneVisibility
 *
 * 使用官方 Spine 4.2 runtime，兼容 Spine 4.2.x 资源。
 *
 * 输入支持 dataUrl 或原文；这里 dist 运行在浏览器，资源经 fetch 拿到后传入。
 */
import { PIXI, getSpineRuntime, updateWorldTransform } from './runtime'

export interface SpineInput {
  /** .skel 二进制（ArrayBuffer/Uint8Array）或 .json 文本 */
  skel: ArrayBuffer | Uint8Array | string
  /** .atlas 文本 */
  atlas: string
  /** .png 贴图（dataUrl 或 URL） */
  png: string
  /** 资源名（仅日志） */
  name?: string
}

/** 把 base64 dataUrl 转 ArrayBuffer（用于 .skel 二进制解析） */
async function dataUrlToArrayBuffer(dataUrl: string): Promise<Uint8Array> {
  const resp = await fetch(dataUrl)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

function waitForTexture(baseTexture: any): Promise<void> {
  if (baseTexture.valid) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>
    const poll = setInterval(() => {
      if (baseTexture.valid) {
        cleanup()
        resolve()
      }
    }, 16)
    const cleanup = () => {
      clearTimeout(timer)
      clearInterval(poll)
      baseTexture.off?.('loaded', onLoaded)
      baseTexture.off?.('error', onError)
    }
    const onLoaded = () => { cleanup(); resolve() }
    const onError = (error: unknown) => {
      cleanup()
      reject(new Error(`Spine 贴图加载失败: ${error instanceof Error ? error.message : String(error)}`))
    }
    baseTexture.once?.('loaded', onLoaded)
    baseTexture.once?.('error', onError)
    timer = setTimeout(() => {
      cleanup()
      reject(new Error('Spine 贴图加载超时'))
    }, 30000)
  })
}

/**
 * 加载 Spine 资源并构造 Spine 实例（window.spine.Spine）。
 * @throws 解析失败 / 无骨骼
 */
export async function loadSpine({ skel, atlas, png, name = 'spine' }: SpineInput): Promise<any> {
  // 1. 准备骨架数据：判定是二进制 .skel 还是文本 .json
  let skelBytes: Uint8Array | string
  let isJson = false

  if (skel instanceof ArrayBuffer || skel instanceof Uint8Array) {
    skelBytes = skel instanceof Uint8Array ? skel : new Uint8Array(skel)
  } else if (typeof skel === 'string') {
    const trimmed = skel.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // JSON 骨架
      isJson = true
      skelBytes = trimmed
    } else if (trimmed.startsWith('data:')) {
      // dataUrl：可能是 .skel 或 .json
      const resp = await fetch(trimmed)
      const text = await resp.text()
      const t = text.trim()
      if (t.startsWith('{') || t.startsWith('[')) {
        isJson = true
        skelBytes = t
      } else {
        skelBytes = await dataUrlToArrayBuffer(trimmed)
      }
    } else {
      throw new Error('无法识别的骨架数据格式')
    }
  } else {
    throw new Error('骨架数据格式不支持')
  }

  const { Spine, SkeletonBinary, SkeletonJson, TextureAtlas, AtlasAttachmentLoader, SpineTexture } = getSpineRuntime()

  // 2. 加载贴图（PIXI.BaseTexture.from 兼容 dataUrl 与 URL）
  const baseTexture = PIXI.BaseTexture.from(png)
  await waitForTexture(baseTexture)

  // 3. 解析 atlas，再把 SpineTexture 显式绑定到每个 page。
  const spineTexture = SpineTexture.from(baseTexture)
  const spineAtlas = new TextureAtlas(atlas)
  for (const page of spineAtlas.pages) page.setTexture(spineTexture)
  const attachmentLoader = new AtlasAttachmentLoader(spineAtlas)

  // 4. 解析骨架
  let spineData: any
  if (isJson) {
    const jsonParser = new SkeletonJson(attachmentLoader)
    spineData = jsonParser.readSkeletonData(skelBytes as string)
  } else {
    const binaryParser = new SkeletonBinary(attachmentLoader)
    spineData = binaryParser.readSkeletonData(skelBytes as Uint8Array)
  }

  if (!spineData || !spineData.bones || spineData.bones.length === 0) {
    throw new Error('Spine 解析失败：无骨骼数据')
  }

  // 5. 构造 Spine 实例，关闭内部 ticker，沿用宿主渲染循环
  const spine = new Spine({ skeletonData: spineData, autoUpdate: false })
  spine.name = name
  if (!spine.spineData) spine.spineData = spineData
  const updateWorldTransformNative = spine.skeleton.updateWorldTransform.bind(spine.skeleton)
  spine.skeleton.updateWorldTransform = (physics = getSpineRuntime().Physics.update) =>
    updateWorldTransformNative(physics)

  // 记录版本（UI 提示用）
  spine._spineVersion = spineData.version || 'unknown'

  return spine
}

/** 动画列表 */
export function getAnimations(spine: any): string[] {
  if (!spine?.spineData?.animations) return []
  return spine.spineData.animations.map((a: any) => a.name)
}

/** 皮肤列表 */
export function getSkins(spine: any): string[] {
  if (!spine?.spineData?.skins) return []
  return spine.spineData.skins.map((s: any) => s.name)
}

/** 骨骼层级树节点 */
export interface BoneNode {
  bone: any
  index: number
  depth: number
  children: BoneNode[]
}

/** 获取骨骼层级树（root 在顶层） */
export function getBoneTree(spine: any): BoneNode[] {
  if (!spine?.skeleton?.bones) return []
  const all = spine.skeleton.bones as any[]
  const byIndex = new Map<number, BoneNode>()
  all.forEach((b, i) => byIndex.set(i, { bone: b, index: i, depth: 0, children: [] }))
  const roots: BoneNode[] = []
  for (const node of byIndex.values()) {
    const parent = node.bone.parent
    if (parent) {
      let parentIdx = -1
      for (const [idx, n] of byIndex) {
        if (n.bone === parent) {
          parentIdx = idx
          break
        }
      }
      if (parentIdx >= 0) {
        const parentNode = byIndex.get(parentIdx)!
        node.depth = parentNode.depth + 1
        parentNode.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }
  return roots
}

/**
 * 骨骼显隐管理。
 *
 * Spine 的 Bone 是变换节点，不直接绘制；绘制的是绑定到骨骼的 slot.attachment（mesh）。
 * 隐藏一根骨骼 = 把绑定到该骨骼（及其子孙）的 slot 的 attachment 临时置 null，
 * 恢复时从缓存还原。
 */
export class BoneVisibility {
  /** 已隐藏的骨骼名（含用户显式隐藏的根） */
  hidden = new Set<string>()
  /** boneName -> [{slot, attachment}] */
  saved = new Map<string, Array<{ slot: any; attachment: any }>>()

  /** 收集某骨骼及其所有子孙 */
  private collectBones(bone: any, acc: any[] = []): any[] {
    acc.push(bone)
    for (const child of bone.children || []) this.collectBones(child, acc)
    return acc
  }

  /** 隐藏一根骨骼（及其子级）相关的所有 slot attachment */
  hide(spine: any, bone: any) {
    if (!spine?.skeleton || !bone) return
    const name = bone.data.name
    if (this.hidden.has(name)) return
    this.hidden.add(name)
    const bones = this.collectBones(bone)
    const boneSet = new Set(bones)
    const savedSlots: Array<{ slot: any; attachment: any }> = []
    for (const slot of spine.skeleton.slots) {
      if (boneSet.has(slot.bone) && slot.attachment) {
        savedSlots.push({ slot, attachment: slot.attachment })
        slot.setAttachment(null)
      }
    }
    this.saved.set(name, savedSlots)
    updateWorldTransform(spine.skeleton)
  }

  /** 显示一根骨骼（及其子级）相关的所有 slot attachment */
  show(spine: any, bone: any) {
    if (!spine?.skeleton || !bone) return
    const name = bone.data.name
    if (!this.hidden.has(name)) return
    this.hidden.delete(name)
    const savedSlots = this.saved.get(name) || []
    for (const { slot, attachment } of savedSlots) slot.setAttachment(attachment)
    this.saved.delete(name)
    updateWorldTransform(spine.skeleton)
  }

  /** 切换显隐 */
  toggle(spine: any, bone: any) {
    if (this.hidden.has(bone.data.name)) this.show(spine, bone)
    else this.hide(spine, bone)
  }

  /** 某骨骼是否已隐藏（含被祖先隐藏的间接情况） */
  isHidden(bone: any): boolean {
    let cur = bone
    while (cur) {
      if (this.hidden.has(cur.data.name)) return true
      cur = cur.parent
    }
    return false
  }

  /** 重置所有显隐 */
  reset(spine: any) {
    for (const name of this.hidden) {
      const savedSlots = this.saved.get(name) || []
      for (const { slot, attachment } of savedSlots) slot.setAttachment(attachment)
    }
    this.hidden.clear()
    this.saved.clear()
    updateWorldTransform(spine?.skeleton)
  }
}
