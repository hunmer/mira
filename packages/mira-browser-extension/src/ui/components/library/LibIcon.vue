<script setup lang="ts">
/**
 * 素材库图标渲染。
 *
 * 后端 Library.icon 存的是 Material Icons 字体名(如 'default' / 'folder' / 'photo')。
 * 字体文件(material-icons.ttf)已下载到 public/fonts/,在 style.css 全局声明 @font-face,
 * 这里直接用 <span class="material-icons"> 渲染,与桌面端一致。
 *
 * 空值或 'default' 统一回退到资源库默认图标。
 *
 * 用法:<LibIcon :name="lib.icon" :size="28" />
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ name?: string; size?: number }>(),
  { name: '', size: 28 },
);

const iconName = computed(() => {
  const n = props.name?.trim();
  // 空或 'default' → 用资源库默认图标
  return n && n !== 'default' ? n : 'video_library';
});
const fontSize = computed(() => `${props.size}px`);
</script>

<template>
  <span class="material-icons lib-icon" :style="{ fontSize }">{{ iconName }}</span>
</template>

<style scoped>
.lib-icon { color: var(--primary); line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
</style>
