<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { useVModel } from '@vueuse/core'
import { AnimatePresence, Motion } from 'motion-v'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * 可展开折叠按钮：
 * - 默认显示一个图标按钮
 * - 点击后在按钮指定侧展开自定义内容（slot），按钮自身切换为关闭图标
 * - 再次点击则折叠
 * 展开折叠使用 motion-v 做宽度动画
 */
const props = withDefaults(defineProps<{
  /** v-model 控制展开状态 */
  modelValue?: boolean
  /** 折叠态图标（material-icons） */
  icon?: string
  /** 展开态（关闭）图标 */
  closeIcon?: string
  /** 折叠态 tooltip */
  expandTooltip?: string
  /** 展开态 tooltip */
  collapseTooltip?: string
  /** 按钮自定义样式 */
  buttonClass?: string
  /** 展开方向：按钮左侧 / 右侧 */
  direction?: 'left' | 'right'
  /** 展开后自动 focus 内容区首个可聚焦元素 */
  autofocus?: boolean
}>(), {
  modelValue: false,
  icon: 'search',
  closeIcon: 'close',
  buttonClass: 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-muted transition-colors text-muted-foreground dark:text-muted-foreground',
  direction: 'left',
  autofocus: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const expanded = useVModel(props, 'modelValue', emit, { passive: true })

const contentRef = useTemplateRef<HTMLElement>('contentRef')

const toggle = () => {
  expanded.value = !expanded.value
}

// 展开后自动 focus 首个可聚焦元素
watch(expanded, async (val) => {
  if (!val || !props.autofocus) return
  await nextTick()
  const el = contentRef.value?.querySelector<HTMLElement>(
    'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
  )
  el?.focus()
})
</script>

<template>
  <div class="flex items-center" :class="direction === 'left' ? 'justify-end' : 'justify-start'">
    <template v-if="direction === 'left'">
      <!-- 内容在按钮左侧 -->
      <AnimatePresence :initial="false">
        <Motion
          v-if="expanded"
          :initial="{ width: 0, opacity: 0 }"
          :animate="{ width: 'auto', opacity: 1 }"
          :exit="{ width: 0, opacity: 0 }"
          :transition="{ type: 'spring', stiffness: 400, damping: 35 }"
          class="overflow-hidden"
        >
          <div ref="contentRef" class="px-2">
            <slot />
          </div>
        </Motion>
      </AnimatePresence>

      <TooltipProvider :ignore-non-keyboard-focus="true">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              @click="toggle"
              :class="buttonClass"
            >
              <span class="material-icons text-base">{{ expanded ? closeIcon : icon }}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {{ expanded ? collapseTooltip : expandTooltip }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </template>

    <template v-else>
      <!-- 内容在按钮右侧 -->
      <TooltipProvider :ignore-non-keyboard-focus="true">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              @click="toggle"
              :class="buttonClass"
            >
              <span class="material-icons text-base">{{ expanded ? closeIcon : icon }}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {{ expanded ? collapseTooltip : expandTooltip }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AnimatePresence :initial="false">
        <Motion
          v-if="expanded"
          :initial="{ width: 0, opacity: 0 }"
          :animate="{ width: 'auto', opacity: 1 }"
          :exit="{ width: 0, opacity: 0 }"
          :transition="{ type: 'spring', stiffness: 400, damping: 35 }"
          class="overflow-hidden"
        >
          <div ref="contentRef" class="px-2">
            <slot />
          </div>
        </Motion>
      </AnimatePresence>
    </template>
  </div>
</template>
