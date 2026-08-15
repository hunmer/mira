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

    <!-- ChapterScrubber：波纹刻度导航 -->
    <div class="space-y-3 rounded-lg border p-4">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.chapterScrubberTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.chapterScrubberDesc') }}</p>
      </div>
      <div class="flex items-start gap-8">
        <ChapterScrubber
          :chapters="chapters"
          :current-index="5"
          @select="onSelectChapter"
          @active-change="onActiveChapter"
        />
        <div class="space-y-1 text-xs text-muted-foreground pt-2">
          <p>active: {{ activeTitle || '—' }}</p>
          <p>selected: {{ selectedTitle || '—' }}</p>
        </div>
      </div>
    </div>

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

    <!-- ExpandableGallery：堆叠 ⇄ 网格 -->
    <div class="space-y-3">
      <div class="space-y-1">
        <p class="text-sm font-medium text-foreground">{{ $t('views.playgroundPanel.galleryTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.galleryDesc') }}</p>
      </div>
      <ExpandableGallery :items="galleryItems" class="min-h-[640px] rounded-lg border" />
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TabsContent } from '@/components/ui/tabs'
import { NotificationList } from '@/components/ui/notification-list'
import { ChapterScrubber, type Chapter } from '@/components/ui/chapter-scrubber'
import { Folder } from '@/components/ui/folder'
import { ExpandableGallery, type GalleryItem } from '@/components/ui/expandable-gallery'
import { FileIcon, FolderIcon } from '@/components/ui/file-icon'
import { FileCard, type FormatFile } from '@/components/ui/file-card'

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
  'photo.png',
  'data.yaml',
  '未知类型.xyz',
]

const activeTitle = ref('')
const selectedTitle = ref('')

function onSelectChapter(chapter: Chapter) {
  selectedTitle.value = chapter.title
}

function onActiveChapter(chapter: Chapter | null) {
  activeTitle.value = chapter?.title ?? ''
}

const chapters: Chapter[] = Array.from({ length: 24 }, (_, i) => ({
  id: `chapter-${i + 1}`,
  meta: `00:${String(i * 5).padStart(2, '0')}`,
  title: `第 ${i + 1} 章`,
  description: '章节内容简介，悬停刻度可在预览卡中查看，最多显示三行。',
}))

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
</script>
