<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="settings-dialog sm:max-w-[60vw] sm:max-h-[60vh] overflow-hidden grid-rows-[auto_1fr_auto]">
      <DialogHeader>
        <DialogTitle>设置</DialogTitle>
      </DialogHeader>
      <div class="min-h-[400px] h-full flex flex-col">
        <!-- 顶部图标导航 -->
        <nav class="border-b border-white/60 dark:border-border shrink-0">
          <div class="flex items-center justify-center gap-1 sm:gap-2 px-4 py-3 overflow-x-auto">
            <button
              v-for="section in settingSections"
              :key="section.id"
              type="button"
              class="group flex flex-col items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl cursor-pointer transition-colors duration-200 hover:bg-muted/50"
              :class="activeSection === section.id ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'"
              @click="activeSection = section.id"
            >
              <span class="material-icons text-[28px] leading-none transition-transform duration-200 group-hover:scale-125">{{ section.icon }}</span>
              <span
                class="h-4 leading-none text-xs font-medium whitespace-nowrap transition-opacity duration-200"
                :class="activeSection === section.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
              >{{ section.name }}</span>
            </button>
          </div>
        </nav>

        <!-- 动态组件渲染 -->
        <div class="flex-1 p-4 overflow-y-auto min-h-0">
          <component :is="currentComponent" />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// 导入组件
import GeneralPanel from '../../views/settings/GeneralPanel.vue'
import NotificationsPanel from '../../views/settings/NotificationsPanel.vue'
import ImportPanel from '../../views/settings/ImportPanel.vue'
import FloatingBallPanel from '../../views/settings/FloatingBallPanel.vue'
import PluginsPanel from '../../views/settings/pluginPlan.vue'
import NetworkPanel from '../../views/settings/NetworkPanel.vue'
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
    'floating-ball': FloatingBallPanel,
    plugins: PluginsPanel,
    network: NetworkPanel,
    data: DataPanel
  }
  return componentMap[activeSection.value] || GeneralPanel
})

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
