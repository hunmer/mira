<script setup lang="ts">
/**
 * Breadcrumb —— 面包屑导航组件。
 *
 * 渲染一组层级路径，除最后一项（当前所在位置）外均可点击，
 * 点击时通过 `select` 事件向上抛出被点击的项。
 *
 * 用法：
 *   <Breadcrumb :items="items" @select="onSelect" />
 */
import type { BreadcrumbItem } from '@renderer/controllers/HomeController'

interface Props {
  /** 面包屑项目列表，按层级顺序：第一项为根，最后一项为当前位置；不传或为空时不渲染 */
  items?: BreadcrumbItem[]
  /** 分隔符图标（material icon 名称），默认 chevron_right */
  separator?: string
}

withDefaults(defineProps<Props>(), {
  items: () => [],
  separator: 'chevron_right'
})

const emit = defineEmits<{
  select: [item: BreadcrumbItem]
}>()

const handleClick = (item: BreadcrumbItem, isLast: boolean) => {
  // 最后一项是当前位置，不可点击
  if (isLast) return
  emit('select', item)
}
</script>

<template>
  <nav
    v-if="items.length > 0"
    class="flex items-center min-w-0 flex-1"
    :aria-label="$t('commonUi.breadcrumb.ariaLabel')"
  >
    <template v-for="(item, index) in items" :key="item.id">
      <!-- 当前项（最后一项）：纯文本，不可点击 -->
      <span
        v-if="index === items.length - 1"
        class="flex items-center space-x-1 text-foreground dark:text-foreground font-medium truncate"
        :aria-current="item.active ? 'page' : undefined"
      >
        <span v-if="item.icon" class="material-icons text-sm flex-shrink-0">{{ item.icon }}</span>
        <span v-if="item.label" class="truncate">{{ item.label }}</span>
      </span>

      <!-- 可点击的父级项 -->
      <button
        v-else
        type="button"
        class="flex items-center space-x-1 text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors truncate cursor-pointer"
        :title="item.label"
        @click="handleClick(item, false)"
      >
        <span v-if="item.icon" class="material-icons text-sm flex-shrink-0">{{ item.icon }}</span>
        <span v-if="item.label" class="truncate">{{ item.label }}</span>
      </button>

      <!-- 分隔符（非最后一项后显示） -->
      <span
        v-if="index < items.length - 1"
        class="material-icons text-sm text-muted-foreground/50 dark:text-muted-foreground/50 mx-0.5 flex-shrink-0"
      >
        {{ separator }}
      </span>
    </template>
  </nav>
</template>
