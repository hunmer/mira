<script setup lang="ts">
import type { SniffedResource } from '@/shared/types';
defineProps<{ resource: SniffedResource; selected: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="item" @click="$emit('toggle')">
    <input type="checkbox" :checked="selected" @click.stop="$emit('toggle')" />
    <img v-if="resource.kind === 'image'" :src="resource.url" class="thumb" loading="lazy" />
    <img v-else-if="resource.kind === 'video' && resource.poster" :src="resource.poster" class="thumb" loading="lazy" />
    <div v-else class="thumb icon">{{ resource.kind === 'audio' ? '🎵' : '🎬' }}</div>
    <div class="meta">
      <div class="url">{{ resource.url.split('/').pop() }}</div>
      <div class="dim">{{ resource.width }}×{{ resource.height }} · ×{{ resource.occurrences }}</div>
    </div>
  </div>
</template>

<style scoped>
.item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; background: var(--bg-elev); }
.thumb.icon { display: flex; align-items: center; justify-content: center; font-size: 20px; }
.meta { flex: 1; overflow: hidden; }
.url { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dim { font-size: 11px; color: var(--muted); }
</style>
