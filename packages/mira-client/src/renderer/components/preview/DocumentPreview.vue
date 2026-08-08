<template>
  <div class="w-full h-full flex flex-col bg-muted">
    <div class="flex flex-col h-full">
      <div class="bg-white px-8 py-4 border-b border-border">
        <h3 class="m-0 mb-2 text-foreground">{{ fileInfo.title || fileInfo.name || '未知文档' }}</h3>
        <div class="flex gap-4 text-sm text-muted-foreground">
          <span v-if="fileInfo.mimeType" class="px-2 py-1 bg-muted rounded">{{ fileInfo.mimeType }}</span>
          <span v-if="fileInfo.size" class="px-2 py-1 bg-muted rounded">{{ formatFileSize(fileInfo.size) }}</span>
          <button v-if="isMarkdown" :disabled="isSaving" @click="saveMarkdown"
            class="ml-auto bg-primary text-white border-none px-4 py-2 rounded cursor-pointer disabled:opacity-50">
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <!-- PDF预览 -->
      <div v-if="isPDF" class="flex-1 relative">
        <iframe
          v-if="documentUrl"
          :src="documentUrl"
          class="w-full h-full border-none"
          @error="onDocumentError"
        ></iframe>
        <div v-else class="flex justify-center items-center flex-1 text-destructive text-center">
          <p>无法加载PDF文件</p>
        </div>
      </div>

      <!-- Markdown 编辑器 -->
      <div v-else-if="isMarkdown" class="flex-1 min-h-0 bg-white m-4 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)] overflow-hidden">
        <MdEditor v-model="textContent" class="h-full" />
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { miraSDKService } from '../../services/MiraSDKService'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  error: [message: string]
}>()

const textContent = ref('')
const isSaving = ref(false)

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

const onDocumentError = (): void => {
  emit('error', '文档加载失败')
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
    if (props.fileInfo.libraryId && props.fileInfo.id) {
      const blob = await miraSDKService.downloadFile(props.fileInfo.libraryId, props.fileInfo.id)
      textContent.value = await blob.text()
      return
    }
    const response = await fetch(documentUrl.value)
    if (!response.ok) throw new Error('加载文本失败')
    textContent.value = await response.text()
  } catch (error) {
    console.error('加载文本内容失败:', error)
    emit('error', '加载文本内容失败')
  }
}

const saveMarkdown = async (): Promise<void> => {
  if (!isMarkdown.value || !props.fileInfo.libraryId || !props.fileInfo.id || isSaving.value) return

  try {
    isSaving.value = true
    await miraSDKService.writeFile(props.fileInfo.libraryId, props.fileInfo.id, textContent.value, {
      name: props.fileInfo.name || props.fileInfo.title || 'document.md',
      contentType: 'text/markdown'
    })
  } catch (error) {
    console.error('保存 Markdown 失败:', error)
    emit('error', '保存 Markdown 失败')
  } finally {
    isSaving.value = false
  }
}
onMounted(() => {
  if (isTextFile.value) {
    loadTextContent()
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
