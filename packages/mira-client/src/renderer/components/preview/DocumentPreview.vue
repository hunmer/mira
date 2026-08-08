<template>
  <div class="w-full h-full flex flex-col bg-muted">
    <div class="flex flex-col h-full">
      <!-- 顶部工具栏 -->
      <div class="bg-white px-6 py-4 border-b border-border flex items-center space-x-4">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          title="返回"
          @click="goBack"
        >
          <span class="material-icons text-muted-foreground">arrow_back</span>
        </button>
        <input v-if="isRenaming" ref="titleInput" v-model="editableTitle" :disabled="isRenameSaving"
          class="min-w-0 flex-1 border-b border-primary bg-transparent px-1 py-1 text-foreground outline-none"
          @blur="commitRename" @keydown.enter.prevent="commitRename" @keydown.esc.prevent="cancelRename" />
        <button v-else class="min-w-0 flex-1 truncate text-left text-foreground hover:text-primary" title="点击重命名"
          @click="startRename">
          {{ displayTitle }}
        </button>
        <span v-if="fileInfo.size" class="text-sm text-muted-foreground flex-shrink-0">{{ formatFileSize(fileInfo.size) }}</span>
        <button v-if="isMarkdown" :disabled="isSaving" @click="saveMarkdown"
          class="ml-auto bg-primary text-white border-none px-4 py-2 rounded cursor-pointer disabled:opacity-50 flex-shrink-0">
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>

      <!-- PDF预览 -->
      <div v-if="isPDF" ref="pdfContainer" class="pdfobject-container flex-1 min-h-0" />

      <!-- Markdown 编辑器 -->
      <div v-else-if="isMarkdown" class="flex-1 min-h-0 bg-white overflow-hidden">
        <MdEditor v-model="textContent" class="h-full" style="height: 100%" />
      </div>

      <!-- 文本文件预览 -->
      <div v-else-if="isTextFile" class="flex-1 overflow-auto bg-white m-4 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
        <div v-if="textContent" class="text-content p-8">
          <pre>{{ textContent }}</pre>
        </div>
        <div v-else class="flex justify-center items-center flex-1 text-destructive text-center">
          <p>无法加载文本内容</p>
        </div>
      </div>

      <!-- 其他文档类型 -->
      <div v-else class="flex flex-col justify-center items-center flex-1 gap-4">
        <div class="text-6xl opacity-50">📄</div>
        <p>此文档类型暂不支持预览</p>
        <button v-if="documentUrl" @click="downloadFile" class="bg-primary text-white border-none px-6 py-3 rounded cursor-pointer text-base hover:bg-primary">
          下载文件
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as PDFObject from 'pdfobject'
import { useRouter } from 'vue-router'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { miraSDKService } from '../../services/MiraSDKService'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  error: [message: string]
  renamed: [name: string]
}>()

const router = useRouter()

const goBack = (): void => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const textContent = ref('')
const isSaving = ref(false)
const pdfContainer = ref<HTMLElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const displayTitle = ref(props.fileInfo.title || props.fileInfo.name || '未知文档')
const editableTitle = ref(displayTitle.value)
const isRenaming = ref(false)
const isRenameSaving = ref(false)

const startRename = async (): Promise<void> => {
  editableTitle.value = displayTitle.value
  isRenaming.value = true
  await nextTick()
  titleInput.value?.focus()
  titleInput.value?.select()
}

const cancelRename = (): void => {
  isRenaming.value = false
  editableTitle.value = displayTitle.value
}

const commitRename = async (): Promise<void> => {
  const name = editableTitle.value.trim()
  if (!name || name === displayTitle.value || isRenameSaving.value) return cancelRename()

  try {
    isRenameSaving.value = true
    let result: any
    try {
      result = await miraSDKService.renameFile(props.fileInfo.libraryId, props.fileInfo.id, name)
    } catch (sdkError) {
      if (!documentUrl.value) throw sdkError
      const renameUrl = new URL(documentUrl.value)
      renameUrl.pathname = '/api/files/rename'
      const response = await fetch(renameUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId: props.fileInfo.libraryId, fileId: props.fileInfo.id, name })
      })
      if (!response.ok) throw new Error(`重命名失败 (${response.status})`)
      result = (await response.json()).data
    }
    const resolvedName = result?.name || result?.title || name
    displayTitle.value = resolvedName
    editableTitle.value = resolvedName
    isRenaming.value = false
    emit('renamed', resolvedName)
  } catch (error) {
    console.error('重命名文件失败:', error)
    emit('error', '重命名文件失败')
  } finally {
    isRenameSaving.value = false
  }
}

const documentUrl = computed(() => {
  if (!props.fileInfo) return ''

  if (props.fileInfo.url) {
    return props.fileInfo.url
  }

  if (props.fileInfo.path) {
    return props.fileInfo.path
  }

  return ''
})

const isPDF = computed(() => {
  const mimeType = props.fileInfo?.mimeType?.toLowerCase() || ''
  const fileName = (props.fileInfo?.name || props.fileInfo?.title || '').toLowerCase()
  return mimeType.includes('pdf') || fileName.endsWith('.pdf')
})

const isTextFile = computed(() => {
  const mimeType = props.fileInfo?.mimeType?.toLowerCase() || ''
  const fileName = (props.fileInfo?.name || props.fileInfo?.title || '').toLowerCase()

  return mimeType.startsWith('text/') ||
         ['txt', 'md', 'json', 'xml', 'csv', 'log'].some(ext => fileName.endsWith(`.${ext}`))
})

const isMarkdown = computed(() => {
  const fileName = (props.fileInfo?.name || props.fileInfo?.title || '').toLowerCase()
  return fileName.endsWith('.md') || props.fileInfo?.mimeType?.toLowerCase() === 'text/markdown'
})

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const embedPDF = async (): Promise<void> => {
  if (!isPDF.value) return
  if (!documentUrl.value) return emit('error', '无法加载 PDF 文件')
  await nextTick()
  if (pdfContainer.value) {
    PDFObject.embed(documentUrl.value, pdfContainer.value, { width: '100%', height: '100%' })
  }
}

const downloadFile = (): void => {
  if (documentUrl.value) {
    const link = document.createElement('a')
    link.href = documentUrl.value
    link.download = props.fileInfo.name || props.fileInfo.title || 'document'
    link.click()
  }
}

const loadTextContent = async (): Promise<void> => {
  if (!isTextFile.value || (!documentUrl.value && !(props.fileInfo.libraryId && props.fileInfo.id))) return

  try {
    // 刷新预览页时 SDK 可能尚未登录，优先使用路由中已有的带 token URL。
    if (documentUrl.value) {
      const response = await fetch(documentUrl.value)
      if (response.ok) {
        textContent.value = await response.text()
        return
      }
    }
    if (props.fileInfo.libraryId && props.fileInfo.id) {
      const blob = await miraSDKService.downloadFile(props.fileInfo.libraryId, props.fileInfo.id)
      textContent.value = await blob.text()
      return
    }
    throw new Error('加载文本失败')
  } catch (error) {
    console.error('加载文本内容失败:', error)
    emit('error', '加载文本内容失败')
  }
}

const saveMarkdown = async (): Promise<void> => {
  if (!isMarkdown.value || !props.fileInfo.libraryId || !props.fileInfo.id || isSaving.value) return

  try {
    isSaving.value = true
    const name = props.fileInfo.name || props.fileInfo.title || 'document.md'
    try {
      await miraSDKService.writeFile(props.fileInfo.libraryId, props.fileInfo.id, textContent.value, {
        name,
        contentType: 'text/markdown'
      })
    } catch (sdkError) {
      if (!documentUrl.value) throw sdkError
      const writeUrl = new URL(documentUrl.value)
      writeUrl.pathname = '/api/files/upload'
      const formData = new FormData()
      formData.append('files', new File([textContent.value], name, { type: 'text/markdown' }))
      formData.append('libraryId', props.fileInfo.libraryId)
      formData.append('fileId', props.fileInfo.id)
      formData.append('name', name)
      const response = await fetch(writeUrl, { method: 'POST', body: formData })
      if (!response.ok) throw new Error(`保存失败 (${response.status})`)
    }
  } catch (error) {
    console.error('保存 Markdown 失败:', error)
    emit('error', '保存 Markdown 失败')
  } finally {
    isSaving.value = false
  }
}
onMounted(() => {
  if (isPDF.value) {
    embedPDF()
  } else if (isTextFile.value) {
    loadTextContent()
  }
})

watch(documentUrl, () => embedPDF())
watch(() => props.fileInfo.title || props.fileInfo.name, (name) => {
  if (!isRenaming.value && name) {
    displayTitle.value = name
    editableTitle.value = name
  }
})

onBeforeUnmount(() => {
  if (documentUrl.value.startsWith('blob:')) URL.revokeObjectURL(documentUrl.value)
})
</script>

<style scoped>
.text-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
}
</style>
