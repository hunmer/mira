<script setup lang="ts">
import NotificationCard from './NotificationCard.vue'
import MoreNotifications from './MoreNotifications.vue'
import type { NotificationAction, NotificationPayload } from '../shared/types'

interface Item extends NotificationPayload { __itemKey?: number }
interface Props {
  items: Item[]
  remaining: number
  animDir?: 'left' | 'right' | 'up' | 'down'
  onClick?: (item: Item) => void
  onAction?: (item: Item, action: NotificationAction) => void
  onClose?: (item: Item, index: number) => void
  onMore?: () => void
}
const props = defineProps<Props>()
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <NotificationCard
      v-for="(item, index) in props.items"
      :key="item.__itemKey ?? index"
      :item="item"
      :anim-dir="props.animDir"
      :on-click="() => props.onClick?.(item)"
      :on-action="(action) => props.onAction?.(item, action)"
      :on-close="() => props.onClose?.(item, index)"
    />
    <MoreNotifications v-if="props.remaining > 0" :count="props.remaining" :on-click="props.onMore" />
  </div>
</template>
