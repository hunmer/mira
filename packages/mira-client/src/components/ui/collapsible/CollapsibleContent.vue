<script setup lang="ts">
import type { CollapsibleContentProps } from "reka-ui"
import { CollapsibleContent } from "reka-ui"
import { injectCollapsibleRootContext } from "reka-ui"
import { Motion } from "motion-v"
import { cn } from "@/lib/utils"
import { computed } from "vue"

const props = withDefaults(
  defineProps<CollapsibleContentProps & { class?: string; animated?: boolean }>(),
  { animated: true },
)

const rootContext = injectCollapsibleRootContext()
const isOpen = computed(() => !!rootContext.open.value)
</script>

<template>
  <!--
    force-mount 始终保留子组件挂载状态与内部 ref
    （例如 FolderTreeComponent 折叠后仍保留展开节点、搜索态、暴露的方法）。
    animated（默认开启）：外层 motion-v 做高度 0↔auto 过渡，overflow hidden 裁剪。
  -->
  <Motion
    v-if="animated"
    as="div"
    :initial="false"
    :animate="{ height: isOpen ? 'auto' : 0 }"
    :transition="{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }"
    style="overflow: hidden;"
  >
    <CollapsibleContent
      force-mount
      data-slot="collapsible-content"
      :class="cn(props.class)"
    >
      <slot />
    </CollapsibleContent>
  </Motion>
  <CollapsibleContent
    v-else
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
