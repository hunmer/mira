<script setup lang="ts">
/**
 * AI 图片生成器（mira_ai_sdk 服务端插件的 web SPA）：
 *   - 文生图 / 图生图（参考图支持本地 + 素材库 MediaPickerDialog 多选）
 *   - 蒙版重绘（MaskEditor 画笔涂抹，导出透明区 PNG）
 *   - 生成结果勾选 → BatchUploadDialog 一键导入素材库
 * server/token/libraryId 来自宿主注入的 query（resolveMiraServerConfig），主题跟随宿主。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Brush, Download, ImagePlus, Library, Loader2, Plus, Sparkles } from '@lucide/vue'
import { Badge } from 'mira-plugin-ui/src/components/ui/badge'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Checkbox } from 'mira-plugin-ui/src/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'mira-plugin-ui/src/components/ui/dropdown-menu'
import { VueDraggable } from 'mira-plugin-ui/src/components/ui/draggable'
import { Label } from 'mira-plugin-ui/src/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'mira-plugin-ui/src/components/ui/select'
import { Separator } from 'mira-plugin-ui/src/components/ui/separator'
import { Textarea } from 'mira-plugin-ui/src/components/ui/textarea'
import BatchUploadDialog from 'mira-plugin-ui/src/BatchUploadDialog.vue'
import MediaPickerDialog from 'mira-plugin-ui/src/library/MediaPickerDialog.vue'
import type { MediaPickerFile } from 'mira-plugin-ui/src/library/types'
import MaskEditor from '@/components/MaskEditor.vue'
import { useI18n } from '@/lib/i18n'
import {
  createFolder,
  fetchAuthorizedImage,
  fetchFolders,
  fetchLibraries,
  generateImage,
  getServerConfig,
  listProviders,
  mediaSourceUrl,
  uploadFile,
  type AiProvider,
  type FolderItem,
  type LibraryItem,
} from '@/lib/server'

const { setLocale, t } = useI18n()

interface RefImage {
  key: string
  name: string
  dataUrl: string
}

interface GenResult {
  key: string
  name: string
  dataUrl: string
  selected: boolean
}

// ── 主题跟随宿主（html.dark） ──────────────────────────────
const host = (typeof window !== 'undefined' && (window.mira || window.eagle)) || null

function hostIsDark(): boolean {
  try {
    return Boolean(host?.app?.isDarkColors?.()) || host?.app?.theme === 'DARK'
  } catch {
    return false
  }
}

let offTheme: (() => void) | null = null
let offLocale: (() => void) | null = null
const applyDark = (dark: boolean) => document.documentElement.classList.toggle('dark', dark)

// ── 连接与服务商 ─────────────────────────────────────────
const config = getServerConfig()
const connected = computed(() => Boolean(config.server && config.token))

const providers = ref<AiProvider[]>([])
const providerId = ref('')
const model = ref('')
const prompt = ref('')
const size = ref('auto')
const count = ref(1)

const currentProvider = computed(() => providers.value.find((p) => p.id === providerId.value))
const models = computed(() => currentProvider.value?.models || [])

function onProviderChange(value: string, preferredModel?: string | null) {
  providerId.value = value
  const next = providers.value.find((p) => p.id === value)
  model.value = preferredModel && next?.models.includes(preferredModel)
    ? preferredModel
    : next?.models[0] || ''
}

async function loadProviders() {
  if (!connected.value) return
  try {
    const list = await listProviders()
    providers.value = list
    const preferred = list.find((p) => p.isDefaultImage) || list[0]
    if (preferred) onProviderChange(preferred.id, preferred.defaultImageModelId)
  } catch (e) {
    error.value = errorMessage(e)
  }
}

// ── 参考图（本地 + 素材库） ────────────────────────────────
const refImages = ref<RefImage[]>([])
const maskDataUrl = ref<string | null>(null)
const localFileInput = ref<HTMLInputElement | null>(null)
const pickerOpen = ref(false)
const pickerLibraryId = ref(config.libraryId)
const loadingRefs = ref(false)

function addRefImage(name: string, dataUrl: string) {
  refImages.value.push({ key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, dataUrl })
}

function removeRefImage(index: number) {
  refImages.value.splice(index, 1)
  if (!refImages.value.length) maskDataUrl.value = null
}

function onLocalFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const reader = new FileReader()
    reader.onload = () => addRefImage(file.name, String(reader.result || ''))
    reader.readAsDataURL(file)
  }
  ;(e.target as HTMLInputElement).value = ''
}

async function onPickerConfirm(files: MediaPickerFile[]) {
  const libraryId = pickerLibraryId.value
  loadingRefs.value = true
  try {
    for (const file of files) {
      if (!file.isImage || !file.id) continue
      try {
        const dataUrl = await fetchAuthorizedImage(mediaSourceUrl({ id: String(file.id), libraryId }))
        addRefImage(file.name, dataUrl)
      } catch {
        // 单张失败跳过，不影响其余
      }
    }
  } finally {
    loadingRefs.value = false
  }
}

// 宿主右键菜单「AI 生成 / 编辑」经 ?media= 传入选中素材
async function loadMediaQuery() {
  if (!connected.value) return
  try {
    const raw = new URLSearchParams(location.search).get('media')
    if (!raw) return
    const items = JSON.parse(decodeURIComponent(raw)) as Array<{ id?: string; libraryId?: string; name?: string }>
    for (const item of items) {
      if (!item.id || !item.libraryId) continue
      try {
        const dataUrl = await fetchAuthorizedImage(mediaSourceUrl(item))
        addRefImage(item.name || '素材', dataUrl)
      } catch {
        // 忽略单张失败
      }
    }
  } catch {
    // query 非法时忽略
  }
}

// ── 蒙版 ────────────────────────────────────────────────
const maskEditorOpen = ref(false)

function onMaskConfirm(mask: string | null) {
  maskDataUrl.value = mask
}

// ── 生成 ────────────────────────────────────────────────
const generating = ref(false)
const error = ref('')
const info = ref('')

const sizeOptions = computed(() => [
  { value: 'auto', label: t('app.sizeAuto') },
  { value: '1024x1024', label: t('app.sizeSquare') },
  { value: '1024x1536', label: t('app.sizePortrait') },
  { value: '1536x1024', label: t('app.sizeLandscape') },
  { value: '1024x1792', label: t('app.sizePortrait2') },
  { value: '1792x1024', label: t('app.sizeLandscape2') },
])

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'image'
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

async function onGenerate() {
  const text = prompt.value.trim()
  if (!text || generating.value || !model.value) return
  generating.value = true
  error.value = ''
  info.value = ''
  try {
    const result = await generateImage({
      providerId: providerId.value,
      model: model.value,
      prompt: text,
      n: count.value,
      size: size.value === 'auto' ? undefined : size.value,
      images: refImages.value.length ? refImages.value.map((item) => item.dataUrl) : undefined,
      mask: refImages.value.length && maskDataUrl.value ? maskDataUrl.value : undefined,
    })
    const stamp = Date.now().toString(36)
    for (const image of result.images) {
      results.value.unshift({
        key: `${stamp}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${slugify(text)}-${stamp}.${(image.mediaType || 'image/png').split('/')[1] || 'png'}`,
        dataUrl: `data:${image.mediaType || 'image/png'};base64,${image.base64 || ''}`,
        selected: true,
      })
    }
    const ignored = Array.from(new Set((result.warnings || []).map((w) => w.feature).filter(Boolean)))
    info.value = t('app.doneInfo', { n: result.images.length, sec: Math.round(result.elapsed / 1000) })
      + (ignored.length ? t('app.ignored', { list: ignored.join(', ') }) : '')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    generating.value = false
  }
}

// ── 结果：下载 / 导入素材库 ────────────────────────────────
const results = ref<GenResult[]>([])
const selectedResults = computed(() => results.value.filter((item) => item.selected))

function downloadResult(item: GenResult) {
  const link = document.createElement('a')
  link.href = item.dataUrl
  link.download = item.name
  link.click()
}

async function dataUrlToFile(item: GenResult): Promise<File | null> {
  try {
    const resp = await fetch(item.dataUrl)
    const blob = await resp.blob()
    return new File([blob], item.name, { type: blob.type || 'image/png' })
  } catch {
    return null
  }
}

const importDialogOpen = ref(false)
const importFiles = ref<File[]>([])
const importLibraries = ref<LibraryItem[]>([])
const importFolders = ref<FolderItem[]>([])
const preparingImport = ref(false)

async function openImportDialog() {
  if (!selectedResults.value.length || preparingImport.value) return
  if (!connected.value) {
    error.value = t('app.missingConn')
    return
  }
  preparingImport.value = true
  error.value = ''
  try {
    const [files, libs, folders] = await Promise.all([
      Promise.all(selectedResults.value.map(dataUrlToFile)),
      fetchLibraries(),
      fetchFolders(config.libraryId),
    ])
    importFiles.value = files.filter(Boolean) as File[]
    importLibraries.value = libs
    importFolders.value = folders
    importDialogOpen.value = true
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    preparingImport.value = false
  }
}

async function onImportLibraryChange(libraryId: string) {
  importFolders.value = await fetchFolders(libraryId)
}

/** BatchUploadDialog 的 create-node 服务：仅支持新建文件夹 */
function importCreateNode(payload: { kind?: string; parentId: number; title: string; description?: string; color?: number }) {
  return payload.kind === 'folder' ? createFolder(payload) : Promise.resolve(undefined)
}

function onImported() {
  info.value = t('app.imported', { n: importFiles.value.length })
}

// ── 生命周期 ────────────────────────────────────────────
onMounted(() => {
  applyDark(hostIsDark())
  const viaHost = host?.onThemeChanged?.((theme: string) => applyDark(theme === 'DARK'))
  if (typeof viaHost === 'function') offTheme = viaHost
  else if (typeof matchMedia === 'function') {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent) => applyDark(event.matches)
    mq.addEventListener('change', listener)
    offTheme = () => mq.removeEventListener('change', listener)
    applyDark(mq.matches)
  }
  // 主窗口切换语言时实时跟随（preload 广播 → onLocaleChanged）
  offLocale = host?.onLocaleChanged?.((locale: string) => setLocale(locale)) || null
  void loadProviders()
  void loadMediaQuery()
})

onUnmounted(() => {
  offTheme?.()
  offLocale?.()
})
</script>

<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- 顶栏 -->
    <header class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <Sparkles class="size-4 shrink-0 text-primary" />
      <span class="text-sm font-semibold">{{ t('app.title') }}</span>
      <Badge v-if="currentProvider" variant="secondary" class="max-w-48 truncate font-normal">
        {{ currentProvider.name }} · {{ model || t('app.noModel') }}
      </Badge>
      <Badge v-if="refImages.length" variant="outline">{{ t('app.img2img', { n: refImages.length }) }}</Badge>
      <Badge v-if="maskDataUrl && refImages.length" variant="outline">{{ t('app.mask') }}</Badge>

      <div class="flex-1" />

      <span v-if="generating" class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 class="size-3.5 animate-spin" />{{ t('app.generating') }}
      </span>
      <span v-else-if="info" class="max-w-72 truncate text-xs text-muted-foreground" :title="info">{{ info }}</span>
      <span v-else-if="error" class="max-w-72 truncate text-xs text-destructive" :title="error">{{ error }}</span>

      <Button
        size="sm"
        :disabled="!selectedResults.length || preparingImport"
        @click="openImportDialog"
      >
        <Download v-if="preparingImport" class="animate-pulse" />
        {{ selectedResults.length ? t('app.importCount', { n: selectedResults.length }) : t('app.import') }}
      </Button>
    </header>

    <div v-if="!connected" class="border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
      {{ t('app.missingConnBanner') }}
    </div>

    <div class="flex min-h-0 flex-1">
      <!-- 左侧参数栏 -->
      <aside class="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r p-4">
        <div class="space-y-1.5">
          <Label>{{ t('app.provider') }}</Label>
          <Select :model-value="providerId" @update:model-value="onProviderChange(String($event))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="providers.length ? t('app.selectProvider') : t('app.noProviders')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in providers" :key="p.id" :value="p.id">
                {{ p.name }}{{ p.isDefaultImage ? t('app.default') : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <Label>{{ t('app.model') }}</Label>
          <Select v-model="model" :disabled="!models.length">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('app.selectModel')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="m in models" :key="m" :value="m" class="font-mono">{{ m }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">{{ t('app.modelHint') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label>{{ t('app.size') }}</Label>
            <Select v-model="size">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in sizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label>{{ t('app.count') }}</Label>
            <Select v-model="count">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="n in [1, 2, 3, 4]" :key="n" :value="n">{{ n }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div class="flex min-h-0 flex-1 flex-col gap-1.5">
          <Label class="shrink-0">{{ t('app.prompt') }}</Label>
          <Textarea
            v-model="prompt"
            class="field-sizing-fixed min-h-0 flex-1 resize-none"
            :placeholder="t('app.promptPlaceholder')"
            :disabled="generating"
            @keydown.ctrl.enter.prevent="onGenerate"
          />
          <p class="shrink-0 text-xs text-muted-foreground">{{ t('app.promptHint') }}</p>
        </div>

        <Button class="w-full shrink-0" :disabled="generating || !model || !prompt.trim()" @click="onGenerate">
          <Loader2 v-if="generating" class="animate-spin" />
          <Sparkles v-else />
          {{ generating ? t('app.generating') : refImages.length ? t('app.edit') : t('app.generate') }}
        </Button>
      </aside>

      <!-- 右侧：参考图 + 结果 -->
      <main class="flex min-w-0 flex-1 flex-col">
        <!-- 参考图栏 -->
        <section class="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
          <span class="shrink-0 text-xs text-muted-foreground">{{ t('app.refs') }}</span>
          <div class="flex flex-wrap items-center gap-2">
            <VueDraggable
              v-model="refImages"
              :animation="150"
              class="flex flex-wrap items-center gap-2"
            >
              <div
                v-for="(item, index) in refImages"
                :key="item.key"
                class="group relative cursor-grab active:cursor-grabbing"
              >
                <img
                  :src="item.dataUrl"
                  :alt="item.name"
                  :title="item.name"
                  class="size-14 rounded-md border object-cover"
                  draggable="false"
                />
                <!-- 蒙版入口：首图左上角（蒙版基于首图绘制） -->
                <button
                  v-if="index === 0"
                  type="button"
                  :title="maskDataUrl ? t('app.redrawMask') : t('app.maskHint')"
                  class="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full border shadow-sm transition-opacity"
                  :class="maskDataUrl
                    ? 'border-primary bg-primary text-primary-foreground opacity-100'
                    : 'bg-background text-foreground opacity-0 group-hover:opacity-100'"
                  @click="maskEditorOpen = true"
                >
                  <Brush class="size-3" />
                </button>
                <button
                  type="button"
                  :title="t('app.remove')"
                  class="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[0.625rem] leading-none text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  @click="removeRefImage(index)"
                  >×</button>
              </div>
            </VueDraggable>

            <!-- 添加参考图：加号占位，点击下拉选择来源 -->
            <DropdownMenu v-if="refImages.length < 4">
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  :title="t('app.addRef')"
                  :disabled="loadingRefs"
                  class="grid size-14 place-items-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-50"
                >
                  <Loader2 v-if="loadingRefs" class="size-5 animate-spin" />
                  <Plus v-else class="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem @click="localFileInput?.click()">
                  <ImagePlus />{{ t('app.uploadLocal') }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="pickerOpen = true">
                  <Library />{{ t('app.pickLibrary') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <span class="ml-auto text-xs text-muted-foreground">{{ refImages.length }}/4</span>

          <input
            ref="localFileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onLocalFiles"
          />
        </section>

        <!-- 结果网格 -->
        <section class="min-h-0 flex-1 overflow-y-auto p-4">
          <div v-if="!results.length" class="grid h-full place-items-center text-sm text-muted-foreground">
            {{ t('app.empty') }}
          </div>
          <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <div
              v-for="item in results"
              :key="item.key"
              class="group relative overflow-hidden rounded-lg border bg-card"
            >
              <img :src="item.dataUrl" :alt="item.name" class="aspect-square w-full object-cover" draggable="false" />
              <label class="absolute left-2 top-2 flex cursor-pointer items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                <Checkbox :checked="item.selected" @update:checked="item.selected = Boolean($event)" />
                {{ t('app.selected') }}
              </label>
              <a
                :href="item.dataUrl"
                :download="item.name"
                :title="t('app.download')"
                class="absolute right-2 top-2 grid size-6 place-items-center rounded-md bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                @click.stop
              >
                <Download class="size-3.5" />
              </a>
              <p class="truncate px-2 py-1.5 text-xs text-muted-foreground" :title="item.name">{{ item.name }}</p>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- 从素材库选参考图（多选） -->
    <MediaPickerDialog
      v-model:open="pickerOpen"
      v-model:library-id="pickerLibraryId"
      select-mode="multiple"
      :title="t('picker.title')"
      :confirm-text="t('picker.confirm')"
      :cancel-text="t('picker.cancel')"
      :selected-count-text="t('picker.selected', { n: 1 })"
      :missing-auth-text="t('picker.missingAuth')"
      :load-failed-text="t('picker.loadFailed', { error: '' })"
      :loading-text="t('picker.loading')"
      :no-library-text="t('picker.noLibrary')"
      @confirm="onPickerConfirm"
    />

    <!-- 蒙版绘制 -->
    <MaskEditor
      v-model:open="maskEditorOpen"
      :image="refImages[0]?.dataUrl || ''"
      @confirm="onMaskConfirm"
    />

    <!-- 导入素材库（批量上传对话框） -->
    <BatchUploadDialog
      v-model:open="importDialogOpen"
      :libraries="importLibraries"
      :folders="importFolders"
      :initial-library-id="config.libraryId"
      :upload-file="uploadFile"
      :create-node="importCreateNode"
      :initial-files="importFiles"
      :title="t('upload.title')"
      :description="t('upload.description')"
      :submit-text="t('upload.submit')"
      :cancel-text="t('upload.cancel')"
      @library-change="onImportLibraryChange"
      @uploaded="onImported"
    />
  </div>
</template>
