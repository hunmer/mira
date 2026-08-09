<template>
  <div class="file-upload-wrapper">
    <file-pond
      ref="pond"
      :name="name"
      :label-idle="chooseLabel || $t('commonUi.fileUpload.defaultChooseLabel')"
      :allow-multiple="true"
      :accepted-file-types="acceptedFileTypes"
      :max-file-size="maxFileSize"
      :files="files"
      @addfile="handleAddFile"
      @removefile="handleRemoveFile"
      @processfile="handleProcessFile"
      @error="handleError"
      class="filepond-custom"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import vueFilePond from 'vue-filepond'

// Import FilePond plugins
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size'

// Import FilePond styles
import 'filepond/dist/filepond.min.css'

// Create FilePond component
const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize
)

interface Props {
  name?: string
  accept?: string
  maxFileSize?: number
  chooseLabel?: string
  auto?: boolean
  mode?: string
}

const props = withDefaults(defineProps<Props>(), {
  name: 'files',
  accept: '*',
  maxFileSize: 5000000, // 5MB default
  chooseLabel: '',
  auto: false,
  mode: 'basic'
})

interface Emits {
  (e: 'select', event: { files: File[] }): void
  (e: 'upload', event: { files: File[] }): void
  (e: 'error', event: { error: string }): void
  (e: 'remove', event: { file: File }): void
}

const emit = defineEmits<Emits>()
const { t } = useI18n()

const pond = ref()
const files = ref([])
const addFileTimeout = ref<NodeJS.Timeout | null>(null)

// Convert accept prop to FilePond format
const acceptedFileTypes = computed(() => {
  if (!props.accept || props.accept === '*') return null
  
  // Handle common formats
  if (props.accept === '.json') return ['application/json']
  if (props.accept.includes('image')) return ['image/*']
  if (props.accept.includes('.')) {
    // Handle file extensions like .json, .pdf, etc.
    return [props.accept]
  }
  
  return [props.accept]
})

const handleAddFile = (error: any, _file: any) => {
  if (error) {
    emit('error', { error: error.message })
    return
  }

  // 清除之前的超时，防止重复触发
  if (addFileTimeout.value) {
    clearTimeout(addFileTimeout.value)
  }

  // 使用防抖机制收集所有同时添加的文件
  addFileTimeout.value = setTimeout(() => {
    const allFiles = pond.value?.getFiles()?.map((f: any) => f.file as File) || []

    if (allFiles.length > 0) {
      emit('select', { files: allFiles })

      if (props.auto) {
        emit('upload', { files: allFiles })
      }
    }

    addFileTimeout.value = null
  }, 200) // 200ms延迟以确保所有文件都被添加
}

const handleRemoveFile = (error: any, file: any) => {
  if (!error && file) {
    const fileObj = file.file as File
    emit('remove', { file: fileObj })
  }
}

const handleProcessFile = (error: any, file: any) => {
  if (error) {
    emit('error', { error: error.message })
    return
  }
  
  if (file) {
    const fileObj = file.file as File
    emit('upload', { files: [fileObj] })
  }
}

const handleError = (error: any) => {
  emit('error', { error: error.message || t('commonUi.fileUpload.errFileProcess') })
}

// Method to clear files
const clear = () => {
  if (pond.value) {
    pond.value.removeFiles()
  }
}

// 清理定时器
onBeforeUnmount(() => {
  if (addFileTimeout.value) {
    clearTimeout(addFileTimeout.value)
  }
})

// Expose methods for parent components
defineExpose({
  clear
})
</script>

<style scoped>
.file-upload-wrapper {
  width: 100%;
}

/* Custom FilePond styling */
:deep(.filepond-custom) {
  font-family: inherit;
}

:deep(.filepond--root) {
  border-radius: 0.375rem; /* rounded-md */
  border: 2px dashed #d1d5db; /* border-border */
  background-color: #f9fafb; /* bg-muted */
  transition: border-color 0.2s, background-color 0.2s;
}

:deep(.filepond--root:hover) {
  border-color: #6366f1; /* border-primary */
  background-color: #eef2ff; /* bg-primary */
}

:deep(.filepond--panel-root) {
  background-color: transparent;
  border: none;
}

:deep(.filepond--drop-label) {
  color: #6b7280; /* text-muted-foreground */
  font-size: 0.875rem; /* text-sm */
}

:deep(.filepond--label-action) {
  color: #6366f1; /* text-primary */
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.filepond--label-action:hover) {
  color: #4f46e5; /* text-primary */
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :deep(.filepond--root) {
    border-color: #4b5563; /* border-border */
    background-color: #1f2937; /* bg-muted */
  }
  
  :deep(.filepond--root:hover) {
    border-color: #6366f1; /* border-primary */
    background-color: #312e81; /* bg-primary */
  }
  
  :deep(.filepond--drop-label) {
    color: #9ca3af; /* text-muted-foreground */
  }
}

/* File item styling */
:deep(.filepond--item) {
  width: 100%;
  margin: 0;
}

:deep(.filepond--item-panel) {
  background-color: #f3f4f6; /* bg-muted */
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb; /* border-border */
}

:deep(.filepond--file-info-main) {
  color: #374151; /* text-foreground */
  font-weight: 500;
}

:deep(.filepond--file-info-sub) {
  color: #6b7280; /* text-muted-foreground */
}

/* Loading indicator */
:deep(.filepond--file-action-button) {
  background-color: #6366f1; /* bg-primary */
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
}

:deep(.filepond--file-action-button:hover) {
  background-color: #4f46e5; /* bg-primary */
}

/* Error styling */
:deep(.filepond--item-state-error .filepond--item-panel) {
  background-color: #fef2f2; /* bg-destructive */
  border-color: #fca5a5; /* border-destructive */
}

:deep(.filepond--item-state-error .filepond--file-info-main) {
  color: #dc2626; /* text-destructive */
}
</style>
