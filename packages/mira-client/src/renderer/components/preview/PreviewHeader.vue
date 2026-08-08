<template>
  <header class="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-background px-6">
    <div class="flex min-w-0 items-center gap-4">
      <button class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted" title="返回" @click="goBack">
        <span class="material-icons text-muted-foreground">arrow_back</span>
      </button>
      <input v-if="renaming" ref="titleInput" v-model="title" :disabled="savingRename"
        class="min-w-0 flex-1 border-b border-primary bg-transparent px-1 py-1 text-foreground outline-none"
        @blur="commitRename" @keydown.enter.prevent="commitRename" @keydown.esc.prevent="cancelRename" />
      <button v-else class="min-w-0 truncate text-left text-lg font-semibold text-foreground hover:text-primary" title="点击重命名" @click="startRename">
        {{ title }}
      </button>
      <slot name="left-extra" />
      <span v-if="fileInfo.size" class="flex-shrink-0 text-sm text-muted-foreground">{{ formatFileSize(fileInfo.size) }}</span>
    </div>
    <div class="flex flex-shrink-0 items-center gap-2">
      <button
        v-for="format in openFormats"
        :key="format.id"
        class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
        :title="`使用${format.title || '插件'}打开`"
        @click="openWith(format)"
      >
        <span class="material-symbols-outlined text-muted-foreground">{{ format.icon || 'extension' }}</span>
      </button>
      <button v-if="saveVisible" :disabled="saving" class="rounded bg-primary px-4 py-2 text-white disabled:opacity-50" @click="$emit('save')">
        {{ saving ? '保存中...' : '保存' }}
      </button>
      <slot name="right-actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { miraSDKService } from '../../services/MiraSDKService'
import { getPluginFileFormats } from '../../plugins/instanceManager'
import type { PluginFileFormat } from '../../plugins/types'

const props = withDefaults(defineProps<{ fileInfo: any; saveVisible?: boolean; saving?: boolean; showOpenWith?: boolean }>(), {
  saveVisible: false,
  saving: false,
  showOpenWith: true,
})
const emit = defineEmits<{ save: []; renamed: [name: string]; error: [message: string] }>()
const router = useRouter()
const titleInput = ref<HTMLInputElement | null>(null)
const title = ref(props.fileInfo?.title || props.fileInfo?.name || '未知文件')
const renaming = ref(false)
const savingRename = ref(false)
const formatVersion = ref(0)
const formatTimer = setInterval(() => { formatVersion.value++ }, 500)
const openFormats = computed(() => {
  void formatVersion.value
  return props.showOpenWith && props.fileInfo?.id
    ? getPluginFileFormats(props.fileInfo).filter(format => format.getPreviewUrl || format.open)
    : []
})

const goBack = () => window.history.length > 1 ? router.back() : router.push('/')
const openWith = async (format: PluginFileFormat) => {
  try {
    if (format.getPreviewUrl) {
      await router.push({
        path: '/file-preview',
        query: {
          id: String(props.fileInfo.id),
          libraryId: String(props.fileInfo.libraryId || ''),
          title: props.fileInfo.name || props.fileInfo.title || '',
          path: props.fileInfo.path || props.fileInfo.url || '',
          mimeType: props.fileInfo.mimeType || '',
          viewer: format.id,
        },
      })
      return
    }
    await format.open?.(props.fileInfo)
  } catch (error) {
    emit('error', error instanceof Error ? error.message : '插件打开文件失败')
  }
}
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
onBeforeUnmount(() => clearInterval(formatTimer))
</script>
