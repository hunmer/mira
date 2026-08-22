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
      aria-hidden="true"
    >
      <!-- 自定义占位 UI;未提供时回退到默认发光呼吸 Skeleton -->
      <slot name="placeholder">
        <div class="lazy-cell__skeleton" />
      </slot>
    </div>
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

/* 占位容器:absolute inset-0,自定义占位 UI 直接填满 cell */
.lazy-cell__placeholder {
  position: absolute;
  inset: 0;
}

/* 默认占位:Skeleton 发光呼吸效果(颜色走 CSS 变量,便于暗色模式覆盖) */
.lazy-cell__skeleton {
  --sk-base: rgb(226 232 240 / 60%);
  --sk-dim: rgb(226 232 240 / 45%);
  --sk-shimmer: rgb(241 245 249 / 95%);
  --sk-edge: rgb(0 0 0 / 8%);
  --sk-glow-a: rgb(148 197 253 / 45%);
  --sk-glow-b: rgb(196 181 253 / 20%);
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* 圆角描边:外层 Masonry 定位框为 overflow:hidden 矩形,会裁掉普通 border 的圆角;
     改用内描边实现圆角描边,既贴合圆角又不受外层裁切影响。 */
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px var(--sk-edge);
  background:
    linear-gradient(
      110deg,
      var(--sk-dim) 30%,
      var(--sk-shimmer) 50%,
      var(--sk-dim) 70%
    ),
    var(--sk-base);
  background-size: 220% 100%, auto;
  animation:
    lazy-cell-shimmer 1.8s linear infinite,
    lazy-cell-breathe 2.4s ease-in-out infinite;
}

/* 呼吸光晕:中心柔和扩散光 */
.lazy-cell__skeleton::after {
  content: "";
  position: absolute;
  inset: -40%;
  background: radial-gradient(
    ellipse at center,
    var(--sk-glow-a) 0%,
    var(--sk-glow-b) 35%,
    transparent 70%
  );
  animation: lazy-cell-glow 2.4s ease-in-out infinite;
}

/* 暗色适配:跟随系统偏好 */
@media (prefers-color-scheme: dark) {
  .lazy-cell__skeleton {
    --sk-base: rgb(30 41 59 / 60%);
    --sk-dim: rgb(30 41 59 / 45%);
    --sk-shimmer: rgb(51 65 85 / 95%);
    --sk-edge: rgb(255 255 255 / 6%);
    --sk-glow-a: rgb(96 165 250 / 35%);
    --sk-glow-b: rgb(167 139 250 / 18%);
  }
}

/* 暗色适配:宿主在祖先元素上显式切换 .dark(如 Tailwind dark:class),优先于系统偏好。
   用 .light 显式恢复亮色的场景同样支持。 */
.dark .lazy-cell__skeleton {
  --sk-base: rgb(30 41 59 / 60%);
  --sk-dim: rgb(30 41 59 / 45%);
  --sk-shimmer: rgb(51 65 85 / 95%);
  --sk-edge: rgb(255 255 255 / 6%);
  --sk-glow-a: rgb(96 165 250 / 35%);
  --sk-glow-b: rgb(167 139 250 / 18%);
}

.light .lazy-cell__skeleton {
  --sk-base: rgb(226 232 240 / 60%);
  --sk-dim: rgb(226 232 240 / 45%);
  --sk-shimmer: rgb(241 245 249 / 95%);
  --sk-edge: rgb(0 0 0 / 8%);
  --sk-glow-a: rgb(148 197 253 / 45%);
  --sk-glow-b: rgb(196 181 253 / 20%);
}

@keyframes lazy-cell-shimmer {
  0% {
    background-position: 120% 0, 0 0;
  }
  100% {
    background-position: -120% 0, 0 0;
  }
}

@keyframes lazy-cell-breathe {
  0%,
  100% {
    filter: brightness(0.92);
  }
  50% {
    filter: brightness(1.06);
  }
}

@keyframes lazy-cell-glow {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
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
</style>
