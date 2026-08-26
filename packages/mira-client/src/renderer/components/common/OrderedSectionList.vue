<script setup lang="ts" generic="T extends { id: string | number; title: string; icon?: string }">
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { VueDraggable } from 'vue-draggable-plus'
import { computed, ref, watch, type Ref } from 'vue'

const props = withDefaults(defineProps<{
  items?: T[]
  draggable?: boolean
  headerOnly?: boolean
  /** 不渲染每个区块的 header/折叠结构，直接展示内容（工具栏场景） */
  headerless?: boolean
  /** 横向布局（配合 headerless 用于水平工具栏） */
  horizontal?: boolean
  title?: string
  customizeLabel?: string
  customizeIcon?: string
  isOpen?: (item: T) => boolean
}>(), { customizeIcon: 'dashboard_customize', isOpen: () => true, draggable: false, headerOnly: false, headerless: false, horizontal: false })
const emit = defineEmits<{ 'update:open': [item: T, value: boolean]; 'update:items': [items: T[]]; customize: [] }>()
// as Ref<T[]>：避免 UnwrapRefSimple<T> 与泛型 T 不兼容
const orderedItems = ref<T[]>([]) as Ref<T[]>
watch(() => props.items, value => { orderedItems.value = [...(value || [])] }, { immediate: true, deep: true })
function onReorder() { emit('update:items', [...orderedItems.value]) }

const rootClass = computed(() => {
  if (props.headerOnly) return 'shrink-0'
  if (props.horizontal) return 'flex min-w-0 items-center overflow-x-auto'
  // headerless 纵向由外层容器滚动：不加 overflow-y-auto，否则会截断内部 sticky 元素的悬浮
  if (props.headerless) return 'flex flex-col'
  return 'flex min-h-0 flex-1 flex-col overflow-y-auto'
})
const listClass = computed(() => props.horizontal ? 'flex items-center gap-2' : 'space-y-2')
</script>

<template>
  <div :class="rootClass">
    <header v-if="props.title || $slots.headerActions || props.customizeLabel" class=" flex shrink-0 items-center justify-between px-1 py-1">
      <h2 class="text-sm font-semibold text-foreground">{{ props.title }}</h2>
      <div class="flex items-center gap-1" @click.stop>
        <slot name="headerActions" />
        <button v-if="props.customizeLabel" type="button" class="header-action-btn" :title="props.customizeLabel" @click="emit('customize')">
          <span class="material-icons leading-none" style="font-size: 18px">{{ props.customizeIcon }}</span>
        </button>
      </div>
    </header>
    <VueDraggable v-if="props.draggable" v-model="orderedItems" item-key="id" :class="listClass" @end="onReorder">
      <template v-for="item in orderedItems" :key="item.id">
        <!-- headerless：无折叠结构，直接渲染内容 -->
        <div v-if="props.headerless" :class="props.horizontal ? 'shrink-0' : 'min-w-0'">
          <slot :item="item" />
        </div>
        <Collapsible v-else :open="props.isOpen(item)" class="sidebar-section" @update:open="emit('update:open', item, $event)">
          <CollapsibleTrigger as-child><header class="section-header"><span v-if="item.icon" class="material-icons title-icon">{{ item.icon }}</span><h2 class="section-title">{{ item.title }}</h2><span class="material-icons chevron" :class="{ 'chevron--open': props.isOpen(item) }">expand_more</span><div class="header-actions" @click.stop><slot name="actions" :item="item" /></div></header></CollapsibleTrigger>
          <CollapsibleContent class="section-body"><slot :item="item" /></CollapsibleContent>
        </Collapsible>
      </template>
    </VueDraggable>
    <template v-else>
      <div v-if="props.headerless" :class="[listClass, props.horizontal ? 'w-full' : 'flex flex-col']">
        <div v-for="item in orderedItems" :key="item.id" :class="props.horizontal ? 'shrink-0' : 'min-w-0'">
          <slot :item="item" />
        </div>
      </div>
      <Collapsible v-else v-for="item in orderedItems" :key="item.id" :open="props.isOpen(item)" class="sidebar-section" @update:open="emit('update:open', item, $event)">
        <CollapsibleTrigger as-child>
          <header class="section-header">
            <span v-if="item.icon" class="material-icons title-icon">{{ item.icon }}</span>
            <h2 class="section-title">{{ item.title }}</h2>
            <span class="material-icons chevron" :class="{ 'chevron--open': props.isOpen(item) }">expand_more</span>
            <div class="header-actions" @click.stop><slot name="actions" :item="item" /></div>
          </header>
        </CollapsibleTrigger>
        <CollapsibleContent class="section-body"><slot :item="item" /></CollapsibleContent>
      </Collapsible>
    </template>
  </div>
</template>

<style scoped>
.section-header{display:flex;align-items:center;gap:.25rem;padding:.25rem .5rem;cursor:pointer;user-select:none;border-radius:.5rem  .5rem 0 0;background:var(--primary);color:var(--primary-foreground);transition:filter .15s ease}.section-header:hover{filter:brightness(.95)}.section-header[data-state="closed"]{border-radius:.5rem}.title-icon{font-size:1rem}.section-title{flex:1;min-width:0;font-size:.75rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chevron{font-size:1rem;transition:transform .15s ease}.chevron--open{transform:rotate(180deg)}.header-actions{display:flex;align-items:center;gap:.125rem}.header-action-btn{display:flex;height:1.5rem;width:1.5rem;align-items:center;justify-content:center;border-radius:.375rem;color:inherit;opacity:.8}.header-action-btn:hover{background:color-mix(in srgb,var(--primary-foreground) 15%,transparent);opacity:1}.section-body{padding:.25rem 0}.sidebar-section{min-width:0}
</style>
