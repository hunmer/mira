<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { PaginationListItem } from "reka-ui"
import { cn } from "../../../lib/utils"

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"]
    /** 激活页样式 */
    isActive?: boolean
    /** 页码 */
    value: number
    disabled?: boolean
  }>(),
  { isActive: false },
)

const delegatedProps = reactiveOmit(props, "class", "isActive", "value")
</script>

<template>
  <PaginationListItem
    data-slot="pagination-link"
    :value="props.value"
    as-child
  >
    <button
      type="button"
      :class="cn(
        'inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-sm font-medium whitespace-nowrap transition-colors duration-100 outline-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-xs',
        props.class,
      )"
      :data-active="props.isActive ? 'true' : undefined"
      :aria-current="props.isActive ? 'page' : undefined"
      v-bind="delegatedProps"
    >
      <slot />
    </button>
  </PaginationListItem>
</template>
