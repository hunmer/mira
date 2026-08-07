<template>
  <div
    class="flex flex-col items-center justify-center gap-2 text-muted-foreground"
    :class="containerClass"
  >
    <img
      :src="src"
      :alt="text || ''"
      :class="['object-contain pointer-events-none select-none', spin && 'animate-spin', imgClass]"
      :style="{ width: size, height: size }"
      draggable="false"
    />
    <span v-if="text" class="text-xs text-center" :class="textClass">{{ text }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveIcon, type IconName } from '@renderer/utils/icons'

/**
 * 通用状态占位组件：统一渲染 empty / loading / error 等状态图标。
 * 所有图标资源路径集中在 @renderer/utils/icons 中管理，组件层只引用逻辑名称。
 */
const props = withDefaults(defineProps<{
  /** 图标逻辑名称，对应 @renderer/utils/icons 中的 IconName */
  name: IconName
  /** 图标尺寸（CSS 值），默认 6rem */
  size?: string
  /** 图标下方说明文字 */
  text?: string
  /** 为 loading 等静态图标加旋转动画 */
  spin?: boolean
  /** 透传给 <img> 的额外 class */
  imgClass?: string
  /** 容器额外 class */
  containerClass?: string
  /** 文字额外 class */
  textClass?: string
}>(), {
  size: '6rem',
})

const src = computed(() => resolveIcon(props.name))
</script>
