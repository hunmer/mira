<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Library } from '@/types/mira'
import { libraryApi, fileApi } from '@/api'
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'
import { RiUploadCloudLine, RiFileLine, RiCloseLine } from '@remixicon/vue'

const { t } = useI18n()
const libraries = ref<Library[]>([])
const selectedLib = ref('')
const files = ref<File[]>([])
const uploading = ref(false)
const progress = ref(0)
const dragOver = ref(false)

const canUpload = computed(() => selectedLib.value && files.value.length > 0)

async function loadLibraries() {
  try {
    const res = await libraryApi.list()
    libraries.value = Array.isArray(res.data) ? res.data : []
  } catch { /* ignore */ }
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  if (e.dataTransfer?.files) {
    files.value.push(...Array.from(e.dataTransfer.files))
  }
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) files.value.push(...Array.from(input.files))
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

async function handleUpload() {
  if (!selectedLib.value || !files.value.length) return
  uploading.value = true
  progress.value = 0
  try {
    for (const file of files.value) {
      const fd = new FormData()
      fd.append('file', file)
      await fileApi.uploadProgress(selectedLib.value, fd, (p) => { progress.value = p })
    }
    toast.success(t('fileUpload.uploadSuccess'))
    files.value = []
  } catch {
    toast.error(t('fileUpload.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

onMounted(loadLibraries)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t('fileUpload.title') }}</h1>

    <Select v-model="selectedLib">
      <SelectTrigger class="w-64">
        <SelectValue :placeholder="t('fileUpload.selectLibrary')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">{{ lib.name }}</SelectItem>
      </SelectContent>
    </Select>

    <Card
      class="border-dashed"
      :class="{ 'border-primary bg-primary/5': dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="handleDrop"
    >
      <CardContent class="flex flex-col items-center gap-4 py-12">
        <RiUploadCloudLine class="size-12 text-muted-foreground" />
        <p class="text-muted-foreground">{{ t('fileUpload.dragHere') }}</p>
        <p class="text-sm text-muted-foreground">{{ t('fileUpload.or') }}</p>
        <label>
          <input type="file" multiple class="hidden" @change="handleFileInput" />
          <Button variant="outline" as="span">{{ t('fileUpload.browse') }}</Button>
        </label>
      </CardContent>
    </Card>

    <!-- File list -->
    <div v-if="files.length" class="space-y-2">
      <div v-for="(file, i) in files" :key="i" class="flex items-center gap-3 rounded-md border p-3">
        <RiFileLine class="size-4 text-muted-foreground" />
        <span class="flex-1 text-sm">{{ file.name }}</span>
        <span class="text-xs text-muted-foreground">{{ (file.size / 1024).toFixed(1) }} KB</span>
        <Button variant="ghost" size="icon" @click="removeFile(i)">
          <RiCloseLine class="size-4" />
        </Button>
      </div>
      <div class="flex items-center gap-4">
        <Button :disabled="!canUpload || uploading" @click="handleUpload">
          {{ uploading ? `${t('fileUpload.uploading')} ${progress}%` : t('fileUpload.browse') }}
        </Button>
        <div v-if="uploading" class="h-2 flex-1 rounded-full bg-secondary">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${progress}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>
