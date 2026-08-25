<script lang="ts">
/** 暂存条目：本地 File 或元数据文件（如素材库文件，previewUrl 直接作缩略图源） */
export type DropzoneItem = File | { name: string; size: number; type?: string; previewUrl?: string };
</script>

<script setup lang="ts">
/**
 * 上传拖放区:点击选择文件 / 拖放本地文件 → emit('drop', files)。
 * 链接拖拽(files 空)不 emit,冒泡给外层处理(如树视图的根落点)。
 *
 * 已暂存条目在区内以 Attachment 卡片展示(可移除,emit('remove', file));v-model:files
 * 除本地 File 外也接受元数据条目(如素材库文件:name/size/可选 type/previewUrl,
 * previewUrl 直接作缩略图源)——外部把两类条目放进同一列表统一交互。
 * 外部可通过 fileState/fileDescription 反馈每个条目的发送状态
 * (uploading=Spinner,done=✓,error=警告图标);removable=false 隐藏移除按钮。
 *
 * 样式为 tailwind/shadcn 原子类,无 scoped CSS(见仓库 ui_rule.md)。
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { CheckIcon, FileImage, FileText, FileWarningIcon, Film, Music, X } from '@lucide/vue';
import { canAcceptDrop } from './drag-data';
import { Spinner } from '../components/ui/spinner';
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

type FileState = 'idle' | 'processing' | 'uploading' | 'done' | 'error';

const props = withDefaults(
  defineProps<{
    hint?: string;
    /** 附件媒体展示样式:image=图片缩略图,icon=类型图标 */
    mediaVariant?: 'icon' | 'image';
    /** 附件排列方向:horizontal=横排,vertical=媒体在上竖排 */
    orientation?: 'horizontal' | 'vertical';
    /** 每个暂存条目的展示状态(发送/上传反馈);缺省 idle */
    fileState?: (file: DropzoneItem) => FileState;
    /** 每个条目的动态描述(如进度百分比);有值时覆盖默认的 扩展名 · 大小 */
    fileDescription?: (file: DropzoneItem) => string | undefined;
    /** 是否显示移除按钮(发送进行中等场景置 false),默认 true */
    removable?: boolean;
  }>(),
  { hint: '拖放文件到此处,或点击选择', mediaVariant: 'image', orientation: 'horizontal', removable: true },
);
const emit = defineEmits<{
  drop: [files: File[]];
  /** 移除一个已暂存的条目 */
  remove: [file: DropzoneItem];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const hovering = ref(false);

// ---- 已暂存条目:传 v-model:files 走受控,否则内部自持 ----
const filesModel = defineModel<DropzoneItem[]>('files');
const internal = ref<DropzoneItem[]>([]);
const staged = computed(() => filesModel.value ?? internal.value);

function setStaged(next: DropzoneItem[]) {
  if (filesModel.value !== undefined) filesModel.value = next;
  else internal.value = next;
}

function stateOf(file: DropzoneItem): FileState {
  return props.fileState?.(file) ?? 'idle';
}

function descriptionOf(file: DropzoneItem): string {
  return props.fileDescription?.(file)
    ?? `${extOf(file)} · ${formatSize(file.size)}`;
}

// ---- 图片预览:元数据条目直接用 previewUrl;本地 File 走 objectURL(移除/卸载时回收) ----
const previews = new Map<File, string>();

function objectUrlOf(file: File): string {
  let url = previews.get(file);
  if (url == null) {
    url = URL.createObjectURL(file);
    previews.set(file, url);
  }
  return url;
}

/** 元数据条目(如素材库文件)的 previewUrl 直接作缩略图源 */
function previewSrc(file: DropzoneItem): string {
  const meta = file as { previewUrl?: string };
  return meta.previewUrl || (file instanceof File ? objectUrlOf(file) : '');
}

function releasePreview(file: DropzoneItem) {
  if (!(file instanceof File)) return
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

function removeFile(file: DropzoneItem) {
  setStaged(staged.value.filter(f => f !== file));
  releasePreview(file);
  emit('remove', file);
}

// ---- 类型图标 / 大小格式化 ----
function iconOf(file: DropzoneItem) {
  if (file.type?.startsWith('image/')) return FileImage;
  if (file.type?.startsWith('video/')) return Film;
  if (file.type?.startsWith('audio/')) return Music;
  return FileText;
}

function isImage(file: DropzoneItem) {
  return !!file.type?.startsWith('image/');
}

function mediaVariantOf(file: DropzoneItem): 'icon' | 'image' {
  // 状态反馈态(uploading/done/error)强制图标位,不显示缩略图
  const state = stateOf(file)
  if (state !== 'idle' && state !== 'processing') return 'icon'
  return props.mediaVariant === 'image' && isImage(file) ? 'image' : 'icon'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 扩展名大写(无扩展名显示 FILE) */
function extOf(file: DropzoneItem) {
  return (file.name.split('.').pop() || 'FILE').toUpperCase();
}

/** 列表 key:元数据条目无 lastModified */
function keyOf(file: DropzoneItem) {
  return file.name + file.size + ((file as File).lastModified ?? '');
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

    <!-- 已暂存条目:Attachment 卡片(外部 fileState 反馈发送状态;removable=false 隐藏移除) -->
    <AttachmentGroup v-if="staged.length" class="px-3 pb-2">
      <Attachment
        v-for="file in staged"
        :key="keyOf(file)"
        size="sm"
        :state="stateOf(file)"
        :orientation="orientation"
        :class="orientation === 'vertical' && 'w-40 gap-0 overflow-hidden has-data-[slot=attachment-content]:p-0 has-data-[slot=attachment-media]:p-0'"
      >
        <AttachmentMedia
          :variant="mediaVariantOf(file)"
          :class="orientation === 'vertical' && 'w-full! rounded-none'"
        >
          <Spinner v-if="stateOf(file) === 'uploading'" />
          <CheckIcon v-else-if="stateOf(file) === 'done'" />
          <FileWarningIcon v-else-if="stateOf(file) === 'error'" />
          <img v-else-if="mediaVariantOf(file) === 'image' && previewSrc(file)" :src="previewSrc(file)" :alt="file.name" />
          <component :is="iconOf(file)" v-else />
        </AttachmentMedia>

        <AttachmentContent :class="orientation === 'vertical' ? 'px-2 py-1.5' : undefined">
          <AttachmentTitle>{{ file.name }}</AttachmentTitle>
          <AttachmentDescription>{{ descriptionOf(file) }}</AttachmentDescription>
        </AttachmentContent>

        <!-- 竖排:删除按钮悬浮在媒体右上角;横排:常规尾部动作区 -->
        <AttachmentAction
          v-if="removable && orientation === 'vertical'"
          class="absolute top-1 right-1 z-20 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
          :aria-label="`移除 ${file.name}`"
          @click="removeFile(file)"
        >
          <X />
        </AttachmentAction>
        <AttachmentActions v-else-if="removable">
          <AttachmentAction :aria-label="`移除 ${file.name}`" @click="removeFile(file)">
            <X />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </AttachmentGroup>
  </div>
</template>
