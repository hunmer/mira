<script setup lang="ts">
/**
 * Dropdown —— 基于 shadcn-vue Popover 的兼容封装。
 *
 * 历史背景：项目原使用自写的 volt/Dropdown（手写定位 + Teleport），现已统一到 shadcn-vue。
 * 本组件保留原 volt/Dropdown 的对外 API（placement / offset / minWidth /
 * closeOnContentClick / #trigger / #content(close) / open/close/toggle 暴露方法），
 * 内部改用 Popover（reka-ui）实现定位、点击外部关闭、滚动关闭等行为。
 *
 * 仅用于「自由内容」的下拉（trigger + 任意 content）。
 * 若需要菜单项形态（MenuItem / 分隔符 / 快捷键），请直接使用 @/components/ui/dropdown-menu。
 * 若需要「选项列表」形态（options + option-label），请使用 @/components/ui/select。
 */
import { computed, ref } from 'vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  /** 兼容旧 offset，映射到 Popover 的 sideOffset（取 y） */
  offset?: { x: number; y: number }
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'bottom' | 'top'
  minWidth?: string
  /** 点击内容是否自动关闭 */
  closeOnContentClick?: boolean
  disabled?: boolean
  /** trigger 区域是否撑满父级宽度（默认 inline-flex 收缩到内容宽度） */
  fullWidth?: boolean
}

interface Emits {
  (e: 'open'): void
  (e: 'close'): void
  (e: 'toggle', isOpen: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  offset: () => ({ x: 0, y: 8 }),
  placement: 'bottom-start',
  minWidth: '200px',
  closeOnContentClick: false,
  disabled: false,
  fullWidth: false,
})
const emit = defineEmits<Emits>()

const open = ref(false)

const side = computed<'top' | 'bottom'>(() =>
  props.placement.startsWith('top') ? 'top' : 'bottom',
)
const align = computed<'start' | 'center' | 'end'>(() => {
  if (props.placement.endsWith('start')) return 'start'
  if (props.placement.endsWith('end')) return 'end'
  return 'center'
})
const sideOffset = computed(() => props.offset.y)

const onOpenChange = (val: boolean) => {
  if (props.disabled && val) return
  if (open.value === val) return
  open.value = val
  emit(val ? 'open' : 'close', undefined as never)
  emit('toggle', val)
}

const close = () => onOpenChange(false)
const doOpen = () => onOpenChange(true)
const toggle = () => onOpenChange(!open.value)

const onContentClick = () => {
  if (props.closeOnContentClick) close()
}

defineExpose({
  open: doOpen,
  close,
  toggle,
  isOpen: () => open.value,
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <div :class="fullWidth ? 'flex w-full' : 'inline-flex'"><slot name="trigger" :is-open="open" /></div>
    </PopoverTrigger>
    <PopoverContent
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :disable-outside-pointer-events="false"
      class="w-auto p-0"
      :style="{ minWidth }"
      @click="onContentClick"
    >
      <slot name="content" :close="close" />
    </PopoverContent>
  </Popover>
</template>
