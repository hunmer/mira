<script setup lang="ts">
/**
 * PluginContributionBar —— HomeView 右侧栏顶部的「插件图标列表」。
 *
 * 订阅 window.pluginSystem.contributions，把所有已注册 contribution 的插件渲染为图标，
 * 水平排列展示。
 *
 * 点击图标的行为由 contribution.behavior 决定：
 *   - 'window'（默认）：直接调 onActivate（一般在此 openPluginWindow 打开插件主界面）
 *   - 'popover'：在宿主内用 Dropdown 弹出 render 返回的内容（DOM 渲染契约）
 *
 * 无任何 contribution 时整体隐藏（不占位）。
 */
import { ref, onMounted, onBeforeUnmount, defineComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import PluginIcon from '@/renderer/components/common/PluginIcon.vue'
import { useToast } from '@renderer/composables/useToast'
import { openPluginWindow, resolveServerPluginUrl } from '@renderer/plugins/openPluginWindow'
import { usePluginStore } from '@renderer/stores/plugin'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { PluginContribution, PluginContributionRenderContext } from '@renderer/plugins/types'

defineOptions({ name: 'PluginContributionBar' })

const { t } = useI18n()

const emit = defineEmits<{ manage: [] }>()

const contributions = ref<PluginContribution[]>([])
let unsubscribe: (() => void) | null = null
const toast = useToast()

const getPluginSystem = (): any => (window as any).pluginSystem

const pluginStore = usePluginStore()

// ==================== 插件 dev 模式配置（localStorage 持久化） ====================

interface PluginDevConfig {
  enabled: boolean
  url: string
}

const DEV_CONFIG_KEY = 'mira-plugin-dev-config'

function loadDevConfigs(): Record<string, PluginDevConfig> {
  try {
    const raw = localStorage.getItem(DEV_CONFIG_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const devConfigs = ref<Record<string, PluginDevConfig>>(loadDevConfigs())

function persistDevConfigs() {
  try {
    localStorage.setItem(DEV_CONFIG_KEY, JSON.stringify(devConfigs.value))
  } catch { /* ignore */ }
}

/** dev 模式生效：开关开启且配置了有效 url */
function isDevEnabled(pluginId: string): boolean {
  const c = devConfigs.value[pluginId]
  return !!(c?.enabled && c.url?.trim())
}

// dev 模式弹窗状态
const devDialogOpen = ref(false)
const devDialogPlugin = ref<PluginContribution | null>(null)
const devFormEnabled = ref(false)
const devFormUrl = ref('')

function openDevDialog(contribution: PluginContribution) {
  devDialogPlugin.value = contribution
  const c = devConfigs.value[contribution.pluginId]
  devFormEnabled.value = !!c?.enabled
  devFormUrl.value = c?.url?.trim() || 'http://localhost:5173'
  devDialogOpen.value = true
}

function saveDevConfig() {
  const id = devDialogPlugin.value?.pluginId
  if (!id) return
  const url = devFormUrl.value.trim()
  if (devFormEnabled.value && !url) {
    toast.add({ severity: 'warn', summary: t('views.pluginContributionBar.devUrlRequired'), life: 4000 })
    return
  }
  devConfigs.value = { ...devConfigs.value, [id]: { enabled: devFormEnabled.value, url } }
  persistDevConfigs()
  devDialogOpen.value = false
}

/** dev 模式下打开自定义 url 的插件窗口；返回是否已处理 */
async function openDevWindow(contribution: PluginContribution): Promise<boolean> {
  const url = devConfigs.value[contribution.pluginId]?.url?.trim()
  if (!url) return false
  const result = await openPluginWindow({
    pluginId: contribution.pluginId,
    url,
    dev: true,
    title: `${contribution.title} (dev)`,
  })
  if (result?.success === false) {
    toast.add({ severity: 'error', summary: t('views.pluginContributionBar.windowOpenFailed'), detail: result.message || t('views.common.unknownError'), life: 5000 })
  }
  return true
}

// ==================== 右键菜单操作 ====================

/**
 * 禁用插件：服务端插件与本地插件走各自的禁用流程。
 */
async function onDisablePlugin(contribution: PluginContribution) {
  const info = getPluginSystem()?.getPlugin?.(contribution.pluginId)
  const isServer = info?.config?.source === 'server'
  const result = isServer
    ? await pluginStore.disableServerPlugin(contribution.pluginId)
    : await pluginStore.disableLocalPlugin(contribution.pluginId)
  if (result?.success) {
    toast.add({ severity: 'success', summary: t('views.pluginContributionBar.disableSuccess'), life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: t('views.pluginContributionBar.disableFailed'), detail: result?.message || t('views.common.unknownError'), life: 5000 })
  }
}

/**
 * popover 行为触发按钮点击：dev 模式开启时拦截，直接打开 dev url 窗口。
 */
async function onPopoverTriggerClick(e: Event, contribution: PluginContribution) {
  if (!isDevEnabled(contribution.pluginId)) return
  e.preventDefault()
  e.stopPropagation()
  await openDevWindow(contribution)
}

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
    // server/token 注入与 Electron/Web 双路径打开由 plugins/openPluginWindow 公共实现
    openPluginWindow: (opts) => {
      let webBaseUrl: string | undefined
      let remoteUrl: string | undefined
      let libraryId: string | undefined
      try {
        const info = getPluginSystem()?.getPlugin?.(contribution.pluginId)
        webBaseUrl = info?.config?.url || info?.config?.actualDirectory

        // 服务端插件的 config.url 是 server-plugins 基础路径，不能当作本地插件目录。
        // 传入 url 后，主进程会跳过本地入口文件存在性校验并直接加载远程页面。
        if (info?.config?.source === 'server') {
          const config = info.config
          remoteUrl = resolveServerPluginUrl(config, opts.entry)
          libraryId = config.libraryId
        }
      } catch { /* ignore */ }
      return openPluginWindow(
        {
          ...opts,
          pluginId: opts.pluginId || contribution.pluginId,
          ...(remoteUrl ? { url: remoteUrl } : {}),
          query: { ...opts.query, ...(libraryId ? { libraryId } : {}) },
        },
        { webBaseUrl },
      )
    },
  }
}

/**
 * window 行为：点击直接触发 onActivate（一般打开插件主界面窗口）。
 * 包装 onActivate：捕获同步抛错，并对返回值/异步结果做失败提示。
 */
async function onWindowActivate(contribution: PluginContribution) {
  // dev 模式开启时优先打开自定义 url，跳过插件正常激活流程
  if (isDevEnabled(contribution.pluginId)) {
    await openDevWindow(contribution)
    return
  }
  let result: any
  try {
    result = await contribution.onActivate?.(buildCtx(contribution))
  } catch (e: any) {
    console.error(`[PluginContributionBar] onActivate failed for ${contribution.id}:`, e)
    toast.add({ severity: 'error', summary: t('views.pluginContributionBar.activateFailed'), detail: e?.message || String(e), life: 5000 })
    return
  }
  // onActivate 返回了 openPluginWindow 的结果（或 Promise<result>）时检查
  if (result && typeof result === 'object' && result.success === false) {
    const detail = result.message || t('views.common.unknownError')
    const hint = /不存在|dist/.test(detail)
      ? t('views.pluginContributionBar.buildHint')
      : ''
    toast.add({ severity: 'error', summary: t('views.pluginContributionBar.windowOpenFailed'), detail: `${detail}${hint}`, life: 6000 })
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
        el.textContent = t('views.pluginContributionBar.renderFailed')
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
</script>

<template>
  <div
    v-if="contributions.length > 0"
    class="rounded-2xl border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(99,102,241,0.10)] flex items-center gap-1 px-2 py-1.5"
  >
    <template v-for="contribution in contributions" :key="contribution.id">
      <!-- window 行为：纯按钮，点击直开插件主界面；右键菜单提供 dev 模式 / 禁用 -->
      <ContextMenu>
        <ContextMenuTrigger as-child>
          <button
            v-if="!isPopover(contribution)"
            class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            :title="contribution.title"
            :aria-label="contribution.title"
            @click="onWindowActivate(contribution)"
          >
            <PluginIcon
              :plugin-id="contribution.pluginId"
              :contribution-icon="contribution.icon"
              :size="18"
              rounded="sm"
              :badge="isDevEnabled(contribution.pluginId) ? '#f97316' : undefined"
            />
          </button>

          <!-- popover 行为：Dropdown 弹出 render 返回的内容；dev 模式下点击直接打开 dev url -->
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
                @click="onPopoverTriggerClick($event, contribution)"
              >
                <PluginIcon
                  :plugin-id="contribution.pluginId"
                  :contribution-icon="contribution.icon"
                  :size="18"
                  rounded="sm"
                  :badge="isDevEnabled(contribution.pluginId) ? '#f97316' : undefined"
                />
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
        </ContextMenuTrigger>
        <ContextMenuContent class="w-40">
          <ContextMenuItem @select="openDevDialog(contribution)">
            <span class="material-icons text-base mr-2">developer_mode</span>
            <span>{{ t('views.pluginContributionBar.devMode') }}</span>
          </ContextMenuItem>
          <ContextMenuItem @select="onDisablePlugin(contribution)">
            <span class="material-icons text-base mr-2">block</span>
            <span>{{ t('views.pluginContributionBar.disable') }}</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </template>

    <!-- 最右侧：管理插件入口（ml-auto 推到栏右端，左侧分割线区隔） -->
    <div class="ml-auto w-px h-5 bg-border/60 mx-0.5 shrink-0" />
    <button
      class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
      :title="t('views.pluginContributionBar.managePlugins')"
      :aria-label="t('views.pluginContributionBar.managePlugins')"
      @click="emit('manage')"
    >
      <span class="material-icons" style="font-size: 18px;">settings</span>
    </button>
  </div>

  <!-- dev 模式配置弹窗 -->
  <Dialog v-model:open="devDialogOpen">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>{{ t('views.pluginContributionBar.devDialogTitle') }}<template v-if="devDialogPlugin"> · {{ devDialogPlugin.title }}</template></DialogTitle>
      </DialogHeader>
      <div class="space-y-4 py-1">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">{{ t('views.pluginContributionBar.devEnabledLabel') }}</label>
          <Switch :model-value="devFormEnabled" @update:model-value="devFormEnabled = !!$event" />
        </div>
        <div v-if="devFormEnabled" class="space-y-1.5">
          <label class="text-sm font-medium">{{ t('views.pluginContributionBar.devUrlLabel') }}</label>
          <Input v-model="devFormUrl" :placeholder="t('views.pluginContributionBar.devUrlPlaceholder')" />
          <p class="text-xs text-muted-foreground">{{ t('views.pluginContributionBar.devUrlHint') }}</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="devDialogOpen = false">{{ t('views.pluginContributionBar.cancel') }}</Button>
        <Button @click="saveDevConfig">{{ t('views.pluginContributionBar.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
