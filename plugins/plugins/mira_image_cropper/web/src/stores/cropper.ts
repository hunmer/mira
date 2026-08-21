import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { CropRegion, ExportFormat, MediaInput } from '@/types'
import { fetchAuthorizedImage } from '@/lib/server'

let uid = 0
const nextId = () => `r${Date.now().toString(36)}_${++uid}`

const HISTORY_LIMIT = 50

export interface LoadedImage {
  name: string
  width: number
  height: number
  sourceUrl: string
  objectUrl: string
}

/**
 * 裁切状态中心：
 *   - 图片（element 非响应式持有）+ 多图任务列表切换
 *   - 选区数组（原图像素坐标）与选中态
 *   - 视图变换（scale / offset）供画布与 Header 缩放控件共享
 *   - 撤销/重做（选区快照栈，拖拽交互在 gesture 开始时统一 commit）
 */
export const useCropperStore = defineStore('cropper', () => {
  const imageEl = shallowRef<HTMLImageElement | null>(null)
  const image = shallowRef<LoadedImage | null>(null)
  const loading = ref(false)
  const loadError = ref('')

  const mediaList = ref<MediaInput[]>([])
  const mediaIndex = ref(0)

  const regions = ref<CropRegion[]>([])
  const selectedId = ref<string | null>(null)

  // 视图变换：wrapper translate(offset) + 原图尺寸 × scale
  const scale = ref(1)
  const offset = ref({ x: 0, y: 0 })
  const fitScale = ref(1)

  const undoStack = ref<CropRegion[][]>([])
  const redoStack = ref<CropRegion[][]>([])

  const format = ref<ExportFormat>('png')
  const quality = ref(0.92)
  const prefix = ref('')

  const selectedRegion = computed(() => regions.value.find((r) => r.id === selectedId.value) || null)

  // ── 历史 ─────────────────────────────────────────────
  function snapshot(): CropRegion[] {
    return regions.value.map((r) => ({ ...r }))
  }

  /** gesture（新建/移动/缩放/删除/清空）开始前调用一次 */
  function commitHistory() {
    undoStack.value.push(snapshot())
    if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    const prev = undoStack.value.pop()
    if (!prev) return
    redoStack.value.push(snapshot())
    regions.value = prev
    if (selectedId.value && !prev.some((r) => r.id === selectedId.value)) selectedId.value = null
  }

  function redo() {
    const next = redoStack.value.pop()
    if (!next) return
    undoStack.value.push(snapshot())
    regions.value = next
    if (selectedId.value && !next.some((r) => r.id === selectedId.value)) selectedId.value = null
  }

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  // ── 选区操作 ─────────────────────────────────────────
  function select(id: string | null) {
    selectedId.value = id
  }

  /** 居中添加一个默认 1/3 尺寸的选区（右侧「+ 添加选区」） */
  function addDefaultRegion() {
    const img = image.value
    if (!img) return
    commitHistory()
    const w = Math.max(16, Math.round(img.width / 3))
    const h = Math.max(16, Math.round(img.height / 3))
    const region: CropRegion = {
      id: nextId(),
      x: Math.round((img.width - w) / 2),
      y: Math.round((img.height - h) / 2),
      w,
      h,
    }
    regions.value.push(region)
    selectedId.value = region.id
  }

  /** 拖拽新建：gesture 开始先 push 一个占位选区，move 中原地更新 */
  function beginDrawRegion(x: number, y: number): CropRegion {
    commitHistory()
    const region: CropRegion = { id: nextId(), x, y, w: 0, h: 0 }
    regions.value.push(region)
    selectedId.value = region.id
    return region
  }

  /** 拖拽中的连续更新（不记历史，历史在 gesture 开始时已 commit） */
  function updateRegion(id: string, patch: Partial<Pick<CropRegion, 'x' | 'y' | 'w' | 'h'>>) {
    const region = regions.value.find((r) => r.id === id)
    if (region) Object.assign(region, patch)
  }

  /** 新建拖拽结果太小 → 丢弃（连同占位历史） */
  function discardRegion(id: string) {
    regions.value = regions.value.filter((r) => r.id !== id)
    undoStack.value.pop()
    if (selectedId.value === id) selectedId.value = null
  }

  function removeRegion(id: string) {
    if (!regions.value.some((r) => r.id === id)) return
    commitHistory()
    regions.value = regions.value.filter((r) => r.id !== id)
    if (selectedId.value === id) selectedId.value = null
  }

  function removeSelected() {
    if (selectedId.value) removeRegion(selectedId.value)
  }

  function clearRegions() {
    if (!regions.value.length) return
    commitHistory()
    regions.value = []
    selectedId.value = null
  }

  // ── 图片加载 ─────────────────────────────────────────
  async function loadFromMedia(media: MediaInput) {
    const source = media.url || media.thumbnailURL
    if (!source) {
      loadError.value = `素材 ${media.name} 没有可用的原图地址`
      return
    }
    await loadFromUrl(await fetchAuthorizedImage(source), media.name)
  }

  async function loadFromUrl(objectUrl: string, name: string) {
    loading.value = true
    loadError.value = ''
    try {
      const el = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('图片解码失败'))
        el.src = objectUrl
      })
      if (image.value?.objectUrl && image.value.objectUrl !== objectUrl) {
        try { URL.revokeObjectURL(image.value.objectUrl) } catch { /* noop */ }
      }
      imageEl.value = el
      image.value = { name, width: el.naturalWidth, height: el.naturalHeight, sourceUrl: objectUrl, objectUrl }
      regions.value = []
      selectedId.value = null
      undoStack.value = []
      redoStack.value = []
      prefix.value = name.replace(/\.[^.]+$/, '') || 'crop'
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function loadFromFile(file: File) {
    if (!file.type.startsWith('image/')) {
      loadError.value = `不支持的文件类型: ${file.type || file.name}`
      return
    }
    await loadFromUrl(URL.createObjectURL(file), file.name)
  }

  /** 宿主选中项 → 多图任务列表，默认载入第一张 */
  async function initFromMediaList(list: MediaInput[]) {
    mediaList.value = list
    mediaIndex.value = 0
    if (list.length) await loadFromMedia(list[0])
  }

  async function switchMedia(index: number) {
    if (index < 0 || index >= mediaList.value.length || index === mediaIndex.value) return
    mediaIndex.value = index
    await loadFromMedia(mediaList.value[index])
  }

  const fileNamePrefix = computed(() => prefix.value.trim() || 'crop')

  function exportFileName(index: number): string {
    return `${fileNamePrefix.value}_crop_${index + 1}.${format.value === 'jpeg' ? 'jpg' : 'png'}`
  }

  return {
    imageEl, image, loading, loadError,
    mediaList, mediaIndex,
    regions, selectedId, selectedRegion,
    scale, offset, fitScale,
    undoStack, redoStack, canUndo, canRedo,
    format, quality, prefix, fileNamePrefix,
    commitHistory, undo, redo,
    select, addDefaultRegion, beginDrawRegion, updateRegion, discardRegion, removeRegion, removeSelected, clearRegions,
    loadFromFile, loadFromUrl, initFromMediaList, switchMedia,
    exportFileName,
  }
})
