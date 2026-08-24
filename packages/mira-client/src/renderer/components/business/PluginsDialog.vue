<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="plugins-dialog sm:max-w-[90vw] max-h-[88vh] h-[85vh] sm:h-[80vh] overflow-hidden grid-rows-[auto_1fr]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.pluginsDialog.title') }}</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-3 min-h-0 overflow-hidden">
        <!-- 第一行：tab 切换 + 搜索框 + 操作按钮 -->
        <PluginToolbar />

        <!-- 第二行：类别横向滚动按钮栏 -->
        <PluginCategoryBar />

        <!-- 主内容区 + 右侧详情栏（移动端堆叠，桌面端左右两列） -->
        <div class="flex-1 flex flex-col gap-3 min-h-0 lg:flex-row">
          <main class="flex-1 flex flex-col min-w-0 min-h-0 border border-border dark:border-border rounded-lg overflow-hidden">
            <div class="flex-1 p-4 overflow-y-auto">
              <!-- 本地插件列表 -->
              <div v-if="activeTab === 'local'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <PluginCard
                  v-for="plugin in filteredLocalPlugins"
                  :key="plugin.config.pluginId"
                  kind="local"
                  :plugin="plugin"
                />
                <!-- 空状态 -->
                <div v-if="filteredLocalPlugins.length === 0" class="col-span-full text-center py-12">
                  <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">extension</span>
                  <p class="text-muted-foreground dark:text-muted-foreground mt-4">
                    {{ searchQuery ? $t('business.pluginsDialog.noMatch') : $t('business.pluginsDialog.noLocalPlugins') }}
                  </p>
                </div>
              </div>

              <!-- 服务器插件列表 -->
              <div v-else-if="activeTab === 'server'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <PluginCard
                  v-for="plugin in filteredServerPlugins"
                  :key="plugin.config.pluginId"
                  kind="server"
                  :plugin="plugin"
                />
                <div v-if="filteredServerPlugins.length === 0" class="col-span-full text-center py-12">
                  <span class="material-icons text-6xl text-muted-foreground dark:text-muted-foreground">dns</span>
                  <p class="text-muted-foreground dark:text-muted-foreground mt-4">
                    {{ searchQuery ? $t('business.pluginsDialog.noMatch') : $t('business.pluginsDialog.noServerPlugins') }}
                  </p>
                </div>
              </div>

              <!-- 在线插件市场 -->
              <PluginMarketGrid v-else-if="activeTab === 'online'" />
            </div>
          </main>

          <!-- 右侧详情栏 -->
          <PluginDetailPanel />
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
        <DialogTitle>{{ $t('business.pluginsDialog.addDialogTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="space-y-3">
        <p class="text-muted-foreground dark:text-muted-foreground">{{ $t('business.pluginsDialog.addDialogDesc') }}</p>
        <button
          @click="selectPluginDirectory(activeTab)"
          class="w-full flex items-center p-4 border border-border dark:border-border rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
        >
          <span class="material-icons text-2xl text-primary mr-3">folder_open</span>
          <div class="text-left">
            <div class="font-medium">{{ $t('business.pluginsDialog.addFromFolder') }}</div>
            <div class="text-sm text-muted-foreground dark:text-muted-foreground">{{ $t('business.pluginsDialog.addFromFolderDesc') }}</div>
          </div>
        </button>
        <button
          @click="installPluginFromFile"
          class="w-full flex items-center p-4 border border-border dark:border-border rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
        >
          <span class="material-icons text-2xl text-primary mr-3">description</span>
          <div class="text-left">
            <div class="font-medium">{{ $t('business.pluginsDialog.installFromFile') }}</div>
            <div class="text-sm text-muted-foreground dark:text-muted-foreground">{{ $t('business.pluginsDialog.installFromFileDesc') }}</div>
          </div>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, provide } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PluginToolbar from './PluginsDialog/PluginToolbar.vue'
import PluginCategoryBar from './PluginsDialog/PluginCategoryBar.vue'
import PluginMarketGrid from './PluginsDialog/PluginMarketGrid.vue'
import PluginDetailPanel from './PluginsDialog/PluginDetailPanel.vue'
import PluginCard from './PluginsDialog/PluginCard.vue'
import { usePluginTabs } from './PluginsDialog/composables/usePluginTabs'
import { usePluginSelection } from './PluginsDialog/composables/usePluginSelection'
import { usePluginActions } from './PluginsDialog/composables/usePluginActions'
import { PLUGINS_DIALOG_KEY, type PluginsDialogContext } from './PluginsDialog/context'

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

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 组装共享上下文：选中状态 → tabs(依赖 clearSelection) → actions → provide
const selection = usePluginSelection()
const tabs = usePluginTabs(selection.clearSelection)
const actions = usePluginActions()

// 解构供模板直接使用（顶层 ref 在模板中自动解包）
const { activeTab, filteredLocalPlugins, filteredServerPlugins, searchQuery } = tabs
const { showAddPluginDialog, selectPluginDirectory, installPluginFromFile, refreshPlugins } = actions

// 合并为共享上下文 provide 给子组件。
// 普通对象即可：它持有的 ref/computed 引用本身是响应式的，子组件通过 ctx.xxx.value 访问。
const ctx: PluginsDialogContext = {
  ...tabs,
  ...selection,
  ...actions
}
provide(PLUGINS_DIALOG_KEY, ctx)

// 按需初始化标志
const isInitialized = ref(false)

// 监听对话框打开，按需刷新插件列表；关闭时清空选中
watch(isVisible, async (visible) => {
  if (!visible) {
    selection.clearSelection()
    return
  }
  if (!isInitialized.value) {
    await nextTick()
    refreshPlugins(tabs.activeTab.value)
    isInitialized.value = true
  }
})
</script>
