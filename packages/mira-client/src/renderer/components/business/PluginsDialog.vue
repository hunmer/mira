<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="plugins-dialog sm:max-w-[90vw]">
      <DialogHeader>
        <DialogTitle>插件管理</DialogTitle>
      </DialogHeader>
      <div class="min-h-[400px] h-full flex gap-3">
        <!-- 侧边栏 -->
        <aside class="w-56 flex flex-col">
          <!-- 插件类型切换 -->
          <div class="p-4">
            <div class="bg-white/40 dark:bg-muted/40 rounded-lg p-1 flex border border-white/60 dark:border-border">
              <button
                @click="activeTab = 'local'"
                :class="[
                  'flex-1 text-sm py-2 px-3 rounded-md font-medium transition-colors',
                  activeTab === 'local'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground'
                ]"
              >
                本地插件
              </button>
              <button
                @click="activeTab = 'online'"
                :class="[
                  'flex-1 text-sm py-2 px-3 rounded-md font-medium transition-colors',
                  activeTab === 'online'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground'
                ]"
              >
                插件市场
              </button>
            </div>
          </div>

          <!-- 分类导航 -->
          <nav class="px-2 space-y-1 flex-grow">
            <button
              @click="selectedCategory = 'all'"
              :class="[
                'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/60'
              ]"
            >
              <span class="material-icons text-base mr-2">all_inclusive</span>
              全部集成
            </button>
            <button
              @click="selectedCategory = 'communication'"
              :class="[
                'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors',
                selectedCategory === 'communication'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/60'
              ]"
            >
              <span class="material-icons text-base mr-2">chat_bubble_outline</span>
              通讯
            </button>
            <button
              @click="selectedCategory = 'documentation'"
              :class="[
                'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors',
                selectedCategory === 'documentation'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/60'
              ]"
            >
              <span class="material-icons text-base mr-2">description</span>
              文档
            </button>
            <button
              @click="selectedCategory = 'productivity'"
              :class="[
                'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors',
                selectedCategory === 'productivity'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/60'
              ]"
            >
              <span class="material-icons text-base mr-2">trending_up</span>
              效率工具
            </button>
            <button
              @click="selectedCategory = 'development'"
              :class="[
                'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors',
                selectedCategory === 'development'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-white/50 dark:hover:bg-muted/60'
              ]"
            >
              <span class="material-icons text-base mr-2">code</span>
              开发工具
            </button>
          </nav>
        </aside>

        <!-- 主内容区 -->
        <main class="flex-1 flex flex-col">
          <!-- 顶部操作栏 -->
          <header class="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border">
            <div class="flex items-center space-x-2">
              <!-- 搜索框 -->
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索插件..."
                  class="pl-9 pr-4 py-2 w-64 border border-white/60 dark:border-border bg-white/40 dark:bg-muted/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground dark:text-muted-foreground"
                />
              </div>
              <!-- 刷新按钮 -->
              <TooltipProvider :ignore-non-keyboard-focus="true">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      @click="refreshPlugins"
                      :disabled="isRefreshing"
                      class="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors text-muted-foreground dark:text-muted-foreground disabled:opacity-50"
                    >
                      <span class="material-icons text-base" :class="{ 'animate-spin': isRefreshing }">refresh</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">刷新插件列表</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <!-- 检查更新按钮（仅本地插件 tab 显示） -->
              <TooltipProvider v-if="activeTab === 'local' && marketplaceUrl" :ignore-non-keyboard-focus="true">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      @click="checkUpdates"
                      :disabled="pluginStore.isCheckingUpdates"
                      class="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors text-muted-foreground dark:text-muted-foreground disabled:opacity-50"
                    >
                      <span class="material-icons text-base" :class="{ 'animate-spin': pluginStore.isCheckingUpdates }">sync</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">检查插件更新{{ pluginUpdateCount > 0 ? `（${pluginUpdateCount} 个可更新）` : '' }}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <!-- 添加插件按钮 -->
              <TooltipProvider :ignore-non-keyboard-focus="true">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      @click="showAddPluginDialog = true"
                      class="p-2 rounded-lg bg-primary text-white hover:bg-primary transition-colors"
                    >
                      <span class="material-icons text-base">add</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">添加新插件</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </header>

          <!-- 内容区域 -->
          <div class="flex-1 p-4 overflow-y-auto">
            <!-- 本地插件列表 -->
            <div v-if="activeTab === 'local'" class="grid grid-cols-2 gap-4">
              <div
                v-for="plugin in filteredLocalPlugins"
                :key="plugin.config.pluginId"
                class="border border-border dark:border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <h3 class="font-medium text-foreground dark:text-muted-foreground">{{ plugin.config.pluginName }}</h3>
                      <span
                        v-if="getPluginUpdate(plugin.config.pluginId)"
                        class="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      >
                        可更新<span v-if="getPluginUpdate(plugin.config.pluginId)?.fileMismatch && !getPluginUpdate(plugin.config.pluginId)?.versionOutdated">（文件已改）</span>
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{{ plugin.config.description }}</p>
                  </div>
                  <!-- 启用/禁用开关 -->
                  <button
                    @click="togglePlugin(plugin)"
                    :class="[
                      'ml-3 w-10 h-6 rounded-full relative transition-colors',
                      plugin.status !== 'disabled' ? 'bg-green-500' : 'bg-accent dark:bg-muted'
                    ]"
                  >
                    <span
                      :class="[
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        plugin.status !== 'disabled' ? 'left-5' : 'left-1'
                      ]"
                    ></span>
                  </button>
                </div>
                <div class="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
                  <span>{{ plugin.config.author }}</span>
                  <span>v{{ plugin.config.version }}</span>
                </div>
                <div v-if="plugin.error" class="mt-2 text-xs text-destructive dark:text-destructive bg-destructive dark:bg-destructive/20 p-2 rounded">
                  {{ plugin.error }}
                </div>
                <div class="flex items-center space-x-2 mt-3 pt-3 border-t border-border dark:border-border">
                  <button
                    @click="showPluginDetails(plugin)"
                    class="text-xs text-primary dark:text-primary hover:text-primary dark:hover:text-primary"
                  >
                    详情
                  </button>
                  <button
                    @click="reloadPlugin(plugin)"
                    class="text-xs text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground"
                  >
                    重载
                  </button>
                  <button
                    v-if="getPluginUpdate(plugin.config.pluginId)"
                    @click="updateLocalPlugin(plugin.config.pluginId)"
                    :disabled="isInstalling(plugin.config.pluginId)"
                    class="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                  >
                    {{ isInstalling(plugin.config.pluginId) ? '更新中...' : '更新' }}
                  </button>
                  <button
                    @click="removePlugin(plugin)"
                    class="text-xs text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive"
                  >
                    卸载
                  </button>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="filteredLocalPlugins.length === 0" class="col-span-2 text-center py-12">
                <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">extension</span>
                <p class="text-muted-foreground dark:text-muted-foreground mt-4">
                  {{ searchQuery ? '没有找到匹配的插件' : '暂无插件' }}
                </p>
              </div>
            </div>

            <!-- 在线插件市场 -->
            <div v-else>
              <!-- 插件源切换 -->
              <div v-if="marketplaceUrlList.length > 0" class="flex items-center gap-2 mb-3">
                <span class="text-sm text-muted-foreground dark:text-muted-foreground whitespace-nowrap">插件源</span>
                <Select
                  :model-value="marketplaceUrl"
                  @update:model-value="switchMarketSource"
                >
                  <SelectTrigger size="sm" class="w-[320px]">
                    <SelectValue placeholder="选择插件市场源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="url in marketplaceUrlList" :key="url" :value="url">
                      {{ url }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- 未配置市场源 -->
              <div v-if="!marketplaceUrl" class="flex flex-col items-center justify-center h-full text-center py-12">
                <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">cloud_off</span>
                <h3 class="text-lg font-medium text-muted-foreground dark:text-muted-foreground mt-4">未配置插件市场源</h3>
                <p class="text-muted-foreground dark:text-muted-foreground mt-2">请先在「设置 → 插件 → 插件市场源」中填写市场源地址</p>
              </div>

              <!-- 加载中 -->
              <div v-else-if="pluginStore.isMarketplaceLoading" class="flex flex-col items-center justify-center h-full text-center py-12">
                <span class="material-icons text-5xl text-muted-foreground dark:text-muted-foreground animate-spin">sync</span>
                <p class="text-muted-foreground dark:text-muted-foreground mt-4">正在加载插件市场...</p>
              </div>

              <!-- 加载失败 -->
              <div v-else-if="pluginStore.marketplaceError && filteredMarketplacePlugins.length === 0" class="flex flex-col items-center justify-center h-full text-center py-12">
                <span class="material-icons text-6xl text-destructive dark:text-destructive">error_outline</span>
                <h3 class="text-lg font-medium text-muted-foreground dark:text-muted-foreground mt-4">插件市场加载失败</h3>
                <p class="text-muted-foreground dark:text-muted-foreground mt-2">{{ pluginStore.marketplaceError }}</p>
                <button
                  @click="loadMarketplace"
                  class="mt-4 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary transition-colors"
                >
                  重试
                </button>
              </div>

              <!-- 市场插件列表 -->
              <div v-else class="grid grid-cols-2 gap-4">
                <div
                  v-for="entry in filteredMarketplacePlugins"
                  :key="entry.pluginId"
                  class="border border-border dark:border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <h3 class="font-medium text-foreground dark:text-muted-foreground">{{ entry.pluginName }}</h3>
                      <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{{ entry.description }}</p>
                    </div>
                    <span
                      v-if="getMarketStatus(entry).badge"
                      :class="[
                        'ml-3 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
                        getMarketStatus(entry).badgeClass
                      ]"
                    >
                      {{ getMarketStatus(entry).badge }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
                    <span>{{ entry.author }}</span>
                    <span>v{{ entry.version }}</span>
                  </div>
                  <div v-if="entry.platform && entry.platform.length" class="flex items-center gap-1 mt-2">
                    <span
                      v-for="p in entry.platform"
                      :key="p"
                      class="px-1.5 py-0.5 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground rounded text-[10px]"
                    >
                      {{ platformLabel(p) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-border dark:border-border">
                    <button
                      v-if="getMarketStatus(entry).action === 'install'"
                      @click="installMarketplacePlugin(entry)"
                      :disabled="isInstalling(entry.pluginId)"
                      class="text-xs px-3 py-1 rounded bg-primary text-white hover:bg-primary transition-colors disabled:opacity-50"
                    >
                      {{ isInstalling(entry.pluginId) ? '安装中...' : '安装' }}
                    </button>
                    <button
                      v-else-if="getMarketStatus(entry).action === 'update'"
                      @click="installMarketplacePlugin(entry)"
                      :disabled="isInstalling(entry.pluginId)"
                      class="text-xs px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {{ isInstalling(entry.pluginId) ? '更新中...' : '更新' }}
                    </button>
                    <button
                      v-else
                      disabled
                      class="text-xs px-3 py-1 rounded bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground cursor-default"
                    >
                      已安装
                    </button>
                  </div>
                </div>

                <!-- 空状态 -->
                <div v-if="filteredMarketplacePlugins.length === 0" class="col-span-2 text-center py-12">
                  <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">store</span>
                  <p class="text-muted-foreground dark:text-muted-foreground mt-4">
                    {{ searchQuery ? '没有找到匹配的插件' : '插件市场暂无可用插件' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DialogContent>
  </Dialog>

  <!-- 插件详情对话框 -->
  <Dialog
    :open="showDetailsDialog"
    @update:open="showDetailsDialog = $event"
  >
    <DialogContent class="plugin-details-dialog sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>插件详情 - {{ selectedPlugin?.config.pluginName }}</DialogTitle>
      </DialogHeader>
    <div v-if="selectedPlugin" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">插件ID</label>
          <input
            :value="selectedPlugin.config.pluginId"
            readonly
            class="w-full px-3 py-2 border border-border dark:border-border rounded bg-muted/50 dark:bg-muted/50 text-sm text-foreground dark:text-muted-foreground"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">版本</label>
          <input
            :value="selectedPlugin.config.version"
            readonly
            class="w-full px-3 py-2 border border-border dark:border-border rounded bg-muted/50 dark:bg-muted/50 text-sm text-foreground dark:text-muted-foreground"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">描述</label>
        <textarea
          :value="selectedPlugin.config.description"
          readonly
          rows="3"
          class="w-full px-3 py-2 border border-border dark:border-border rounded bg-muted dark:bg-muted text-sm text-foreground dark:text-muted-foreground"
        ></textarea>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">作者</label>
          <input
            :value="selectedPlugin.config.author"
            readonly
            class="w-full px-3 py-2 border border-border dark:border-border rounded bg-muted/50 dark:bg-muted/50 text-sm text-foreground dark:text-muted-foreground"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">主页</label>
          <input
            :value="selectedPlugin.config.homepage || '无'"
            readonly
            class="w-full px-3 py-2 border border-border dark:border-border rounded bg-muted/50 dark:bg-muted/50 text-sm text-foreground dark:text-muted-foreground"
          />
        </div>
      </div>
      <div v-if="selectedPlugin.config.dependencies && selectedPlugin.config.dependencies.length > 0">
        <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">依赖插件</label>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="dep in selectedPlugin.config.dependencies"
            :key="dep"
            class="px-2 py-1 bg-primary dark:bg-primary text-primary dark:text-primary rounded text-xs"
          >
            {{ dep }}
          </span>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">插件目录</label>
        <input
          :value="selectedPlugin.directory"
          readonly
          class="w-full px-3 py-2 border border-border dark:border-border rounded bg-muted dark:bg-muted text-sm text-foreground dark:text-muted-foreground"
        />
      </div>
      <div v-if="selectedPlugin.error">
        <label class="block text-sm font-medium mb-1 text-foreground dark:text-muted-foreground">错误信息</label>
        <textarea
          :value="selectedPlugin.error"
          readonly
          rows="3"
          class="w-full px-3 py-2 border border-border dark:border-border rounded bg-destructive dark:bg-destructive/20 text-sm text-destructive dark:text-destructive"
        ></textarea>
      </div>
    </div>
    </DialogContent>
  </Dialog>

  <!-- 添加插件对话框 -->
  <Dialog
    :open="showAddPluginDialog"
    @update:open="showAddPluginDialog = $event"
  >
    <DialogContent class="add-plugin-dialog sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>添加新插件</DialogTitle>
      </DialogHeader>
    <div class="space-y-3">
      <p class="text-muted-foreground dark:text-muted-foreground">选择要添加插件的方式：</p>
      <button
        @click="selectPluginDirectory"
        class="w-full flex items-center p-4 border border-border dark:border-border rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
      >
        <span class="material-icons text-2xl text-primary mr-3">folder_open</span>
        <div class="text-left">
          <div class="font-medium">从文件夹添加</div>
          <div class="text-sm text-muted-foreground dark:text-muted-foreground">选择包含插件的文件夹</div>
        </div>
      </button>
      <button
        @click="installPluginFromFile"
        class="w-full flex items-center p-4 border border-border dark:border-border rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
      >
        <span class="material-icons text-2xl text-primary mr-3">description</span>
        <div class="text-left">
          <div class="font-medium">从文件安装</div>
          <div class="text-sm text-muted-foreground dark:text-muted-foreground">安装 ZIP 格式的插件包</div>
        </div>
      </button>
    </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useToast } from '@/renderer/composables/useToast'
import { useConfirm } from '@/renderer/composables/useConfirm'
import { usePluginStore } from '@renderer/stores/plugin'
import { useSettingsStore } from '@renderer/stores/settings'
import type { PluginRuntime } from '../../../shared/types'
import type { MarketplacePluginEntry } from '../../../shared/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AcceptableValue } from 'reka-ui'

// 组件属性
interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// 组件事件
interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const emit = defineEmits<Emits>()

// Store 和工具
const toast = useToast()
const confirm = useConfirm()
const pluginStore = usePluginStore()
const settingsStore = useSettingsStore()

// 响应式状态
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const activeTab = ref<'local' | 'online'>('local')
const selectedCategory = ref('all')
const searchQuery = ref('')
const isRefreshing = ref(false)
const showDetailsDialog = ref(false)
const showAddPluginDialog = ref(false)
const selectedPlugin = ref<PluginRuntime | null>(null)

// 插件市场相关
const marketplaceUrl = computed(() => (settingsStore.settings.clientPluginMarketUrl || '').trim())
const marketplaceUrlList = computed(() => {
  const list = settingsStore.settings.clientPluginMarketUrls || []
  return list.map((u) => (u || '').trim()).filter((u) => !!u)
})
const installingIds = ref<Set<string>>(new Set())

// 本地插件可更新数量（来自 store 的 pluginUpdates）
const pluginUpdateCount = computed(() => pluginStore.pluginUpdates?.size || 0)

// 计算属性
const filteredLocalPlugins = computed(() => {
  let plugins = pluginStore.localPlugins || []

  // 按分类筛选
  if (selectedCategory.value !== 'all') {
    plugins = plugins.filter(plugin => {
      const category = plugin.config.category || 'other'
      const tags = plugin.config.tags || []

      switch (selectedCategory.value) {
        case 'communication':
          return category === 'communication' ||
                 tags.includes('通讯') || tags.includes('communication')
        case 'documentation':
          return category === 'documentation' ||
                 tags.includes('文档') || tags.includes('documentation')
        case 'productivity':
          return category === 'productivity' ||
                 tags.includes('效率') || tags.includes('productivity')
        case 'development':
          return category === 'development' ||
                 tags.includes('开发') || tags.includes('development')
        default:
          return true
      }
    })
  }

  // 按搜索词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    plugins = plugins.filter(plugin =>
      plugin.config.pluginName.toLowerCase().includes(query) ||
      plugin.config.description.toLowerCase().includes(query) ||
      plugin.config.author.toLowerCase().includes(query)
    )
  }

  return plugins
})

// 插件市场过滤后的列表（复用分类导航与搜索框）
const filteredMarketplacePlugins = computed(() => {
  let plugins = pluginStore.marketplacePlugins || []

  // 按分类筛选
  if (selectedCategory.value !== 'all') {
    plugins = plugins.filter(entry => {
      const category = entry.category || ''
      const tags = entry.tags || []
      switch (selectedCategory.value) {
        case 'communication':
          return category === 'communication' ||
                 tags.includes('通讯') || tags.includes('communication')
        case 'documentation':
          return category === 'documentation' ||
                 tags.includes('文档') || tags.includes('documentation')
        case 'productivity':
          return category === 'productivity' ||
                 tags.includes('效率') || tags.includes('productivity')
        case 'development':
          return category === 'development' ||
                 tags.includes('开发') || tags.includes('development')
        default:
          return true
      }
    })
  }

  // 按搜索词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    plugins = plugins.filter(entry =>
      entry.pluginName.toLowerCase().includes(query) ||
      (entry.description || '').toLowerCase().includes(query) ||
      (entry.author || '').toLowerCase().includes(query)
    )
  }

  return plugins
})

// 方法
const getCategoryTitle = () => {
  switch (selectedCategory.value) {
    case 'all': return '全部集成'
    case 'communication': return '通讯工具'
    case 'documentation': return '文档工具'
    case 'productivity': return '效率工具'
    case 'development': return '开发工具'
    default: return '集成管理'
  }
}

// ==================== 插件市场方法 ====================

/**
 * 拉取插件市场目录
 */
const loadMarketplace = async () => {
  if (!marketplaceUrl.value) return
  await pluginStore.fetchMarketplaceCatalog()
}

/**
 * 切换当前生效的插件市场源
 * 写入设置后，既有 watch(marketplaceUrl) 会自动触发重新加载目录
 */
const switchMarketSource = async (value: AcceptableValue) => {
  const url = typeof value === 'string' ? value.trim() : ''
  if (!url || url === marketplaceUrl.value) return
  await settingsStore.updateSetting('clientPluginMarketUrl', url)
}

/**
 * 平台标识的中文标签
 */
const platformLabel = (p: string): string => {
  switch (p) {
    case 'win32': return 'Windows'
    case 'darwin': return 'macOS'
    case 'linux': return 'Linux'
    default: return p
  }
}

/**
 * 简单的语义化版本比较：返回正数表示 a 更新，负数表示 b 更新，0 表示相等
 */
const compareVersions = (a: string, b: string): number => {
  const pa = (a || '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = (b || '').split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0
    const db = pb[i] || 0
    if (da !== db) return da - db
  }
  return 0
}

/**
 * 判断某市场插件相对本地安装状态：未安装 / 已安装(同版本或更新) / 可更新
 */
const getMarketStatus = (entry: MarketplacePluginEntry): {
  action: 'install' | 'update' | 'none'
  badge?: string
  badgeClass?: string
} => {
  const local = (pluginStore.localPlugins || []).find(p => p.config.pluginId === entry.pluginId)
  if (!local) {
    return { action: 'install' }
  }
  const cmp = compareVersions(entry.version, local.config.version)
  if (cmp > 0) {
    return {
      action: 'update',
      badge: '可更新',
      badgeClass: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
    }
  }
  return {
    action: 'none',
    badge: '已安装',
    badgeClass: 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground'
  }
}

const isInstalling = (pluginId: string): boolean => installingIds.value.has(pluginId)

/**
 * 安装/更新市场插件
 */
const installMarketplacePlugin = async (entry: MarketplacePluginEntry) => {
  installingIds.value.add(entry.pluginId)
  try {
    const result = await pluginStore.installMarketplacePlugin(entry)
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: '安装成功',
        detail: `${entry.pluginName} 已安装，可在「本地插件」中启用`,
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '安装失败',
        detail: (result as any).message || (result as any).error || '未知错误',
        life: 5000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '安装失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  } finally {
    installingIds.value.delete(entry.pluginId)
  }
}

/**
 * 取某插件的更新信息（无则返回 undefined）
 */
const getPluginUpdate = (pluginId: string) => pluginStore.pluginUpdates?.get(pluginId)

/**
 * 手动触发检查更新
 */
const checkUpdates = async () => {
  try {
    const result = await pluginStore.checkPluginUpdates()
    if ((result as any).success) {
      const count = (result as any).data?.count ?? 0
      toast.add({
        severity: count > 0 ? 'info' : 'success',
        summary: count > 0 ? '发现可用更新' : '已是最新',
        detail: count > 0 ? `共 ${count} 个插件可更新` : '所有插件均为最新版本',
        life: 3000
      })
    } else {
      toast.add({
        severity: 'warn',
        summary: '检查更新',
        detail: (result as any).message || (result as any).error || '无法检查更新',
        life: 4000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '检查更新失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  }
}

/**
 * 更新单个本地插件（走市场安装流程覆盖）
 */
const updateLocalPlugin = async (pluginId: string) => {
  const update = pluginStore.pluginUpdates?.get(pluginId)
  if (!update?.entry) return
  await installMarketplacePlugin(update.entry)
  // 更新完成后清除该插件的更新标记
  if (pluginStore.pluginUpdates) {
    pluginStore.pluginUpdates.delete(pluginId)
  }
}

const togglePlugin = async (plugin: PluginRuntime) => {
  try {
    if (plugin.status !== 'disabled') {
      await pluginStore.disableLocalPlugin(plugin.config.pluginId)
      toast.add({
        severity: 'success',
        summary: '禁用成功',
        detail: plugin.config.pluginName,
        life: 3000
      })
    } else {
      await pluginStore.enableLocalPlugin(plugin.config.pluginId)
      toast.add({
        severity: 'success',
        summary: '启用成功',
        detail: plugin.config.pluginName,
        life: 3000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  }
}

const showPluginDetails = (plugin: PluginRuntime) => {
  selectedPlugin.value = plugin
  showDetailsDialog.value = true
}

const reloadPlugin = async (plugin: PluginRuntime) => {
  try {
    await pluginStore.reloadLocalPlugin(plugin.config.pluginId)
    toast.add({
      severity: 'success',
      summary: '重载成功',
      detail: plugin.config.pluginName,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '重载失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  }
}

const removePlugin = (plugin: PluginRuntime) => {
  confirm.require({
    message: `确定要卸载插件 "${plugin.config.pluginName}" 吗？`,
    header: '确认卸载',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await pluginStore.uninstallLocalPlugin(plugin.config.pluginId, plugin.directory, plugin.config.pluginName)
        toast.add({
          severity: 'success',
          summary: '卸载成功',
          detail: plugin.config.pluginName,
          life: 3000
        })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: '卸载失败',
          detail: error instanceof Error ? error.message : '未知错误',
          life: 5000
        })
      }
    }
  })
}

const refreshPlugins = async () => {
  isRefreshing.value = true
  try {
    const result = await pluginStore.discoverLocalPlugins()
    if (!result.success) {
      toast.add({
        severity: 'error',
        summary: '刷新失败',
        detail: result.message || '未知错误',
        life: 5000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '刷新失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  } finally {
    isRefreshing.value = false
  }
}

const selectPluginDirectory = async () => {
  showAddPluginDialog.value = false
  try {
    const result = await pluginStore.selectPluginDirectory('选择插件文件夹')
    if (result.success && result.data) {
      toast.add({
        severity: 'success',
        summary: '插件已添加',
        detail: '正在扫描插件...',
        life: 3000
      })
      await refreshPlugins()
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '添加失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  }
}

const installPluginFromFile = async () => {
  showAddPluginDialog.value = false
  toast.add({
    severity: 'info',
    summary: '功能开发中',
    detail: '从文件安装插件功能正在开发中',
    life: 3000
  })
}

// 按需初始化标志
const isInitialized = ref(false)
const isMarketplaceInitialized = ref(false)

// 监听对话框打开，按需刷新插件列表
watch(isVisible, async (visible) => {
  if (visible && !isInitialized.value) {
    await nextTick()
    refreshPlugins()
    isInitialized.value = true
  }
})

// 切换到插件市场标签时按需加载目录；切换到本地标签且配置了市场源时静默检查更新
watch(activeTab, async (tab) => {
  if (tab === 'online' && !isMarketplaceInitialized.value) {
    isMarketplaceInitialized.value = true
    await loadMarketplace()
  } else if (tab === 'local' && marketplaceUrl.value && !pluginStore.isCheckingUpdates) {
    // 后台静默检查更新（不弹 toast，仅刷新徽章）
    pluginStore.checkPluginUpdates().catch(() => {})
  }
})

// 市场源地址变化时，若已切到市场标签则重新加载
watch(marketplaceUrl, async (url, oldUrl) => {
  if (url !== oldUrl && activeTab.value === 'online') {
    await loadMarketplace()
  }
})
</script>

