<template>
  <!-- ============ 组件库 Tab ============ -->
  <TabsContent value="components" class="space-y-6 mt-4">
    <div class="space-y-1">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.componentsTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.componentsDesc') }}</p>
    </div>

    <!-- NotificationList：折叠堆叠，悬停展开 -->
    <div class="py-4">
      <NotificationList />
    </div>

    <!-- InteractiveHoverButton：悬停扩散填充按钮 -->
    <div class="space-y-3 rounded-lg border p-4">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.interactiveHoverButtonTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.interactiveHoverButtonDesc') }}</p>
      </div>
      <div class="flex items-center gap-8 py-3">
        <InteractiveHoverButton text="Explore" @click="() => {}" />
        <InteractiveHoverButton text="了解更多" class="w-36" />
      </div>
    </div>

    <!-- ChapterScrubber 已移除：波纹悬停与标注点效果并入 ui/scrollbar -->

    <!-- Folder：悬停纸张扇开 -->
    <div class="space-y-3 rounded-lg border p-4">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.folderTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.folderDesc') }}</p>
      </div>
      <div class="flex items-end gap-8 py-6">
        <Folder size="sm" color="yellow" label="12 项" />
        <Folder size="md" color="black" label="设计稿" />
        <Folder size="lg" color="red" label="旅行照片" />
      </div>
    </div>

    <!-- FileIcon / FolderIcon：文件类型图标 -->
    <div class="space-y-3 rounded-lg border p-4">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.fileIconTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.fileIconDesc') }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <p
            v-for="folder in folderDemo"
            :key="folder.name"
            class="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <FolderIcon :name="folder.name" :is-open="folder.open" />
            {{ folder.name }}{{ folder.open ? '（open）' : '' }}
          </p>
        </div>
        <div class="space-y-1.5">
          <p v-for="file in fileDemo" :key="file" class="flex items-center gap-2 text-xs text-muted-foreground">
            <FileIcon :name="file" />
            {{ file }}
          </p>
        </div>
      </div>
    </div>

    <!-- FileCard：文件格式占位卡片 -->
    <div class="space-y-3 rounded-lg border p-4">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.fileCardTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.fileCardDesc') }}</p>
      </div>
      <div class="flex flex-wrap gap-6 pt-3">
        <FileCard v-for="format in fileCardDemo" :key="format" :format-file="format" />
      </div>
    </div>

    <!-- ColorPicker / ColorSwatch：颜色选择器与色块 -->
    <div class="space-y-3 rounded-lg border p-4">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.colorPickerTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.colorPickerDesc') }}</p>
      </div>

      <!-- ColorSwatch：尺寸 × 形状 × 透明度棋盘格 -->
      <div class="flex flex-col gap-2 pt-2">
        <div class="flex items-center gap-4">
          <ColorSwatch v-for="size in swatchSizes" :key="size" color="#3B82F6" :size="size" />
        </div>
        <div class="flex items-center gap-4">
          <ColorSwatch v-for="size in swatchSizes" :key="size" color="#10B981" :size="size" shape="square" />
          <ColorSwatch color="rgba(239, 68, 68, 0.35)" label="半透明红" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-8 pt-2">
        <!-- 默认触发器：色块 + 色值文本 -->
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground">默认触发器</p>
          <ColorPicker v-model="pickerColor">
            <ColorPickerTrigger />
            <ColorPickerContent>
              <ColorAreaRoot v-model="pickerColor" v-slot="{ style: areaStyle }">
                <ColorAreaArea class="relative mx-1 h-36 overflow-hidden rounded-lg" :style="areaStyle">
                  <ColorAreaThumb class="size-5 rounded-full border-2 border-white shadow-md" />
                </ColorAreaArea>
              </ColorAreaRoot>
              <ColorSlider v-model="pickerColor" channel="hue">
                <template #label>色相</template>
                <template #output><ColorSliderOutput /></template>
                <ColorSliderTrack>
                  <ColorSliderThumb />
                </ColorSliderTrack>
              </ColorSlider>
              <ColorSlider v-model="pickerColor" channel="alpha">
                <template #label>透明度</template>
                <template #output><ColorSliderOutput /></template>
                <ColorSliderTrack>
                  <ColorSliderThumb />
                </ColorSliderTrack>
              </ColorSlider>
            </ColorPickerContent>
          </ColorPicker>
        </div>

        <!-- 自定义插槽：覆盖 ColorPickerTrigger 默认内容 -->
        <div class="space-y-1.5">
          <p class="text-xs text-muted-foreground">自定义触发器插槽</p>
          <ColorPicker v-model="pickerColorCustom">
            <ColorPickerTrigger
              class="rounded-lg border bg-background px-3 py-1.5 shadow-xs transition-colors hover:bg-accent dark:bg-input/30 dark:hover:bg-input/50"
            >
              <ColorSwatch :color="pickerColorCustom" shape="square" size="sm" />
              <span class="text-sm">主题色</span>
              <ChevronDown :size="16" class="text-muted-foreground" />
            </ColorPickerTrigger>
            <ColorPickerContent>
              <ColorAreaRoot v-model="pickerColorCustom" v-slot="{ style: areaStyle }">
                <ColorAreaArea class="relative mx-1 h-36 overflow-hidden rounded-lg" :style="areaStyle">
                  <ColorAreaThumb class="size-5 rounded-full border-2 border-white shadow-md" />
                </ColorAreaArea>
              </ColorAreaRoot>
              <ColorSlider v-model="pickerColorCustom" channel="hue">
                <ColorSliderTrack>
                  <ColorSliderThumb />
                </ColorSliderTrack>
              </ColorSlider>
              <ColorSlider v-model="pickerColorCustom" channel="alpha">
                <ColorSliderTrack>
                  <ColorSliderThumb />
                </ColorSliderTrack>
              </ColorSlider>
            </ColorPickerContent>
          </ColorPicker>
        </div>
      </div>
    </div>

    <!-- ExpandableGallery：堆叠 ⇄ 网格 -->
    <div class="space-y-3">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.galleryTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.galleryDesc') }}</p>
      </div>
      <ExpandableGallery :items="galleryItems" class="min-h-[640px] rounded-lg border" />
    </div>

    <!-- FileSystem：Finder 风格文件浏览器 -->
    <div class="space-y-3">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.fileSystemTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.fileSystemDesc') }}</p>
      </div>
      <FileSystem
        :items="fileSystemItems"
        title="Demo Library"
        class="h-[560px]"
        :load-children="loadFolderChildren"
        :get-file-url="resolveFileUrl"
        :load-preview-image-url="loadPreviewPage"
        @selection-change="onFsSelectionChange"
        @file-open="onFsFileOpen"
      />
      <div v-if="fsSelection || fsOpened" class="space-y-0.5 text-xs text-muted-foreground">
        <p v-if="fsSelection">selected: {{ fsSelection }}</p>
        <p v-if="fsOpened">opened: {{ fsOpened }}</p>
      </div>
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TabsContent } from '@/components/ui/tabs'
import { NotificationList } from '@/components/ui/notification-list'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { Folder } from '@/components/ui/folder'
import { ExpandableGallery, type GalleryItem } from '@/components/ui/expandable-gallery'
import { FileIcon, FolderIcon } from '@/components/ui/file-icon'
import { FileCard, type FormatFile } from '@/components/ui/file-card'
import { FileSystem, type FileSystemItem, type FileSystemLoadChildrenResult } from '@/components/ui/file-system'
import { ColorPicker, ColorPickerContent, ColorPickerTrigger } from '@/components/ui/color-picker'
import { ColorSwatch, type ColorSwatchSize } from '@/components/ui/color-swatch'
import { ColorAreaRoot, ColorAreaArea, ColorAreaThumb } from 'reka-ui'
import { ColorSlider, ColorSliderOutput, ColorSliderThumb, ColorSliderTrack } from '@/components/ui/color-slider'
import { ChevronDown } from '@lucide/vue'

const swatchSizes: ColorSwatchSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const pickerColor = ref('#3B82F6')
const pickerColorCustom = ref('#F97316')

const fileCardDemo: FormatFile[] = [
  'doc',
  'pdf',
  'md',
  'csv',
  'xlsx',
  'zip',
  'pptx',
  'png',
  'video',
  'html',
  'css',
  'json',
]

const folderDemo = [
  { name: 'src', open: true },
  { name: 'components', open: false },
  { name: 'node_modules', open: false },
  { name: '.github', open: true },
  { name: 'locales', open: false },
  { name: '任意目录', open: false },
]

const fileDemo = [
  'package.json',
  'tsconfig.json',
  'index.ts',
  'App.vue',
  'style.css',
  'README.md',
  '.gitignore',
  'photo.jpg',
  'data.yaml',
  '未知类型.xyz',
]

// 示例图为 unsplash 外链，仅作演示
const galleryItems: GalleryItem[] = [
  {
    id: 'photo-1',
    src: 'https://images.unsplash.com/photo-1755398104393-746e52af4a9f?w=800',
    alt: 'Technology setup',
    rotation: -15,
    x: -90,
    y: 10,
    zIndex: 10,
  },
  {
    id: 'photo-2',
    src: 'https://images.unsplash.com/photo-1756764099214-b09a5666914b?w=800',
    alt: 'Design research',
    rotation: -3,
    x: -10,
    y: -15,
    zIndex: 20,
  },
  {
    id: 'photo-3',
    src: 'https://images.unsplash.com/photo-1757372429884-92e02350c5d9?w=800',
    alt: 'Code and development',
    rotation: 12,
    x: 75,
    y: 5,
    zIndex: 30,
  },
  { id: 'photo-4', src: 'https://images.unsplash.com/photo-1756993399574-2fa126269ce7?w=800', alt: 'Dashboard interface' },
  { id: 'photo-5', src: 'https://images.unsplash.com/photo-1756990637536-714b76296a30?w=800', alt: 'Product design' },
  { id: 'photo-6', src: 'https://images.unsplash.com/photo-1756838197413-07f174def66c?w=800', alt: 'Developer workspace' },
]

// ---- FileSystem demo ----
const DAY_MS = 24 * 60 * 60 * 1000
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString()
const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=480`

const fsSelection = ref('')
const fsOpened = ref('')

function onFsSelectionChange(item: FileSystemItem | null) {
  fsSelection.value = item?.name ?? ''
}

function onFsFileOpen(file: { name?: string }, url: string | null) {
  fsOpened.value = `${file.name ?? ''}${url ? '' : '（无 URL）'}`
}

// 演示懒加载：archive/ 文件夹带 hasChildren，首次展开时注入子项
function loadFolderChildren({ path }: { path: string, cursor: string | null }): Promise<FileSystemLoadChildrenResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        items:
          path === 'archive/'
            ? [
                { kind: 'file', path: 'archive/backup-2025.zip', size: 52_428_800, contentType: 'application/zip', createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(40) },
                { kind: 'file', path: 'archive/migrations.sql', size: 204_800, createdAt: isoDaysAgo(45), updatedAt: isoDaysAgo(41) },
                { kind: 'file', path: 'archive/旧版手册.docx', size: 1_868_000, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', createdAt: isoDaysAgo(90), updatedAt: isoDaysAgo(60) },
              ]
            : [],
      })
    }, 600)
  })
}

// 演示预签名：没有 url 的文件在打开时经此函数解析（延迟 400ms）
function resolveFileUrl(_file: { name?: string }) {
  return new Promise<string>((resolve) => {
    setTimeout(() => resolve(unsplash('photo-1757372429884-92e02350c5d9')), 400)
  })
}

// 演示分页缩略图：多页文档按需取页封面
function loadPreviewPage(file: { path: string }, pageIndex: number) {
  return Promise.resolve(
    `https://picsum.photos/seed/${encodeURIComponent(file.path)}-${pageIndex}/480/620`
  )
}

// 示例缩略图为 unsplash / picsum 外链，仅作演示
const fileSystemItems: FileSystemItem[] = [
  { kind: 'folder', path: 'photos/', createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(1) },
  { kind: 'folder', path: 'documents/', createdAt: isoDaysAgo(20), updatedAt: isoDaysAgo(3) },
  { kind: 'folder', path: 'documents/invoices/', createdAt: isoDaysAgo(18), updatedAt: isoDaysAgo(5) },
  { kind: 'folder', path: 'src/', createdAt: isoDaysAgo(60), updatedAt: isoDaysAgo(0.2) },
  { kind: 'folder', path: 'src/components/', createdAt: isoDaysAgo(50), updatedAt: isoDaysAgo(1) },
  { kind: 'folder', path: 'archive/', hasChildren: true, createdAt: isoDaysAgo(40) },
  { kind: 'file', path: 'photos/cover-portrait.jpg', size: 2_400_000, contentType: 'image/jpeg', previewImageUrl: unsplash('photo-1755398104393-746e52af4a9f'), url: unsplash('photo-1755398104393-746e52af4a9f'), previewAspectRatio: 0.75, createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2) },
  { kind: 'file', path: 'photos/workspace.jpg', size: 3_100_000, contentType: 'image/jpeg', previewImageUrl: unsplash('photo-1756838197413-07f174def66c'), url: unsplash('photo-1756838197413-07f174def66c'), previewAspectRatio: 1.5, createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(3) },
  { kind: 'file', path: 'photos/design-research.jpg', size: 1_800_000, contentType: 'image/jpeg', previewImageUrl: unsplash('photo-1756764099214-b09a5666914b'), url: unsplash('photo-1756764099214-b09a5666914b'), previewAspectRatio: 1.5, createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(6) },
  { kind: 'file', path: 'photos/dashboard.png', size: 900_000, contentType: 'image/png', previewImageUrl: unsplash('photo-1756993399574-2fa126269ce7'), url: unsplash('photo-1756993399574-2fa126269ce7'), createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(9) },
  { kind: 'file', path: 'photos/product.jpg', size: 2_050_000, contentType: 'image/jpeg', previewImageUrl: unsplash('photo-1756990637536-714b76296a30'), url: unsplash('photo-1756990637536-714b76296a30'), createdAt: isoDaysAgo(12), updatedAt: isoDaysAgo(12) },
  { kind: 'file', path: 'photos/待签名-合同封面.jpg', size: 1_200_000, contentType: 'image/jpeg', previewAspectRatio: 0.75, createdAt: isoDaysAgo(0.5), updatedAt: isoDaysAgo(0.5) },
  { kind: 'file', path: 'documents/annual-report.pdf', size: 8_400_000, contentType: 'application/pdf', previewImageUrl: 'https://picsum.photos/seed/report-cover/480/620', previewPageCount: 6, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', createdAt: isoDaysAgo(15), updatedAt: isoDaysAgo(4) },
  { kind: 'file', path: 'documents/方案说明.docx', size: 1_600_000, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', createdAt: isoDaysAgo(22), updatedAt: isoDaysAgo(10) },
  { kind: 'file', path: 'documents/budget-2026.xlsx', size: 320_000, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', createdAt: isoDaysAgo(30), updatedAt: isoDaysAgo(8) },
  { kind: 'file', path: 'documents/notes.md', size: 12_800, createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(0.1) },
  { kind: 'file', path: 'documents/readme.txt', size: 2_048, createdAt: isoDaysAgo(70), updatedAt: isoDaysAgo(70) },
  { kind: 'file', path: 'documents/invoices/2026-01.pdf', size: 240_000, contentType: 'application/pdf', previewImageUrl: 'https://picsum.photos/seed/invoice-01/480/620', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', createdAt: isoDaysAgo(200), updatedAt: isoDaysAgo(200) },
  { kind: 'file', path: 'documents/invoices/2026-02.pdf', size: 255_000, contentType: 'application/pdf', previewImageUrl: 'https://picsum.photos/seed/invoice-02/480/620', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', createdAt: isoDaysAgo(170), updatedAt: isoDaysAgo(170) },
  { kind: 'file', path: 'src/main.ts', size: 4_096, createdAt: isoDaysAgo(60), updatedAt: isoDaysAgo(2) },
  { kind: 'file', path: 'src/app.vue', size: 18_432, createdAt: isoDaysAgo(55), updatedAt: isoDaysAgo(1) },
  { kind: 'file', path: 'src/utils.ts', size: 6_144, createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(20) },
  { kind: 'file', path: 'src/components/DataTable.vue', size: 24_576, createdAt: isoDaysAgo(50), updatedAt: isoDaysAgo(0.5) },
  { kind: 'file', path: 'src/components/StyleGuide.css', size: 8_192, createdAt: isoDaysAgo(48), updatedAt: isoDaysAgo(6) },
]
</script>
