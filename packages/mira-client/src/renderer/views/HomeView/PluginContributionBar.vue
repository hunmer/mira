<script setup lang="ts">
/**
 * PluginContributionBar —— HomeView 右侧栏顶部的「插件图标列表」。
 *
 * 订阅 window.pluginSystem.contributions，把所有已注册 contribution 的插件渲染为横向图标。
 * 点击图标用 Dropdown(popover) 弹出插件 render() 返回的自定义内容（DOM 渲染契约）。
 *
 * 契约（见 renderer/plugins/types.ts PluginContribution）：
 *   - icon: { type: 'material'|'emoji'|'text', value }
 *   - render(container, ctx) → 可选 cleanup；ctx = { api, openPluginWindow }
 *
 * 无任何 contribution 时整体隐藏（不占位）。
 */
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import type { PluginContribution } from '@renderer/plugins/types'

defineOptions({ name: 'PluginContributionBar' })

const contributions = ref<PluginContribution[]>([])
/** 当前展开的 contribution id（同一时刻只展开一个） */
const openId = ref<string | null>(null)
/** 每个 contribution render 返回的 cleanup，按 id 缓存 */
const cleanups = new Map<string, (() => void) | void>()
/** popover 内容容器，按 id 缓存 */
const contentRefs = new Map<string, HTMLElement>()

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
    const timer = setInterval(() => {
      if (trySubscribe()) clearInterval(timer)
    }, 500)
    // 组件卸载前兜底清理
    ;(trySubscribeTimer as any) = timer
  }
})

let trySubscribeTimer: number | undefined

onBeforeUnmount(() => {
  if (trySubscribeTimer) clearInterval(trySubscribeTimer)
  // 关闭所有 popover，执行 cleanup
  cleanupAll()
  if (unsubscribe) {
    try { unsubscribe() } catch { /* ignore */ }
    unsubscribe = null
  }
})

function cleanupAll() {
  cleanups.forEach(c => {
    try {
      if (typeof c === 'function') c()
    } catch (e) {
      console.error('[PluginContributionBar] cleanup error:', e)
    }
  })
  cleanups.clear()
  contentRefs.clear()
}

/**
 * 渲染某个 contribution 的内容到其容器。
 * 调用时机：popover 打开后(nextTick)，拿到内容 DOM 节点。
 */
async function renderInto(contribution: PluginContribution) {
  await nextTick()
  const container = contentRefs.get(contribution.id)
  if (!container) return

  // 清空旧内容
  container.innerHTML = ''
  // 旧的 cleanup
  const oldCleanup = cleanups.get(contribution.id)
  if (typeof oldCleanup === 'function') {
    try { oldCleanup() } catch { /* ignore */ }
  }

  const ps = getPluginSystem()
  // 取插件实例的 api（initialize 时 context.api）；优先用运行时实例的 api
  let api: any = undefined
  try {
    const inst = ps?.getPluginInstance?.(contribution.pluginId)
    // 插件实例自身不一定暴露 api，从 pluginSystem.plugins 取 context.api
    const info = ps?.getPlugin?.(contribution.pluginId)
    api = inst?.api || info?.context?.api
  } catch { /* ignore */ }

  const ctx = {
    api,
    openPluginWindow: (opts: any) => {
      const w = (window as any).electronAPI
      if (!w?.pluginWindow?.open) {
        return Promise.resolve({ success: false, message: '插件窗口 API 在当前环境不可用' })
      }
      // 默认 pluginId 取当前 contribution 归属插件
      return w.pluginWindow.open({ pluginId: contribution.pluginId, entry: 'dist/index.html', ...opts })
    },
  }

  try {
    const cleanup = contribution.render(container, ctx)
    cleanups.set(contribution.id, cleanup)
  } catch (e) {
    console.error(`[PluginContributionBar] render failed for ${contribution.id}:`, e)
    container.textContent = '插件内容渲染失败'
  }
}

/**
 * 某个 contribution 的 popover 打开/关闭切换。
 */
function onToggle(id: string, isOpen: boolean) {
  if (isOpen) {
    // 关闭其它
    if (openId.value && openId.value !== id) {
      const other = cleanups.get(openId.value)
      if (typeof other === 'function') {
        try { other() } catch { /* ignore */ }
      }
      cleanups.delete(openId.value)
    }
    openId.value = id
    const target = contributions.value.find(c => c.id === id)
    if (target) renderInto(target)
  } else {
    if (openId.value === id) openId.value = null
    const c = cleanups.get(id)
    if (typeof c === 'function') {
      try { c() } catch { /* ignore */ }
    }
    cleanups.delete(id)
  }
}

/**
 * 把内容容器 ref 注册进 contentRefs（按 contribution id）。
 */
function registerContent(id: string, el: HTMLElement | null) {
  if (el) contentRefs.set(id, el)
  else contentRefs.delete(id)
}

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
    <Dropdown
      v-for="contribution in contributions"
      :key="contribution.id"
      placement="bottom-end"
      min-width="280px"
      @toggle="(isOpen: boolean) => onToggle(contribution.id, isOpen)"
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
          <!-- 插件自定义内容挂载点：渲染契约 render(container, ctx) -->
          <div :ref="(el: any) => registerContent(contribution.id, el as HTMLElement | null)"></div>
        </div>
      </template>
    </Dropdown>
  </div>
</template>
