<script setup lang="ts">
import type { ListboxRootEmits, ListboxRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ListboxRoot, useFilter, useForwardPropsEmits } from "reka-ui"
import { reactive, ref, watch } from "vue"
import { cn } from "@/lib/utils"
import { provideCommandContext } from "."

const props = withDefaults(defineProps<ListboxRootProps & {
  class?: HTMLAttributes["class"]
  /** 是否启用客户端文本过滤；服务端搜索场景（拼音等）应设为 false */
  shouldFilter?: boolean
}>(), {
  modelValue: "",
  highlightOnHover: true,
  shouldFilter: true,
})

const emits = defineEmits<ListboxRootEmits>()

const delegatedProps = reactiveOmit(props, "class", "shouldFilter")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const allItems = ref<Map<string, string>>(new Map())
const allGroups = ref<Map<string, Set<string>>>(new Map())

const { contains } = useFilter({ sensitivity: "base" })
const filterState = reactive({
  search: "",
  filtered: {
    /** The count of all visible items. */
    count: 0,
    /** Map from visible item id to its search score. */
    items: new Map() as Map<string, number>,
    /** Set of groups with at least one visible item. */
    groups: new Set() as Set<string>,
  },
})

function filterItems() {
  filterState.filtered.count = allItems.value.size
  // 禁用客户端过滤：结果可见性完全由外部数据源决定（仅保留 Empty 判定）
  if (!props.shouldFilter) {
    return
  }
  if (!filterState.search) {
    // Do nothing, each item will know to show itself because search is empty
    return
  }

  // Reset the groups
  filterState.filtered.groups = new Set()
  let itemCount = 0

  // Check which items should be included
  for (const [id, value] of allItems.value) {
    const score = contains(value, filterState.search)
    filterState.filtered.items.set(id, score ? 1 : 0)
    if (score)
      itemCount++
  }

  // Check which groups have at least 1 item shown
  for (const [groupId, group] of allGroups.value) {
    for (const itemId of group) {
      if (filterState.filtered.items.get(itemId)! > 0) {
        filterState.filtered.groups.add(groupId)
        break
      }
    }
  }

  filterState.filtered.count = itemCount
}

watch(() => filterState.search, () => {
  filterItems()
})

// 结果集由外部更新（服务端搜索）时，同步可见数量供 Empty 判定
watch(() => allItems.value.size, () => {
  filterItems()
})

provideCommandContext({
  allItems,
  allGroups,
  filterState,
})
</script>

<template>
  <ListboxRoot
    data-slot="command"
    v-bind="forwarded"
    :class="cn('bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md', props.class)"
  >
    <slot />
  </ListboxRoot>
</template>
