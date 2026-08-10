<script setup lang="ts">
import type { CollapsibleContentProps } from "reka-ui"
import { CollapsibleContent } from "reka-ui"
import { injectCollapsibleRootContext } from "reka-ui"
import { cn } from "@/lib/utils"
import { computed } from "vue"

const props = defineProps<CollapsibleContentProps & { class?: string }>()

const rootContext = injectCollapsibleRootContext()
const isOpen = computed(() => !!rootContext.open.value)
</script>

<template>
  <!--
    用 v-show 而非 v-if 卸载：保留子组件挂载状态与内部 ref
    （例如 FolderTreeComponent 折叠后仍保留展开节点、搜索态、暴露的方法）。
    高度过渡交给外层 CSS（grid-template-rows / max-height）按需处理。
  -->
  <CollapsibleContent
    v-show="isOpen"
    force-mount
    data-slot="collapsible-content"
    :class="cn(props.class)"
  >
    <slot />
  </CollapsibleContent>
</template>

<style scoped>
[data-slot="collapsible-content"] {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border, oklch(0.92 0 0));
  border-top: none;
  border-radius: 0 0 0.75rem 0.75rem;
  background: var(--muted, oklch(0.97 0 0));
}
</style>
