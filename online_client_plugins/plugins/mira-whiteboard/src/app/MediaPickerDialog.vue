<script setup lang="ts">
/**
 * 「从素材库添加图片」对话框：mira-plugin-ui 的 Dialog + MediaBrowser 组合。
 *
 * - server/token 来自窗口 URL query（宿主 openPluginWindow 注入），用 SDK
 *   （mira-app-core/shared/sdk）直连 server API 拉文件列表与元数据；
 * - 缩略图/原图 URL 由 img/fetch 直接访问（token 拼 query）；
 * - 确认后把选中文件抛给宿主（App.vue 复用 insertMedia 管道插入画布）。
 */
import { ref, watch } from 'vue'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { MediaBrowser } from 'mira-plugin-ui/library'
import type { MediaBrowserItem, MediaBrowserServices } from 'mira-plugin-ui/library'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'mira-plugin-ui/src/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'mira-plugin-ui/src/components/ui/select'

const props = defineProps<{
  /** 对话框开关 */
  open: boolean
  /** Mira server 根地址（如 http://127.0.0.1:8081） */
  server: string
  /** 登录 token（query 传入，用于 API 鉴权与资源 URL 拼接） */
  token: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** 确认添加：url 为带 token 的原图直链 */
  confirm: [files: { id: string | number; url: string; name: string }[]]
}>()

const LIB_KEY = 'mira-whiteboard:picker-library'

const libraries = ref<{ id: string | number; name?: string; title?: string }[]>([])
const currentLibraryId = ref('')
const selected = ref<MediaBrowserItem[]>([])
const libError = ref('')

// SDK client：server/token 由宿主注入，窗口生命周期内 token 视为有效
const client = new MiraClient(props.server)
client.setToken(props.token)

const libraryLabel = (lib: { name?: string; title?: string }) => lib.title || lib.name || String(lib.id)

/** 打开时拉库列表并恢复上次选择的库 */
watch(
  () => props.open,
  async (open) => {
    if (!open || libraries.value.length) return
    libError.value = ''
    try {
      const rows = (await client.libraries().getAll()) as any[]
      libraries.value = rows || []
      const saved = localStorage.getItem(LIB_KEY)
      currentLibraryId.value =
        libraries.value.some((lib) => String(lib.id) === saved)
          ? saved!
          : String(libraries.value[0]?.id || '')
    } catch (e) {
      libError.value = `素材库加载失败：${(e as Error)?.message || e}`
    }
  },
)

function onLibraryChange(id: string) {
  currentLibraryId.value = id
  localStorage.setItem(LIB_KEY, id)
  selected.value = []
}

// MediaBrowser 数据服务：列表走 SDK（服务端过滤/排序），缩略图/宽高走 REST 直链
const services: MediaBrowserServices = {
  async listFiles(filters) {
    const ret: any = await client.files().getFiles({
      libraryId: currentLibraryId.value,
      filters: {
        title: filters?.title,
        category: filters?.category,
        sort: filters?.sort,
        order: filters?.order,
        limit: 200,
      } as any,
    })
    // 服务端返回分页对象 { result, limit, offset, total }；行为原始列（name/thumb 标志）
    const rows: any[] = Array.isArray(ret) ? ret : (ret?.result ?? [])
    return rows.map((r) => {
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
  },
  // img 无法带 header，token 拼 query；未生成缩略图的文件不给 URL，组件回退类型图标
  getThumbUrl(item) {
    if (!item.thumbnail_path) return undefined
    return `${props.server}/api/files/thumb/${currentLibraryId.value}/${item.id}?token=${encodeURIComponent(props.token)}`
  },
  // 瀑布流真实宽高
  async getMetadataByIds(ids) {
    return client.files().getMetadataByIds(currentLibraryId.value, ids)
  },
}

function close() {
  emit('update:open', false)
}

function confirmAdd() {
  if (!selected.value.length) return
  emit(
    'confirm',
    selected.value.map((item) => ({
      id: item.id,
      url: `${props.server}/api/files/file/${currentLibraryId.value}/${item.id}?token=${encodeURIComponent(props.token)}`,
      name: item.title,
    })),
  )
  selected.value = []
  close()
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex h-[82vh] max-w-5xl flex-col gap-3 sm:max-w-5xl">
      <DialogHeader class="flex-row items-center justify-between space-y-0">
        <DialogTitle>从素材库添加</DialogTitle>
        <!-- 素材库切换 -->
        <Select :model-value="currentLibraryId" @update:model-value="onLibraryChange">
          <SelectTrigger class="h-8 w-52 text-xs">
            <SelectValue placeholder="选择素材库" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="lib in libraries" :key="lib.id" :value="String(lib.id)">
              {{ libraryLabel(lib) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </DialogHeader>

      <div v-if="libError" class="text-destructive px-1 text-xs">{{ libError }}</div>
      <div v-else class="min-h-0 flex-1 overflow-y-auto rounded-md border">
        <MediaBrowser
          v-if="currentLibraryId"
          v-model:selected="selected"
          :library-id="currentLibraryId"
          :services="services"
        />
        <div v-else class="text-muted-foreground flex h-full items-center justify-center text-sm">
          暂无素材库
        </div>
      </div>

      <DialogFooter class="gap-2">
        <span class="text-muted-foreground mr-auto text-xs">已选 {{ selected.length }} 项（可框选/按住 Ctrl 多选）</span>
        <Button variant="outline" @click="close">取消</Button>
        <Button :disabled="!selected.length" @click="confirmAdd">添加到画布</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
