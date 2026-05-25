<script setup lang="ts">
import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Plugin } from '@/types/mira'
import type { LibraryPlugins } from '@/api/modules/plugin'
import { pluginApi } from '@/api'
import client from '@/api/client'
import { useAppStore } from '@/stores/app'
import { getDashboardContext } from '@/stores/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'vue-sonner'
import {
  RiSearchLine, RiMoreLine, RiSettings3Line, RiStopCircleLine,
  RiStore2Line, RiInformationLine, RiExternalLinkLine, RiAddLine, RiUploadLine,
} from '@remixicon/vue'

interface PluginRoute {
  name: string
  path: string
  pluginName: string
  component?: string
  builder?: () => string
  meta?: { title?: string; [k: string]: any }
}

const { t } = useI18n()

// core state
const groups = ref<LibraryPlugins[]>([])
const loading = ref(false)
const searchQuery = ref('')
const activeTab = ref('')
const pluginRoutes = reactive<Record<string, PluginRoute[]>>({})

// detail sheet
const detailOpen = ref(false)
const detailPlugin = ref<Plugin | null>(null)

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

const storePlugins = [
  { name: 'mira_user', title: '用户认证', description: '用户登录认证插件，通过 SDK 连接 Mira 服务端进行权限验证，支持多角色管理和会话管理。', icon: '👤', category: '安全', deps: 'mira-server-sdk' },
  { name: 'mira_thumb', title: '缩略图生成', description: '自动为视频和图片生成缩略图，基于 ffmpeg 实现高效批量处理。', icon: '🖼️', category: '存储', deps: 'fluent-ffmpeg, queue' },
  { name: 'upload_statistics', title: '上传统计', description: '记录和查询文件上传历史数据，提供上传量统计和趋势分析。', icon: '📊', category: '工具', deps: '--' },
  { name: 'mira_n8n', title: 'n8n 集成', description: '通过 Webhook 和 WebSocket 将 Mira 事件转发到 n8n 工作流引擎，实现自动化任务编排。', icon: '🔗', category: '集成', deps: 'ws' },
]

const installedNames = computed(() => groups.value.flatMap(g => g.plugins.map(p => p.name)))

const filteredStorePlugins = computed(() => {
  if (!storeSearch.value) return storePlugins
  const q = storeSearch.value.toLowerCase()
  return storePlugins.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.title.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q),
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

async function loadPlugins() {
  loading.value = true
  try {
    const res = await pluginApi.listByLibrary()
    groups.value = Array.isArray(res.data) ? res.data : []
    if (groups.value.length && !activeTab.value) {
      activeTab.value = groups.value[0].id
    }
    for (const g of groups.value) {
      loadPluginRoutes(g.id)
    }
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

const registeredRouteNames = new Set<string>()

// 暴露 dashboard 上下文给插件组件
;(window as any).MiraDashboard = getDashboardContext()

async function loadPluginRoutes(libraryId: string) {
  try {
    const res = await client.get(`/plugin-routes/${libraryId}`)
    const routes: PluginRoute[] = Array.isArray(res.data?.data) ? res.data.data : []
    pluginRoutes[libraryId] = routes

    for (const route of routes) {
      const routeName = `plugin_${libraryId}_${route.name}`
      if (registeredRouteNames.has(routeName)) continue
      registeredRouteNames.add(routeName)

      const childPath = route.path.startsWith('/') ? route.path.slice(1) : route.path
      const component = resolvePluginComponent(route, libraryId)

      router.addRoute('MainLayout', {
        name: routeName,
        path: childPath,
        component,
        meta: { ...route.meta, isPlugin: true, requiresAuth: true, libraryId },
      })
    }
  } catch {
    pluginRoutes[libraryId] = []
  }
}

function resolvePluginComponent(route: PluginRoute, libraryId: string) {
  const mixin = {
    methods: {
      getLibraryId: () => libraryId,
    },
  }

  // builder 模式
  if (route.builder) {
    try {
      const html = route.builder()
      return defineComponent({ template: html, name: route.name, mixins: [mixin] })
    } catch (e) {
      console.error(`Plugin route builder error: ${route.name}`, e)
    }
  }

  // component 模式：动态加载插件 JS
  if (route.component) {
    const comp = route.component
    const pluginName = route.pluginName || ''
    const src = `/plugins/${libraryId}/${pluginName}/${comp}`

    return () => new Promise<any>((resolve) => {
      const key = `${pluginName}_${comp.replace(/[/.]/g, '_')}`
      const existing = (window as any).MiraPluginComponents?.[key]
      if (existing) return resolve(withMixin(existing, mixin))

      const script = document.createElement('script')
      script.src = src
      script.onload = () => {
        const raw = (window as any).MiraPluginComponents?.[key]
        resolve(raw ? withMixin(raw, mixin) : fallback(route))
      }
      script.onerror = () => {
        console.error(`Failed to load plugin script: ${src}`)
        resolve(fallback(route))
      }
      document.head.append(script)
    })
  }

  return fallback(route)
}

function withMixin(comp: any, mixin: any) {
  return defineComponent({ ...comp, mixins: [mixin] })
}

function fallback(route: PluginRoute) {
  return defineComponent({
    template: `<div class="p-6"><h2 class="text-lg font-semibold mb-2">{{ title }}</h2><p class="text-muted-foreground">插件页面: {{ path }}</p></div>`,
    data: () => ({ title: route.meta?.title || route.name, path: route.path }),
    name: route.name,
  })
}

async function toggleStatus(plugin: Plugin, checked: boolean) {
  const newStatus = checked ? 'active' : 'inactive'
  try {
    await pluginApi.updateStatus(plugin.libraryId!, plugin.name, newStatus)
    plugin.status = newStatus
    if (detailPlugin.value?.name === plugin.name) detailPlugin.value.status = newStatus
    toast.success(t('common.success'))
  } catch {
    toast.error(t('common.failed'))
  }
}

function openDetail(plugin: Plugin) {
  detailPlugin.value = plugin
  detailOpen.value = true
}

async function openConfig(plugin: Plugin) {
  try {
    const res = await client.get(`/plugins/${plugin.name}/config`, { params: { libraryId: plugin.libraryId } })
    configJson.value = JSON.stringify(res.data, null, 2)
    configPlugin.value = plugin
    configDialog.value = true
    detailOpen.value = false
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
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await pluginApi.uninstall(plugin.name, plugin.libraryId)
    toast.success(t('common.success'))
    if (detailPlugin.value?.name === plugin.name) detailOpen.value = false
    await loadPlugins()
  } catch {
    toast.error(t('common.failed'))
  }
}

async function installFromStore(name: string) {
  if (!activeTab.value) return
  try {
    await pluginApi.install({ name, libraryId: activeTab.value })
    toast.success(t('common.success'))
    storeOpen.value = false
    setTimeout(loadPlugins, 2000)
  } catch {
    toast.error(t('common.failed'))
  }
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

async function submitInstall() {
  if (!activeTab.value) return
  installLoading.value = true
  try {
    if (installTab.value === 'repository') {
      if (!installForm.value.name) {
        toast.error('请输入插件名称')
        installLoading.value = false
        return
      }
      await pluginApi.install({
        name: installForm.value.name,
        version: installForm.value.version || undefined,
        libraryId: activeTab.value,
      })
    } else {
      if (!installFile.value) {
        toast.error('请选择插件包文件')
        installLoading.value = false
        return
      }
      const formData = new FormData()
      formData.append('file', installFile.value)
      formData.append('libraryId', activeTab.value)
      await client.post('/plugins/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    toast.success(t('common.success'))
    installOpen.value = false
    setTimeout(loadPlugins, 2000)
  } catch {
    toast.error(t('common.failed'))
  } finally {
    installLoading.value = false
  }
}

const router = useRouter()

function openRoute(route: PluginRoute) {
  router.push(route.path)
}

onMounted(loadPlugins)
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
        <Button @click="storeOpen = true">
          <RiStore2Line class="mr-2 size-4" /> {{ t('plugin.pluginStore') }}
        </Button>
      </div>
    </div>

    <!-- search -->
    <div class="relative max-w-sm">
      <RiSearchLine class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="searchQuery" :placeholder="t('common.search')" class="pl-9" />
    </div>

    <!-- loading -->
    <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i"><CardContent class="h-48 animate-pulse" /></Card>
    </div>

    <!-- main content -->
    <Tabs v-else-if="groups.length" v-model="activeTab">
      <TabsList>
        <TabsTrigger v-for="g in groups" :key="g.id" :value="g.id">
          {{ g.name }}
          <Badge variant="secondary" class="ml-1.5 text-[10px] px-1.5 py-0">{{ g.plugins.length }}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent v-for="g in groups" :key="g.id" :value="g.id" class="mt-4">
        <div v-if="currentPlugins.length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <Card
            v-for="plugin in currentPlugins"
            :key="plugin.name"
            class="relative cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
            :class="plugin.status === 'active' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-muted'"
            @click="openDetail(plugin)"
          >
            <CardContent class="pt-5">
              <!-- header: name + switch -->
              <div class="mb-3 flex items-start justify-between" @click.stop>
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-base font-semibold">{{ plugin.name }}</h3>
                  <p class="text-xs text-muted-foreground">v{{ plugin.version }}</p>
                </div>
                <Switch
                  :model-value="plugin.status === 'active'"
                  @update:model-value="(v: boolean) => toggleStatus(plugin, v)"
                />
              </div>

              <!-- description -->
              <p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {{ plugin.description || '-' }}
              </p>

              <!-- meta -->
              <div class="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge :variant="plugin.status === 'active' ? 'default' : 'secondary'">
                  {{ plugin.status === 'active' ? t('plugin.enabled') : t('plugin.disabled') }}
                </Badge>
                <span>{{ t('plugin.author') }}: {{ plugin.author }}</span>
              </div>

              <!-- plugin routes -->
              <div v-if="getRoutesForPlugin(g.id, plugin.name).length" class="border-t pt-3">
                <p class="mb-1.5 text-[11px] font-medium text-muted-foreground">插件入口</p>
                <div class="flex flex-wrap gap-1">
                  <Button
                    v-for="route in getRoutesForPlugin(g.id, plugin.name)"
                    :key="route.path"
                    variant="outline"
                    size="sm"
                    class="h-6 gap-1 px-2 text-xs"
                    @click.stop="openRoute(route)"
                  >
                    {{ route.meta?.title || route.name }}
                    <RiExternalLinkLine class="size-3" />
                  </Button>
                </div>
              </div>

              <!-- actions (dropdown, stop click propagation) -->
              <div class="absolute right-2 top-2" @click.stop>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-8">
                      <RiMoreLine class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="openDetail(plugin)">
                      <RiInformationLine class="mr-2 size-4" /> {{ t('plugin.detail') || '详情' }}
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="plugin.configurable" @click="openConfig(plugin)">
                      <RiSettings3Line class="mr-2 size-4" /> {{ t('plugin.configure') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem class="text-destructive" @click="uninstallPlugin(plugin)">
                      <RiStopCircleLine class="mr-2 size-4" /> {{ t('plugin.uninstall') }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        </div>
        <div v-else class="py-12 text-center text-muted-foreground">
          {{ t('common.noData') }}
        </div>
      </TabsContent>
    </Tabs>

    <div v-else class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>

    <!-- Detail Sheet -->
    <Sheet :open="detailOpen" @update:open="detailOpen = $event">
      <SheetContent class="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{{ detailPlugin?.name }}</SheetTitle>
          <SheetDescription>{{ detailPlugin?.description || '-' }}</SheetDescription>
        </SheetHeader>

        <div v-if="detailPlugin" class="mt-4 space-y-4">
          <div class="flex items-center justify-between">
            <Label>{{ t('plugin.enabled') || '状态' }}</Label>
            <Switch
              :model-value="detailPlugin.status === 'active'"
              @update:model-value="(v: boolean) => toggleStatus(detailPlugin!, v)"
            />
          </div>

          <Separator />

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">{{ t('plugin.version') }}</span>
              <span>{{ detailPlugin.version }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">{{ t('plugin.author') }}</span>
              <span>{{ detailPlugin.author }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">分类</span>
              <span>{{ getCategoryName(detailPlugin.category) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">所属库</span>
              <span>{{ detailPlugin.libraryName || detailPlugin.libraryId || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">入口文件</span>
              <span class="text-xs">{{ detailPlugin.main }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">依赖</span>
              <span>{{ detailPlugin.dependencies.length }} 个</span>
            </div>
            <div v-if="detailPlugin.tags?.length" class="flex flex-wrap items-center gap-1">
              <span class="text-muted-foreground">标签</span>
              <Badge v-for="tag in detailPlugin.tags" :key="tag" variant="outline" class="text-xs">{{ tag }}</Badge>
            </div>
          </div>

          <Separator />

          <!-- routes in detail -->
          <div v-if="detailPlugin.libraryId && getRoutesForPlugin(detailPlugin.libraryId, detailPlugin.name).length">
            <p class="mb-2 text-sm font-medium">插件入口</p>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="route in getRoutesForPlugin(detailPlugin.libraryId!, detailPlugin.name)"
                :key="route.path"
                variant="outline"
                size="sm"
                class="gap-1"
                @click="openRoute(route)"
              >
                {{ route.meta?.title || route.name }}
                <RiExternalLinkLine class="size-3" />
              </Button>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <Button
              v-if="detailPlugin.configurable"
              class="flex-1"
              @click="openConfig(detailPlugin)"
            >
              <RiSettings3Line class="mr-2 size-4" /> {{ t('plugin.configure') }}
            </Button>
            <Button
              variant="destructive"
              @click="uninstallPlugin(detailPlugin)"
            >
              <RiStopCircleLine class="mr-2 size-4" /> {{ t('plugin.uninstall') }}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>

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
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ t('plugin.pluginStore') }}</DialogTitle>
          <DialogDescription>浏览并安装官方插件</DialogDescription>
        </DialogHeader>

        <div class="relative mb-4">
          <RiSearchLine class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="storeSearch" placeholder="搜索插件..." class="pl-9" />
        </div>

        <ScrollArea class="max-h-[400px]">
          <div class="space-y-3 pr-3">
            <Card v-for="p in filteredStorePlugins" :key="p.name">
              <CardContent class="flex items-start gap-4 py-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                  {{ p.icon }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ p.title }}</span>
                    <Badge variant="outline" class="text-[10px]">{{ p.category }}</Badge>
                    <Badge v-if="installedNames.includes(p.name)" variant="secondary" class="text-[10px]">已安装</Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">{{ p.name }}</p>
                  <p class="mt-1 text-sm text-muted-foreground">{{ p.description }}</p>
                  <p v-if="p.deps !== '--'" class="mt-1 text-[11px] text-muted-foreground/60">依赖: {{ p.deps }}</p>
                </div>
                <Button
                  :disabled="installedNames.includes(p.name)"
                  :variant="installedNames.includes(p.name) ? 'secondary' : 'default'"
                  size="sm"
                  @click="installFromStore(p.name)"
                >
                  {{ installedNames.includes(p.name) ? '已安装' : '安装' }}
                </Button>
              </CardContent>
            </Card>

            <div v-if="!filteredStorePlugins.length" class="py-8 text-center text-sm text-muted-foreground">
              没有找到匹配的插件
            </div>
          </div>
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
          <Button variant="outline" @click="installOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="installLoading" @click="submitInstall">
            <RiAddLine v-if="!installLoading" class="mr-2 size-4" />
            {{ installLoading ? '安装中...' : '安装' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
