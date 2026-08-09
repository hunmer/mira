<template>
  <div class="w-full h-full flex flex-col bg-muted">
    <div class="flex flex-col h-full">
      <PreviewHeader :file-info="fileInfo" :save-visible="isMarkdown" :saving="isSaving" @save="saveMarkdown"
        @renamed="$emit('renamed', $event)" @error="$emit('error', $event)" />

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
          <p>{{ $t('preview.documentPreview.noTextContent') }}</p>
        </div>
      </div>

      <!-- 其他文档类型 -->
      <div v-else class="flex flex-col justify-center items-center flex-1 gap-4">
        <div class="text-6xl opacity-50">📄</div>
        <p>{{ $t('preview.documentPreview.unsupportedType') }}</p>
        <button v-if="documentUrl" @click="downloadFile" class="bg-primary text-white border-none px-6 py-3 rounded cursor-pointer text-base hover:bg-primary">
          {{ $t('preview.documentPreview.download') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as PDFObject from 'pdfobject'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { miraSDKService } from '../../services/MiraSDKService'
import PreviewHeader from './PreviewHeader.vue'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const { t } = useI18n()
const emit = defineEmits<{
  error: [message: string]
  renamed: [name: string]
}>()

const textContent = ref('')
const isSaving = ref(false)
const pdfContainer = ref<HTMLElement | null>(null)
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

const embedPDF = async (): Promise<void> => {
  if (!isPDF.value) return
  if (!documentUrl.value) return emit('error', t('preview.documentPreview.loadPdfFailed'))
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
    throw new Error('Failed to load text content')
  } catch (error) {
    console.error('加载文本内容失败:', error)
    emit('error', t('preview.documentPreview.loadTextFailed'))
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
      if (!response.ok) throw new Error(t('preview.documentPreview.saveFailed', { status: response.status }))
    }
  } catch (error) {
    console.error('保存 Markdown 失败:', error)
    emit('error', t('preview.documentPreview.saveMarkdownFailed'))
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
