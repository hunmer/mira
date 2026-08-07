<template>
  <div class="hitokoto-card flex h-full flex-col p-4">
    <!-- 加载中 -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <span class="material-icons animate-spin text-muted-foreground">refresh</span>
    </div>

    <!-- 错误（可重试） -->
    <div v-else-if="error" class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2" @click="fetch">
      <span class="material-icons text-2xl text-muted-foreground">wifi_off</span>
      <span class="text-center text-xs text-muted-foreground">{{ error }}</span>
      <span class="text-xs text-primary">点击重试</span>
    </div>

    <!-- 一言内容 -->
    <div v-else class="flex flex-1 flex-col justify-between" @click="fetch">
      <div class="flex items-start gap-2">
        <span class="material-icons mt-0.5 text-lg text-primary/70">format_quote</span>
        <p class="hitokoto-text flex-1 text-sm leading-relaxed">{{ data.hitokoto }}</p>
      </div>
      <div class="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span v-if="data.from">—— {{ data.from }}</span>
        <span class="material-icons ml-auto cursor-pointer text-base hover:text-primary" @click.stop="fetch">
          refresh
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 一言卡片（Dashboard 测试卡片）
 * 数据来源：https://v1.hitokoto.cn/
 * 点击卡片任意区域即可刷新一条。
 */

interface HitokotoData {
  id: number
  hitokoto: string
  type?: string
  from?: string
  from_who?: string
  creator?: string
}

const loading = ref(true)
const error = ref('')
const data = ref<HitokotoData>({ id: 0, hitokoto: '' })

let timer: ReturnType<typeof setInterval> | null = null

async function fetch() {
  loading.value = true
  error.value = ''
  try {
    const res = await window.fetch('https://v1.hitokoto.cn/')
    if (!res.ok) throw new Error(`请求失败 (${res.status})`)
    data.value = (await res.json()) as HitokotoData
  } catch (e: any) {
    error.value = e?.message || '获取一言失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetch()
  // 每 60 秒自动刷新一条
  timer = setInterval(fetch, 60_000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

defineExpose({ refresh: fetch })
</script>

<style scoped>
.hitokoto-text {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
}
</style>
