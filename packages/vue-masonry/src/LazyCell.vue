<script setup lang="ts">
/**
 * LazyCell —— 懒加载容器
 * lazy=false 时直接渲染内容;lazy=true 时进入预加载范围即加载并常驻。
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

function findScrollRoot(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY
    if (overflowY === "auto" || overflowY === "scroll") return parent
    parent = parent.parentElement
  }
  return null
}

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
  const scrollRoot = findScrollRoot(el)
  const rootMargin = props.rootMargin ?? "300px"

  ob = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        inView.value = true
        void activate()
        ob?.disconnect() // once: 出现即加载并常驻
      }
    },
    { root: scrollRoot, rootMargin }
  )
  ob.observe(el)

  visibilityOb = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      inView.value = true
      void activate()
      visibilityOb?.disconnect()
    },
    { root: scrollRoot }
  )
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
    class="lazy-cell"
    :class="{ 'lazy-cell--pending': active && !props.revealed }"
    :aria-busy="active && !props.revealed"
  >
    <div
      v-if="active && !props.revealed"
      class="lazy-cell__placeholder"
      :style="{ backgroundColor: props.placeholderColor }"
      aria-hidden="true"
    />
    <!-- 内容提前挂载并加载,当前 cell 完成后独立显示。 -->
    <div
      v-if="active"
      class="lazy-cell__content"
      :class="props.revealed ? 'lazy-cell__content--visible' : 'lazy-cell__content--hidden'"
    >
      <slot :preload="active" />
    </div>
  </div>
</template>

<style scoped>
/* 等价于 Tailwind 的 `relative h-full min-h-0 w-full min-w-0 overflow-hidden` */
.lazy-cell {
  position: relative;
  height: 100%;
  min-height: 0;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

/* 等价于 `absolute inset-0 animate-pulse` */
.lazy-cell__placeholder {
  position: absolute;
  inset: 0;
  animation: lazy-cell-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 等价于 `transition-opacity duration-150` */
.lazy-cell__content {
  height: 100%;
  width: 100%;
  transition-property: opacity;
  transition-duration: 150ms;
}

.lazy-cell__content--hidden {
  visibility: hidden;
  opacity: 0;
}

.lazy-cell__content--visible {
  visibility: visible;
  opacity: 1;
}

@keyframes lazy-cell-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
