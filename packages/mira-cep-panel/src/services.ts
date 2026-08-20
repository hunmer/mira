/**
 * Mira Server 数据服务:移植自 mira-plugin-ui demo App.vue 的 SDK 接线
 * (treeServices / mediaServices / detailServices),供 MediaLibraryView 三栏视图消费。
 * CEP 内无 vite 代理,serverURL 直接填局域网/本机地址(manifest 已放开跨域)。
 */
import { computed, ref } from 'vue'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { toApiFilters } from 'mira-plugin-ui/library'
import type {
  LibraryFlatItem,
  LibrarySelectServer,
  LibraryTreeDialog,
  LibraryTreeServices,
  MediaBrowserItem,
  MediaBrowserServices,
  MediaDetailServices,
} from 'mira-plugin-ui/library'
import type { BatchUploadFileService } from 'mira-plugin-ui/src/types'

const STORE_KEY = 'mira-cep-panel'

export function useMira() {
  const serverURL = ref('http://127.0.0.1:8081')
  const username = ref('admin')
  const password = ref('admin123')
  const token = ref('')
  const connected = ref(false)
  const connecting = ref(false)
  const loadError = ref('')

  const libraries = ref<any[]>([])
  const folders = ref<any[]>([])
  const tags = ref<any[]>([])
  const currentLibraryId = ref('')
  let client: MiraClient | null = null

  function restore() {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    serverURL.value = saved.serverURL || serverURL.value
    username.value = saved.username || username.value
    token.value = saved.token || ''
    if (token.value) void connect(token.value)
  }

  function persist() {
    localStorage.setItem(STORE_KEY, JSON.stringify({ serverURL: serverURL.value, username: username.value, token: token.value }))
  }

  async function connect(existingToken?: string) {
    connecting.value = true
    loadError.value = ''
    try {
      client = new MiraClient(serverURL.value)
      if (existingToken) client.setToken(existingToken)
      else {
        const response = await client.auth().login(username.value, password.value)
        token.value = response.accessToken || ''
      }
      libraries.value = (await client.libraries().getAll()) as any[]
      currentLibraryId.value ||= String(libraries.value[0]?.id || '')
      await loadLibraryData()
      connected.value = true
      persist()
    } catch (error: any) {
      loadError.value = error?.response?.data?.message || error?.message || String(error)
      connected.value = false
    } finally {
      connecting.value = false
    }
  }

  async function loadLibraryData() {
    if (!client || !currentLibraryId.value) return
    folders.value = (await client.folders().getAll(currentLibraryId.value)) as any[]
    tags.value = (await client.tags().getAll(currentLibraryId.value).catch(() => [])) as any[]
  }

  function logout() {
    connected.value = false
    token.value = ''
    libraries.value = []
    folders.value = []
    tags.value = []
    client = null
    localStorage.removeItem(STORE_KEY)
  }

  function adaptRows(rows: any[]): LibraryFlatItem[] {
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

  const treeServices: LibraryTreeServices = {
    async listFolders() {
      return adaptRows(folders.value)
    },
    async listTags() {
      return adaptRows(tags.value)
    },
    async createNode(kind, libId, title, parentId, extra) {
      if (!client) throw new Error('未连接服务器')
      return kind === 'folder'
        ? client.folders().createFolder(libId, title, parentId, extra?.color, extra?.description, extra?.icon)
        : client.tags().createTag(libId, title, parentId, extra?.color, extra?.description, extra?.icon)
    },
    async deleteNode(kind, libId, id, deleteFiles) {
      if (!client) throw new Error('未连接服务器')
      return kind === 'folder'
        ? client.folders().deleteFolder(libId, id, deleteFiles)
        : client.tags().deleteTag(libId, id)
    },
    async updateNode(kind, libId, id, title, extra) {
      if (!client) throw new Error('未连接服务器')
      const updates = { title, color: extra?.color, description: extra?.description, icon: extra?.icon }
      return kind === 'folder'
        ? client.folders().updateFolder(libId, id, updates)
        : client.tags().updateTag(libId, id, updates)
    },
    async updateSortIndex(kind, libId, items) {
      if (!client) throw new Error('未连接服务器')
      return kind === 'folder'
        ? client.folders().updateSortIndex(libId, items)
        : client.tags().updateSortIndex(libId, items)
    },
    async moveNode(kind, libId, id, parentId) {
      if (!client) throw new Error('未连接服务器')
      const update = { parent_id: parentId } as any
      return kind === 'folder'
        ? client.folders().updateFolder(libId, id, update)
        : client.tags().updateTag(libId, id, update)
    },
  }

  const mediaServices: MediaBrowserServices = {
    listFolders: () => treeServices.listFolders(),
    listTags: () => treeServices.listTags(),
    async listFiles(filters) {
      if (!client) throw new Error('未连接服务器')
      const ret: any = await client.files().getFiles({
        libraryId: currentLibraryId.value,
        filters: toApiFilters(filters ?? {}) as any,
      })
      // 服务端返回分页对象 { result, limit, offset, total }(SDK 类型声明为数组,与实际不符)
      const rows: any[] = Array.isArray(ret) ? ret : (ret?.result ?? [])
      const items: MediaBrowserItem[] = rows.map(r => {
        const name = r.title ?? r.name ?? ''
        const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
        return {
          id: r.id,
          title: name,
          size: r.size,
          extension,
          imported_at: r.imported_at,
          // 数据库行为原始列,thumb 是 0/1 的"已生成缩略图"标志;未生成时留空,组件回退类型图标
          thumbnail_path: r.thumb ? 'generated' : undefined,
        }
      })
      return { items, total: Array.isArray(ret) ? items.length : (ret?.total ?? items.length) }
    },
    getThumbUrl(item) {
      if (!item.thumbnail_path) return undefined
      // img 标签无法带 header,token 拼 query
      return `${serverURL.value}/api/files/thumb/${currentLibraryId.value}/${item.id}?token=${token.value}`
    },
    async getMetadataByIds(ids) {
      if (!client) return []
      return client.files().getMetadataByIds(currentLibraryId.value, ids)
    },
  }

  const detailServices: MediaDetailServices = {
    async getFileDetail(item) {
      if (!client) throw new Error('未连接服务器')
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
    },
    async renameFile(item, name) {
      if (!client) throw new Error('未连接服务器')
      return client.files().renameFile(currentLibraryId.value, item.id, name)
    },
    async updateFile(item, patch) {
      if (!client) throw new Error('未连接服务器')
      return client.files().updateFile(currentLibraryId.value, item.id, patch as any)
    },
    async setFileFolder(items, folderId) {
      if (!client) throw new Error('未连接服务器')
      for (const item of items) {
        if (folderId == null) await client.folders().removeFileFromFolder(currentLibraryId.value, Number(item.id))
        else await client.folders().moveFileToFolder(currentLibraryId.value, Number(item.id), folderId)
      }
    },
    async addTagsToFile(items, tagTitles) {
      if (!client) throw new Error('未连接服务器')
      for (const item of items) await client.tags().addTagsToFile(currentLibraryId.value, Number(item.id), tagTitles)
    },
    async setFileTags(item, tagTitles) {
      if (!client) throw new Error('未连接服务器')
      return client.tags().setFileTags({ libraryId: currentLibraryId.value, fileId: Number(item.id), tags: tagTitles })
    },
    getPreviewUrl(item) {
      if (!item.thumbnail_path) return undefined
      return `${serverURL.value}/api/files/thumb/${currentLibraryId.value}/${item.id}?token=${token.value}`
    },
  }

  // 弹窗适配:CEP 内用原生 alert/confirm/prompt(宿主可换成自己的 Dialog 系统)
  const dialog: LibraryTreeDialog = {
    alert: async o => { window.alert(`${o.title ?? ''}\n${o.message ?? ''}`.trim()) },
    confirm: async o => window.confirm(o.message ?? ''),
    prompt: async o => window.prompt(o.title ?? '', o.defaultValue ?? ''),
    confirmCheck: async o => {
      const ok = window.confirm(o.message ?? '')
      return { ok, checked: ok && window.confirm(o.checkboxLabel ?? '') }
    },
  }

  return {
    serverURL, username, password, token, connected, connecting, loadError,
    libraries, folders, tags, currentLibraryId,
    restore, connect, logout, loadLibraryData,
    treeServices, mediaServices, detailServices, dialog,
    libraryId: currentLibraryId,
    libraryServers: computed<LibrarySelectServer[]>(() => [
      { id: 'current', name: serverURL.value, libraries: libraries.value },
    ]),
    /** 上传服务:走 SDK uploadFiles,进度回传给 BatchUploadForm */
    uploadFile: (async (item, onProgress) => {
      if (!client) throw new Error('未连接服务器')
      await client.files().uploadFiles([item.file], item.libraryId, {
        folderId: item.folderId,
        tags: item.tags,
        onUploadProgress: e => onProgress(e.percent ?? 0),
      })
    }) as BatchUploadFileService,
    /** 上传对话框内切换素材库:同步当前库并重拉文件夹/标签数据 */
    async handleLibraryChange(libraryId: string) {
      if (!connected.value || libraryId === currentLibraryId.value) return
      currentLibraryId.value = libraryId
      await loadLibraryData()
    },
    /** 上传对话框「新增节点」:创建成功返回新 id 供组件自动选中 */
    async handleCreateNode({ kind, parentId, title, color, description, icon }: {
      kind: 'folder' | 'tag'; parentId: number; title: string; color?: number; description?: string; icon?: string
    }): Promise<number | undefined> {
      if (!currentLibraryId.value) throw new Error('未选择素材库')
      const id = kind === 'folder'
        ? await treeServices.createNode('folder', currentLibraryId.value, title, parentId, { color, description, icon })
        : await treeServices.createNode('tag', currentLibraryId.value, title, parentId, { color, description, icon })
      await loadLibraryData()
      return id as number
    },
  }
}

export type MiraContext = ReturnType<typeof useMira>
