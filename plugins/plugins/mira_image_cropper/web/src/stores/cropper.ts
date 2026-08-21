import { computed, markRaw, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import type { CropRegion, ExportFormat, MediaInput } from '@/types'
import { fetchAuthorizedImage, mediaSourceUrl, tokenizedUrl } from '@/lib/server'

let uid = 0
const nextId = () => `r${Date.now().toString(36)}_${++uid}`

const HISTORY_LIMIT = 50

/**
 * 单个图片实例：独立的裁切选区、撤销历史与导出设置。
 * 图片本体懒加载（切换到该实例才拉取），加载结果缓存在实例上。
 */
export interface MediaInstance {
  key: string
  name: string
  /** 左侧栏缩略图地址（已鉴权处理） */
  thumbUrl: string
  /** 原图来源：素材库文件（走 download API）或本地文件 blob */
  media?: MediaInput
  localUrl?: string
  loaded: boolean
  loading: boolean
  loadError: string
  width: number
  height: number
  objectUrl: string
  imageEl: HTMLImageElement | null
  // ── 独立裁切数据 ──
  regions: CropRegion[]
  selectedId: string | null
  undoStack: CropRegion[][]
  redoStack: CropRegion[][]
  format: ExportFormat
  quality: number
  prefix: string
}

function createInstance(init: {
  name: string
  thumbUrl: string
  media?: MediaInput
  localUrl?: string
}): MediaInstance {
  return {
    key: `m${Date.now().toString(36)}_${++uid}`,
    name: init.name,
    thumbUrl: init.thumbUrl,
    media: init.media,
    localUrl: init.localUrl,
    loaded: false,
    loading: false,
    loadError: '',
    width: 0,
    height: 0,
    objectUrl: '',
    imageEl: null,
    regions: [],
    selectedId: null,
    undoStack: [],
    redoStack: [],
    format: 'png',
    quality: 0.92,
    prefix: '',
  }
}

/**
 * 裁切状态中心（多实例）：
 *   - instances：所有图片实例（左侧栏缩略图列表），每个实例独立持有选区/历史/导出设置
 *   - activeKey：当前编辑实例，image/regions/selectedId 等均代理到它
 *   - 视图变换（scale/offset）为窗口级共享状态，切图时由 CropStage 重新 fit
 */
export const useCropperStore = defineStore('cropper', () => {
  const order = ref<string[]>([])
  const instances = ref<Record<string, MediaInstance>>({})
  const activeKey = ref('')

  const active = computed<MediaInstance | null>(() => instances.value[activeKey.value] || null)
  const imageEl = shallowRef<HTMLImageElement | null>(null)

  // 视图变换（窗口级共享；切图时 CropStage watch image 后重新 fit）
  const scale = ref(1)
  const offset = ref({ x: 0, y: 0 })
  const fitScale = ref(1)

  const image = computed(() => {
    const inst = active.value
    if (!inst?.loaded || !inst.imageEl) return null
    return { name: inst.name, width: inst.width, height: inst.height, objectUrl: inst.objectUrl }
  })

  // ── 实例管理 ─────────────────────────────────────────
  function addMediaInstance(media: MediaInput): string {
    const inst = createInstance({
      name: media.name,
      thumbUrl: mediaThumbUrl(media),
      media,
    })
    instances.value[inst.key] = inst
    order.value.push(inst.key)
    return inst.key
  }

  function addLocalInstance(file: File): string {
    const objectUrl = URL.createObjectURL(file)
    const inst = createInstance({
      name: file.name,
      thumbUrl: objectUrl,
      localUrl: objectUrl,
    })
    instances.value[inst.key] = inst
    order.value.push(inst.key)
    return inst.key
  }

  function removeInstance(key: string) {
    const inst = instances.value[key]
    if (!inst) return
    if (inst.localUrl) {
      try { URL.revokeObjectURL(inst.localUrl) } catch { /* noop */ }
    }
    if (inst.objectUrl && inst.objectUrl !== inst.localUrl && inst.objectUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(inst.objectUrl) } catch { /* noop */ }
    }
    delete instances.value[key]
    order.value = order.value.filter((k) => k !== key)
    if (activeKey.value === key) {
      activeKey.value = order.value[order.value.length - 1] || ''
      if (activeKey.value) void ensureLoaded(activeKey.value)
    }
  }

  function setActive(key: string) {
    if (!key || !instances.value[key] || key === activeKey.value) return
    activeKey.value = key
    void ensureLoaded(key)
  }

  /** 宿主选中项 → 多实例列表，默认激活第一个 */
  function initFromMediaList(list: MediaInput[]) {
    for (const media of list) addMediaInstance(media)
    if (!activeKey.value && order.value.length) setActive(order.value[0])
  }

  async function addLocalFile(file: File): Promise<string> {
    const key = addLocalInstance(file)
    setActive(key)
    return key
  }

  // ── 图片懒加载 ───────────────────────────────────────
  async function ensureLoaded(key: string) {
    const inst = instances.value[key]
    if (!inst || inst.loaded || inst.loading) return
    inst.loading = true
    inst.loadError = ''
    try {
      let objectUrl: string
      if (inst.localUrl) {
        objectUrl = inst.localUrl
      } else if (inst.media) {
        const source = mediaSourceUrl(inst.media) || inst.media.thumbnailURL
        objectUrl = await fetchAuthorizedImage(source)
      } else {
        throw new Error('图片来源缺失')
      }
      const el = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('图片解码失败'))
        el.src = objectUrl
      })
      inst.imageEl = markRaw(el)
      inst.width = el.naturalWidth
      inst.height = el.naturalHeight
      inst.objectUrl = objectUrl
      inst.prefix = inst.name.replace(/\.[^.]+$/, '') || 'crop'
      inst.loaded = true
    } catch (error) {
      inst.loadError = error instanceof Error ? error.message : String(error)
    } finally {
      inst.loading = false
    }
  }

  // active 实例切换/加载完成 → 同步 imageEl（CropThumb/CropPanel 渲染用）
  watch(active, (inst) => { imageEl.value = inst?.imageEl || null }, { immediate: true })
  // 加载完成不触发 active 引用变化（同一实例对象），单独监听 loaded 标记
  watch(
    () => active.value?.loaded,
    () => { imageEl.value = active.value?.imageEl || null },
  )

  // ── 历史与选区（操作当前实例） ──────────────────────
  const regions = computed(() => active.value?.regions || [])
  const selectedId = computed(() => active.value?.selectedId || null)
  const selectedRegion = computed(() => regions.value.find((r) => r.id === selectedId.value) || null)
  const canUndo = computed(() => (active.value?.undoStack.length || 0) > 0)
  const canRedo = computed(() => (active.value?.redoStack.length || 0) > 0)

  function withActive(action: (inst: MediaInstance) => void) {
    const inst = active.value
    if (inst) action(inst)
  }

  function snapshot(inst: MediaInstance): CropRegion[] {
    return inst.regions.map((r) => ({ ...r }))
  }

  function commitHistory() {
    withActive((inst) => {
      inst.undoStack.push(snapshot(inst))
      if (inst.undoStack.length > HISTORY_LIMIT) inst.undoStack.shift()
      inst.redoStack = []
    })
  }

  function undo() {
    withActive((inst) => {
      const prev = inst.undoStack.pop()
      if (!prev) return
      inst.redoStack.push(snapshot(inst))
      inst.regions = prev
      if (inst.selectedId && !prev.some((r) => r.id === inst.selectedId)) inst.selectedId = null
    })
  }

  function redo() {
    withActive((inst) => {
      const next = inst.redoStack.pop()
      if (!next) return
      inst.undoStack.push(snapshot(inst))
      inst.regions = next
      if (inst.selectedId && !next.some((r) => r.id === inst.selectedId)) inst.selectedId = null
    })
  }

  function select(id: string | null) {
    withActive((inst) => { inst.selectedId = id })
  }

  function addDefaultRegion() {
    const inst = active.value
    if (!inst?.loaded) return
    commitHistory()
    const w = Math.max(16, Math.round(inst.width / 3))
    const h = Math.max(16, Math.round(inst.height / 3))
    const region: CropRegion = {
      id: nextId(),
      x: Math.round((inst.width - w) / 2),
      y: Math.round((inst.height - h) / 2),
      w,
      h,
    }
    inst.regions.push(region)
    inst.selectedId = region.id
  }

  function beginDrawRegion(x: number, y: number): CropRegion {
    const region: CropRegion = { id: nextId(), x, y, w: 0, h: 0 }
    withActive((inst) => {
      commitHistory()
      inst.regions.push(region)
      inst.selectedId = region.id
    })
    return region
  }

  function updateRegion(id: string, patch: Partial<Pick<CropRegion, 'x' | 'y' | 'w' | 'h'>>) {
    withActive((inst) => {
      const region = inst.regions.find((r) => r.id === id)
      if (region) Object.assign(region, patch)
    })
  }

  function discardRegion(id: string) {
    withActive((inst) => {
      inst.regions = inst.regions.filter((r) => r.id !== id)
      inst.undoStack.pop()
      if (inst.selectedId === id) inst.selectedId = null
    })
  }

  function removeRegion(id: string) {
    withActive((inst) => {
      if (!inst.regions.some((r) => r.id === id)) return
      commitHistory()
      inst.regions = inst.regions.filter((r) => r.id !== id)
      if (inst.selectedId === id) inst.selectedId = null
    })
  }

  function removeSelected() {
    if (selectedId.value) removeRegion(selectedId.value)
  }

  function clearRegions() {
    withActive((inst) => {
      if (!inst.regions.length) return
      commitHistory()
      inst.regions = []
      inst.selectedId = null
    })
  }

  // ── 导出设置（每实例独立，v-model 双向） ────────────
  const format = computed<ExportFormat>({
    get: () => active.value?.format || 'png',
    set: (value) => withActive((inst) => { inst.format = value }),
  })
  const quality = computed<number>({
    get: () => active.value?.quality ?? 0.92,
    set: (value) => withActive((inst) => { inst.quality = value }),
  })
  const prefix = computed<string>({
    get: () => active.value?.prefix || '',
    set: (value) => withActive((inst) => { inst.prefix = value }),
  })

  const fileNamePrefix = computed(() => (active.value?.prefix || '').trim() || 'crop')

  function exportFileName(index: number): string {
    const inst = active.value
    const ext = (inst?.format || 'png') === 'jpeg' ? 'jpg' : 'png'
    const base = (inst?.prefix || '').trim() || 'crop'
    return `${base}_crop_${index + 1}.${ext}`
  }

  const loading = computed(() => Boolean(active.value?.loading))
  const loadError = computed(() => active.value?.loadError || '')

  return {
    order, instances, activeKey, active,
    image, imageEl, loading, loadError,
    scale, offset, fitScale,
    regions, selectedId, selectedRegion, canUndo, canRedo,
    format, quality, prefix, fileNamePrefix, exportFileName,
    setActive, addMediaInstance, addLocalFile, removeInstance, initFromMediaList,
    commitHistory, undo, redo,
    select, addDefaultRegion, beginDrawRegion, updateRegion, discardRegion, removeRegion, removeSelected, clearRegions,
  }
})

/** 缩略图直链：素材走 /api/files/thumb（附 token），本地文件用 objectUrl */
function mediaThumbUrl(media: MediaInput): string {
  if (media.id && media.libraryId) {
    return tokenizedUrl(`/api/files/thumb/${encodeURIComponent(media.libraryId)}/${encodeURIComponent(media.id)}`)
  }
  return media.thumbnailURL ? tokenizedUrl(media.thumbnailURL) : ''
}
