<script setup lang="ts">
import { Masonry, type MasonryItemMeta } from '@hunmer/vue-masonry';
import '@hunmer/vue-masonry/style.css';
import type { SniffedResource } from '@/shared/types';
import MasonryItem from './MasonryItem.vue';

defineProps<{ resources: SniffedResource[]; selected: Set<string> }>();
defineEmits<{ toggle: [id: string] }>();

function getKey(r: SniffedResource) {
  return r.id;
}

/** 求两数最大公约数 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * 由资源原始宽高算最简整数比字符串(如 3:4)。
 * 无尺寸或非法值回退 1:1,保证瀑布流整齐且懒加载友好。
 */
function ratioOf(r: SniffedResource): string {
  const { width: w, height: h } = r;
  if (!w || !h || w <= 0 || h <= 0) return '1:1';
  const g = gcd(Math.round(w), Math.round(h));
  return `${Math.round(w) / g}:${Math.round(h) / g}`;
}

function getMeta(r: SniffedResource): MasonryItemMeta {
  return { aspect: ratioOf(r), lazy: true };
}
</script>

<template>
  <div class="masonry-wrap">
    <Masonry
      :data="resources"
      :get-key="getKey"
      :get-meta="getMeta"
      :columns="{ base: 2, sm: 3, md: 4 }"
      :gap="8"
    >
      <template #default="{ item }">
        <MasonryItem
          :resource="item"
          :selected="selected.has(item.id)"
          @toggle="$emit('toggle', item.id)"
        />
      </template>
    </Masonry>
  </div>
</template>

<style scoped>
.masonry-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
</style>
