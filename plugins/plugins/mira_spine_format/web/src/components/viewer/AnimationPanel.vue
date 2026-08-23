<script setup lang="ts">
import { ref, watch } from 'vue'
import { Play, Square } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()

const props = defineProps<{
  animations: string[]
  skins: string[]
}>()

const emit = defineEmits<{
  (e: 'animation-change', name: string): void
  (e: 'skin-change', name: string): void
  (e: 'playing-change', playing: boolean): void
  (e: 'speed-change', speed: number): void
}>()

const selected = ref<string>('')
const skin = ref<string>('')
const playing = ref(true)
const speed = ref<number[]>([1]) // Slider 用数组

// 动画列表到达后默认选 idle（App 层 setSpine 已默认播放，这里同步 UI）
watch(
  () => props.animations,
  (list) => {
    if (!list.length) return
    if (!selected.value || !list.includes(selected.value)) {
      const idle = list.find((a) => a === 'idle')
      selected.value = idle || list[0]
    }
  },
  { immediate: true },
)
watch(
  () => props.skins,
  (list) => {
    if (!list.length) return
    if (!skin.value || !list.includes(skin.value)) skin.value = list[0]
  },
  { immediate: true },
)

function selectAnimation(name: string) {
  selected.value = name
  emit('animation-change', name)
}
function selectSkin(name: string) {
  skin.value = name
  emit('skin-change', name)
}
function togglePlaying() {
  playing.value = !playing.value
  emit('playing-change', playing.value)
}
function onSpeedInput(val: number[] | undefined) {
  const v = Array.isArray(val) ? val[0] : 1
  speed.value = [v]
  emit('speed-change', v)
}
</script>

<template>
  <div class="flex flex-col gap-3 border-b p-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-muted-foreground">{{ t('app.animations', { n: animations.length }) }}</span>
      <Button size="icon-sm" variant="outline" :title="playing ? t('app.pause') : t('app.play')" @click="togglePlaying">
        <Play v-if="!playing" class="size-3.5" />
        <Square v-else class="size-3.5" />
      </Button>
    </div>

    <!-- 动画列表 -->
    <div class="scroll-thin max-h-52 overflow-y-auto rounded border bg-background/40">
      <button
        v-for="name in animations"
        :key="name"
        type="button"
        :class="[
          'flex w-full items-center justify-between px-2 py-1 text-left text-xs transition-colors',
          name === selected ? 'bg-primary/15 text-foreground' : 'hover:bg-muted',
        ]"
        @click="selectAnimation(name)"
      >
        <span class="truncate">{{ name }}</span>
        <span v-if="name === 'idle'" class="text-[10px] text-primary">idle</span>
      </button>
      <p v-if="!animations.length" class="px-2 py-3 text-xs text-muted-foreground">{{ t('app.noAnimations') }}</p>
    </div>

    <!-- 倍速 -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <Label class="text-xs">{{ t('app.speed') }}</Label>
        <span class="font-mono text-[11px] text-muted-foreground">{{ speed[0]?.toFixed(2) }}</span>
      </div>
      <Slider
        :model-value="speed"
        :min="0.1"
        :max="3"
        :step="0.05"
        @update:model-value="onSpeedInput"
      />
    </div>

    <!-- 皮肤 -->
    <div v-if="skins.length" class="space-y-1.5">
      <Label class="text-xs">{{ t('app.skins', { n: skins.length }) }}</Label>
      <select
        :value="skin"
        class="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-3"
        @change="selectSkin(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="s in skins" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
  </div>
</template>
