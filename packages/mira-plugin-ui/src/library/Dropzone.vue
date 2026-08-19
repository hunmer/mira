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
import { computed, onBeforeUnmount, ref } from 'vue';
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

// ---- 已暂存文件:传 v-model:files 走受控,否则内部自持 ----
const filesModel = defineModel<File[]>('files');
const internal = ref<File[]>([]);
const staged = computed(() => filesModel.value ?? internal.value);

function setStaged(next: File[]) {
  if (filesModel.value !== undefined) filesModel.value = next;
  else internal.value = next;
}

// ---- 图片预览(objectURL,移除/卸载时回收) ----
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
  setStaged([...staged.value, ...files]);
  emit('drop', files);
}

function removeFile(file: File) {
  setStaged(staged.value.filter(f => f !== file));
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

// 附件媒体展示样式:image=图片缩略图,icon=统一类型图标;排列方向:horizontal=横排,vertical=媒体在上竖排
const mediaVariant = ref<'icon' | 'image'>('image');
const orientation = ref<'horizontal' | 'vertical'>('horizontal');
function mediaVariantOf(file: File): 'icon' | 'image' {
  return mediaVariant.value === 'image' && isImage(file) ? 'image' : 'icon';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 扩展名大写(无扩展名显示 FILE) */
function extOf(file: File): string {
  return (file.name.split('.').pop() || 'FILE').toUpperCase();
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
    <!-- 右上角:附件展示样式(缩略图/图标) + 排列方向(横排/竖排) -->
    <div class="style-toggles">
      <div class="variant-toggle" role="group" aria-label="附件展示样式">
        <button
          type="button"
          :class="{ on: mediaVariant === 'image' }"
          @click="mediaVariant = 'image'"
        >缩略图</button>
        <button
          type="button"
          :class="{ on: mediaVariant === 'icon' }"
          @click="mediaVariant = 'icon'"
        >图标</button>
      </div>
      <div class="variant-toggle" role="group" aria-label="附件排列方向">
        <button
          type="button"
          :class="{ on: orientation === 'horizontal' }"
          @click="orientation = 'horizontal'"
        >横排</button>
        <button
          type="button"
          :class="{ on: orientation === 'vertical' }"
          @click="orientation = 'vertical'"
        >竖排</button>
      </div>
    </div>

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
        :orientation="orientation"
        :class="orientation === 'vertical' && 'w-40 gap-0 overflow-hidden has-data-[slot=attachment-content]:p-0 has-data-[slot=attachment-media]:p-0'"
      >
        <AttachmentMedia
          :variant="mediaVariantOf(file)"
          :class="orientation === 'vertical' && 'w-full! rounded-none'"
        >
          <img v-if="mediaVariantOf(file) === 'image'" :src="previewUrl(file)" :alt="file.name" />
          <component :is="iconOf(file)" v-else />
        </AttachmentMedia>

        <AttachmentContent :class="orientation === 'vertical' ? 'px-2 py-1.5' : undefined">
          <AttachmentTitle>{{ file.name }}</AttachmentTitle>
          <AttachmentDescription>{{ extOf(file) }} · {{ formatSize(file.size) }}</AttachmentDescription>
        </AttachmentContent>

        <!-- 竖排:删除按钮悬浮在媒体右上角;横排:常规尾部动作区 -->
        <AttachmentAction
          v-if="orientation === 'vertical'"
          class="absolute top-1 right-1 z-20 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
          :aria-label="`移除 ${file.name}`"
          @click="removeFile(file)"
        >
          <X />
        </AttachmentAction>
        <AttachmentActions v-else>
          <AttachmentAction :aria-label="`移除 ${file.name}`" @click="removeFile(file)">
            <X />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </AttachmentGroup>
  </div>
</template>

<style scoped>
.dropzone { position: relative; }

/* 右上角展示样式/排列方向切换 */
.style-toggles {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1;
  display: flex;
  gap: 8px;
}
.variant-toggle {
  display: flex;
  gap: 4px;
}
.variant-toggle button {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-elev, inherit);
  color: var(--muted-fg, var(--muted));
  font-size: 11px;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
  transition: color .12s, border-color .12s;
}
.variant-toggle button:hover { color: var(--fg); }
.variant-toggle button.on {
  border-color: var(--primary);
  color: var(--primary);
}

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
