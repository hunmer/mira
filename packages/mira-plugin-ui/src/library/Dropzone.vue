<script setup lang="ts">
/**
 * 上传拖放区:点击选择文件 / 拖放本地文件 → emit('drop', files)。
 * 链接拖拽(files 空)不 emit,冒泡给外层处理(如树视图的根落点)。
 *
 * 已选文件在区内以 Attachment 卡片展示(可移除,emit('remove', file));
 * 图片文件显示缩略图(objectURL,移除/卸载时回收)。
 *
 * 注意:Attachment 列表基于库的 tailwind 组件体系,宿主需引入
 * mira-plugin-ui.css(library 子路径本身不携带样式)。
 */
import { onBeforeUnmount, ref } from 'vue';
import { FileImage, FileText, Film, Music, X } from '@lucide/vue';
import { canAcceptDrop } from './drag-data';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '../components/ui/attachment/index';

withDefaults(defineProps<{ hint?: string }>(), { hint: '拖放文件到此处,或点击选择' });
const emit = defineEmits<{
  drop: [files: File[]];
  /** 移除一个已暂存的文件 */
  remove: [file: File];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const hovering = ref(false);

// ---- 已暂存文件 + 图片预览 ----
const staged = ref<File[]>([]);
const previews = new Map<File, string>();

function previewUrl(file: File): string {
  let url = previews.get(file);
  if (url == null) {
    url = URL.createObjectURL(file);
    previews.set(file, url);
  }
  return url;
}

function releasePreview(file: File) {
  const url = previews.get(file);
  if (url != null) {
    URL.revokeObjectURL(url);
    previews.delete(file);
  }
}

onBeforeUnmount(() => {
  for (const url of previews.values()) URL.revokeObjectURL(url);
  previews.clear();
});

function addFiles(files: File[]) {
  if (!files.length) return;
  staged.value = [...staged.value, ...files];
  emit('drop', files);
}

function removeFile(file: File) {
  staged.value = staged.value.filter(f => f !== file);
  releasePreview(file);
  emit('remove', file);
}

// ---- 类型图标 / 大小格式化 ----
function iconOf(file: File) {
  if (file.type.startsWith('image/')) return FileImage;
  if (file.type.startsWith('video/')) return Film;
  if (file.type.startsWith('audio/')) return Music;
  return FileText;
}

function isImage(file: File) {
  return file.type.startsWith('image/');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---- 拖放 / 选择 ----
function onDragOver(e: DragEvent) {
  // 文件或链接都高亮(链接 drop 由外层处理)
  if (!canAcceptDrop(e.dataTransfer)) return;
  e.preventDefault();
  hovering.value = true;
}

function onDrop(e: DragEvent) {
  hovering.value = false;
  // 本地文件 → 暂存;链接(files 空)不处理,冒泡到外层处理
  addFiles(Array.from(e.dataTransfer?.files ?? []));
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  addFiles(Array.from(input.files ?? []));
  // 重置以便连续选择同一文件仍触发 change
  input.value = '';
}
</script>

<template>
  <div class="dropzone">
    <div
      class="zone"
      :class="{ hover: hovering }"
      @click="fileInput?.click()"
      @dragover="onDragOver"
      @dragleave="hovering = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" multiple class="file-input" @change="onPick" />
      <span>{{ hint }}</span>
    </div>

    <!-- 已暂存文件:Attachment 卡片,可移除(idle 虚线边框 = 待上传) -->
    <AttachmentGroup v-if="staged.length" class="files">
      <Attachment
        v-for="file in staged"
        :key="file.name + file.size + file.lastModified"
        size="sm"
        state="idle"
      >
        <AttachmentMedia :variant="isImage(file) ? 'image' : 'icon'">
          <img v-if="isImage(file)" :src="previewUrl(file)" :alt="file.name" />
          <component :is="iconOf(file)" v-else />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{{ file.name }}</AttachmentTitle>
          <AttachmentDescription>{{ formatSize(file.size) }}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction :aria-label="`移除 ${file.name}`" @click="removeFile(file)">
            <X />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </AttachmentGroup>
  </div>
</template>

<style scoped>
.zone {
  padding: 24px;
  margin: 12px;
  border: 2px dashed var(--border);
  border-radius: var(--radius, 6px);
  text-align: center;
  color: var(--muted-fg, var(--muted));
  transition: border-color .15s;
  cursor: pointer;
}
.zone.hover { border-color: var(--primary); color: var(--fg); }
.file-input { display: none; }
.files { padding: 0 12px 8px; }
</style>
