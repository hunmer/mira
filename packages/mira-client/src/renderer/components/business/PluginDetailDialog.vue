
<template>
  <Dialog
    :open="dialogVisible"
    @update:open="dialogVisible = $event"
  >
    <DialogContent class="plugin-detail-dialog sm:max-w-[1200px] w-[95vw] max-h-[90vh]">
      <DialogHeader>
        <DialogTitle></DialogTitle>
      </DialogHeader>
    <div v-if="plugin" class="plugin-detail-content bg-white text-foreground overflow-hidden">
      <!-- 头部关闭按钮 -->
      <header class="flex justify-end mb-6 p-4">
        <button 
          @click="closeDialog"
          class="text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          <span class="material-icons">close</span>
        </button>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-12 px-8 pb-8">
        <!-- 主内容区域 -->
        <main class="md:col-span-2">
          <!-- 插件头部信息 -->
          <div class="flex items-start mb-6">
            <div class="relative mr-4">
              <img
                v-if="plugin.image"
                :alt="plugin.name"
                class="rounded-lg shadow-lg w-24 h-24 object-cover"
                :src="plugin.image"
              />
              <div
                v-else
                class="w-24 h-24 bg-gradient-to-br from-primary to-primary rounded-lg shadow-lg flex items-center justify-center"
              >
                <span class="material-icons text-3xl text-primary">extension</span>
              </div>
              <!-- 安装状态标识 -->
              <div v-if="plugin.installed" class="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-md">
                <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span class="material-icons text-white text-sm">check</span>
                </div>
              </div>
            </div>
            <div>
              <h1 class="text-3xl font-bold">{{ plugin.name }}</h1>
              <p class="text-muted-foreground mt-1">{{ plugin.description }}</p>
            </div>
          </div>

          <!-- 标签栏 -->
          <div class="flex border-b border-border mb-6">
            <button 
              v-for="tab in tabs"
              :key="tab.value"
              @click="activeTab = tab.value"
              class="py-2 px-4 font-semibold transition-colors"
              :class="activeTab === tab.value 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground'"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 标签内容 -->
          <div class="space-y-4 text-muted-foreground">
            <!-- 插件介绍 -->
            <div v-if="activeTab === 'overview'">
              <p>{{ plugin.longDescription || plugin.description }}</p>
              
              <!-- 功能特性 -->
              <div v-if="plugin.features && plugin.features.length" class="mt-6">
                <h3 class="text-lg font-semibold text-foreground mb-3">主要功能</h3>
                <ul class="space-y-2">
                  <li v-for="feature in plugin.features" :key="feature" class="flex items-start">
                    <span class="material-icons text-green-500 mr-2 mt-0.5 text-sm">check_circle</span>
                    {{ feature }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- 版本记录 -->
            <div v-if="activeTab === 'changelog'">
              <div v-if="plugin.changelog && plugin.changelog.length" class="space-y-4">
                <div v-for="change in plugin.changelog" :key="change.version" class="border-l-4 border-primary pl-4">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-semibold text-foreground">版本 {{ change.version }}</h4>
                    <span class="text-sm text-muted-foreground">{{ formatDate(change.date) }}</span>
                  </div>
                  <p class="text-muted-foreground">{{ change.description }}</p>
                </div>
              </div>
              <div v-else class="text-center py-8 text-muted-foreground">
                暂无版本记录
              </div>
            </div>
          </div>

          <!-- 截图展示 -->
          <div v-if="plugin.screenshots && plugin.screenshots.length" class="mt-8">
            <div class="relative">
              <img
                :alt="`${plugin.name} 截图 ${currentScreenshot + 1}`"
                class="rounded-lg shadow-lg mx-auto w-full max-h-96 object-contain"
                :src="plugin.screenshots[currentScreenshot]"
              />
              <div v-if="plugin.screenshots.length > 1" class="absolute inset-0 flex items-center justify-between px-4">
                <button 
                  @click="prevScreenshot"
                  class="bg-white/50 hover:bg-white/75 text-foreground rounded-full p-2 transition-colors"
                >
                  <span class="material-icons">chevron_left</span>
                </button>
                <button 
                  @click="nextScreenshot"
                  class="bg-white/50 hover:bg-white/75 text-foreground rounded-full p-2 transition-colors"
                >
                  <span class="material-icons">chevron_right</span>
                </button>
              </div>
            </div>
            <div v-if="plugin.screenshots.length > 1" class="flex justify-center items-center space-x-2 mt-4">
              <span 
                v-for="(_, index) in plugin.screenshots"
                :key="index"
                @click="currentScreenshot = index"
                class="h-2 w-2 rounded-full cursor-pointer transition-colors"
                :class="currentScreenshot === index ? 'bg-primary' : 'bg-accent'"
              ></span>
            </div>
          </div>
        </main>

        <!-- 侧边栏 -->
        <aside class="md:col-span-1">
          <div class="sticky top-8">
            <!-- 操作按钮 -->
            <div class="bg-muted rounded-lg p-6">
              <button
                v-if="!plugin.installed"
                @click="handleInstall"
                :disabled="isInstalling"
                class="bg-primary hover:bg-primary disabled:bg-primary text-white font-bold py-3 px-6 rounded-lg w-full flex items-center justify-center text-lg mb-4 transition-colors"
              >
                <span v-if="isInstalling" class="material-icons mr-2 animate-spin">refresh</span>
                <span v-else class="material-icons mr-2">download</span>
                {{ isInstalling ? '安装中...' : '安装' }}
              </button>
              
              <button
                v-else
                @click="handleUninstall"
                :disabled="isUninstalling"
                class="bg-destructive hover:bg-destructive disabled:bg-destructive text-white font-bold py-3 px-6 rounded-lg w-full flex items-center justify-center text-lg mb-4 transition-colors"
              >
                <span v-if="isUninstalling" class="material-icons mr-2 animate-spin">refresh</span>
                <span v-else class="material-icons mr-2">delete</span>
                {{ isUninstalling ? '卸载中...' : '卸载' }}
              </button>

              <button
                v-if="plugin.homepage"
                @click="openHomepage"
                class="bg-white hover:bg-muted text-foreground font-bold py-3 px-6 rounded-lg w-full flex items-center justify-center text-lg border border-border mb-6 transition-colors"
              >
                <span class="material-icons mr-2">home</span>
                查看主页
              </button>

              <!-- 插件信息 -->
              <div class="space-y-4 text-sm text-muted-foreground">
                <div class="flex items-center">
                  <span class="material-icons text-base mr-3 w-5 text-center">person</span>
                  <span>由 <strong>{{ plugin.author || '未知开发者' }}</strong> 开发</span>
                </div>
                <div class="flex items-center">
                  <span class="material-icons text-base mr-3 w-5 text-center">info</span>
                  <span>版本 {{ plugin.version }}</span>
                </div>
                <div v-if="plugin.fileSize" class="flex items-center">
                  <span class="material-icons text-base mr-3 w-5 text-center">storage</span>
                  <span>{{ formatFileSize(plugin.fileSize) }}</span>
                </div>
              </div>

              <!-- 标签分类 -->
              <div v-if="plugin.tags && plugin.tags.length" class="mt-6 pt-6 border-t border-border">
                <h3 class="font-semibold text-foreground mb-3">类别</h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in plugin.tags"
                    :key="tag"
                    class="bg-accent text-foreground text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- 统计信息 -->
              <div class="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="font-bold text-lg text-foreground">{{ plugin.rating || 'N/A' }}</div>
                  <div class="text-sm text-muted-foreground">
                    <div v-if="plugin.rating" class="flex justify-center text-amber-500">
                      <span v-for="i in 5" :key="i" class="material-icons text-sm">
                        {{ i <= Math.floor(plugin.rating) ? 'star' : 
                           i - 0.5 <= plugin.rating ? 'star_half' : 'star_border' }}
                      </span>
                    </div>
                    <div>{{ formatNumber(plugin.reviews) || 0 }} 评价</div>
                  </div>
                </div>
                <div>
                  <div class="font-bold text-lg text-foreground">{{ formatNumber(plugin.downloads) || 'N/A' }}</div>
                  <div class="text-sm text-muted-foreground">下载</div>
                </div>
                <div>
                  <div class="font-bold text-lg text-foreground">{{ formatNumber(plugin.users) || 'N/A' }}</div>
                  <div class="text-sm text-muted-foreground">用户</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from '@/renderer/composables/useToast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Props
interface Plugin {
  id: string
  name: string
  description?: string
  longDescription?: string
  version: string
  author?: string
  image?: string
  rating?: number
  reviews?: number
  downloads?: number
  users?: number
  installed?: boolean
  enabled?: boolean
  isInstalling?: boolean
  isUninstalling?: boolean
  fileSize?: number
  installedAt?: string
  tags?: string[]
  features?: string[]
  requirements?: string
  changelog?: Array<{
    version: string
    date: string
    description: string
  }>
  screenshots?: string[]
  homepage?: string
}

const props = defineProps<{
  visible: boolean
  plugin: Plugin | null
}>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  install: [plugin: Plugin]
  uninstall: [plugin: Plugin]
}>()

// 组合式 API
const toast = useToast()

// 响应式状态
const isInstalling = ref(false)
const isUninstalling = ref(false)
const activeTab = ref('overview')
const currentScreenshot = ref(0)

// 标签页配置
const tabs = [
  { label: '插件介绍', value: 'overview' },
  { label: '版本记录', value: 'changelog' }
]

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Methods
const closeDialog = () => {
  dialogVisible.value = false
}

const handleInstall = async () => {
  if (!props.plugin || isInstalling.value) return
  
  isInstalling.value = true
  try {
    emit('install', props.plugin)
    toast.add({
      severity: 'success',
      summary: '安装成功',
      detail: `插件 "${props.plugin.name}" 已成功安装`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '安装失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  } finally {
    isInstalling.value = false
  }
}

const handleUninstall = async () => {
  if (!props.plugin || isUninstalling.value) return
  
  isUninstalling.value = true
  try {
    emit('uninstall', props.plugin)
    toast.add({
      severity: 'success',
      summary: '卸载成功',
      detail: `插件 "${props.plugin.name}" 已成功卸载`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '卸载失败',
      detail: error instanceof Error ? error.message : '未知错误',
      life: 5000
    })
  } finally {
    isUninstalling.value = false
  }
}

const openHomepage = () => {
  if (props.plugin?.homepage) {
    window.open(props.plugin.homepage, '_blank')
  }
}

const prevScreenshot = () => {
  if (!props.plugin?.screenshots) return
  currentScreenshot.value = currentScreenshot.value > 0 
    ? currentScreenshot.value - 1 
    : props.plugin.screenshots.length - 1
}

const nextScreenshot = () => {
  if (!props.plugin?.screenshots) return
  currentScreenshot.value = currentScreenshot.value < props.plugin.screenshots.length - 1 
    ? currentScreenshot.value + 1 
    : 0
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatNumber = (num: number | undefined): string => {
  if (!num) return '0'
  if (num >= 1000000) return Math.floor(num / 100000) / 10 + 'M'
  if (num >= 1000) return Math.floor(num / 100) / 10 + 'k'
  return num.toString()
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

// 监听插件变化，重置状态
watch(() => props.plugin, () => {
  activeTab.value = 'overview'
  currentScreenshot.value = 0
})
</script>

<style scoped>
.plugin-detail-dialog :deep([data-radix-dialog-content]) {
  padding: 0;
  overflow: hidden;
}

.plugin-detail-dialog :deep([data-radix-dialog-overlay]) {
  background-color: rgba(0, 0, 0, 0.4);
}
</style>
