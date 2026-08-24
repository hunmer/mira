<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LocalFolderCrumb } from './localFolderUtils'

const props = defineProps<{
  isAtRoot: boolean
  currentPath: string
  breadcrumbs: LocalFolderCrumb[]
}>()

const emit = defineEmits<{
  up: []
  navigate: [path: string]
  refresh: []
  submit: [rawPath: string]
}>()

const editing = defineModel<boolean>('editing', { default: false })
const pathInput = ref('')
const pathInputRef = ref<InstanceType<typeof Input> | null>(null)

async function startEditing() {
  pathInput.value = props.currentPath
  editing.value = true
  await nextTick()
  const input = pathInputRef.value?.$el as HTMLInputElement | undefined
  input?.focus()
  input?.select()
}
</script>

<template>
  <header class="flex min-h-12 shrink-0 items-center gap-2 border-b px-3">
    <Button variant="ghost" size="icon-sm" :disabled="isAtRoot" :title="$t('views.localFolder.up')" @click="emit('up')">
      <ArrowLeft />
    </Button>
    <Input
      v-if="editing"
      ref="pathInputRef"
      v-model="pathInput"
      class="h-8 min-w-0 flex-1"
      :aria-label="$t('views.localFolder.pathInput')"
      @keydown.enter.prevent="emit('submit', pathInput)"
      @keydown.escape.prevent="editing = false"
    />
    <nav v-else class="flex min-w-0 flex-1 items-center overflow-hidden text-sm" aria-label="Breadcrumb">
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
        <span v-if="index" class="px-1 text-muted-foreground">/</span>
        <button class="min-w-0 truncate rounded px-1.5 py-1 hover:bg-accent" @click="emit('navigate', crumb.path)">
          {{ crumb.label }}
        </button>
      </template>
    </nav>
    <Button
      v-if="!editing"
      variant="ghost"
      size="icon-sm"
      :title="$t('views.localFolder.editPath')"
      @click="startEditing"
    >
      <Pencil />
    </Button>
    <Button variant="ghost" size="icon-sm" :title="$t('views.localFolder.refresh')" @click="emit('refresh')">
      <RefreshCw />
    </Button>
  </header>
</template>
