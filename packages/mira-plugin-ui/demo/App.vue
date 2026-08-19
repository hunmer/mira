<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileText, Folder, Loader2, LogOut, Moon, Server, Sun } from '@lucide/vue'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { SaveLocationDialog, Progress, type SaveLocation } from '@/index'
import { Dropzone, LibrarySelect, LibraryTreeView, MediaBrowser } from '@/library'
import type { LibraryFlatItem, LibrarySelectServer, LibraryTreeDialog, LibraryTreeServices, LibraryTreeNode, MediaBrowserFilters, MediaBrowserItem, MediaBrowserServices } from '@/library'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const dark = ref(false)
function toggleDark () {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
}

/* ---------- Mira SDK 真实数据 ---------- */
// dev 模式经 vite 代理（/mira-api -> 127.0.0.1:8081），避免 server 无 CORS 的跨域问题
const STORE_KEY = 'mira-plugin-ui-demo'
const apiBaseUrl = ref('/mira-api')
const username = ref('admin')
const password = ref('admin123')
const token = ref('')
const connected = ref(false)
const connecting = ref(false)
const loadError = ref('')

const libraries = ref<any[]>([])
const folders = ref<any[]>([])
const tags = ref<any[]>([])
const tiptapCount = ref(0)
const currentLibraryId = ref('')
let client: MiraClient | null = null

const currentLibrary = computed(() => libraries.value.find(item => String(item.id) === currentLibraryId.value))

onMounted(() => {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  apiBaseUrl.value = saved.apiBaseUrl || '/mira-api'
  username.value = saved.username || 'admin'
  token.value = saved.token || ''
  if (token.value) void connect(token.value)
})

function persist () {
  localStorage.setItem(STORE_KEY, JSON.stringify({ apiBaseUrl: apiBaseUrl.value, username: username.value, token: token.value }))
}

async function connect (existingToken?: string) {
  connecting.value = true
  loadError.value = ''
  try {
    client = new MiraClient(apiBaseUrl.value)
    if (existingToken) client.setToken(existingToken)
    else {
      const response = await client.auth().login(username.value, password.value)
      token.value = response.accessToken || ''
    }
    await loadLibraries()
    connected.value = true
    persist()
  } catch (error) {
    loadError.value = error?.response?.data?.message || error?.message || String(error)
    connected.value = false
  } finally {
    connecting.value = false
  }
}

async function loadLibraries () {
  if (!client) return
  libraries.value = (await client.libraries().getAll()) as any[]
  currentLibraryId.value ||= String(libraries.value[0]?.id || '')
  await loadLibraryData()
}

async function loadLibraryData () {
  if (!client || !currentLibraryId.value) return
  folders.value = (await client.folders().getAll(currentLibraryId.value)) as any[]
  tags.value = (await client.tags().getAll(currentLibraryId.value).catch(() => [])) as any[]
  const docs = await client.files().getFilesByExtension(currentLibraryId.value, 'tiptap').catch(() => [])
  tiptapCount.value = (docs as any[] | undefined)?.length || 0
}

function logout () {
  connected.value = false
  token.value = ''
  libraries.value = []
  folders.value = []
  tags.value = []
  localStorage.removeItem(STORE_KEY)
}

/* ---------- SaveLocationDialog 演示 ---------- */
const showSave = ref(false)
const saved = ref('')
// 演示顶部 Attachment 文件卡片(待保存文件)
const saveFiles = ref([new File(['demo'], '我的文档.tiptap', { type: 'application/vnd.mira.tiptap+json' })])

function handleSave (location: SaveLocation) {
  saved.value = JSON.stringify(location)
}

/** 保存对话框内切换素材库:同步当前库并重拉文件夹/标签树数据 */
async function handleLibraryChange (libraryId: string) {
  if (!connected.value || libraryId === currentLibraryId.value) return
  currentLibraryId.value = libraryId
  await loadLibraryData()
}

/** 保存对话框「新增」:名称/描述/颜色/图标由组件内对话框收集,创建成功返回新节点 id 供组件自动选中 */
async function handleCreateNode ({ kind, parentId, title, color, description, icon }: { kind: 'folder' | 'tag'; parentId: number; title: string; color?: number; description?: string; icon?: string }): Promise<number | undefined> {
  if (!currentLibraryId.value) throw new Error('未选择素材库')
  if (connected.value && client) {
    const id = kind === 'folder'
      ? await client.folders().createFolder(currentLibraryId.value, title, parentId, color, description, icon)
      : await client.tags().createTag(currentLibraryId.value, title, parentId, color, description, icon)
    await loadLibraryData()
    return id
  }
  const pool = kind === 'folder' ? mockFolders : mockTags
  const id = Date.now()
  pool.value = [...pool.value, { id, title, parent_id: parentId }]
  return id
}

/* ---------- LibrarySelect 服务器分组选择(Mira Server 卡片内) ---------- */
const selectServers = computed<LibrarySelectServer[]>(() =>
  [{ id: 'current', name: apiBaseUrl.value, libraries: libraries.value }])

/* ---------- LibraryTreeView 树演示 ---------- */
const treeMode = ref<'folder' | 'tag'>('folder')
// 受控选择:传 v-model:selected 启用(文件夹单选 + 标签多选勾选)
const selectedFolder = ref<LibraryTreeNode[]>([])
const selectedTags = ref<LibraryTreeNode[]>([])

// mock 数据(未连接时使用;可变,右键新建/删除直接改内存,完整演示编辑流程)
const mockFolders = ref<LibraryFlatItem[]>([
  { id: 1, title: '设计素材', parent_id: 0 },
  { id: 2, title: '参考图', parent_id: 1 },
  { id: 3, title: '未整理', parent_id: 0 },
])
const mockTags = ref<LibraryFlatItem[]>([
  { id: 1, title: '灵感', parent_id: 0 },
  { id: 2, title: '插画', parent_id: 1 },
])

function adaptRows (rows: any[]): LibraryFlatItem[] {
  return rows.map(r => ({
    id: r.id,
    title: r.title ?? r.name,
    parent_id: typeof r.parent_id === 'number' ? r.parent_id : undefined,
    color: r.color,
    description: r.description,
    icon: r.icon,
    sort_index: r.sort_index,
  }))
}

// 连接后走 SDK 真实 CRUD;未连接操作内存 mock
const treeServices: LibraryTreeServices = {
  async listFolders () {
    if (!connected.value || !client) return mockFolders.value
    return adaptRows(await client.folders().getAll(currentLibraryId.value))
  },
  async listTags () {
    if (!connected.value || !client) return mockTags.value
    return adaptRows(await client.tags().getAll(currentLibraryId.value))
  },
  async createNode (kind, libId, title, parentId, extra) {
    if (!connected.value || !client) {
      const list = kind === 'folder' ? mockFolders : mockTags
      const id = Math.max(0, ...list.value.map(i => i.id)) + 1
      list.value = [...list.value, { id, title, parent_id: parentId ?? 0, color: extra?.color }]
      return id
    }
    return kind === 'folder'
      ? client.folders().createFolder(libId, title, parentId, extra?.color, extra?.description, extra?.icon)
      : client.tags().createTag(libId, title, parentId, extra?.color, extra?.description, extra?.icon)
  },
  async deleteNode (kind, libId, id, deleteFiles) {
    if (!connected.value || !client) {
      const list = kind === 'folder' ? mockFolders : mockTags
      list.value = list.value.filter(i => i.id !== id)
      return
    }
    return kind === 'folder'
      ? client.folders().deleteFolder(libId, id, deleteFiles)
      : client.tags().deleteTag(libId, id)
  },
  // 右键「编辑」:改名称/颜色/图标/描述(未连接时写内存 mock)
  async updateNode (kind, libId, id, title, extra) {
    if (!connected.value || !client) {
      const list = kind === 'folder' ? mockFolders : mockTags
      const row = list.value.find(i => i.id === id)
      if (row) {
        row.title = title
        row.color = extra?.color
        row.description = extra?.description
        row.icon = extra?.icon
      }
      return
    }
    const updates = { title, color: extra?.color, description: extra?.description, icon: extra?.icon }
    return kind === 'folder'
      ? client.folders().updateFolder(libId, id, updates)
      : client.tags().updateTag(libId, id, updates)
  },
  // 拖拽排序:同层 sort_index(未连接时写内存 mock)
  async updateSortIndex (kind, libId, items) {
    if (!connected.value || !client) {
      const list = kind === 'folder' ? mockFolders : mockTags
      for (const item of items) {
        const row = list.value.find(i => i.id === item.id)
        if (row) row.sort_index = item.sort_index
      }
      return
    }
    return kind === 'folder'
      ? client.folders().updateSortIndex(libId, items)
      : client.tags().updateSortIndex(libId, items)
  },
  // 拖拽跨层移动:改 parent_id(null=移到根,需绕过 SDK 的 number? 类型与桌面端一致)
  async moveNode (kind, libId, id, parentId) {
    if (!connected.value || !client) {
      const list = kind === 'folder' ? mockFolders : mockTags
      const row = list.value.find(i => i.id === id)
      if (row) row.parent_id = parentId ?? 0
      return
    }
    const update = { parent_id: parentId } as any
    return kind === 'folder'
      ? client.folders().updateFolder(libId, id, update)
      : client.tags().updateTag(libId, id, update)
  },
}

// 弹窗适配:demo 用原生弹窗(prompt/confirm),宿主可换成自己的 Dialog 系统
const treeDialog: LibraryTreeDialog = {
  alert: async o => { window.alert(`${o.title ?? ''}\n${o.message ?? ''}`.trim()) },
  confirm: async o => window.confirm(o.message ?? ''),
  prompt: async o => window.prompt(o.title ?? '', o.defaultValue ?? ''),
  confirmCheck: async o => {
    const ok = window.confirm(o.message ?? '')
    return { ok, checked: ok && window.confirm(o.checkboxLabel ?? '') }
  },
}

/* ---------- MediaBrowser 文件浏览器演示(网格/瀑布流 + 选择) ---------- */
const mediaView = ref<'grid' | 'waterfall'>('grid')
// 受控选择:传 v-model:selected 启用(点选/Ctrl 加选/Shift 连选/空白拖拽框选/Alt 减选)
const selectedMedia = ref<MediaBrowserItem[]>([])

// mock 数据(未连接时):渐变 SVG 缩略图 + 多种宽高比,瀑布流布局效果可见
function gradientThumb (i: number, w: number, h: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${(i * 47) % 360} 70% 65%)"/>` +
    `<stop offset="1" stop-color="hsl(${(i * 47 + 60) % 360} 70% 45%)"/>` +
    `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const mockAspects = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3']
const mockFiles = ref<MediaBrowserItem[]>(Array.from({ length: 24 }, (_, i) => {
  const aspect = mockAspects[i % mockAspects.length]
  const ext = ['png', 'jpg', 'mp4', 'mp3', 'pdf'][i % 5]
  return {
    id: i + 1,
    title: `演示素材 ${String(i + 1).padStart(2, '0')}.${ext}`,
    size: 1024 * (i + 1) * 137,
    extension: ext,
    mime_type: ext === 'png' || ext === 'jpg' ? `image/${ext}` : ext === 'mp4' ? 'video/mp4' : ext === 'mp3' ? 'audio/mpeg' : 'application/pdf',
    imported_at: Date.now() - i * 86400_000,
    aspect,
  }
}))

// 连接后走 SDK getFiles(服务端过滤/排序);未连接在内存 mock 上过滤/排序
const mediaServices: MediaBrowserServices = {
  async listFiles (filters) {
    if (connected.value && client) {
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
      // 服务端实际返回分页对象 { result, limit, offset, total }(SDK 类型声明为数组,与实际不符)
      const rows: any[] = Array.isArray(ret) ? ret : (ret?.result ?? [])
      // 数据库行为原始列:name 含扩展名,thumb 是 0/1 的"已生成缩略图"标志
      return rows.map(r => {
        const name = r.title ?? r.name ?? ''
        const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
        return {
          id: r.id,
          title: name,
          size: r.size,
          extension,
          imported_at: r.imported_at,
          thumbnail_path: r.thumb ? 'generated' : undefined,
        }
      })
    }
    let list = [...mockFiles.value]
    if (filters?.title) list = list.filter(f => f.title.toLowerCase().includes(filters.title!.toLowerCase()))
    if (filters?.category) list = list.filter(f => f.mime_type?.startsWith(filters.category!))
    const key = filters?.sort || 'imported_at'
    const dir = filters?.order === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const va = key === 'name' ? a.title : (a[key as 'size' | 'imported_at'] ?? 0)
      const vb = key === 'name' ? b.title : (b[key as 'size' | 'imported_at'] ?? 0)
      return (va > vb ? 1 : -1) * dir
    })
    return list
  },
  // 真实缩略图走 /api/files/thumb(img 无法带 header,token 拼 query);未生成缩略图的文件不给 URL,组件回退类型图标
  getThumbUrl (item) {
    if (connected.value) {
      if (!item.thumbnail_path) return undefined
      return `${apiBaseUrl.value}/api/files/thumb/${currentLibraryId.value}/${item.id}?token=${token.value}`
    }
    const [w, h] = (item.aspect || '1:1').split(':').map(Number)
    return gradientThumb(Number(item.id) - 1, w * 120, h * 120)
  },
}

function handleMediaClick (item: MediaBrowserItem) {
  console.log('[MediaBrowser demo] click:', item.title)
}

// Delete 快捷键:mock 删内存;连接走 SDK batchDelete(默认移入回收站),完成后刷新列表
const mediaBrowserRef = ref<InstanceType<typeof MediaBrowser>>()
async function handleMediaDelete (items: MediaBrowserItem[]) {
  if (!connected.value || !client) {
    const ids = new Set(items.map(i => i.id))
    mockFiles.value = mockFiles.value.filter(f => !ids.has(f.id))
    selectedMedia.value = []
    return
  }
  try {
    await client.files().batchDelete(currentLibraryId.value, items.map(i => i.id))
    selectedMedia.value = []
    await mediaBrowserRef.value?.refresh()
  } catch (error: any) {
    console.error('[MediaBrowser demo] batchDelete failed:', error?.message || error)
  }
}

/* ---------- Dropzone 暂存 + 真实上传 ---------- */
const stagedFiles = ref<File[]>([])
const dzMediaVariant = ref<'icon' | 'image'>('image')
const dzOrientation = ref<'horizontal' | 'vertical'>('horizontal')
const uploading = ref(false)
const uploadPercent = ref(0)
const uploadResult = ref('')

const totalSize = computed(() => stagedFiles.value.reduce((sum, f) => sum + f.size, 0))

function formatSize (bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function startUpload () {
  if (!client || !connected.value || !stagedFiles.value.length || uploading.value) return
  uploading.value = true
  uploadPercent.value = 0
  uploadResult.value = ''
  try {
    const folder = selectedFolder.value[0]
    const tags = selectedTags.value.map(t => t.title)
    await client.files().uploadFiles(stagedFiles.value, currentLibraryId.value, {
      folderId: folder ? String(folder.id) : undefined,
      tags: tags.length ? tags : undefined,
      onUploadProgress: e => { uploadPercent.value = e.percent ?? 0 },
    })
    uploadPercent.value = 100
    uploadResult.value = `已上传 ${stagedFiles.value.length} 个文件`
    stagedFiles.value = []
    await loadLibraryData()
  } catch (error: any) {
    uploadResult.value = `上传失败: ${error?.response?.data?.message || error?.message || String(error)}`
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <main class="bg-background text-foreground min-h-[100dvh]">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">mira-plugin-ui Demo</h1>
          <p class="text-muted-foreground text-sm">SaveLocationDialog 组件演示，数据来自 Mira SDK</p>
        </div>
        <Button variant="outline" size="icon" aria-label="切换主题" @click="toggleDark">
          <Sun v-if="dark" class="size-4" />
          <Moon v-else class="size-4" />
        </Button>
      </header>

      <div class="grid items-start gap-6 lg:grid-cols-3">
        <!-- 连接卡片：登录 / 会话 -->
        <section class="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border p-6 shadow-sm lg:col-span-2">
          <div class="flex items-center gap-2">
            <Server class="text-muted-foreground size-4" />
            <h2 class="text-base font-semibold">Mira Server</h2>
            <span
              class="bg-muted text-muted-foreground ms-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="connected && 'bg-primary/10 text-primary'"
            >
              {{ connected ? '已连接' : '未连接' }}
            </span>
          </div>

          <template v-if="!connected">
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="grid gap-2">
                <Label for="api-base">API 地址</Label>
                <Input id="api-base" v-model="apiBaseUrl" placeholder="/mira-api（代理到 127.0.0.1:8081）" />
              </div>
              <div class="grid gap-2">
                <Label for="username">用户名</Label>
                <Input id="username" v-model="username" autocomplete="username" />
              </div>
              <div class="grid gap-2">
                <Label for="password">密码</Label>
                <Input
                  id="password"
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  @keyup.enter="connect()"
                />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Button class="w-fit" :disabled="connecting || !username || !password" @click="connect()">
                <Loader2 v-if="connecting" class="size-4 animate-spin" />
                连接并登录
              </Button>
              <p v-if="loadError" class="text-destructive text-sm">{{ loadError }}</p>
            </div>
          </template>

          <template v-else>
            <p class="text-muted-foreground text-sm">
              接入 <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{{ apiBaseUrl }}</code>
            </p>
            <div class="grid gap-2 sm:max-w-72">
              <Label>当前素材库</Label>
              <LibrarySelect v-model="currentLibraryId" :servers="selectServers" @change="loadLibraryData" />
            </div>
            <div>
              <Button variant="outline" class="w-fit" @click="logout">
                <LogOut class="size-4" /> 断开连接
              </Button>
            </div>
          </template>
        </section>

        <!-- 概览卡片：库统计 -->
        <aside class="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
          <h2 class="text-base font-semibold">数据概览</h2>
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Server class="size-3.5" /> 素材库
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ libraries.length }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Folder class="size-3.5" /> 文件夹
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ folders.length }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground flex items-center gap-1.5 text-sm">
                <FileText class="size-3.5" /> .tiptap 文档
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ tiptapCount }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground text-sm">当前库</span>
              <span class="truncate text-sm font-medium">{{ currentLibrary?.name || currentLibrary?.title || currentLibraryId || '未选择' }}</span>
            </div>
          </div>
          <p v-if="!connected" class="text-muted-foreground mt-auto text-xs">连接 server 后显示实时统计，未连接时对话框使用 mock 数据</p>
        </aside>
      </div>

      <!-- 组件演示卡片 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">SaveLocationDialog</h2>
            <p class="text-muted-foreground text-sm">
              {{ connected ? '数据来自当前素材库（真实 SDK 拉取）' : '未连接 server，仅展示 mock 数据' }}
            </p>
          </div>
          <Button class="w-fit shrink-0" :disabled="!connected" @click="showSave = true">保存文档到…</Button>
        </div>
        <p v-if="saved" class="bg-muted text-muted-foreground rounded-lg p-3 font-mono text-sm break-all">{{ saved }}</p>
        <SaveLocationDialog
          v-model:open="showSave"
          :libraries="connected ? libraries : [{ id: 1, name: 'Mock 素材库' }]"
          :folders="connected ? folders : [{ id: 101, title: 'Mock 文件夹' }]"
          :tags="connected ? tags : [{ id: 1, title: 'Mock 标签' }]"
          :files="saveFiles"
          :initial-library-id="currentLibraryId"
          initial-file-name="我的文档"
          @save="handleSave"
          @library-change="handleLibraryChange"
          :create-node="handleCreateNode"
          @remove-file="file => saveFiles = saveFiles.filter(f => f !== file)"
        />
      </section>

      <!-- 树视图演示卡片(受控选择:为上传卡片选目标) -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">LibraryTreeView 树视图</h2>
            <p class="text-muted-foreground text-sm">
              {{ connected ? '数据来自当前素材库（真实 SDK 读写，v-model:selected 受控选择）' : '未连接 server，操作内存 mock 数据（受控选择，工具栏/右键可新建，右键可删除）' }}
            </p>
          </div>
          <div class="bg-muted flex gap-1 rounded-lg p-1">
            <button
              v-for="m in (['folder', 'tag'] as const)"
              :key="m"
              class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
              :class="treeMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="treeMode = m"
            >
              {{ m === 'folder' ? '文件夹树' : '标签树' }}
            </button>
          </div>
        </div>
        <div class="h-96 overflow-hidden rounded-lg border">
          <LibraryTreeView
            :key="treeMode"
            :mode="treeMode"
            :library-id="currentLibraryId || 'mock'"
            :services="treeServices"
            :dialog="treeDialog"
            :selected="treeMode === 'folder' ? selectedFolder : selectedTags"
            @update:selected="treeMode === 'folder' ? (selectedFolder = $event) : (selectedTags = $event)"
          />
        </div>
      </section>

      <!-- MediaBrowser 文件浏览器演示:网格/瀑布流切换 + 框选 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold">MediaBrowser 文件浏览器</h2>
          <p class="text-muted-foreground text-sm">
            {{ connected ? '数据来自当前素材库（SDK getFiles 过滤/排序，缩略图走 /api/files/thumb）' : '未连接 server，演示 mock 数据（渐变缩略图 + 多种宽高比，切换瀑布流可见高度差异）' }}
          </p>
          <p class="text-muted-foreground text-xs">点击选择 · Ctrl 加选 · Shift 连选 · 空白处拖拽框选 · Alt 拖拽减选 · Delete 删除选中（回收站）</p>
          <p v-if="selectedMedia.length" class="text-primary text-xs">
            已选 {{ selectedMedia.length }} 项：{{ selectedMedia.map(i => i.title).join('、') }}
          </p>
        </div>
        <div class="h-[32rem] overflow-hidden rounded-lg border">
          <MediaBrowser
            ref="mediaBrowserRef"
            v-model:view="mediaView"
            v-model:selected="selectedMedia"
            :library-id="currentLibraryId || 'mock'"
            :services="mediaServices"
            @item-click="handleMediaClick"
            @delete-selection="handleMediaDelete"
          />
        </div>
      </section>

      <!-- Dropzone 独立卡片:文件暂存 -->
      <section class="bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">Dropzone 拖放区</h2>
            <p class="text-muted-foreground text-sm">选择/拖放文件暂存（v-model:files 受控），附件卡片可单独移除</p>
          </div>
          <!-- 附件展示样式(缩略图/图标) + 排列方向(横排/竖排) -->
          <div class="flex gap-2">
            <div class="flex gap-1" role="group" aria-label="附件展示样式">
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
                :class="{ 'border-primary text-primary': dzMediaVariant === 'image' }"
                @click="dzMediaVariant = 'image'"
              >缩略图</button>
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
                :class="{ 'border-primary text-primary': dzMediaVariant === 'icon' }"
                @click="dzMediaVariant = 'icon'"
              >图标</button>
            </div>
            <div class="flex gap-1" role="group" aria-label="附件排列方向">
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
                :class="{ 'border-primary text-primary': dzOrientation === 'horizontal' }"
                @click="dzOrientation = 'horizontal'"
              >横排</button>
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
                :class="{ 'border-primary text-primary': dzOrientation === 'vertical' }"
                @click="dzOrientation = 'vertical'"
              >竖排</button>
            </div>
          </div>
        </div>
        <div class="overflow-hidden rounded-lg border">
          <Dropzone v-model:files="stagedFiles" :media-variant="dzMediaVariant" :orientation="dzOrientation" />
        </div>
      </section>

      <!-- 真实上传卡片:目标预览 + SDK 进度 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">真实上传</h2>
            <p class="text-muted-foreground text-sm">走 Mira SDK uploadFiles，进度来自 onUploadProgress 字节级回调</p>
          </div>
          <Button
            class="w-fit shrink-0"
            :disabled="!connected || !stagedFiles.length || uploading"
            @click="startUpload()"
          >
            <Loader2 v-if="uploading" class="size-4 animate-spin" />
            {{ uploading ? `上传中 ${uploadPercent}%` : `上传 ${stagedFiles.length} 个文件` }}
          </Button>
        </div>
        <div class="text-foreground flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <span>目标文件夹：<b>{{ selectedFolder[0]?.title || '根目录' }}</b></span>
          <span>标签：<b>{{ selectedTags.map(t => t.title).join('、') || '无' }}</b></span>
          <span>文件：<b>{{ stagedFiles.length }}</b> 个（{{ formatSize(totalSize) }}）</span>
        </div>
        <div v-if="uploading || uploadPercent > 0" class="flex items-center gap-3">
          <Progress :model-value="uploadPercent" class="flex-1" />
          <span class="text-muted-foreground w-12 text-right text-sm tabular-nums">{{ uploadPercent }}%</span>
        </div>
        <p
          v-if="uploadResult"
          class="text-sm"
          :class="uploadResult.startsWith('上传失败') ? 'text-destructive' : 'text-muted-foreground'"
        >{{ uploadResult }}</p>
        <p v-if="!connected" class="text-muted-foreground text-sm">连接 server 后可上传（未连接时仅暂存文件）</p>
      </section>
    </div>
  </main>
</template>
