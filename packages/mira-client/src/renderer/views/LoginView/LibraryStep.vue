<script setup lang="ts">
/**
 * 步骤 3：素材库选择
 */
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import type { Library } from 'mira-app-core/shared/sdk'

defineOptions({ name: 'LibraryStep' })

const props = defineProps<{
  loading: boolean
  libraries: Library[]
  selectedLibraryId: string
  /** 当前用户角色，用于判断库的可访问性 */
  isLibraryAccessible: (lib: Library) => boolean
}>()

const emit = defineEmits<{
  'update:selectedLibraryId': [value: string]
  connect: []
  back: []
}>()

function select(lib: Library) {
  if (props.isLibraryAccessible(lib)) {
    emit('update:selectedLibraryId', lib.id)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="loading" class="text-center py-8 text-muted-foreground dark:text-muted-foreground">加载素材库...</div>
    <div v-else-if="libraries.length === 0" class="text-center py-8 text-muted-foreground dark:text-muted-foreground">没有可用的素材库</div>
    <div v-else class="flex flex-col gap-2 max-h-60 overflow-y-auto">
      <div
        v-for="lib in libraries"
        :key="lib.id"
        class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all"
        :class="[
          selectedLibraryId === lib.id
            ? 'border-primary dark:border-primary bg-primary/15 dark:bg-primary/15'
            : isLibraryAccessible(lib)
              ? 'border-border dark:border-border hover:border-primary dark:hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/10'
              : 'opacity-50 cursor-not-allowed border-border dark:border-border bg-muted dark:bg-muted'
        ]"
        @click="select(lib)"
      >
        <span class="material-icons text-2xl" :class="selectedLibraryId === lib.id ? 'text-primary dark:text-primary' : 'text-muted-foreground dark:text-muted-foreground'">{{ lib.icon === 'default' ? 'folder' : 'folder_special' }}</span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-foreground dark:text-muted-foreground">{{ lib.name }}</div>
          <div class="text-xs text-muted-foreground dark:text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">{{ lib.path }}</div>
        </div>
        <span v-if="!isLibraryAccessible(lib)" class="material-icons text-xl text-muted-foreground dark:text-muted-foreground">lock</span>
        <span v-else-if="selectedLibraryId === lib.id" class="material-icons text-xl text-primary dark:text-primary">check_circle</span>
      </div>
    </div>
    <Button class="w-full" :disabled="!selectedLibraryId || loading" @click="emit('connect')">
      <Loader2 v-if="loading" class="animate-spin" />
      连接
    </Button>
    <Button type="button" variant="ghost" class="w-full" @click="emit('back')" :disabled="loading">
      上一步
    </Button>
  </div>
</template>
