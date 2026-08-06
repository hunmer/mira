<script setup lang="ts">
/**
 * LazyCell —— 懒加载容器
 * lazy=false 时直接渲染内容；lazy=true 时进入视窗才渲染（once：出现即加载并常驻）。
 * 拆成独立组件以保证 IntersectionObserver 在 v-for 中稳定挂载。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"

const props = defineProps<{
  lazy?: boolean
  rootMargin?: string
  placeholderColor?: string
  revealed?: boolean
}>()

const emit = defineEmits<{
  (e: "visible"): void
  (e: "ready"): void
  (e: "hidden"): void
}>()

const cellRef = ref<HTMLElement | null>(null)
const inView = ref(false)
const active = computed(() => !props.lazy || inView.value)
let ob: IntersectionObserver | null = null
let visibilityOb: IntersectionObserver | null = null
let reportedVisible = false
let loadVersion = 0

function waitForImage(image: HTMLImageElement): Promise<void> {
  const initialSrc = image.getAttribute("src") ?? ""
  const isLazyPlaceholder = initialSrc.startsWith("data:image/svg+xml")
  if (!isLazyPlaceholder && image.complete) return Promise.resolve()

  return new Promise((resolve) => {
    let sourceObserver: MutationObserver | null = null

    const cleanup = () => {
      image.removeEventListener("load", handleSettled)
      image.removeEventListener("error", handleSettled)
      sourceObserver?.disconnect()
      sourceObserver = null
    }
    const settle = () => {
      cleanup()
      resolve()
    }
    const handleSettled = () => {
      if (!isLazyPlaceholder || image.getAttribute("src") !== initialSrc) settle()
    }

    image.addEventListener("load", handleSettled)
    image.addEventListener("error", handleSettled)

    if (isLazyPlaceholder) {
      sourceObserver = new MutationObserver(() => {
        if (image.getAttribute("src") === initialSrc) return
        if (image.complete) settle()
      })
      sourceObserver.observe(image, { attributes: true, attributeFilter: ["src"] })
    }
  })
}

async function activate(): Promise<void> {
  if (reportedVisible) return
  reportedVisible = true
  emit("visible")

  const version = ++loadVersion
  await nextTick()
  const images = Array.from(cellRef.value?.querySelectorAll("img") ?? [])
  await Promise.all(images.map(waitForImage))
  if (version === loadVersion) emit("ready")
}

onMounted(() => {
  if (!props.lazy) {
    inView.value = true
    void activate()
    return
  }

  const el = cellRef.value
  if (!el) return
  ob = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        inView.value = true
        ob?.disconnect() // once: 出现即加载并常驻
      }
    },
    { rootMargin: props.rootMargin ?? "300px" }
  )
  ob.observe(el)

  visibilityOb = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    inView.value = true
    void activate()
    visibilityOb?.disconnect()
  })
  visibilityOb.observe(el)
})

onBeforeUnmount(() => {
  loadVersion++
  if (reportedVisible) emit("hidden")
  ob?.disconnect()
  visibilityOb?.disconnect()
  ob = null
  visibilityOb = null
})
</script>

<template>
  <div
    ref="cellRef"
    class="relative h-full min-h-0 w-full min-w-0 overflow-hidden"
    :aria-busy="active && !props.revealed"
  >
    <div
      v-if="active && !props.revealed"
      class="absolute inset-0 animate-pulse"
      :style="{ backgroundColor: props.placeholderColor }"
      aria-hidden="true"
    />
    <!-- 内容需要提前挂载并加载，但整批完成前保持不可见。 -->
    <div
      v-if="active"
      class="h-full w-full transition-opacity duration-150"
      :class="props.revealed ? 'visible opacity-100' : 'invisible opacity-0'"
    >
      <slot :preload="active" />
    </div>
  </div>
</template>
