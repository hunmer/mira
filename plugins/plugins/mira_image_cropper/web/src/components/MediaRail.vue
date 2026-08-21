<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImagePlus, Trash2 } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { useCropperStore } from '@/stores/cropper'

/**
 * 左侧图片实例栏：每个缩略图对应一份独立的选区/历史/导出数据。
 * 点击切换当前实例（懒加载原图），hover 可删除，底部添加本地图片。
 */
const store = useCropperStore()
const fileInput = ref<HTMLInputElement | null>(null)
/** 缩略图加载失败的实例（降级为占位图标，不影响原图懒加载） */
const brokenThumbs = ref(new Set<string>())

const list = computed(() =>
  store.order.map((key) => store.instances[key]).filter(Boolean),
)

function onPickFile(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  for (const file of files) {
    if (file.type.startsWith('image/')) void store.addLocalFile(file)
  }
  ;(e.target as HTMLInputElement).value = ''
}

function thumbTitle(inst: { name: string; loadError: string }): string {
  return inst.loadError ? `${inst.name}（${inst.loadError}）` : inst.name
}
</script>

<template>
  <aside class="w-24 shrink-0 border-r bg-background flex flex-col min-h-0">
    <div class="flex items-center justify-between px-2 h-8 border-b shrink-0">
      <span class="text-xs text-muted-foreground">图片</span>
      <Button variant="ghost" size="icon-xs" title="添加图片" @click="fileInput?.click()">
        <ImagePlus />
      </Button>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
      <div
        v-for="inst in list"
        :key="inst.key"
        class="group relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all"
        :class="inst.key === store.activeKey
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-primary/50'"
        :title="thumbTitle(inst)"
        @click="store.setActive(inst.key)"
      >
        <img
          v-if="inst.thumbUrl && !brokenThumbs.has(inst.key)"
          :src="inst.thumbUrl"
          class="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          alt=""
          draggable="false"
          @error="brokenThumbs.add(inst.key)"
        />
        <div v-else class="absolute inset-0 grid place-items-center text-muted-foreground text-xl" :title="inst.name">🖼️</div>

        <!-- 加载/失败角标 -->
        <span
          v-if="inst.loading"
          class="absolute top-1 left-1 size-2 rounded-full bg-primary animate-pulse"
        />
        <span
          v-else-if="inst.loadError"
          class="absolute top-1 left-1 size-2 rounded-full bg-destructive"
          :title="inst.loadError"
        />

        <!-- 选区数角标 -->
        <span
          v-if="inst.regions.length"
          class="absolute right-1 bottom-1 min-w-4 px-1 rounded-full bg-black/70 text-white text-[10px] leading-4 text-center font-mono"
        >
          {{ inst.regions.length }}
        </span>

        <Button
          variant="secondary"
          size="icon-xs"
          class="!absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity !size-5"
          title="移除此图片"
          @click.stop="store.removeInstance(inst.key)"
        >
          <Trash2 />
        </Button>
      </div>

      <button
        class="w-full aspect-square rounded-lg border border-dashed grid place-items-center text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        title="添加图片"
        @click="fileInput?.click()"
      >
        <ImagePlus class="size-5" />
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
      multiple
      class="hidden"
      @change="onPickFile"
    />
  </aside>
</template>
