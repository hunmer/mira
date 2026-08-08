<template>
  <header class="flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-background px-6">
    <button class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted" title="返回" @click="goBack">
      <span class="material-icons text-muted-foreground">arrow_back</span>
    </button>
    <input v-if="renaming" ref="titleInput" v-model="title" :disabled="savingRename"
      class="min-w-0 flex-1 border-b border-primary bg-transparent px-1 py-1 text-foreground outline-none"
      @blur="commitRename" @keydown.enter.prevent="commitRename" @keydown.esc.prevent="cancelRename" />
    <button v-else class="min-w-0 flex-1 truncate text-left text-foreground hover:text-primary" title="点击重命名" @click="startRename">
      {{ title }}
    </button>
    <span v-if="fileInfo.size" class="flex-shrink-0 text-sm text-muted-foreground">{{ formatFileSize(fileInfo.size) }}</span>
    <button v-if="saveVisible" :disabled="saving" class="ml-auto rounded bg-primary px-4 py-2 text-white disabled:opacity-50" @click="$emit('save')">
      {{ saving ? '保存中...' : '保存' }}
    </button>
  </header>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { miraSDKService } from '../../services/MiraSDKService'

const props = withDefaults(defineProps<{ fileInfo: any; saveVisible?: boolean; saving?: boolean }>(), { saveVisible: false, saving: false })
const emit = defineEmits<{ save: []; renamed: [name: string]; error: [message: string] }>()
const router = useRouter()
const titleInput = ref<HTMLInputElement | null>(null)
const title = ref(props.fileInfo?.title || props.fileInfo?.name || '未知文件')
const renaming = ref(false)
const savingRename = ref(false)

const goBack = () => window.history.length > 1 ? router.back() : router.push('/')
const startRename = async () => { renaming.value = true; await nextTick(); titleInput.value?.focus(); titleInput.value?.select() }
const cancelRename = () => { renaming.value = false; title.value = props.fileInfo?.title || props.fileInfo?.name || '未知文件' }
const commitRename = async () => {
  const name = title.value.trim()
  const oldName = props.fileInfo?.title || props.fileInfo?.name || '未知文件'
  if (!name || name === oldName || savingRename.value) return cancelRename()
  try {
    savingRename.value = true
    await miraSDKService.renameFile(props.fileInfo.libraryId, props.fileInfo.id, name)
    renaming.value = false
    emit('renamed', name)
  } catch (error) {
    emit('error', error instanceof Error ? error.message : '重命名文件失败')
  } finally { savingRename.value = false }
}
const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${['B', 'KB', 'MB', 'GB'][i] || 'TB'}`
}
watch(() => props.fileInfo?.title || props.fileInfo?.name, value => { if (!renaming.value && value) title.value = value })
</script>
