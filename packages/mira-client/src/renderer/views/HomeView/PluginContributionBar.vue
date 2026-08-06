<script setup lang="ts">
/**
 * PluginContributionBar —— HomeView 右侧栏顶部的「插件图标列表」。
 *
 * 订阅 window.pluginSystem.contributions，把所有已注册 contribution 的插件渲染为横向图标。
 *
 * 点击图标的行为由 contribution.behavior 决定：
 *   - 'window'（默认）：直接调 onActivate（一般在此 openPluginWindow 打开插件主界面）
 *   - 'popover'：在宿主内用 Dropdown 弹出 render 返回的内容（DOM 渲染契约）
 *
 * 无任何 contribution 时整体隐藏（不占位）。
 */
import { ref, onMounted, onBeforeUnmount, defineComponent, h } from 'vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import type { PluginContribution, PluginContributionRenderContext } from '@renderer/plugins/types'

defineOptions({ name: 'PluginContributionBar' })

const contributions = ref<PluginContribution[]>([])
let unsubscribe: (() => void) | null = null

const getPluginSystem = (): any => (window as any).pluginSystem

onMounted(() => {
  // pluginSystem 可能尚未初始化（插件系统初始化在 useHomeInit 内进行），
  // 这里轮询等待 contributions 中心可用后订阅。
  const trySubscribe = () => {
    const ps = getPluginSystem()
    if (ps?.contributions?.subscribe) {
      unsubscribe = ps.contributions.subscribe((list: PluginContribution[]) => {
        contributions.value = Array.isArray(list) ? list : []
      })
      return true
    }
    return false
  }
  if (!trySubscribe()) {
    timer = setInterval(() => {
      if (trySubscribe()) {
        clearInterval(timer!)
        timer = null
      }
    }, 500) as any
  }
})

let timer: ReturnType<typeof setInterval> | null = null

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (unsubscribe) {
    try { unsubscribe() } catch { /* ignore */ }
    unsubscribe = null
  }
})

/**
 * 判断 contribution 是否为 popover 行为
 */
function isPopover(c: PluginContribution): boolean {
  return c.behavior === 'popover'
}

/**
 * 构建传给 contribution 的上下文（onActivate / render 共用）。
 */
function buildCtx(contribution: PluginContribution): PluginContributionRenderContext {
  const ps = getPluginSystem()
  let api: any = undefined
  try {
    const inst = ps?.getPluginInstance?.(contribution.pluginId)
    const info = ps?.getPlugin?.(contribution.pluginId)
    api = inst?.api || info?.context?.api
  } catch { /* ignore */ }

  return {
    api,
    openPluginWindow: (opts) => {
      const w = (window as any).electronAPI
      if (!w?.pluginWindow?.open) {
        return Promise.resolve({ success: false, message: '插件窗口 API 在当前环境不可用' })
      }
      return w.pluginWindow.open({
        // 默认指向当前贡献所属插件、dist/index.html；调用者可通过 opts 覆盖
        entry: 'dist/index.html',
        ...opts,
        pluginId: opts.pluginId || contribution.pluginId,
      })
    },
  }
}

/**
 * window 行为：点击直接触发 onActivate（一般打开插件主界面窗口）。
 */
async function onWindowActivate(contribution: PluginContribution) {
  try {
    await contribution.onActivate?.(buildCtx(contribution))
  } catch (e) {
    console.error(`[PluginContributionBar] onActivate failed for ${contribution.id}:`, e)
  }
}

/**
 * ContributionHost —— 承载 popover 行为 contribution 内容的子组件。
 *
 * 关键：只有当 popover content 真正挂载到 DOM 时本组件才会 mount，
 * 因此 onMounted 里 root 元素一定就绪，contribution.render(container, ctx) 必然能拿到容器。
 * onBeforeUnmount 里调用插件返回的 cleanup，避免内存泄漏 / 重复渲染。
 */
const ContributionHost = defineComponent({
  name: 'ContributionHost',
  props: {
    contribution: { type: Object as () => PluginContribution, required: true },
  },
  setup(props) {
    const root = ref<HTMLElement | null>(null)
    let cleanup: (() => void) | void = undefined

    onMounted(() => {
      const el = root.value
      if (!el || typeof props.contribution.render !== 'function') {
        console.warn('[PluginContributionBar] host: root missing or no render fn')
        return
      }
      try {
        cleanup = props.contribution.render(el, buildCtx(props.contribution))
      } catch (e) {
        console.error(`[PluginContributionBar] render failed for ${props.contribution.id}:`, e)
        el.textContent = '插件内容渲染失败'
      }
    })

    onBeforeUnmount(() => {
      if (typeof cleanup === 'function') {
        try { cleanup() } catch { /* ignore */ }
      }
      cleanup = undefined
    })

    return () => h('div', { ref: root })
  },
})

/**
 * 渲染图标内容。
 */
function iconContent(icon: PluginContribution['icon']): string {
  if (!icon) return '?'
  return icon.value ?? '?'
}
</script>

<template>
  <div
    v-if="contributions.length > 0"
    class="flex items-center gap-1 px-2 py-1.5 rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)]"
  >
    <template v-for="contribution in contributions" :key="contribution.id">
      <!-- window 行为：纯按钮，点击直开插件主界面 -->
      <button
        v-if="!isPopover(contribution)"
        class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        :title="contribution.title"
        :aria-label="contribution.title"
        @click="onWindowActivate(contribution)"
      >
        <span
          v-if="!contribution.icon || contribution.icon.type === 'material'"
          class="material-icons"
          style="font-size: 18px;"
        >{{ iconContent(contribution.icon) }}</span>
        <span
          v-else
          class="text-base leading-none"
        >{{ iconContent(contribution.icon) }}</span>
      </button>

      <!-- popover 行为：Dropdown 弹出 render 返回的内容 -->
      <Dropdown
        v-else
        placement="bottom-end"
        min-width="280px"
      >
        <template #trigger>
          <button
            class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            :title="contribution.title"
            :aria-label="contribution.title"
          >
            <span
              v-if="!contribution.icon || contribution.icon.type === 'material'"
              class="material-icons"
              style="font-size: 18px;"
            >{{ iconContent(contribution.icon) }}</span>
            <span
              v-else
              class="text-base leading-none"
            >{{ iconContent(contribution.icon) }}</span>
          </button>
        </template>
        <template #content="{ close }">
          <div class="p-3">
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-border/60">
              <div class="text-sm font-medium truncate">{{ contribution.title }}</div>
              <button
                class="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                @click="close"
              >
                <span class="material-icons" style="font-size: 16px;">close</span>
              </button>
            </div>
            <!-- 插件自定义内容挂载点：ContributionHost 在挂载后调用 render(container, ctx) -->
            <ContributionHost :contribution="contribution" />
          </div>
        </template>
      </Dropdown>
    </template>
  </div>
</template>
