<script setup lang="ts">
import { ImagePlus, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface Cover {
  type: 'gradient' | 'url'
  value: string
}

const cover = defineModel<Cover | null>({ default: null })
const open = ref(false)
const url = ref('')

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5d0fe 0%, #fbcfe8 100%)',
]

watch(open, (value) => {
  if (value) url.value = cover.value?.type === 'url' ? cover.value.value : ''
})

function coverStyle () {
  if (!cover.value) return {}
  if (cover.value.type === 'gradient') return { background: cover.value.value }
  return { backgroundImage: `url("${cover.value.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
}

function applyGradient (gradient: string) {
  cover.value = { type: 'gradient', value: gradient }
  open.value = false
}

function applyUrl () {
  const value = url.value.trim()
  if (!value) return
  cover.value = { type: 'url', value }
  open.value = false
}

function remove () {
  cover.value = null
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <!-- 有封面：作为卡片顶部的背景层，标题等内容叠在其上（z-10），不会被盖住 -->
    <template v-if="cover">
      <div class="absolute inset-x-0 top-0 z-0 h-52">
        <div class="h-full w-full" :style="coverStyle()" />
        <!-- 底部渐变遮罩（加深到接近卡片底色），保证落在封面下缘的标题可读 -->
        <div class="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-card via-card/90 to-card/10" />
      </div>
      <div class="absolute right-3 top-44 z-10 flex items-center gap-1">
        <PopoverTrigger as-child>
          <Button size="xs" variant="secondary" class="bg-background/70 shadow-sm backdrop-blur">
            <ImagePlus class="size-3" />
            更换封面
          </Button>
        </PopoverTrigger>
        <Button size="xs" variant="secondary" class="bg-background/70 shadow-sm backdrop-blur" @click="remove">
          <X class="size-3" />
          移除
        </Button>
      </div>
    </template>
    <!-- 无封面：标题上方的入口（对齐内容列左缘） -->
    <div v-else class="relative z-10 mb-1 ml-24 mt-3">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <ImagePlus class="size-3.5" />
          添加封面
        </button>
      </PopoverTrigger>
    </div>

    <PopoverContent align="start" class="w-80 p-3" :side-offset="8">
      <p class="mb-2 text-xs font-medium text-muted-foreground">渐变色</p>
      <div class="grid grid-cols-6 gap-1.5">
        <button
          v-for="gradient in GRADIENTS"
          :key="gradient"
          type="button"
          class="h-9 cursor-pointer rounded-md border transition-transform hover:scale-105"
          :class="cover?.type === 'gradient' && cover?.value === gradient ? 'ring-2 ring-primary' : ''"
          :style="{ background: gradient }"
          @click="applyGradient(gradient)"
        />
      </div>
      <p class="mb-2 mt-3 text-xs font-medium text-muted-foreground">图片链接</p>
      <div class="flex items-center gap-2">
        <Input v-model="url" placeholder="https://…" class="h-8 text-sm" @keyup.enter="applyUrl" />
        <Button size="sm" :disabled="!url.trim()" @click="applyUrl">应用</Button>
      </div>
      <Button v-if="cover" variant="ghost" size="sm" class="mt-2 w-full cursor-pointer" @click="remove">
        移除封面
      </Button>
    </PopoverContent>
  </Popover>
</template>
