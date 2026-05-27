<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="side"
        :side-offset="sideOffset"
        :align="align"
        :align-offset="alignOffset"
        :collision-padding="collisionPadding"
        :avoid-collisions="avoidCollisions"
        :class="contentClass"
      >
        <slot name="content" />
        <PopoverArrow v-if="showArrow" :class="arrowClass" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  PopoverArrow
} from 'radix-vue'

interface Props {
  /** 控制 Popover 显示状态 */
  open?: boolean
  /** Popover 相对于触发器的位置 */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Popover 与触发器之间的距离 */
  sideOffset?: number
  /** Popover 对齐方式 */
  align?: 'start' | 'center' | 'end'
  /** 对齐偏移量 */
  alignOffset?: number
  /** 碰撞边距 */
  collisionPadding?: number
  /** 是否避免碰撞 */
  avoidCollisions?: boolean
  /** 是否显示箭头 */
  showArrow?: boolean
  /** 内容容器的自定义类名 */
  contentClass?: string
  /** 箭头的自定义类名 */
  arrowClass?: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  side: 'top',
  sideOffset: 5,
  align: 'center',
  alignOffset: 0,
  collisionPadding: 10,
  avoidCollisions: true,
  showArrow: true,
  contentClass: '',
  arrowClass: ''
})

const emit = defineEmits<Emits>()

const isOpen = ref(props.open)

// 监听外部 open 变化
watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue
  }
)

// 监听内部 isOpen 变化并同步到外部
watch(isOpen, (newValue) => {
  emit('update:open', newValue)
})
</script>
