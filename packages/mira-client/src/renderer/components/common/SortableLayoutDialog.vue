<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, nextTick, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  modelValue: boolean
  enabled: T[]
  disabled: T[]
  title: string
  description?: string
  enabledTitle: string
  disabledTitle: string
  doneLabel: string
  resetLabel?: string
  emptyDisabledLabel?: string
  itemKey?: string
  /** 启用区「全部右移」按钮的提示文案 */
  allToDisabledLabel?: string
  /** 未启用区「全部左移」按钮的提示文案 */
  allToEnabledLabel?: string
}>(), { itemKey: 'id', resetLabel: '重置排序' })
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:enabled': [value: T[]]
  'update:disabled': [value: T[]]
}>()

const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const enabledList = ref<T[]>([])
const disabledList = ref<T[]>([])
const initialEnabled = ref<T[]>([])
const initialDisabled = ref<T[]>([])
const syncing = ref(false)
watch(() => props.modelValue, visible => {
  if (visible) {
    syncing.value = true
    enabledList.value = [...props.enabled]
    disabledList.value = [...props.disabled]
    initialEnabled.value = [...props.enabled]
    initialDisabled.value = [...props.disabled]
    void nextTick(() => { syncing.value = false })
  }
}, { immediate: true, deep: true })
watch(enabledList, value => {
  if (!syncing.value) (emit as any)('update:enabled', [...value])
}, { deep: true })
watch(disabledList, value => {
  if (!syncing.value) (emit as any)('update:disabled', [...value])
}, { deep: true })
function resetOrder() {
  syncing.value = true
  enabledList.value = [...initialEnabled.value]
  disabledList.value = [...initialDisabled.value]
  ;(emit as any)('update:enabled', [...enabledList.value])
  ;(emit as any)('update:disabled', [...disabledList.value])
  void nextTick(() => { syncing.value = false })
}
/** 启用区全部右移到未启用区 */
function moveAllEnabledToDisabled() {
  if (enabledList.value.length === 0) return
  disabledList.value = [...disabledList.value, ...enabledList.value]
  enabledList.value = []
}
/** 未启用区全部左移到启用区 */
function moveAllDisabledToEnabled() {
  if (disabledList.value.length === 0) return
  enabledList.value = [...enabledList.value, ...disabledList.value]
  disabledList.value = []
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>
      <div class="grid grid-cols-2 gap-3 py-2">
        <section v-for="index in [0, 1]" :key="index" class="flex flex-col">
          <div class="mb-2 flex items-center gap-1.5 text-xs font-semibold" :class="index ? 'text-muted-foreground' : 'text-foreground'">
            <span class="material-icons text-sm">{{ index ? 'remove_circle_outline' : 'check_circle' }}</span>
            <span>{{ index ? disabledTitle : enabledTitle }}</span>
            <button
              type="button"
              class="ml-auto flex h-6 w-6 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              :disabled="index ? disabledList.length === 0 : enabledList.length === 0"
              :title="index ? allToEnabledLabel : allToDisabledLabel"
              :aria-label="index ? allToEnabledLabel : allToDisabledLabel"
              @click="index ? moveAllDisabledToEnabled() : moveAllEnabledToDisabled()"
            >
              <span class="material-icons text-sm">{{ index ? 'arrow_back' : 'arrow_forward' }}</span>
            </button>
          </div>
          <VueDraggable v-if="index === 0" v-model="enabledList" :animation="180" group="sortable-layout-dialog" class="flex min-h-[120px] flex-1 flex-col gap-1.5 rounded-xl border border-dashed border-border/70 p-1.5" :fallback-tolerance="4">
            <div v-for="item in enabledList" :key="item[itemKey]" class="group flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-background p-2 active:cursor-grabbing">
              <span class="material-icons text-base text-muted-foreground">drag_indicator</span>
              <slot name="item" :item="item" :disabled="!!index">
                <span class="min-w-0 flex-1 truncate text-xs">{{ item.title }}</span>
              </slot>
            </div>
          </VueDraggable>
          <VueDraggable v-else v-model="disabledList" :animation="180" group="sortable-layout-dialog" class="flex min-h-[120px] flex-1 flex-col gap-1.5 rounded-xl border border-dashed border-border/70 p-1.5" :fallback-tolerance="4">
            <div v-for="item in disabledList" :key="item[itemKey]" class="group flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-background p-2 active:cursor-grabbing">
              <span class="material-icons text-base text-muted-foreground">drag_indicator</span>
              <slot name="item" :item="item" :disabled="true" />
            </div>
            <div v-if="disabledList.length === 0" class="py-4 text-center text-[11px] text-muted-foreground/60">{{ emptyDisabledLabel }}</div>
          </VueDraggable>
        </section>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="resetOrder">{{ props.resetLabel }}</Button>
        <Button type="button" @click="open = false">{{ doneLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
