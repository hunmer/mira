<script setup lang="ts">
/**
 * 上传拖放区:点击选择文件 / 拖放本地文件 → emit('drop', files)。
 * 链接拖拽(files 空)不 emit,冒泡给外层处理(如树视图的根落点)。
 *
 * 已选文件在区内以 Attachment 卡片展示(可移除,emit('remove', file));
 * 图片文件显示缩略图(objectURL,移除/卸载时回收)。
 *
 * 样式为 tailwind/shadcn 原子类,无 scoped CSS(见仓库 ui_rule.md)。
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
  <div class="relative">
    <!-- 右上角:附件展示样式(缩略图/图标) + 排列方向(横排/竖排) -->
    <div class="absolute top-5 right-5 z-[1] flex gap-2">
      <div class="flex gap-1" role="group" aria-label="附件展示样式">
        <button
          type="button"
          class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
          :class="{ 'border-primary text-primary': mediaVariant === 'image' }"
          @click="mediaVariant = 'image'"
        >缩略图</button>
        <button
          type="button"
          class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
          :class="{ 'border-primary text-primary': mediaVariant === 'icon' }"
          @click="mediaVariant = 'icon'"
        >图标</button>
      </div>
      <div class="flex gap-1" role="group" aria-label="附件排列方向">
        <button
          type="button"
          class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
          :class="{ 'border-primary text-primary': orientation === 'horizontal' }"
          @click="orientation = 'horizontal'"
        >横排</button>
        <button
          type="button"
          class="cursor-pointer rounded-md border border-border bg-accent px-2 py-1 text-[11px] leading-none text-muted-foreground transition-colors duration-100 hover:text-foreground"
          :class="{ 'border-primary text-primary': orientation === 'vertical' }"
          @click="orientation = 'vertical'"
        >竖排</button>
      </div>
    </div>

    <div
      class="m-3 cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition-colors duration-150"
      :class="hovering ? 'border-primary text-foreground' : 'border-border text-muted-foreground'"
      @click="fileInput?.click()"
      @dragover="onDragOver"
      @dragleave="hovering = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" multiple class="hidden" @change="onPick">
      <span>{{ hint }}</span>
    </div>

    <!-- 已暂存文件:Attachment 卡片,可移除(idle 虚线边框 = 待上传) -->
    <AttachmentGroup v-if="staged.length" class="px-3 pb-2">
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
