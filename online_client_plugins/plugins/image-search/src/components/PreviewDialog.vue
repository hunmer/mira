<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Search,
  X,
} from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Dialog, DialogContent } from 'mira-plugin-ui/src/components/ui/dialog'
import { t } from '@/lib/i18n'
import { openExternal } from '@/lib/mira'
import { pinUrl } from '@/lib/pinterest'
import { closePreview, previewItem, previewNav, reSearch, saveItem, state } from '@/stores/tasks'

/**
 * 大图预览：底部工具条 = 保存(S) / 反向搜索(F) / Pinterest 打开(O) / 翻页(←→) / 关闭(Esc)。
 * 翻页与快捷键在 App.vue 统一处理，这里只做展示与按钮入口。
 */
const item = previewItem
const failed = ref(false)
const src = ref('')

watch(
  () => item.value?.key,
  (key) => {
    failed.value = false
    src.value = key ? (item.value?.largeUrl || item.value?.url || '') : ''
  },
  { immediate: true },
)

function onImageError() {
  if (item.value && !failed.value) {
    failed.value = true
    src.value = item.value.url || item.value.squareUrl
  }
}
</script>

<template>
  <Dialog :open="state.preview.open" @update:open="(open) => !open && closePreview()">
    <DialogContent
      class="max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-xl"
      :show-close-button="false"
    >
      <div class="flex max-h-[70vh] items-center justify-center bg-black/90 p-2">
        <img
          v-if="src"
          :src="src"
          :alt="item?.title"
          class="max-h-[68vh] max-w-full rounded-md object-contain"
          @error="onImageError"
        >
      </div>
      <div class="flex items-center justify-center gap-1.5 border-t border-border bg-background px-3 py-2">
        <Button variant="ghost" size="sm" :title="t('main.preview.prev')" :disabled="!item" @click="previewNav(-1)">
          <ChevronLeft class="size-4" />
        </Button>
        <Button variant="ghost" size="sm" :title="t('main.preview.next')" :disabled="!item" @click="previewNav(1)">
          <ChevronRight class="size-4" />
        </Button>
        <span class="mx-2 min-w-0 flex-1 truncate text-center text-xs text-muted-foreground" :title="item?.title">
          {{ item?.title }}
        </span>
        <Button
          variant="ghost" size="sm"
          :title="`${item?.saved ? t('main.image.saved') : t('main.image.save')} (S)`"
          :disabled="!item"
          @click="item && saveItem(item)"
        >
          <Check v-if="item?.saved" class="size-4 text-primary" />
          <Download v-else class="size-4" />
        </Button>
        <Button
          variant="ghost" size="sm"
          :title="`${t('main.image.research')} (F)`"
          :disabled="!item"
          @click="item && reSearch(item)"
        >
          <Search class="size-4" />
        </Button>
        <Button
          variant="ghost" size="sm"
          :title="t('main.preview.openOnPinterest')"
          :disabled="!item"
          @click="item && openExternal(pinUrl(item.id))"
        >
          <ExternalLink class="size-4" />
        </Button>
        <Button variant="ghost" size="sm" :title="`${t('main.preview.close')} (Esc)`" @click="closePreview()">
          <X class="size-4" />
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
