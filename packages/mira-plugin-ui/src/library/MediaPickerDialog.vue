<script setup lang="ts">
/**
 * 「从素材库选择媒体」通用对话框：Dialog 壳 + MediaBrowser(多选) + SDK 直连。
 *
 * 目标是让插件宿主用最少代码实现素材库选图:
 *   <MediaPickerDialog v-model:open="open" @confirm="files => ..." />
 * 连接自动解析(组件 props server/token → 窗口 query → 主窗口共享 localStorage,
 * 见 serverAuth.ts);素材库切换/列表/缩略图/宽高全部内置,确认抛 MediaPickerFile[]
 * (原图 + 缩略图直链)。
 *
 * 需要自定义时:resolveUrls 覆盖直链拼接;title/confirmText 等覆盖文案。
 * 样式走 shadcn token;组件经 'mira-plugin-ui/library' 源码消费。
 */
import { ref, watch } from 'vue'
import { MiraClient } from 'mira-app-core/shared/sdk'
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import MediaBrowser from './MediaBrowser.vue'
import { toApiFilters } from './filterBar'
import { resolveMiraServerConfig } from './serverAuth'
import type { MediaBrowserItem, MediaBrowserServices, MediaPickerFile, MediaPickerUrls } from './types'

interface Library { id: string | number; name?: string; title?: string }

const props = withDefaults(defineProps<{
  /** server 根地址;缺省自动解析(query → localStorage) */
  server?: string
  /** 登录 token;缺省自动解析 */
  token?: string
  /** 初始素材库 id(缺省上次选择/首个库) */
  initialLibraryId?: string
  /** 选择模式:multiple=多选(框选/Ctrl/Shift/全选);single=单选(点击替换,再点取消)。缺省 multiple */
  selectMode?: 'single' | 'multiple'
  /** 素材库选择的 localStorage 记忆 key */
  storageKey?: string
  title?: string
  confirmText?: string
  cancelText?: string
  /** 已选计数文案({n} 占位) */
  selectedCountText?: string
  /** 缺少 server/token 时的提示 */
  missingAuthText?: string
  /** 加载素材库列表失败文案({error} 占位) */
  loadFailedText?: string
  /** 加载素材库列表文案 */
  loadingText?: string
  /** 暂无素材库文案 */
  noLibraryText?: string
  /** 文件直链解析;缺省用 server REST 直链(token 拼 query) */
  resolveUrls?: (libraryId: string, item: MediaBrowserItem) => MediaPickerUrls
}>(), {
  server: '',
  token: '',
  initialLibraryId: '',
  storageKey: 'mira-plugin-ui:picker-library',
  title: '从素材库添加',
  confirmText: '添加',
  cancelText: '取消',
  selectedCountText: '已选 {n} 项（可框选/按住 Ctrl 多选）',
  missingAuthText: '缺少服务器连接信息（server/token）',
  loadFailedText: '素材库加载失败：{error}',
  loadingText: '正在加载素材库…',
  noLibraryText: '暂无素材库',
})

const emit = defineEmits<{
  /** 确认添加(文件直链 + 宽高) */
  (event: 'confirm', files: MediaPickerFile[]): void
  /** 连接/加载失败(组件内已展示,宿主可追加提示) */
  (event: 'error', message: string): void
}>()

/** 对话框开关(v-model:open) */
const open = defineModel<boolean>('open', { default: false })
/** 当前素材库 id(v-model:library-id 可受控;内置 LibrarySelect 切换) */
const currentLibraryId = defineModel<string>('libraryId', { default: '' })

const libraries = ref<Library[]>([])
const selected = ref<MediaBrowserItem[]>([])
const error = ref('')
const loading = ref(false)

let client: MiraClient | null = null
let serverUrl = ''
let token = ''

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return
    selected.value = []
    if (client) return
    const config = resolveMiraServerConfig({ server: props.server, token: props.token })
    serverUrl = config.server
    token = config.token
    if (!serverUrl || !token) {
      error.value = props.missingAuthText
      emit('error', error.value)
      return
    }
    client = new MiraClient(serverUrl)
    client.setToken(token)
    error.value = ''
    loading.value = true
    try {
      libraries.value = ((await client.libraries().getAll()) as any[]) || []
      const saved = localStorage.getItem(props.storageKey)
      currentLibraryId.value = libraries.value.some((lib) => String(lib.id) === saved)
        ? saved!
        : (props.initialLibraryId || String(libraries.value[0]?.id || ''))
    } catch (e) {
      error.value = props.loadFailedText.replace('{error}', (e as Error)?.message || String(e))
      emit('error', error.value)
    } finally {
      loading.value = false
    }
  },
)

// 切库(MediaBrowser 内置 LibrarySelect):记忆选择并清空已选(跨库选择无意义)
watch(currentLibraryId, (id) => {
  if (id) localStorage.setItem(props.storageKey, id)
  selected.value = []
})

/** 缺省直链:server REST 原图/缩略图,token 拼 query */
function defaultResolveUrls(libraryId: string, item: MediaBrowserItem): MediaPickerUrls {
  const query = `token=${encodeURIComponent(token)}`
  return {
    url: `${serverUrl}/api/files/file/${libraryId}/${item.id}?${query}`,
    thumbUrl: `${serverUrl}/api/files/thumb/${libraryId}/${item.id}?${query}`,
  }
}

// MediaBrowser 数据服务:列表/树走 SDK,缩略图与宽高走 REST 直链
const services: MediaBrowserServices = {
  async listFolders() {
    if (!client) return []
    const rows = ((await client.folders().getAll(currentLibraryId.value)) as any[]) || []
    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? r.name,
      parent_id: typeof r.parent_id === 'number' ? r.parent_id : undefined,
      color: r.color,
    }))
  },
  async listTags() {
    if (!client) return []
    const rows = ((await client.tags().getAll(currentLibraryId.value)) as any[]) || []
    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? r.name,
      parent_id: typeof r.parent_id === 'number' ? r.parent_id : undefined,
      color: r.color,
    }))
  },
  async listFiles(filters) {
    if (!client) throw new Error(props.missingAuthText)
    const ret: any = await client.files().getFiles({
      libraryId: currentLibraryId.value,
      filters: { ...toApiFilters(filters ?? {}), limit: 200 } as any,
    })
    const rows: any[] = Array.isArray(ret) ? ret : (ret?.result ?? [])
    const items: MediaBrowserItem[] = rows.map((r) => {
      const name = r.title ?? r.name ?? ''
      return {
        id: r.id,
        title: name,
        size: r.size,
        extension: name.includes('.') ? name.split('.').pop()!.toLowerCase() : '',
        imported_at: r.imported_at,
        thumbnail_path: r.thumb ? 'generated' : undefined,
      }
    })
    return { items, total: Array.isArray(ret) ? items.length : (ret?.total ?? items.length) }
  },
  getThumbUrl(item) {
    if (!item.thumbnail_path) return undefined
    return (props.resolveUrls ?? defaultResolveUrls)(currentLibraryId.value, item).thumbUrl
  },
  async getMetadataByIds(ids) {
    if (!client) return []
    return client.files().getMetadataByIds(currentLibraryId.value, ids)
  },
}

/** 图片扩展名(无扩展名视为图片:素材库以图片为主) */
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic', 'heif', 'ico', 'tiff']

function isImageItem(item: MediaBrowserItem): boolean {
  return !item.extension || IMAGE_EXTS.includes(item.extension.toLowerCase())
}

function close() {
  open.value = false
}

async function confirmAdd() {
  if (!selected.value.length || !client) return
  // 拉选中项宽高(宿主展示/裁剪用),失败按 0 兜底不阻断确认
  let metas: any[] = []
  try {
    metas = (await client.files().getMetadataByIds(
      currentLibraryId.value,
      selected.value.map((item) => item.id),
    ) as any[]) || []
  } catch {
    // metadata 不可用时宽高置 0
  }
  const sizeOf = (id: string | number) => {
    const meta = metas.find((m) => String(m.id) === String(id))
    return { width: Number(meta?.width) || 0, height: Number(meta?.height) || 0 }
  }
  const resolve = props.resolveUrls ?? defaultResolveUrls
  emit(
    'confirm',
    selected.value.map((item) => ({
      id: item.id,
      name: item.title,
      isImage: isImageItem(item),
      ...sizeOf(item.id),
      ...resolve(currentLibraryId.value, item),
    })),
  )
  selected.value = []
  close()
}
</script>

<template>
  <Dialog :open="open" @update:open="value => (open = value)">
    <DialogContent class="flex h-[82vh] max-w-5xl flex-col gap-3 sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>

      <div v-if="error" class="text-destructive px-1 text-xs">{{ error }}</div>
      <div v-else-if="loading" class="text-muted-foreground flex min-h-0 flex-1 items-center justify-center text-sm">
        {{ loadingText }}
      </div>
      <div v-else class="min-h-0 flex-1 overflow-hidden rounded-md border">
        <MediaBrowser
          v-if="currentLibraryId"
          enable-selection
          :select-mode="selectMode"
          v-model:selected="selected"
          v-model:library-id="currentLibraryId"
          :services="services"
          :library-servers="[{ id: 'current', name: serverUrl, libraries: libraries }]"
        />
        <div v-else class="text-muted-foreground flex h-full items-center justify-center text-sm">
          {{ noLibraryText }}
        </div>
      </div>

      <DialogFooter class="gap-2">
        <span class="text-muted-foreground mr-auto text-xs">{{ selectedCountText.replace('{n}', String(selected.length)) }}</span>
        <Button variant="outline" @click="close">{{ cancelText }}</Button>
        <Button :disabled="!selected.length" @click="confirmAdd">{{ confirmText }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
