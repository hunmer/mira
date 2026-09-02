<template>
  <div class="release-notes text-sm" @click="handleClick">
    <!-- md-editor-v3 的 markdown-it 开启了 html 透传，release body 无论是
         GitHub 生成的 HTML 片段还是 Markdown 文本都能正确渲染 -->
    <MdPreview
      :model-value="content"
      :theme="settingsStore.isDarkMode ? 'dark' : 'light'"
      preview-theme="github"
      :sanitize="sanitizeHtml"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { useSettingsStore } from '@/renderer/stores/settings'

// electron-updater 的 releaseNotes 可能是字符串（GitHub release body）或数组
const props = defineProps<{
  notes?: string | Array<{ note?: string; version?: string }> | null
}>()

const settingsStore = useSettingsStore()

const content = computed(() => {
  const notes = props.notes
  if (!notes) return ''
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) return notes.map(item => item?.note ?? '').filter(Boolean).join('\n')
  return ''
})

// md-editor-v3 的 sanitize 默认恒等，官方要求调用方注入清洗逻辑
const sanitizeHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, style, link, meta, form').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      } else if (['href', 'src', 'xlink:href'].includes(attr.name) && !/^(https?:|mailto:|#)/i.test(attr.value.trim())) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

// 统一在新窗口打开链接，避免链接劫持当前 webContents 导航
const handleClick = (e: MouseEvent) => {
  const anchor = (e.target as HTMLElement).closest('a[href]')
  if (!anchor) return
  const href = anchor.getAttribute('href') || ''
  if (/^https?:\/\//i.test(href)) {
    e.preventDefault()
    window.open(href, '_blank')
  }
}
</script>

<style scoped>
/* MdPreview 默认带主题背景色和大 padding，收窄以适配弹窗 */
.release-notes {
  --md-bk-color: transparent;
}
.release-notes :deep(.md-editor-preview-wrapper) {
  padding: 0 12px;
}
.release-notes :deep(.md-editor-preview) {
  font-size: 13px;
  line-height: 1.6;
}
.release-notes :deep(.md-editor-preview :first-child) {
  margin-top: 0;
}
.release-notes :deep(.md-editor-preview :last-child) {
  margin-bottom: 0;
}
</style>
