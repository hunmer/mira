<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LayoutGrid, ListTree, Loader2, LogOut, Moon, Server, Sun } from '@lucide/vue'
import { MiraClient, type HealthResponse } from 'mira-app-core/shared/sdk'
import { BatchUploadDialog, DeviceListPicker, Progress, SaveLocationDialog, type BatchUploadFileService, type DeviceListItem, type DeviceListPickerServices, type SaveLocation } from '@/index'
import { Dropzone, LibrarySelect, LibraryTreeView, MediaBrowser, MediaLibraryView, ServerManagerDialog, toApiFilters } from '@/library'
import type { LibraryFlatItem, LibrarySelectServer, LibraryTreeDialog, LibraryTreeDropUploadMode, LibraryTreeFileDropPayload, LibraryTreeServices, LibraryTreeNode, LibraryTreeUpload, LibraryTreeUploadTarget, ManagedServer, MediaBrowserFilters, MediaBrowserItem, MediaBrowserServerManager, MediaBrowserServices, MediaDetailItem, MediaDetailServices, MediaLibraryServices, ServerManagerServices } from '@/library'
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
const health = ref<HealthResponse | null>(null)

const libraries = ref<any[]>([])
const folders = ref<any[]>([])
const tags = ref<any[]>([])
const currentLibraryId = ref('')
let client: MiraClient | null = null

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
    void loadHealth()
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
}

/** 连接成功后拉取 /health 展示服务器信息 */
async function loadHealth () {
  if (!client) return
  try {
    health.value = await client.system().getHealth()
  } catch {
    health.value = null
  }
}

/** 运行时长格式化:秒 → x 天 x 小时 x 分 x 秒 */
function formatUptime (seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const parts: string[] = []
  if (days) parts.push(`${days} 天`)
  if (hours) parts.push(`${hours} 小时`)
  if (minutes) parts.push(`${minutes} 分`)
  if (secs || !parts.length) parts.push(`${secs} 秒`)
  return parts.join(' ')
}

function logout () {
  connected.value = false
  token.value = ''
  health.value = null
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
  if (!client || !connected.value) throw new Error('未连接 Mira 服务器')
  if (!currentLibraryId.value) throw new Error('未选择素材库')
  const id = kind === 'folder'
    ? await api().folders().createFolder(currentLibraryId.value, title, parentId, color, description, icon)
    : await api().tags().createTag(currentLibraryId.value, title, parentId, color, description, icon)
  await loadLibraryData()
  return id
}

/* ---------- BatchUploadDialog 演示 ---------- */
const showBatchUpload = ref(false)
const batchUploadResult = ref('')
// 打开时预选的文件夹/标签(树视图右键「上传到此处」设置;对话框关闭卸载内容,重开取最新值)
const batchUploadFolderId = ref('')
const batchUploadTagTitles = ref<string[]>([])
// 打开时预填的文件(MediaBrowser 菜单「导入文件」多选结果)
const batchUploadFiles = ref<File[]>([])

function openBatchUpload (folderId = '', tagTitles: string[] = [], files: File[] = []) {
  batchUploadFolderId.value = folderId
  batchUploadTagTitles.value = tagTitles
  batchUploadFiles.value = files
  showBatchUpload.value = true
}

/** 逐文件上传服务:连接走 SDK uploadFiles(单文件),未连接模拟进度(1s 0→100) */
const handleBatchUploadFile: BatchUploadFileService = async (item, onProgress) => {
  if (connected.value && client) {
    await client.files().uploadFiles([item.file], item.libraryId, {
      folderId: item.folderId,
      tags: item.tags,
      onUploadProgress: e => onProgress(e.percent ?? 0),
    })
    return
  }
  for (let percent = 10; percent <= 100; percent += 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    onProgress(percent)
  }
}

function handleBatchUploaded ({ total, failed }: { total: number; failed: number }) {
  batchUploadResult.value = `队列结束:共 ${total} 个${failed ? `,失败 ${failed} 个` : ',全部成功'}`
  // 上传完成后刷新文件列表(新文件立即可见)
  void mediaBrowserRef.value?.refresh()
}

/* ---------- ServerManagerView 服务器管理演示(内存 mock CRUD) ---------- */
const showServerManager = ref(false)
const demoServers = ref<ManagedServer[]>([
  { id: 's1', name: '本机开发', serverURL: 'http://localhost:8081', username: 'admin', password: '' },
  { id: 's2', name: '办公服务器', serverURL: 'http://192.168.1.10:8081', username: 'admin', password: '' },
])
const demoActiveId = ref('s1')

// mock 服务:列表存内存;test 模拟 600ms 延迟(localhost 视为可达);activate 直接成功
const serverServices: ServerManagerServices = {
  async add (input) {
    demoServers.value = [...demoServers.value, { id: `s${Date.now()}`, ...input }]
  },
  async edit (id, patch) {
    demoServers.value = demoServers.value.map(s => (s.id === id ? { ...s, ...patch } : s))
  },
  async remove (id) {
    demoServers.value = demoServers.value.filter(s => s.id !== id)
    if (demoActiveId.value === id) demoActiveId.value = demoServers.value[0]?.id ?? ''
  },
  async test (serverURL) {
    await new Promise(resolve => setTimeout(resolve, 600))
    return { ok: /localhost|127\.0\.0\.1/.test(serverURL) }
  },
  async activate (id) {
    demoActiveId.value = id
    return true
  },
}

/* ---------- LibrarySelect 服务器分组选择(Mira Server 卡片内) ---------- */
const selectServers = computed<LibrarySelectServer[]>(() =>
  [{ id: 'current', name: apiBaseUrl.value, libraries: libraries.value }])

/* ---------- MediaBrowser 顶部素材库选择器/服务器管理 ---------- */
// v-model 代理:未连接时回退 'mock'(走内存 mock 数据);切换后重拉文件夹/标签树
const demoLibraryId = computed({
  get: () => currentLibraryId.value || 'mock',
  set: (v: string) => {
    if (!v || v === currentLibraryId.value) return
    currentLibraryId.value = v
    void loadLibraryData()
  },
})

// 服务器管理入口(内存 mock CRUD,与「管理服务器…」演示共用)
const browserServerManager = computed<MediaBrowserServerManager>(() => ({
  servers: demoServers.value,
  activeServerId: demoActiveId.value,
  services: serverServices,
}))

/* ---------- LibraryTreeView 树演示 ---------- */
// 受控选择:传 v-model:selected 启用(文件夹单选 + 标签多选勾选)
const selectedFolder = ref<LibraryTreeNode[]>([])
const selectedTags = ref<LibraryTreeNode[]>([])
// 文件夹树视图:tree=经典树 / tiles=末级叶子层多行平铺(外部切换图标示例)
const folderView = ref<'tree' | 'tiles'>('tree')
const tagView = ref<'tree' | 'tiles'>('tree')

// 拖放文件处理演示:开=默认上传(模式见 dropUploadMode),关=fileDrop 自定义回调(alert 展示回调收到的拖放信息)
const useDefaultDropUpload = ref(true)
// 默认上传方式:direct=直接上传(立即调 API 传到落点) / dialog=弹批量上传对话框(upload.pick 预填)
const dropUploadMode = ref<LibraryTreeDropUploadMode>('direct')
const dropModeHint = computed(() => {
  if (!useDefaultDropUpload.value) return '走 fileDrop 回调，alert 展示拖放信息（文件/链接/落点）'
  return dropUploadMode.value === 'dialog'
    ? '走默认上传（dialog 模式）：经 upload.pick 打开批量上传对话框并预填文件与落点'
    : '走默认上传（direct 模式）：立即调 API 上传到落点文件夹/标签（进度与结果显示在下方上传卡片）'
})
// 自定义回调演示:alert 展示 payload 内容(实际宿主可自行路由到自己的上传逻辑)
function onTreeFileDrop ({ node, files, urls, target }: LibraryTreeFileDropPayload) {
  const lines = [
    node ? `落点节点：${node.title}（#${node.id}）` : '落点：根目录（空白区域）',
    target?.folderId != null ? `目标文件夹 id：${target.folderId}` : '',
    target?.tags?.length ? `目标标签：${target.tags.join('、')}` : '',
    files.length ? `文件（${files.length} 个）：\n${files.map(f => `  ${f.name}（${formatSize(f.size)}）`).join('\n')}` : '',
    urls.length ? `链接（${urls.length} 条）：\n  ${urls.join('\n  ')}` : '',
  ].filter(Boolean)
  window.alert(lines.join('\n'))
}

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

// 树视图服务:直接走 SDK 真实 CRUD(未连接时抛错,树视图显示加载失败)
function api (): MiraClient {
  if (!client) throw new Error('未连接 Mira 服务器')
  return client
}
const treeServices: LibraryTreeServices = {
  async listFolders () {
    return adaptRows(await api().folders().getAll(currentLibraryId.value))
  },
  async listTags () {
    return adaptRows(await api().tags().getAll(currentLibraryId.value))
  },
  async createNode (kind, libId, title, parentId, extra) {
    return kind === 'folder'
      ? api().folders().createFolder(libId, title, parentId, extra?.color, extra?.description, extra?.icon)
      : api().tags().createTag(libId, title, parentId, extra?.color, extra?.description, extra?.icon)
  },
  async deleteNode (kind, libId, id, deleteFiles) {
    return kind === 'folder'
      ? api().folders().deleteFolder(libId, id, deleteFiles)
      : api().tags().deleteTag(libId, id)
  },
  // 右键「编辑」:改名称/颜色/图标/描述
  async updateNode (kind, libId, id, title, extra) {
    const updates = { title, color: extra?.color, description: extra?.description, icon: extra?.icon }
    return kind === 'folder'
      ? api().folders().updateFolder(libId, id, updates)
      : api().tags().updateTag(libId, id, updates)
  },
  // 拖拽排序:同层 sort_index
  async updateSortIndex (kind, libId, items) {
    return kind === 'folder'
      ? api().folders().updateSortIndex(libId, items)
      : api().tags().updateSortIndex(libId, items)
  },
  // 拖拽跨层移动:改 parent_id(null=移到根,需绕过 SDK 的 number? 类型与桌面端一致)
  async moveNode (kind, libId, id, parentId) {
    const update = { parent_id: parentId } as any
    return kind === 'folder'
      ? api().folders().updateFolder(libId, id, update)
      : api().tags().updateTag(libId, id, update)
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

// 树视图上传服务:右键「上传到此处」与默认拖放 dialog 模式 → pick 打开批量上传对话框(预选文件夹,可预填拖放文件);
// direct 模式 → files 立即调 API 上传到拖放落点(不进暂存区)
const treeUpload: LibraryTreeUpload = {
  files (files, target) { void uploadDirect(files, target) },
  urls () {},
  pick (target, files) { openBatchUpload(target?.folderId ? String(target.folderId) : '', target?.tags ?? [], files ?? []) },
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
// mock 文件带详情字段(folder_id/tags/stars/website…),供三栏视图右侧 MediaDetail 演示编辑
const mockFiles = ref<(MediaBrowserItem & Partial<MediaDetailItem>)[]>(Array.from({ length: 1200 }, (_, i) => {
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
    folder_id: [undefined, 1, 2, 3][i % 4],
    tags: [[], ['灵感'], ['插画', '灵感'], []][i % 4],
    stars: i % 6,
    website: i % 3 === 0 ? `https://example.com/${i + 1}` : '',
    notes: i % 5 === 0 ? `演示备注 ${i + 1}` : '',
  }
}))

// 连接后走 SDK getFiles(服务端过滤/排序);未连接在内存 mock 上过滤/排序
const mediaServices: MediaBrowserServices = {
  // 过滤栏的文件夹/标签选择树:复用树演示的数据源(mock / SDK)
  listFolders: () => treeServices.listFolders(),
  listTags: () => treeServices.listTags(),
  async listFiles (filters) {
    if (connected.value && client) {
      const ret: any = await client.files().getFiles({
        libraryId: currentLibraryId.value,
        // 全量筛选字段转后端 snake_case(folder/tags/url/size_min/metadata_* 等,含 limit/offset 分页)
        filters: toApiFilters(filters ?? {}) as any,
      })
      // 服务端实际返回分页对象 { result, limit, offset, total }(SDK 类型声明为数组,与实际不符)
      const rows: any[] = Array.isArray(ret) ? ret : (ret?.result ?? [])
      // 数据库行为原始列:name 含扩展名,thumb 是 0/1 的"已生成缩略图"标志
      const items = rows.map(r => {
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
      // 返回 { items, total } 分页对象,MediaBrowser 底部显示翻页条
      return { items, total: Array.isArray(ret) ? items.length : (ret?.total ?? items.length) }
    }
    let list = [...mockFiles.value]
    if (filters?.title) list = list.filter(f => f.title.toLowerCase().includes(filters.title!.toLowerCase()))
    if (filters?.category) list = list.filter(f => f.mime_type?.startsWith(filters.category!))
    // 三栏视图左侧树选中的过滤:文件夹按 folder_id,标签把选中 id 映射回标题匹配
    if (filters?.folders?.length) list = list.filter(f => f.folder_id != null && filters.folders!.some(id => String(f.folder_id) === String(id)))
    if (filters?.tags?.length) {
      const titles = filters.tags!.map(id => tags.value.find(t => t.id === Number(id))?.title ?? String(id))
      list = list.filter(f => (f.tags ?? []).some(tag => titles.includes(tag)))
    }
    const key = filters?.sort || 'imported_at'
    const dir = filters?.order === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const va = key === 'name' ? a.title : (a[key as 'size' | 'imported_at'] ?? 0)
      const vb = key === 'name' ? b.title : (b[key as 'size' | 'imported_at'] ?? 0)
      return (va > vb ? 1 : -1) * dir
    })
    // mock 也走分页对象形态(本地切片),便于演示翻页条
    const offset = filters?.offset ?? 0
    const limit = filters?.limit ?? list.length
    return { items: list.slice(offset, offset + limit), total: list.length }
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
  // 瀑布流真实宽高(SDK getMetadataByIds);mock 数据自带 aspect 无需拉取
  async getMetadataByIds (ids) {
    if (!connected.value || !client) return []
    return client.files().getMetadataByIds(currentLibraryId.value, ids)
  },
}

function handleMediaClick (item: MediaBrowserItem) {
  console.log('[MediaBrowser demo] click:', item.title)
}

/* ---------- MediaDetail 详情服务(三栏视图右侧编辑) ---------- */
// mock 行定位:未连接时按 id 找内存文件
function mockRow (id: string | number) {
  return mockFiles.value.find(f => String(f.id) === String(id))
}

// 连接走 SDK 真实接口;未连接改内存 mock(编辑即时生效,列表刷新可见)
const detailServices: MediaDetailServices = {
  async getFileDetail (item) {
    if (connected.value && client) {
      const r: any = await client.files().getFile(currentLibraryId.value, item.id)
      return {
        ...item,
        folder_id: r.folder_id ?? null,
        tags: r.tags ?? [],
        stars: Number(r.stars) || 0,
        notes: r.notes || '',
        website: r.website || '',
        created_at: r.created_at,
        updated_at: r.updated_at,
      }
    }
    return mockRow(item.id) ?? null
  },
  async renameFile (item, name) {
    if (connected.value && client) return client.files().renameFile(currentLibraryId.value, item.id, name)
    const row = mockRow(item.id)
    if (row) row.title = name
  },
  async updateFile (item, patch) {
    if (connected.value && client) return client.files().updateFile(currentLibraryId.value, item.id, patch as any)
    const row = mockRow(item.id)
    if (row) Object.assign(row, patch)
  },
  async setFileFolder (items, folderId) {
    if (connected.value && client) {
      for (const item of items) {
        if (folderId == null) await client.folders().removeFileFromFolder(currentLibraryId.value, Number(item.id))
        else await client.folders().moveFileToFolder(currentLibraryId.value, Number(item.id), folderId)
      }
      return
    }
    const ids = new Set(items.map(i => String(i.id)))
    mockFiles.value.forEach(f => { if (ids.has(String(f.id))) f.folder_id = folderId ?? undefined })
  },
  async addTagsToFile (items, tagTitles) {
    if (connected.value && client) {
      for (const item of items) await client.tags().addTagsToFile(currentLibraryId.value, Number(item.id), tagTitles)
      return
    }
    const ids = new Set(items.map(i => String(i.id)))
    mockFiles.value.forEach(f => {
      if (ids.has(String(f.id))) f.tags = [...new Set([...(f.tags ?? []), ...tagTitles])]
    })
  },
  async setFileTags (item, tags) {
    if (connected.value && client) return client.tags().setFileTags({ libraryId: currentLibraryId.value, fileId: Number(item.id), tags })
    const row = mockRow(item.id)
    if (row) row.tags = tags
  },
  // 大图预览:连接走缩略图接口;未连接用渐变 SVG(放大版)
  getPreviewUrl (item) {
    if (connected.value) {
      if (!item.thumbnail_path) return undefined
      return `${apiBaseUrl.value}/api/files/thumb/${currentLibraryId.value}/${item.id}?token=${token.value}`
    }
    const [w, h] = (item.aspect || '1:1').split(':').map(Number)
    return gradientThumb(Number(item.id) - 1, w * 240, h * 240)
  },
}

/* ---------- MediaLibraryView 三栏视图演示(树/列表/详情聚合服务) ---------- */
const libraryViewServices: MediaLibraryServices = {
  tree: treeServices,
  media: mediaServices,
  detail: detailServices,
  dialog: treeDialog,
  upload: treeUpload,
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

/* ---------- DeviceListPicker 设备列表选择演示 ---------- */
const selectedDeviceId = ref<string | null>(null)
// mock 数据(未连接时):不同平台 userAgent 演示设备描述;disconnected 项会被组件过滤
const mockDevices: DeviceListItem[] = [
  { clientId: 'desktop-7f3a2b', status: 'connected', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/33.0.0', ipAddress: '192.168.1.23', lastActivity: new Date(Date.now() - 30_000).toISOString() },
  { clientId: 'phone-a91c', status: 'connected', userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36', ipAddress: '192.168.1.42', lastActivity: new Date(Date.now() - 5 * 60_000).toISOString() },
  { clientId: 'ipad-55ee', status: 'disconnected', userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4)', ipAddress: '192.168.1.77', lastActivity: new Date(Date.now() - 42 * 60_000).toISOString() },
]

// 连接后走 SDK devices().getByLibrary;未连接返回内存 mock
const deviceServices: DeviceListPickerServices = {
  async listDevices (libraryId) {
    if (connected.value && client) return client.devices().getByLibrary(libraryId)
    return mockDevices
  },
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

// 树拖放 direct 模式:立即调 API 上传到拖放落点(文件夹/标签),不进暂存区
async function uploadDirect (files: File[], target?: LibraryTreeUploadTarget) {
  if (!files.length) return
  if (!client || !connected.value) {
    window.alert('未连接服务器，无法直接上传（请先在顶部连接 Mira 服务器）')
    return
  }
  if (uploading.value) {
    window.alert('已有上传进行中，请稍候')
    return
  }
  uploading.value = true
  uploadPercent.value = 0
  uploadResult.value = ''
  try {
    await client.files().uploadFiles(files, currentLibraryId.value, {
      folderId: target?.folderId != null ? String(target.folderId) : undefined,
      tags: target?.tags?.length ? target.tags : undefined,
      onUploadProgress: e => { uploadPercent.value = e.percent ?? 0 },
    })
    uploadPercent.value = 100
    uploadResult.value = `已直接上传 ${files.length} 个文件${target?.folderId != null ? `（文件夹 #${target.folderId}）` : target?.tags?.length ? `（标签：${target.tags.join('、')}）` : ''}`
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
    <div class="mx-auto flex w-full flex-col gap-8 px-6 py-10">
      <header class="flex items-start justify-between gap-4">
        <h1 class="text-2xl font-semibold tracking-tight">mira-plugin-ui Demo</h1>
        <Button variant="outline" size="icon" aria-label="切换主题" @click="toggleDark">
          <Sun v-if="dark" class="size-4" />
          <Moon v-else class="size-4" />
        </Button>
      </header>

      <!-- 连接卡片：登录 / 会话 -->
      <section class="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
          <div class="flex flex-wrap items-center gap-2">
            <Server class="text-muted-foreground size-4" />
            <h2 class="text-base font-semibold">Mira Server</h2>
            <span
              class="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="connected ? 'bg-primary/10 text-primary' : 'ms-auto'"
            >
              {{ connected ? '已连接' : '未连接' }}
            </span>
            <!-- 卡片右上角:素材库选择器 + 断开连接 -->
            <div v-if="connected" class="ms-auto flex items-center gap-2">
              <div class="w-44">
                <LibrarySelect v-model="currentLibraryId" :servers="selectServers" @change="loadLibraryData" />
              </div>
              <Button variant="outline" size="sm" @click="logout">
                <LogOut class="size-4" /> 断开连接
              </Button>
            </div>
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
            <!-- 服务器信息(/health):状态/版本/运行时长等 -->
            <div class="bg-muted/40 grid gap-x-8 gap-y-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-xs">服务器地址</span>
                <code class="font-mono text-xs break-all">{{ apiBaseUrl }}</code>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-xs">状态</span>
                <span class="text-sm">{{ health?.status ?? '—' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-xs">版本</span>
                <span class="font-mono text-sm">{{ health?.version ?? '—' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-xs">运行时长</span>
                <span class="text-sm">{{ health ? formatUptime(health.uptime) : '—' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-xs">Node 版本</span>
                <span class="font-mono text-sm">{{ health?.nodeVersion ?? '—' }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-xs">运行环境</span>
                <span class="text-sm">{{ health?.environment ?? '—' }}</span>
              </div>
            </div>
          </template>
        </section>

      <!-- 对话框组件:并行按钮入口 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold">对话框组件</h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="showServerManager = true">管理服务器…</Button>
          <Button variant="outline" :disabled="!connected" @click="showSave = true">保存文档到…</Button>
          <Button variant="outline" @click="openBatchUpload()">批量上传…</Button>
        </div>
        <p class="text-muted-foreground text-xs">
          当前激活：{{ demoServers.find(s => s.id === demoActiveId)?.name || '无' }}（共 {{ demoServers.length }} 条）
        </p>
        <p v-if="saved" class="bg-muted text-muted-foreground rounded-lg p-3 font-mono text-sm break-all">{{ saved }}</p>
        <p v-if="batchUploadResult" class="bg-muted text-muted-foreground rounded-lg p-3 font-mono text-sm">{{ batchUploadResult }}</p>
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
        <BatchUploadDialog
          v-model:open="showBatchUpload"
          :libraries="connected ? libraries : [{ id: 1, name: 'Mock 素材库' }]"
          :folders="connected ? folders : [{ id: 101, title: 'Mock 文件夹' }]"
          :tags="connected ? tags : [{ id: 1, title: 'Mock 标签' }]"
          :initial-library-id="currentLibraryId"
          :initial-folder-id="batchUploadFolderId"
          :initial-tag-titles="batchUploadTagTitles"
          :initial-files="batchUploadFiles"
          :upload-file="handleBatchUploadFile"
          :create-node="handleCreateNode"
          @uploaded="handleBatchUploaded"
          @library-change="handleLibraryChange"
        />
        <ServerManagerDialog
          v-model:open="showServerManager"
          :servers="demoServers"
          :active-server-id="demoActiveId"
          :services="serverServices"
        />
      </section>

      <!-- DeviceListPicker 设备列表选择演示 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold">DeviceListPicker 设备列表选择</h2>
          <p class="text-muted-foreground text-xs">
            列出当前素材库已连接的设备（10s 轮询），单选目标设备；未连接时展示 mock 数据（已断开的设备被过滤）
          </p>
        </div>
        <div class="rounded-lg border p-2">
          <DeviceListPicker v-model="selectedDeviceId" :library-id="demoLibraryId" :services="deviceServices" />
        </div>
        <p class="text-muted-foreground text-xs">选中设备：{{ selectedDeviceId || '无' }}</p>
      </section>

      <!-- 树视图演示卡片(受控选择:为上传卡片选目标) -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-base font-semibold">LibraryTreeView 树视图</h2>
            <div class="flex flex-wrap items-center gap-2">
              <!-- 拖放文件处理模式切换:默认上传(经 upload 服务) ↔ 自定义回调(fileDrop,alert 展示拖放信息) -->
              <button
                type="button"
                class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
                :class="{ 'border-primary text-primary': !useDefaultDropUpload }"
                @click="useDefaultDropUpload = !useDefaultDropUpload"
              >拖放上传：{{ useDefaultDropUpload ? '默认上传' : '自定义回调' }}</button>
              <!-- 默认上传方式(仅默认上传时可用):直接上传 ↔ 弹出对话框 -->
              <button
                type="button"
                class="rounded-md border px-2 py-1 text-[11px] leading-none transition-colors duration-100"
                :class="[
                  useDefaultDropUpload && dropUploadMode === 'dialog' && 'border-primary text-primary',
                  useDefaultDropUpload
                    ? 'cursor-pointer border-border bg-accent text-muted-foreground hover:text-foreground'
                    : 'cursor-not-allowed border-border border-dashed text-muted-foreground opacity-50',
                ]"
                :disabled="!useDefaultDropUpload"
                :title="dropUploadMode === 'direct' ? '切换为弹出对话框' : '切换为直接上传'"
                @click="dropUploadMode = dropUploadMode === 'direct' ? 'dialog' : 'direct'"
              >默认方式：{{ dropUploadMode === 'direct' ? '直接上传' : '弹出对话框' }}</button>
            </div>
          </div>
          <p class="text-muted-foreground text-xs">拖文件到树节点：{{ dropModeHint }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex min-w-0 flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs font-medium">文件夹树</span>
              <!-- 外部切换视图图标:tree ↔ tiles(平铺视图由 LibraryTreeView 的 view prop 受控) -->
              <button
                type="button"
                class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
                :class="folderView === 'tiles' && 'text-primary'"
                :title="folderView === 'tree' ? '切换为平铺视图' : '切换为树视图'"
                @click="folderView = folderView === 'tree' ? 'tiles' : 'tree'"
              >
                <component :is="folderView === 'tree' ? LayoutGrid : ListTree" class="size-4" />
              </button>
            </div>
            <div class="h-96 overflow-hidden rounded-lg border">
              <LibraryTreeView
                mode="folder"
                :view="folderView"
                :library-id="currentLibraryId"
                :services="treeServices"
                :dialog="treeDialog"
                :upload="treeUpload"
                :file-drop="onTreeFileDrop"
                :use-default-drop-upload="useDefaultDropUpload"
                :default-drop-upload-mode="dropUploadMode"
                :selected="selectedFolder"
                @update:selected="selectedFolder = $event"
              />
            </div>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs font-medium">标签树</span>
              <button
                type="button"
                class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90"
                :class="tagView === 'tiles' && 'text-primary'"
                :title="tagView === 'tree' ? '切换为平铺视图' : '切换为树视图'"
                @click="tagView = tagView === 'tree' ? 'tiles' : 'tree'"
              >
                <component :is="tagView === 'tree' ? LayoutGrid : ListTree" class="size-4" />
              </button>
            </div>
            <div class="h-96 overflow-hidden rounded-lg border">
              <LibraryTreeView
                mode="tag"
                :view="tagView"
                :library-id="currentLibraryId"
                :services="treeServices"
                :dialog="treeDialog"
                :upload="treeUpload"
                :file-drop="onTreeFileDrop"
                :use-default-drop-upload="useDefaultDropUpload"
                :default-drop-upload-mode="dropUploadMode"
                :selected="selectedTags"
                @update:selected="selectedTags = $event"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- MediaBrowser 文件浏览器演示:网格/瀑布流切换 + 框选 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold">MediaBrowser 文件浏览器</h2>
          <p v-if="selectedMedia.length" class="text-primary text-xs">
            已选 {{ selectedMedia.length }} 项：{{ selectedMedia.map(i => i.title).join('、') }}
          </p>
        </div>
        <div class="h-[32rem] overflow-hidden rounded-lg border">
          <MediaBrowser
            ref="mediaBrowserRef"
            v-model:library-id="demoLibraryId"
            v-model:view="mediaView"
            v-model:selected="selectedMedia"
            :services="mediaServices"
            :library-servers="connected ? selectServers : undefined"
            :server-manager="browserServerManager"
            @item-click="handleMediaClick"
            @delete-selection="handleMediaDelete"
            @import-files="files => openBatchUpload('', [], files)"
          />
        </div>
      </section>

      <!-- MediaLibraryView 三栏视图演示:左(文件夹树+标签树) / 中(MediaBrowser) / 右(MediaDetail) -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold">MediaLibraryView 三栏素材库视图</h2>
          <p class="text-muted-foreground text-xs">
            左侧选择文件夹/标签自动过滤中间列表；中间选择文件（支持多选）在右侧查看/编辑详情（名称/网址/备注/评分/标签/文件夹，保存后即时生效并刷新列表）
          </p>
        </div>
        <div class="h-[50rem] overflow-hidden rounded-lg border">
          <MediaLibraryView
            v-model:library-id="demoLibraryId"
            :services="libraryViewServices"
            :library-servers="connected ? selectServers : undefined"
            :server-manager="browserServerManager"
            @import-files="files => openBatchUpload('', [], files)"
          />
        </div>
      </section>

      <!-- Dropzone 独立卡片:文件暂存 -->
      <section class="bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold">Dropzone 拖放区</h2>
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
          <h2 class="text-base font-semibold">真实上传</h2>
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
      </section>
    </div>
  </main>
</template>
