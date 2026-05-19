<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="plugins-dialog sm:max-w-[90vw]">
      <DialogHeader>
        <DialogTitle>插件管理</DialogTitle>
      </DialogHeader>
      <div class="plugins-content h-full flex">
        <!-- 侧边栏 -->
        <aside class="w-56 bg-gray-50 border-r border-gray-200 flex flex-col">
          <!-- 插件类型切换 -->
          <div class="p-4">
            <div class="bg-gray-200 rounded-lg p-1 flex">
              <button
                @click="activeTab = 'local'"
                :class="[
                  'flex-1 text-sm py-2 px-3 rounded-md font-medium transition-colors',
                  activeTab === 'local'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600'
                ]"
              >
                本地插件
              </button>
              <button
                @click="activeTab = 'online'"
                :class="[
                  'flex-1 text-sm py-2 px-3 rounded-md font-medium transition-colors',
                  activeTab === 'online'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600'
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              <span class="material-icons text-base mr-2">code</span>
              开发工具
            </button>
          </nav>
        </aside>

        <!-- 主内容区 -->
        <main class="flex-1 flex flex-col bg-white">
          <!-- 顶部操作栏 -->
          <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div class="flex items-center space-x-3">
              <span class="text-lg font-semibold text-gray-800">{{ getCategoryTitle() }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <!-- 搜索框 -->
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索插件..."
                  class="pl-9 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <!-- 刷新按钮 -->
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      @click="refreshPlugins"
                      :disabled="isRefreshing"
                      class="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-50"
                    >
                      <span class="material-icons text-base" :class="{ 'animate-spin': isRefreshing }">refresh</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">刷新插件列表</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <!-- 添加插件按钮 -->
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      @click="showAddPluginDialog = true"
                      class="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
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
                class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900">{{ plugin.config.pluginName }}</h3>
                    <p class="text-xs text-gray-500 mt-1">{{ plugin.config.description }}</p>
                  </div>
                  <!-- 启用/禁用开关 -->
                  <button
                    @click="togglePlugin(plugin)"
                    :class="[
                      'ml-3 w-10 h-6 rounded-full relative transition-colors',
                      plugin.status !== 'disabled' ? 'bg-green-500' : 'bg-gray-300'
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
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <span>{{ plugin.config.author }}</span>
                  <span>v{{ plugin.config.version }}</span>
                </div>
                <div v-if="plugin.error" class="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded">
                  {{ plugin.error }}
                </div>
                <div class="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    @click="showPluginDetails(plugin)"
                    class="text-xs text-blue-600 hover:text-blue-800"
                  >
                    详情
                  </button>
                  <button
                    @click="reloadPlugin(plugin)"
                    class="text-xs text-gray-600 hover:text-gray-800"
                  >
                    重载
                  </button>
                  <button
                    @click="removePlugin(plugin)"
                    class="text-xs text-red-600 hover:text-red-800"
                  >
                    卸载
                  </button>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="filteredLocalPlugins.length === 0" class="col-span-2 text-center py-12">
                <span class="material-icons text-6xl text-gray-300">extension</span>
                <p class="text-gray-500 mt-4">
                  {{ searchQuery ? '没有找到匹配的插件' : '暂无插件' }}
                </p>
              </div>
            </div>

            <!-- 在线插件（占位符） -->
            <div v-else class="flex flex-col items-center justify-center h-full text-center py-12">
              <span class="material-icons text-6xl text-gray-300">cloud</span>
              <h3 class="text-lg font-medium text-gray-600 mt-4">在线插件市场</h3>
              <p class="text-gray-500 mt-2">在线插件市场功能正在开发中，敬请期待。</p>
            </div>
          </div>
        </main>
      </div>
    <DialogFooter>
      <button
        class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        @click="handleDialogHide"
      >
        关闭
      </button>
    </DialogFooter>
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
          <label class="block text-sm font-medium mb-1 text-gray-700">插件ID</label>
          <input
            :value="selectedPlugin.config.pluginId"
            readonly
            class="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">版本</label>
          <input
            :value="selectedPlugin.config.version"
            readonly
            class="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">描述</label>
        <textarea
          :value="selectedPlugin.config.description"
          readonly
          rows="3"
          class="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm"
        ></textarea>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">作者</label>
          <input
            :value="selectedPlugin.config.author"
            readonly
            class="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">主页</label>
          <input
            :value="selectedPlugin.config.homepage || '无'"
            readonly
            class="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm"
          />
        </div>
      </div>
      <div v-if="selectedPlugin.config.dependencies && selectedPlugin.config.dependencies.length > 0">
        <label class="block text-sm font-medium mb-1 text-gray-700">依赖插件</label>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="dep in selectedPlugin.config.dependencies"
            :key="dep"
            class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
          >
            {{ dep }}
          </span>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">插件目录</label>
        <input
          :value="selectedPlugin.directory"
          readonly
          class="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm"
        />
      </div>
      <div v-if="selectedPlugin.error">
        <label class="block text-sm font-medium mb-1 text-gray-700">错误信息</label>
        <textarea
          :value="selectedPlugin.error"
          readonly
          rows="3"
          class="w-full px-3 py-2 border border-gray-200 rounded bg-red-50 text-sm text-red-600"
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
      <p class="text-gray-600">选择要添加插件的方式：</p>
      <button
        @click="selectPluginDirectory"
        class="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span class="material-icons text-2xl text-blue-500 mr-3">folder_open</span>
        <div class="text-left">
          <div class="font-medium">从文件夹添加</div>
          <div class="text-sm text-gray-500">选择包含插件的文件夹</div>
        </div>
      </button>
      <button
        @click="installPluginFromFile"
        class="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span class="material-icons text-2xl text-blue-500 mr-3">description</span>
        <div class="text-left">
          <div class="font-medium">从文件安装</div>
          <div class="text-sm text-gray-500">安装 ZIP 格式的插件包</div>
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
import type { PluginRuntime } from '../../../shared/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

// 方法
const handleDialogHide = (): void => {
  isVisible.value = false
}

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
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: '刷新成功',
        detail: '插件列表已更新',
        life: 3000
      })
    } else {
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

// 监听对话框打开，按需刷新插件列表
watch(isVisible, async (visible) => {
  if (visible && !isInitialized.value) {
    await nextTick()
    refreshPlugins()
    isInitialized.value = true
  }
})
</script>

<style scoped>
.plugins-content {
  min-height: 400px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
