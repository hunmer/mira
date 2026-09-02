<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SniffedResource } from '@/shared/types';
import { useImagePreview } from '@/ui/composables/useImagePreview';
const { t } = useI18n();
const props = defineProps<{ resource: SniffedResource; selected: boolean }>();
defineEmits<{ toggle: [] }>();

const preview = useImagePreview();

/** 可悬浮预览的大图 url(图片用原图,video 用 poster);非可视媒体返回 null */
const previewUrl = computed(() => {
  const r = props.resource;
  if (r.kind === 'image') return r.url;
  if (r.kind === 'video' && r.poster) return r.poster;
  return null;
});

function onEnter(e: MouseEvent) {
  const url = previewUrl.value;
  if (url) preview.show(url, e.clientX, e.clientY);
}
function onMove(e: MouseEvent) {
  const url = previewUrl.value;
  if (url) preview.show(url, e.clientX, e.clientY);
}
function onLeave() {
  preview.hide();
}
</script>

<template>
  <div class="item" @click="$emit('toggle')">
    <input type="checkbox" :checked="selected" @click.stop="$emit('toggle')" />
    <img
      v-if="resource.kind === 'image'"
      :src="resource.url"
      class="thumb"
      loading="lazy"
      @mouseenter="onEnter"
      @mousemove="onMove"
      @mouseleave="onLeave"
    />
    <img
      v-else-if="resource.kind === 'video' && resource.poster"
      :src="resource.poster"
      class="thumb"
      loading="lazy"
      @mouseenter="onEnter"
      @mousemove="onMove"
      @mouseleave="onLeave"
    />
    <div v-else class="thumb icon">{{ resource.kind === 'audio' ? '🎵' : '🎬' }}</div>
    <div class="meta">
      <div class="url">{{ resource.url.split('/').pop() }}</div>
      <div class="dim">{{ resource.width }}×{{ resource.height }} · ×{{ resource.occurrences }}</div>
      <div v-if="resource.tabTitle" class="source">{{ t('sniffer.source', { title: resource.tabTitle }) }}</div>
    </div>
  </div>
</template>

<style scoped>
.item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; background: var(--bg-elev); }
.thumb.icon { display: flex; align-items: center; justify-content: center; font-size: 20px; }
.meta { flex: 1; overflow: hidden; }
.url { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dim { font-size: 11px; color: var(--muted-foreground); }
.source { font-size: 10px; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
