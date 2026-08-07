<template>
  <div
    class="flex flex-col items-center justify-center gap-2 text-muted-foreground"
    :class="containerClass"
  >
    <img
      :src="src"
      :alt="text || ''"
      :class="['object-contain pointer-events-none select-none', spin && 'animate-spin', imgClass]"
      :style="{ width: sizeValue, height: sizeValue }"
      draggable="false"
    />
    <span
      v-if="text"
      class="text-center"
      :class="textClass || sizeTextClass"
    >{{ text }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveIcon, type IconName } from '@renderer/utils/icons'

/** 尺寸档位：图片与文字尺寸联动 */
export type StatusImageSize = 'small' | 'medium' | 'large'

const SIZE_MAP: Record<StatusImageSize, { img: string; text: string }> = {
  small: { img: '3rem', text: 'text-xs' },
  medium: { img: '6rem', text: 'text-sm' },
  large: { img: '12rem', text: 'text-base' },
}

/**
 * 通用状态占位组件：统一渲染 empty / loading / error 等状态图标。
 * 所有图标资源路径集中在 @renderer/utils/icons 中管理，组件层只引用逻辑名称。
 */
const props = withDefaults(defineProps<{
  /** 图标逻辑名称，对应 @renderer/utils/icons 中的 IconName */
  name: IconName
  /** 尺寸档位：small / medium / large，图片与文字尺寸联动，默认 medium */
  size?: StatusImageSize
  /** 图标下方说明文字 */
  text?: string
  /** 为 loading 等静态图标加旋转动画 */
  spin?: boolean
  /** 透传给 <img> 的额外 class */
  imgClass?: string
  /** 容器额外 class */
  containerClass?: string
  /** 文字额外 class，覆盖默认档位字号与颜色 */
  textClass?: string
}>(), {
  size: 'medium',
})

const src = computed(() => resolveIcon(props.name))

const sizeValue = computed(() => SIZE_MAP[props.size].img)
const sizeTextClass = computed(() => SIZE_MAP[props.size].text)
</script>
