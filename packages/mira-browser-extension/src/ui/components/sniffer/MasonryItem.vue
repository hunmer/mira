<script setup lang="ts">
import type { SniffedResource } from '@/shared/types';
defineProps<{ resource: SniffedResource; selected: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="card" :class="{ selected }" @click="$emit('toggle')">
    <!-- 媒体内容:图片 / video poster 填满,无图用大图标占位 -->
    <img
      v-if="resource.kind === 'image'"
      :src="resource.url"
      class="media"
      loading="lazy"
    />
    <img
      v-else-if="resource.kind === 'video' && resource.poster"
      :src="resource.poster"
      class="media"
      loading="lazy"
    />
    <div v-else class="media icon">{{ resource.kind === 'audio' ? '🎵' : '🎬' }}</div>

    <!-- 选中态:左上角角标 + 半透明遮罩 -->
    <div class="check" :class="{ on: selected }">
      <svg v-if="selected" viewBox="0 0 16 16" width="12" height="12">
        <path
          d="M3.5 8.5l3 3 6-6.5"
          fill="none"
          stroke="#fff"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <!-- 底部叠加 meta(hover 显隐) -->
    <div class="meta">
      <div class="url">{{ resource.url.split('/').pop() }}</div>
      <div class="dim">
        {{ resource.width && resource.height ? `${resource.width}×${resource.height}` : '' }}
        <span v-if="resource.occurrences > 1"> · ×{{ resource.occurrences }}</span>
      </div>
      <div v-if="resource.tabTitle" class="source">{{ resource.tabTitle }}</div>
    </div>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--bg-elev);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}
.card.selected {
  border-color: var(--primary);
}

/* 媒体填满卡片 */
.media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  background: var(--bg-elev);
}

/* 选中角标 */
.check {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.check.on {
  background: var(--primary);
  border-color: var(--primary);
}

/* 底部 meta */
.meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 8px 6px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}
.card:hover .meta {
  opacity: 1;
}
.url {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dim {
  font-size: 10px;
  opacity: 0.85;
}
.source {
  font-size: 10px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
