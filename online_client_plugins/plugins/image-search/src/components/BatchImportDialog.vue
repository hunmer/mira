<script setup lang="ts">
import { ref, watch } from 'vue'
import { MiraClient } from 'mira-app-core/shared/sdk'
import BatchUploadDialog from 'mira-plugin-ui/src/BatchUploadDialog.vue'
import type { BatchUploadFileService } from 'mira-plugin-ui/src/types'
import { resolveMiraServerConfig } from 'mira-plugin-ui/library'
import { logError } from '@/lib/mira'
import { t } from '@/lib/i18n'

/**
 * 批量导入素材库对话框：mira-plugin-ui BatchUploadDialog 包装。
 * 宿主（ResultPanel）先把选中的 Pinterest 结果抓取为 File[] 传入；
 * 本组件负责 server 直连数据（素材库/文件夹/标签树）与上传/新建节点服务（SDK）。
 */
const props = defineProps<{
  open: boolean
  /** 待导入文件（ResultPanel 抓取原图转成） */
  files: File[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'uploaded', value: { total: number; failed: number; libraryId?: string; folderId?: string; tags?: string[] }): void
}>()

interface Library { id: string | number; name?: string; title?: string }
interface TreeItem { id: string | number; title?: string; name?: string; parent_id?: string | number | null; color?: number }

const libraries = ref<Library[]>([])
const folders = ref<TreeItem[]>([])
const tags = ref<TreeItem[]>([])
// 表单当前库（library-change 同步，createNode 需要知道目标库；缺省首个）
const currentLibraryId = ref('')

let client: MiraClient | null = null

async function loadTree(libraryId: string) {
  if (!client || !libraryId) return
  folders.value = ((await client.folders().getAll(libraryId)) as any[]) || []
  tags.value = ((await client.tags().getAll(libraryId)) as any[]) || []
}

/** 鉴权直连 client（query → localStorage 自动解析，见 mira-plugin-ui serverAuth） */
function createClient(): MiraClient | null {
  const { server, token } = resolveMiraServerConfig()
  if (!server || !token) return null
  const client = new MiraClient(server)
  client.setToken(token)
  return client
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    client = createClient()
    if (!client) {
      window.alert(t('main.selection.noServer'))
      emit('update:open', false)
      return
    }
    try {
      if (!libraries.value.length) {
        libraries.value = ((await client.libraries().getAll()) as any[]) || []
      }
      const first = String(libraries.value[0]?.id || '')
      currentLibraryId.value = first
      await loadTree(first)
    } catch (error) {
      logError('[mira-pinterest-search-v2] load libraries failed:', error)
      window.alert(t('main.selection.loadFailed', { error: (error as Error)?.message || String(error) }))
      emit('update:open', false)
    }
  },
)

/** 上传服务：SDK uploadFiles（单文件入队，进度回传表单） */
const uploadFile: BatchUploadFileService = async (item, onProgress) => {
  if (!client) throw new Error(t('main.selection.noServer'))
  await client.files().uploadFiles([item.file], item.libraryId, {
    folderId: item.folderId,
    tags: item.tags,
    onUploadProgress: (event) => onProgress(event.percent ?? 0),
  })
}

/** 树内「新增」节点：创建成功返回新 id 供表单自动选中 */
async function createNode(payload: { kind: 'folder' | 'tag'; parentId: number; title: string; description?: string; color?: number; icon?: string }): Promise<number | undefined> {
  if (!client || !currentLibraryId.value) return undefined
  const id = payload.kind === 'folder'
    ? await client.folders().createFolder(currentLibraryId.value, payload.title, payload.parentId, payload.color, payload.description, payload.icon)
    : await client.tags().createTag(currentLibraryId.value, payload.title, payload.parentId, payload.color, payload.description, payload.icon)
  await loadTree(currentLibraryId.value)
  return id as number
}

function onLibraryChange(libraryId: string) {
  currentLibraryId.value = libraryId
  void loadTree(libraryId)
}
</script>

<template>
  <BatchUploadDialog
    :open="props.open"
    :libraries="libraries"
    :folders="folders"
    :tags="tags"
    :initial-files="props.files"
    :upload-file="uploadFile"
    :create-node="createNode"
    :title="t('main.selection.dialogTitle')"
    :description="t('main.selection.dialogDescription')"
    :submit-text="t('main.selection.submit')"
    @update:open="emit('update:open', $event)"
    @uploaded="emit('uploaded', $event)"
    @library-change="onLibraryChange"
  />
</template>
