<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Plugin } from '@/types/mira'
import type { LibraryPlugins } from '@/api/modules/plugin'
import { pluginApi } from '@/api'
import client from '@/api/client'
import { useLibrary } from '@/composables/useLibrary'
import { usePluginSources } from '@/composables/usePluginSources'
import { registerPluginRoutes } from '@/router/pluginRoutes'
import type { PluginRoute } from '@/router/pluginRoutes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import InstallTerminalDialog from './InstallTerminalDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { toast } from 'vue-sonner'
import {
  RiSearchLine, RiMoreLine, RiSettings3Line, RiStopCircleLine,
  RiStore2Line, RiExternalLinkLine, RiAddLine, RiUploadLine,
  RiRefreshLine,
} from '@remixicon/vue'

const { t } = useI18n()
const { confirmDialog, requireConfirm } = useConfirmDialog()
const { selectedId: activeTab } = useLibrary()

// core state
const groups = ref<LibraryPlugins[]>([])
const loading = ref(false)
const searchQuery = ref('')
const pluginRoutes = reactive<Record<string, PluginRoute[]>>({})

// config dialog
const configDialog = ref(false)
const configPlugin = ref<Plugin | null>(null)
const configJson = ref('')

// store dialog
const storeOpen = ref(false)
const storeSearch = ref('')

// install dialog
const installOpen = ref(false)
const installTab = ref<'repository' | 'local'>('repository')
const installForm = ref({ name: '', version: 'latest', npmSource: 'npmmirror', proxy: '' })
const installFile = ref<File | null>(null)
const installLoading = ref(false)

// store: 从可配置的 JSON URL 拉取推荐插件列表
interface StorePlugin {
  name: string
  title?: string
  description?: string
  icon?: string
  category?: string
  deps?: string
  version?: string
  registry?: string
}

const { activeSource: activePluginSource, ready: pluginSourcesReady } = usePluginSources()
const storePlugins = ref<StorePlugin[]>([])
const storeLoading = ref(false)

async function loadStorePlugins() {
  // 等待插件源从服务端加载完成（首次进入页面时可能仍在请求中）
  await pluginSourcesReady
  const url = activePluginSource.value?.url
  if (!url) { storePlugins.value = []; return }
  storeLoading.value = true
  try {
    // 由后端代理抓取远程 JSON，规避浏览器 CORS 限制
    const res = await pluginApi.fetchStore(url)
    const data = res.data?.data
    const list = Array.isArray(data) ? data : (data?.plugins ?? [])
    storePlugins.value = list.filter((p: any) => p && p.name)
  } catch {
    toast.error('推荐列表加载失败，请检查插件源 URL')
    storePlugins.value = []
  } finally {
    storeLoading.value = false
  }
}

function openStore() {
  storeOpen.value = true
  // 每次打开都用当前选中的插件源刷新
  storePlugins.value = []
  loadStorePlugins()
}

// 检查更新: 从 package.json 重新同步插件 meta 到 plugins.json
const syncing = ref(false)
async function syncMeta() {
  if (!activeTab.value) return
  syncing.value = true
  try {
    await pluginApi.syncMeta(activeTab.value)
    toast.success(t('common.success'))
    await loadPlugins()
  } catch {
    toast.error(t('common.failed'))
  } finally {
    syncing.value = false
  }
}

const installedNames = computed(() => groups.value.flatMap(g => g.plugins.map(p => p.name)))

const filteredStorePlugins = computed(() => {
  if (!storeSearch.value) return storePlugins.value
  const q = storeSearch.value.toLowerCase()
  return storePlugins.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.title || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q),
  )
})

const currentPlugins = computed(() => {
  const g = groups.value.find(g => g.id === activeTab.value)
  if (!g) return []
  if (!searchQuery.value) return g.plugins
  const q = searchQuery.value.toLowerCase()
  return g.plugins.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.author.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q)),
  )
})

function getRoutesForPlugin(libraryId: string, pluginName: string) {
  return (pluginRoutes[libraryId] || []).filter(r => r.pluginName === pluginName)
}

const categoryMap: Record<string, string> = {
  general: '通用', security: '安全', storage: '存储',
  ui: '界面', utility: '工具', integration: '集成', development: '开发',
}

function getCategoryName(c?: string) {
  return categoryMap[c || 'general'] || c || '通用'
}

// icon 可能是 emoji 字符、URL（/api/plugins/... 或 http）或文件路径
function isIconUrl(icon?: string | null): boolean {
  return !!icon && (icon.startsWith('http') || icon.startsWith('/api/') || icon.startsWith('/'))
}

// icon 是否为 Material Icons 名称 (纯 ASCII 字母/数字/下划线, 非 emoji 非 URL)
function isMaterialIcon(icon?: string | null): boolean {
  return !!icon && !isIconUrl(icon) && /^[a-z0-9_]+$/i.test(icon)
}

async function loadPlugins() {
  loading.value = true
  try {
    const res = await pluginApi.listByLibrary()
    groups.value = Array.isArray(res) ? res : []
    for (const g of groups.value) {
      loadPluginRoutes(g.id)
    }
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

async function loadPluginRoutes(libraryId: string) {
  try {
    pluginRoutes[libraryId] = await registerPluginRoutes(router, libraryId)
  } catch {
    pluginRoutes[libraryId] = []
  }
}

async function toggleStatus(plugin: Plugin, checked: boolean) {
  const newStatus = checked ? 'active' : 'inactive'
  try {
    await pluginApi.updateStatus(plugin.libraryId!, plugin.name, newStatus)
    plugin.status = newStatus
    toast.success(t('common.success'))
  } catch {
    toast.error(t('common.failed'))
  }
}

async function disableAll(plugin: Plugin) {
  if (!(await requireConfirm({
    title: '一键禁用插件',
    description: `确定要禁用所有素材库中的插件“${plugin.title || plugin.name}”吗？`,
    confirmText: '禁用',
  }))) return
  try {
    await pluginApi.disableAll(plugin.name)
    toast.success('已禁用所有素材库中的该插件')
    await loadPlugins()
  } catch {
    toast.error(t('common.failed'))
  }
}

async function openConfig(plugin: Plugin) {
  try {
    const res = await pluginApi.get(plugin.name, plugin.libraryId)
    configJson.value = JSON.stringify(res, null, 2)
    configPlugin.value = plugin
    configDialog.value = true
  } catch {
    toast.error(t('common.failed'))
  }
}

async function saveConfig() {
  if (!configPlugin.value) return
  try {
    const parsed = JSON.parse(configJson.value)
    await pluginApi.configure(configPlugin.value.name, parsed, configPlugin.value.libraryId)
    toast.success(t('common.success'))
    configDialog.value = false
  } catch (e) {
    toast.error(e instanceof SyntaxError ? 'JSON 格式错误' : t('common.failed'))
  }
}

async function uninstallPlugin(plugin: Plugin) {
  if (!(await requireConfirm())) return
  try {
    await pluginApi.uninstall(plugin.name, plugin.libraryId)
    toast.success(t('common.success'))
    await loadPlugins()
  } catch {
    toast.error(t('common.failed'))
  }
}

const installingName = ref<string | null>(null)

// 终端式安装对话框: 点击安装后弹出, 通过 SSE 实时展示 --verbose 输出
const terminalOpen = ref(false)
const terminalTarget = ref<{
  name: string
  libraryId: string
  version?: string
  registry?: string
  npmSource?: string
  proxy?: string
} | null>(null)

async function installFromStore(name: string, registry?: string) {
  if (!activeTab.value || installingName.value) return
  installingName.value = name
  terminalTarget.value = { name, libraryId: activeTab.value, registry }
  terminalOpen.value = true
}

function onTerminalFinish({ success, name }: { success: boolean; name: string }) {
  if (success) {
    toast.success(`${name} 安装成功`)
    setTimeout(loadPlugins, 1000)
  } else {
    toast.error(`${name} 安装失败`)
  }
  installingName.value = null
}

function openInstallDialog() {
  installForm.value = { name: '', version: 'latest', npmSource: 'npmmirror', proxy: '' }
  installFile.value = null
  installTab.value = 'repository'
  installOpen.value = true
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  installFile.value = target.files?.[0] ?? null
}

const installController = ref<AbortController | null>(null)

async function submitInstall() {
  if (!activeTab.value) return

  // 从仓库安装: 走终端 SSE 实时日志, 弹出 InstallTerminalDialog
  if (installTab.value === 'repository') {
    if (!installForm.value.name) {
      toast.error('请输入插件名称')
      return
    }
    terminalTarget.value = {
      name: installForm.value.name,
      libraryId: activeTab.value,
      version: installForm.value.version || undefined,
      npmSource: installForm.value.npmSource,
      proxy: installForm.value.proxy || undefined,
    }
    // 关闭安装表单对话框, 改由终端对话框接管
    installOpen.value = false
    terminalOpen.value = true
    return
  }

  // 本地上传: 保持原逻辑
  if (!installFile.value) {
    toast.error('请选择插件包文件')
    return
  }
  installLoading.value = true
  const controller = new AbortController()
  installController.value = controller
  try {
    const formData = new FormData()
    formData.append('file', installFile.value!)
    formData.append('libraryId', activeTab.value)
    await client.post('/plugins/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: controller.signal,
    })
    toast.success(t('common.success'))
    installFile.value = null
    setTimeout(loadPlugins, 2000)
  } catch {
    // 用户主动取消不算错误
    if (controller.signal.aborted) {
      toast.info('已取消安装')
    } else {
      toast.error(t('common.failed'))
    }
  } finally {
    installLoading.value = false
    installController.value = null
  }
}

// 取消: 安装中则中断请求, 非安装中则关闭对话框
function cancelInstall() {
  if (installController.value) {
    installController.value.abort()
  } else {
    installOpen.value = false
  }
}

const router = useRouter()

function openRoute(route: PluginRoute) {
  router.push(route.path)
}

await loadPlugins()
</script>

<template>
  <div class="space-y-6">
    <!-- header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('plugin.title') }}</h1>
      <div class="flex gap-2">
        <Button variant="outline" @click="openInstallDialog">
          <RiAddLine class="mr-2 size-4" /> 安装插件
        </Button>
        <Button @click="openStore">
          <RiStore2Line class="mr-2 size-4" /> {{ t('plugin.pluginStore') }}
        </Button>
      </div>
    </div>

    <!-- main content -->
    <template v-if="groups.length">
      <!-- toolbar: search (素材库跟随全局选中) + 检查更新 -->
      <div class="flex items-center gap-3">
        <div class="relative max-w-sm flex-1">
          <RiSearchLine class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchQuery" :placeholder="t('common.search')" class="pl-9" />
        </div>
        <Button variant="outline" size="sm" :disabled="syncing || !activeTab" @click="syncMeta">
          <RiRefreshLine class="mr-1 size-4" :class="{ 'animate-spin': syncing }" />
          {{ syncing ? '同步中...' : '检查更新' }}
        </Button>
      </div>

      <!-- plugin grid -->
      <div v-if="currentPlugins.length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Card
          v-for="plugin in currentPlugins"
          :key="plugin.name"
          class="group relative overflow-hidden"
          :class="plugin.status === 'active' ? 'ring-1 ring-green-500/40' : ''"
        >
          <!-- active status bar -->
          <div
            class="absolute inset-x-0 top-0 h-1 transition-colors"
            :class="plugin.status === 'active' ? 'bg-green-500' : 'bg-transparent'"
          />
          <CardContent class="space-y-3 pt-5 pb-0">
            <!-- header: icon + title + actions -->
            <div class="flex items-start gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl"
                :class="plugin.status === 'active' ? 'bg-green-500/10' : ''"
              >
                <img v-if="plugin.icon && isIconUrl(plugin.icon)" :src="plugin.icon" class="size-6 object-contain" />
                <span v-else-if="isMaterialIcon(plugin.icon)" class="material-icons text-xl">{{ plugin.icon }}</span>
                <span v-else-if="plugin.icon">{{ plugin.icon }}</span>
                <RiStore2Line v-else class="size-5 text-muted-foreground" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-sm font-semibold">{{ plugin.title || plugin.name }}</h3>
                <p class="truncate text-xs text-muted-foreground">{{ plugin.name }} · v{{ plugin.version }}</p>
              </div>
              <!-- actions -->
              <div class="flex shrink-0 items-center gap-1" @click.stop>
                <Switch
                  :model-value="plugin.status === 'active'"
                  @update:model-value="(v: boolean) => toggleStatus(plugin, v)"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-7 opacity-60 transition-opacity group-hover:opacity-100">
                      <RiMoreLine class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem v-if="plugin.configurable" @click="openConfig(plugin)">
                      <RiSettings3Line class="mr-2 size-4" /> {{ t('plugin.configure') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="disableAll(plugin)">
                      <RiStopCircleLine class="mr-2 size-4" /> 一键禁用
                    </DropdownMenuItem>
                    <DropdownMenuItem class="text-destructive" @click="uninstallPlugin(plugin)">
                      <RiStopCircleLine class="mr-2 size-4" /> {{ t('plugin.uninstall') }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <!-- description -->
            <p class="line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
              {{ plugin.description || '-' }}
            </p>

            <!-- tags -->
            <div v-if="plugin.tags?.length" class="flex flex-wrap gap-1">
              <Badge v-for="tag in plugin.tags" :key="tag" variant="secondary" class="text-[10px] font-normal">{{ tag }}</Badge>
            </div>

            <!-- footer: category + routes -->
            <div class="flex items-center justify-between border-t pt-3">
              <Badge variant="outline" class="text-[10px] font-normal text-muted-foreground">
                {{ getCategoryName(plugin.category) }}
              </Badge>
              <div v-if="activeTab && getRoutesForPlugin(activeTab, plugin.name).length" class="flex flex-wrap justify-end gap-1">
                <Button
                  v-for="route in getRoutesForPlugin(activeTab!, plugin.name)"
                  :key="route.path"
                  variant="ghost"
                  size="sm"
                  class="h-6 gap-1 px-2 text-xs"
                  @click.stop="openRoute(route)"
                >
                  {{ route.meta?.title || route.name }}
                  <RiExternalLinkLine class="size-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div v-else class="py-12 text-center text-muted-foreground">
        {{ t('common.noData') }}
      </div>
    </template>

    <div v-else class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>

    <!-- Config Dialog -->
    <Dialog :open="configDialog" @update:open="configDialog = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('plugin.configure') }} - {{ configPlugin?.name }}</DialogTitle>
          <DialogDescription>编辑 JSON 配置</DialogDescription>
        </DialogHeader>
        <textarea
          v-model="configJson"
          class="min-h-[200px] w-full rounded-md border bg-muted p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          spellcheck="false"
        />
        <DialogFooter>
          <Button variant="outline" @click="configDialog = false">{{ t('common.cancel') }}</Button>
          <Button @click="saveConfig">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Store Dialog -->
    <Dialog :open="storeOpen" @update:open="storeOpen = $event">
      <DialogContent class="w-[80vw] h-[80vh] max-w-[95vw] max-h-[90vh] sm:max-w-[95vw] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader class="flex flex-row items-start justify-between gap-3 px-6 pt-6 pb-2 shrink-0">
          <div class="min-w-0">
            <DialogTitle>{{ t('plugin.pluginStore') }}</DialogTitle>
            <DialogDescription>
              当前插件源：
              <span v-if="activePluginSource" class="font-medium text-foreground">{{ activePluginSource.name }}</span>
              <span v-else class="text-yellow-600 dark:text-yellow-400">未选择</span>
              <span v-if="activePluginSource" class="ml-1 text-xs">（{{ activePluginSource.url }}）</span>
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            class="shrink-0"
            :disabled="storeLoading || !activePluginSource"
            title="刷新插件列表"
            @click="loadStorePlugins"
          >
            <RiRefreshLine class="size-4" :class="{ 'animate-spin': storeLoading }" />
          </Button>
        </DialogHeader>

        <!-- 顶部固定区: 未选源提示 或 搜索框 -->
        <div class="px-6 pb-3 shrink-0">
          <div v-if="!activePluginSource" class="rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-sm text-muted-foreground">
            请先在「设置 → 插件」中添加并选中一个插件源。
          </div>
          <div v-else-if="storePlugins.length" class="relative">
            <RiSearchLine class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="storeSearch" placeholder="搜索插件..." class="pl-9" />
          </div>
        </div>

        <!-- 卡片网格 (可滚动) -->
        <ScrollArea class="flex-1 min-h-0">
          <div class="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card v-for="p in filteredStorePlugins" :key="p.name" class="overflow-hidden">
              <CardContent class="flex h-full flex-col gap-3 p-4">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                    <img v-if="p.icon && isIconUrl(p.icon)" :src="p.icon" class="size-6 object-contain" />
                    <span v-else-if="isMaterialIcon(p.icon)" class="material-icons text-xl">{{ p.icon }}</span>
                    <span v-else-if="p.icon">{{ p.icon }}</span>
                    <RiStore2Line v-else class="size-5 text-muted-foreground" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <a
                      :href="`https://www.npmjs.com/package/${p.name}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block truncate text-sm font-medium text-primary hover:underline"
                      @click.stop
                    >{{ p.title || p.name }}</a>
                    <p class="truncate text-xs text-muted-foreground">{{ p.name }}<span v-if="p.version"> · v{{ p.version }}</span></p>
                  </div>
                </div>
                <p class="line-clamp-3 min-h-[3.75rem] text-sm text-muted-foreground">{{ p.description }}</p>
                <div class="mt-auto flex items-center justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-1">
                    <Badge variant="outline" class="text-[10px]">{{ getCategoryName(p.category) }}</Badge>
                    <Badge v-if="installedNames.includes(p.name)" variant="secondary" class="text-[10px]">已安装</Badge>
                  </div>
                  <Button
                    :disabled="installedNames.includes(p.name) || installingName === p.name"
                    :variant="installedNames.includes(p.name) ? 'secondary' : 'default'"
                    size="sm"
                    class="shrink-0"
                    @click="installFromStore(p.name, p.registry)"
                  >
                    <RiRefreshLine v-if="installingName === p.name" class="mr-1 size-3.5 animate-spin" />
                    {{ installingName === p.name ? '安装中' : (installedNames.includes(p.name) ? '已安装' : '安装') }}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- 空态 -->
          <div v-if="storeLoading" class="py-12 text-center text-sm text-muted-foreground">加载中...</div>
          <div v-else-if="!activePluginSource" class="py-12 text-center text-sm text-muted-foreground">请先在「设置 → 插件」中选择一个插件源</div>
          <div v-else-if="!filteredStorePlugins.length" class="py-12 text-center text-sm text-muted-foreground">没有找到匹配的插件</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <!-- Install Dialog -->
    <Dialog :open="installOpen" @update:open="installOpen = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>安装插件</DialogTitle>
          <DialogDescription>为当前素材库「{{ groups.find(g => g.id === activeTab)?.name || activeTab }}」安装插件</DialogDescription>
        </DialogHeader>

        <Tabs v-model="installTab">
          <TabsList class="w-full">
            <TabsTrigger value="repository" class="flex-1">从仓库安装</TabsTrigger>
            <TabsTrigger value="local" class="flex-1">
              <RiUploadLine class="mr-1 size-3.5" /> 从本地上传
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repository" class="mt-4 space-y-4">
            <div class="space-y-2">
              <Label>插件名称</Label>
              <Input v-model="installForm.name" placeholder="npm 包名，如：mira-plugin-example" />
            </div>
            <div class="space-y-2">
              <Label>版本</Label>
              <Input v-model="installForm.version" placeholder="latest" />
            </div>
            <div class="space-y-2">
              <Label>NPM 源</Label>
              <Select v-model="installForm.npmSource">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="npmmirror">npmmirror（默认）</SelectItem>
                  <SelectItem value="npm">npm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>代理地址（可选）</Label>
              <Input v-model="installForm.proxy" placeholder="http://proxy.example.com:8080" />
            </div>
          </TabsContent>

          <TabsContent value="local" class="mt-4 space-y-4">
            <div class="space-y-2">
              <Label>选择插件包</Label>
              <Input type="file" accept=".zip,.tar.gz" @change="handleFileSelect" />
              <p class="text-xs text-muted-foreground">支持 .zip 和 .tar.gz 格式</p>
            </div>
            <div v-if="installFile" class="text-sm text-muted-foreground">
              已选择: {{ installFile.name }}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" @click="cancelInstall">
            {{ installLoading ? '取消安装' : t('common.cancel') }}
          </Button>
          <Button :disabled="installLoading" @click="submitInstall">
            <RiRefreshLine v-if="installLoading" class="mr-2 size-4 animate-spin" />
            <RiAddLine v-else class="mr-2 size-4" />
            {{ installLoading ? '安装中...' : '安装' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation -->
    <ConfirmDialog
      v-bind="confirmDialog"
      @update:open="confirmDialog.open = $event"
      @confirm="confirmDialog.resolve(true)"
      @cancel="confirmDialog.resolve(false)"
    />

    <!-- Terminal install dialog: SSE 实时展示 npm install --verbose 输出 -->
    <InstallTerminalDialog
      v-if="terminalTarget"
      :open="terminalOpen"
      :name="terminalTarget.name"
      :libraryId="terminalTarget.libraryId"
      :registry="terminalTarget.registry"
      @update:open="terminalOpen = $event"
      @finish="onTerminalFinish"
    />
  </div>
</template>
