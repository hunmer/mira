<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="settings-dialog sm:max-w-[60vw] sm:max-h-[60vh] overflow-hidden grid-rows-[auto_1fr_auto]">
      <DialogHeader>
        <DialogTitle>设置</DialogTitle>
      </DialogHeader>
      <div class="min-h-[400px] h-full flex bg-gray-50 dark:bg-gray-900">
        <!-- 左侧分类面板 -->
        <aside class="w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          <div class="p-4 flex-1">
            <div class="flex flex-col gap-1">
              <div
                v-for="section in settingSections"
                :key="section.id"
                class="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors"
                :class="activeSection === section.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'"
                @click="activeSection = section.id"
              >
                <span class="material-icons text-lg">{{ section.icon }}</span>
                <p class="text-sm font-medium">{{ section.name }}</p>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右侧设置面板 -->
        <main class="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ml-2">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <p class="text-gray-900 dark:text-gray-100 text-2xl font-bold">{{ getCurrentSectionName() }}</p>
          </div>

          <!-- 动态组件渲染 -->
          <div class="flex-1 p-4 overflow-y-auto">
            <component :is="currentComponent" />
          </div>
        </main>
      </div>
    <DialogFooter>
      <div class="flex justify-end w-full">
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
          @click="handleDialogHide"
        >
          关闭
        </button>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// 导入组件
import GeneralPanel from '../../views/settings/GeneralPanel.vue'
import NotificationsPanel from '../../views/settings/NotificationsPanel.vue'
import ImportPanel from '../../views/settings/ImportPanel.vue'
import PluginsPanel from '../../views/settings/pluginPlan.vue'
import DataPanel from '../../views/settings/DataPanel.vue'

// 导入配置
import { settingSections } from '../../views/settings/settingsConfig'

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

// Store
const settingsStore = useSettingsStore()

// 响应式状态
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const activeSection = ref('general')

// 计算属性
const currentComponent = computed(() => {
  const componentMap: Record<string, any> = {
    general: GeneralPanel,
    notifications: NotificationsPanel,
    import: ImportPanel,
    plugins: PluginsPanel,
    data: DataPanel
  }
  return componentMap[activeSection.value] || GeneralPanel
})

// 方法
const handleDialogHide = (): void => {
  isVisible.value = false
}

const getCurrentSectionName = () => {
  const section = settingSections.find(s => s.id === activeSection.value)
  return section?.name || '设置'
}

// 按需初始化标志
const isInitialized = ref(false)

// 监听对话框打开，按需加载设置
watch(isVisible, async (visible) => {
  if (visible && !isInitialized.value) {
    await nextTick()
    try {
      await settingsStore.loadSettings()
      isInitialized.value = true
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
})
</script>
