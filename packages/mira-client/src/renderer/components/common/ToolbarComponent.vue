<template>
  <div class="toolbar-component">
    <div class="flex items-center justify-between bg-white p-2">
      <div class="flex items-center space-x-1">
        <template v-for="(group, groupIndex) in groups" :key="group.id">
          <!-- 按钮组 -->
          <div class="flex items-center space-x-1">
            <template v-for="button in visibleButtons(group.buttons)" :key="button.id">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      :variant="getButtonVariant(button)"
                      :disabled="button.disabled"
                      :size="getButtonSize()"
                      class="toolbar-button"
                      @click="handleButtonClick(button)"
                    >
                      <span class="material-icons">{{ getButtonIcon(button) }}</span>
                      <span v-if="button.label && size !== 'small'" class="ml-2">{{ button.label }}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{{ button.tooltip }}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </template>
          </div>

          <!-- 分隔符 -->
          <Separator
            v-if="group.separator && groupIndex < groups.length - 1"
            orientation="vertical"
            class="mx-2 h-6"
          />
        </template>
      </div>

      <div>
        <slot name="end" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { ToolbarComponentProps, ToolbarButton, ToolbarEvents } from '../../types/components'

interface Props extends ToolbarComponentProps {}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  variant: 'default'
})

const emit = defineEmits<ToolbarEvents>()

// 计算属性
const visibleButtons = (buttons: ToolbarButton[]) => {
  return buttons.filter(button => !button.hidden)
}

const getButtonIcon = (button: ToolbarButton) => {
  // 直接返回 Material Icons 名称
  return button.icon || 'help'
}

const getButtonVariant = (button: ToolbarButton) => {
  const variantMap: Record<string, string> = {
    'primary': 'default',
    'secondary': 'secondary',
    'success': 'default',
    'danger': 'destructive'
  }

  if (variant === 'minimal') return 'ghost'
  if (button.variant === 'secondary' && variant === 'default') return 'outline'

  return variantMap[button.variant || 'secondary'] || 'secondary'
}

const getButtonSize = () => {
  const sizeMap: Record<string, string | undefined> = {
    'small': 'sm',
    'medium': undefined,
    'large': 'lg'
  }

  return sizeMap[props.size]
}

// 方法
const handleButtonClick = (button: ToolbarButton) => {
  if (button.disabled) return
  
  // 触发按钮自定义点击事件
  if (button.onClick) {
    button.onClick()
  }
  
  // 触发组件事件
  emit('button-click', button.id, button)
}
</script>

<style scoped>
.toolbar-component {
  background-color: white;
}

.toolbar-button {
  transition: all 0.2s;
}

.toolbar-button:hover {
  transform: scale(1.05);
}
</style>
