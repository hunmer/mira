<template>
  <div class="document-preview">
    <div class="document-container">
      <div class="document-info">
        <h3>{{ fileInfo.title || fileInfo.name || '未知文档' }}</h3>
        <div class="meta-info">
          <span v-if="fileInfo.mimeType" class="mime-type">{{ fileInfo.mimeType }}</span>
          <span v-if="fileInfo.size" class="file-size">{{ formatFileSize(fileInfo.size) }}</span>
        </div>
      </div>
      
      <!-- PDF预览 -->
      <div v-if="isPDF" class="pdf-container">
        <iframe 
          v-if="documentUrl"
          :src="documentUrl"
          class="pdf-viewer"
          @error="onDocumentError"
        ></iframe>
        <div v-else class="error">
          <p>无法加载PDF文件</p>
        </div>
      </div>
      
      <!-- 文本文件预览 -->
      <div v-else-if="isTextFile" class="text-container">
        <div v-if="textContent" class="text-content">
          <pre>{{ textContent }}</pre>
        </div>
        <div v-else class="error">
          <p>无法加载文本内容</p>
        </div>
      </div>
      
      <!-- 其他文档类型 -->
      <div v-else class="generic-document">
        <div class="document-icon">📄</div>
        <p>此文档类型暂不支持预览</p>
        <button v-if="documentUrl" @click="downloadFile" class="download-button">
          下载文件
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  error: [message: string]
}>()

const textContent = ref('')

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
  if (!isTextFile.value || !documentUrl.value) return
  
  try {
    const response = await fetch(documentUrl.value)
    if (response.ok) {
      textContent.value = await response.text()
    } else {
      throw new Error('加载文本失败')
    }
  } catch (error) {
    console.error('加载文本内容失败:', error)
    emit('error', '加载文本内容失败')
  }
}

onMounted(() => {
  if (isTextFile.value) {
    loadTextContent()
  }
})
</script>

<style scoped>
.document-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.document-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.document-info {
  background: white;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e1e1e1;
}

.document-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.meta-info {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.meta-info span {
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.pdf-container {
  flex: 1;
  position: relative;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
}

.text-container {
  flex: 1;
  overflow: auto;
  background: white;
  margin: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.text-content {
  padding: 2rem;
}

.text-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
}

.generic-document {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  gap: 1rem;
}

.document-icon {
  font-size: 4rem;
  opacity: 0.5;
}

.download-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.download-button:hover {
  background-color: #0056b3;
}

.error {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  color: #e74c3c;
  text-align: center;
}
</style>
