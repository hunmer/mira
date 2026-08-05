<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="settings-dialog sm:max-w-[60vw] sm:max-h-[60vh] overflow-hidden grid-rows-[auto_1fr_auto]">
      <DialogHeader>
        <DialogTitle>设置</DialogTitle>
      </DialogHeader>
      <div class="min-h-[400px] h-full flex gap-3">
        <!-- 左侧分类面板 -->
        <aside class="w-64 flex flex-col">
          <div class="p-4 flex-1">
            <div class="flex flex-col gap-1">
              <div
                v-for="section in settingSections"
                :key="section.id"
                  class="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors"
                  :class="activeSection === section.id ? 'bg-primary/10 text-primary' : 'hover:bg-white/50 dark:hover:bg-muted/60 text-foreground dark:text-muted-foreground'"
                @click="activeSection = section.id"
              >
                <span class="material-icons text-lg">{{ section.icon }}</span>
                <p class="text-sm font-medium">{{ section.name }}</p>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右侧设置面板 -->
        <main class="flex-1 flex flex-col">
          <div class="p-4 border-b border-white/60 dark:border-border">
            <p class="text-foreground dark:text-muted-foreground text-2xl font-bold">{{ getCurrentSectionName() }}</p>
          </div>

          <!-- 动态组件渲染 -->
          <div class="flex-1 p-4 overflow-y-auto">
            <component :is="currentComponent" />
          </div>
        </main>
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
import DataPanel from '../../views/settings/DataPanel.vue'
import PlaygroundPanel from '../../views/settings/PlaygroundPanel.vue'

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
    data: DataPanel,
    playground: PlaygroundPanel
  }
  return componentMap[activeSection.value] || GeneralPanel
})

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
