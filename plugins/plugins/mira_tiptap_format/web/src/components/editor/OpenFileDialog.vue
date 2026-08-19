<script setup lang="ts">
import { FileText, FolderOpen, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface DocFile {
  id: string | number
  title?: string
  name?: string
  updated_at?: string
  size?: number
}

const props = defineProps<{
  open: boolean
  files: DocFile[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'select', file: DocFile): void
}>()

function close () { emit('update:open', false) }

function formatTime (value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize (value?: number) {
  if (!value && value !== 0) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" @click.self="close">
      <section class="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
        <header class="flex items-center gap-2 border-b px-4 py-3">
          <FolderOpen class="size-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold">打开文档</h2>
          <button type="button" title="关闭" class="ml-auto cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="close">
            <X class="size-4" />
          </button>
        </header>
        <div class="scroll-thin flex-1 overflow-y-auto p-2">
          <div v-if="loading" class="px-3 py-8 text-center text-sm text-muted-foreground">正在加载文档列表…</div>
          <template v-else-if="files.length">
            <button
              v-for="file in files"
              :key="file.id"
              type="button"
              class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              @click="emit('select', file)"
            >
              <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText class="size-4" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-medium">{{ file.title || file.name || file.id }}</span>
                <span class="text-xs text-muted-foreground">{{ formatTime(file.updated_at) }}<template v-if="formatSize(file.size)"> · {{ formatSize(file.size) }}</template></span>
              </span>
            </button>
          </template>
          <div v-else class="px-3 py-8 text-center text-sm text-muted-foreground">
            当前素材库中没有 .tiptap 文档
          </div>
        </div>
        <footer class="border-t px-4 py-2.5 text-right">
          <Button variant="ghost" size="sm" @click="close">取消</Button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
