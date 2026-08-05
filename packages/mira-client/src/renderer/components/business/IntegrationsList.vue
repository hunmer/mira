<template>
  <div class="integrations-list h-full bg-background-light dark:bg-background-dark">
    <!-- 侧边栏 -->
    <div class="flex h-full">
      <aside class="w-64 bg-card-light dark:bg-card-dark p-6 border-r border-border-light dark:border-border-dark flex flex-col">
        <!-- 导航菜单 -->
        <nav class="space-y-2 flex-grow mb-6">
          <button
            @click="selectedCategory = 'all'"
            :class="[
              'flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline',
              selectedCategory === 'all'
                ? 'text-primary bg-primary/10'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-muted dark:hover:bg-muted'
            ]"
          >
            <i class="material-icons mr-3">all_inclusive</i> 全部集成
          </button>
          <button
            @click="selectedCategory = 'communication'"
            :class="[
              'flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline',
              selectedCategory === 'communication'
                ? 'text-primary bg-primary/10'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-muted dark:hover:bg-muted'
            ]"
          >
            <i class="material-icons mr-3">chat_bubble_outline</i> 通讯
          </button>
          <button
            @click="selectedCategory = 'documentation'"
            :class="[
              'flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline',
              selectedCategory === 'documentation'
                ? 'text-primary bg-primary/10'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-muted dark:hover:bg-muted'
            ]"
          >
            <i class="material-icons mr-3">description</i> 文档
          </button>
          <button
            @click="selectedCategory = 'productivity'"
            :class="[
              'flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline',
              selectedCategory === 'productivity'
                ? 'text-primary bg-primary/10'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-muted dark:hover:bg-muted'
            ]"
          >
            <i class="material-icons mr-3">trending_up</i> 效率工具
          </button>
          <button
            @click="selectedCategory = 'development'"
            :class="[
              'flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline',
              selectedCategory === 'development'
                ? 'text-primary bg-primary/10'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-muted dark:hover:bg-muted'
            ]"
          >
            <i class="material-icons mr-3">code</i> 开发工具
          </button>
        </nav>

        <!-- 插件类型切换 -->
        <div>
          <div class="bg-muted dark:bg-muted rounded-lg p-1 flex">
            <button
              @click="activeTab = 'local'"
              :class="[
                'flex-1 text-sm py-1 px-2 rounded-md',
                activeTab === 'local'
                  ? 'bg-white dark:bg-card-dark text-text-light-primary dark:text-text-dark-primary shadow'
                  : 'text-text-light-secondary dark:text-text-dark-secondary'
              ]"
            >
              本地插件
            </button>
            <button
              @click="activeTab = 'online'"
              :class="[
                'flex-1 text-sm py-1 px-2 rounded-md',
                activeTab === 'online'
                  ? 'bg-white dark:bg-card-dark text-text-light-primary dark:text-text-dark-primary shadow'
                  : 'text-text-light-secondary dark:text-text-dark-secondary'
              ]"
            >
              在线插件
            </button>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="flex-1 flex flex-col">
        <!-- 顶部 Header -->
        <header class="flex items-center justify-between px-8 py-4 border-b border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark">
          <!-- 左侧：返回按钮 -->
          <div class="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    @click="$router.go(-1)"
                    variant="ghost"
                    class="mr-4"
                  >
                    <i class="pi pi-arrow-left"></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">返回上一页</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <h1 class="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              {{ getCategoryTitle() }}
            </h1>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="flex items-center space-x-3">
            <!-- 刷新按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    @click="refreshPlugins"
                    :disabled="isRefreshing"
                    variant="outline"
                    class="w-10 h-10"
                  >
                    <i class="pi pi-refresh"></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">刷新插件列表</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <!-- 添加插件按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    @click="showAddPluginDialog = true"
                    class="w-10 h-10 rounded-full"
                  >
                    <i class="pi pi-plus"></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">添加新插件</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        <!-- 内容区域 -->
        <div class="flex-1 p-8">
          <!-- 页面头部信息 -->
          <div class="flex justify-between items-center mb-6">
            <div>
              <p class="text-text-light-secondary dark:text-text-dark-secondary">
                {{ getCategoryDescription() }}
              </p>
            </div>
            <div class="flex items-center space-x-4">
              <!-- 搜索框 -->
              <div class="relative">
                <i class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary">search</i>
                <Input
                  v-model="searchQuery"
                  placeholder="搜索集成..."
                  class="pl-10 pr-4 py-2 w-64 border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light-primary dark:text-text-dark-primary"
                />
              </div>
            </div>
          </div>

          <!-- 插件列表 -->
          <div v-if="activeTab === 'local'" class="grid grid-cols-1 md:grid-cols-2 lg gap-6 flex-grow auto-rows-max">
            <!-- 本地插件卡片 -->
            <IntegrationCard
              v-for="plugin in filteredLocalPlugins"
              :key="plugin.config.pluginId"
              :plugin="plugin"
              @toggle="handlePluginToggle"
              @show-details="showPluginDetails"
              @reload="reloadPlugin"
              @remove="removePlugin"
            />

            <!-- 空状态 -->
            <div v-if="filteredLocalPlugins.length === 0" class="col-span-full">
              <Card class="text-center py-12">
                <CardContent>
                  <div class="mb-6">
                    <i class="pi pi-box text-6xl text-muted-foreground"></i>
                  </div>
                  <h3 class="text-xl font-medium text-foreground  mb-3">
                    {{ searchQuery ? '没有找到匹配的插件' : '暂无插件' }}
                  </h3>
                  <p class="text-muted-foreground dark:text-muted-foreground mb-6 max-w-md mx-auto">
                    {{ searchQuery ? '请尝试调整搜索条件' : '开始使用本地插件来扩展应用功能' }}
                  </p>
                  <Button
                    v-if="!searchQuery"
                    @click="showAddPluginDialog = true"
                  >
                    添加插件
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <!-- 在线插件 (占位符) -->
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-grow auto-rows-max">
            <Card class="text-center py-12 col-span-full">
              <CardContent>
                <div class="mb-6">
                  <i class="pi pi-cloud text-6xl text-muted-foreground"></i>
                </div>
                <h3 class="text-xl font-medium text-foreground  mb-3">
                  在线插件功能开发中
                </h3>
                <p class="text-muted-foreground dark:text-muted-foreground mb-6 max-w-md mx-auto">
                  在线插件市场功能正在开发中，敬请期待。
                </p>
              </CardContent>
            </Card>
          </div>

          <!-- 分页 -->
          <div v-if="shouldShowPagination" class="mt-6 flex justify-end">
            <div class="flex items-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <button
                @click="currentPage--"
                :disabled="currentPage <= 1"
                class="p-2 rounded-md hover:bg-muted dark:hover:bg-muted disabled:opacity-50"
              >
                <i class="material-icons text-base">chevron_left</i>
              </button>
              <div class="flex items-center space-x-2 mx-2">
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="currentPage = page"
                  :class="[
                    'w-6 h-6 rounded-full text-xs font-bold',
                    page === currentPage
                      ? 'bg-primary text-white'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-muted dark:hover:bg-muted'
                  ]"
                >
                  {{ page }}
                </button>
              </div>
              <button
                @click="currentPage++"
                :disabled="currentPage >= totalPages"
                class="p-2 rounded-md hover:bg-muted dark:hover:bg-muted disabled:opacity-50"
              >
                <i class="material-icons text-base">chevron_right</i>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 插件详情抽屉 -->
    <Sheet
      :open="showDetailsDrawer"
      @update:open="showDetailsDrawer = $event"
    >
      <SheetContent side="right" class="w-full md:w-80 lg:w-[30rem] h-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>插件详情 - {{ selectedPlugin?.config.pluginName }}</SheetTitle>
        </SheetHeader>
      <div v-if="selectedPlugin" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">插件ID</label>
            <Input
              :value="selectedPlugin.config.pluginId"
              readonly
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">版本</label>
            <Input
              :value="selectedPlugin.config.version"
              readonly
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">描述</label>
          <Textarea
            :value="selectedPlugin.config.description"
            readonly
            rows="3"
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">作者</label>
            <Input
              :value="selectedPlugin.config.author"
              readonly
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">主页</label>
            <Input
              :value="selectedPlugin.config.homepage || '无'"
              readonly
              class="w-full"
            />
          </div>
        </div>

        <div v-if="selectedPlugin.config.dependencies && selectedPlugin.config.dependencies.length > 0">
          <label class="block text-sm font-medium mb-1">依赖插件</label>
          <div class="flex flex-wrap gap-1">
            <Badge
              v-for="dep in selectedPlugin.config.dependencies"
              :key="dep"
              variant="secondary"
              class="text-xs"
            >
              {{ dep }}
            </Badge>
          </div>
        </div>

        <div v-if="selectedPlugin.config.hotkey && Object.keys(selectedPlugin.config.hotkey).length > 0">
          <label class="block text-sm font-medium mb-1">快捷键</label>
          <div class="space-y-1">
            <div
              v-for="(action, key) in selectedPlugin.config.hotkey"
              :key="key"
              class="flex justify-between text-sm"
            >
              <code class="bg-muted dark:bg-muted px-2 py-1 rounded">{{ key }}</code>
              <span>{{ action }}</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">插件目录</label>
          <Input
            :value="selectedPlugin.directory"
            readonly
            class="w-full"
          />
        </div>

        <div v-if="selectedPlugin.error">
          <label class="block text-sm font-medium mb-1">错误信息</label>
          <Textarea
            :value="selectedPlugin.error"
            readonly
            rows="3"
            class="w-full"
          />
        </div>
      </div>
      </SheetContent>
    </Sheet>

    <!-- 添加插件对话框 -->
    <Dialog
      :open="showAddPluginDialog"
      @update:open="showAddPluginDialog = $event"
    >
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加新插件</DialogTitle>
        </DialogHeader>
      <div class="space-y-4">
        <p class="text-muted-foreground dark:text-muted-foreground">
          选择要添加插件的方式：
        </p>
        <div class="grid gap-3">
          <Card
            @click="selectPluginDirectory"
            class="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20"
          >
            <CardContent>
              <div class="flex items-center p-2">
                <i class="pi pi-folder-open text-2xl text-primary mr-4"></i>
                <div>
                  <h4 class="font-medium">从文件夹添加</h4>
                  <p class="text-sm text-muted-foreground">选择包含插件的文件夹</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            @click="installPluginFromFile"
            class="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20"
          >
            <CardContent>
              <div class="flex items-center p-2">
                <i class="pi pi-file-zip text-2xl text-primary mr-4"></i>
                <div>
                  <h4 class="font-medium">从文件安装</h4>
                  <p class="text-sm text-muted-foreground">安装 ZIP 格式的插件包</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/renderer/composables/useToast'
import { useConfirm } from '@/renderer/composables/useConfirm'
import { usePluginStore } from '../../stores/plugin'
import type { PluginRuntime } from '../../../shared/types'
import IntegrationCard from './IntegrationCard.vue'

// 组件导入
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'

// 组合式API
const toast = useToast()
const confirm = useConfirm()
const pluginStore = usePluginStore()

// 响应式状态
const activeTab = ref<'local' | 'online'>('local')
const selectedCategory = ref('all')
const searchQuery = ref('')
const isRefreshing = ref(false)
const showDetailsDrawer = ref(false)
const showAddPluginDialog = ref(false)
const selectedPlugin = ref<PluginRuntime | null>(null)
const currentPage = ref(1)
const itemsPerPage = 12

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

  // 分页
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return plugins.slice(start, end)
})

const totalPages = computed(() => {
  const totalPlugins = pluginStore.localPlugins?.length || 0
  return Math.ceil(totalPlugins / itemsPerPage)
})

const shouldShowPagination = computed(() => {
  return totalPages.value > 1
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
    pages.push(i)
  }

  return pages
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

const getCategoryDescription = () => {
  switch (selectedCategory.value) {
    case 'all': return '管理所有已安装的插件和集成'
    case 'communication': return '聊天、邮件和团队协作工具'
    case 'documentation': return '文档创建和管理工具'
    case 'productivity': return '提高工作效率的工具'
    case 'development': return '开发和编程相关工具'
    default: return '连接各种渠道以获得最佳性能'
  }
}

// 不再需要这些方法，已移动到IntegrationCard组件中

const handlePluginToggle = async (plugin: PluginRuntime, shouldEnable: boolean) => {
  try {
    if (shouldEnable) {
      await pluginStore.enableLocalPlugin(plugin.config.pluginId)
    } else {
      await pluginStore.disableLocalPlugin(plugin.config.pluginId)
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
  showDetailsDrawer.value = true
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
        await pluginStore.removeLocalPlugin(plugin.config.pluginId)

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

      // 刷新插件列表
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

// 生命周期
onMounted(() => {
  // 初始化时刷新插件列表
  refreshPlugins()
})
</script>

<style scoped>
/* 主题颜色变量 */
.integrations-list {
  --primary: #4361EE;
  --background-light: #F8F9FA;
  --background-dark: #121212;
  --card-light: #FFFFFF;
  --card-dark: #1E1E1E;
  --text-light-primary: #212529;
  --text-dark-primary: #E0E0E0;
  --text-light-secondary: #6C757D;
  --text-dark-secondary: #B0B0B0;
  --border-light: #DEE2E6;
  --border-dark: #333333;
}

/* 自定义CSS类 */
.bg-background-light {
  background-color: var(--background-light);
}

.dark .bg-background-dark {
  background-color: var(--background-dark);
}

.bg-card-light {
  background-color: var(--card-light);
}

.dark .bg-card-dark {
  background-color: var(--card-dark);
}

.text-text-light-primary {
  color: var(--text-light-primary);
}

.dark .text-text-dark-primary {
  color: var(--text-dark-primary);
}

.text-text-light-secondary {
  color: var(--text-light-secondary);
}

.dark .text-text-dark-secondary {
  color: var(--text-dark-secondary);
}

.border-border-light {
  border-color: var(--border-light);
}

.dark .border-border-dark {
  border-color: var(--border-dark);
}

.text-primary {
  color: var(--primary);
}

.bg-primary\/10 {
  background-color: rgba(67, 97, 238, 0.1);
}


/* 插件卡片 */
.plugin-card {
  transition: all 0.2s ease;
}

.plugin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 行限制 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Material Icons 字体已本地化 */

/* 响应式设计 */
@media (max-width: 768px) {
  .integrations-list .flex {
    flex-direction: column;
  }

  aside {
    width: 100%;
    min-height: auto;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>