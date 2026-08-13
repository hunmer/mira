<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="settings-dialog sm:max-w-[60vw] max-h-[88vh] h-[82vh] sm:h-[70vh] overflow-hidden grid-rows-[auto_1fr]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.settingsDialog.title') }}</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col min-h-0 overflow-hidden">
        <!-- 顶部图标导航 -->
        <nav class="border-b border-white/60 dark:border-border shrink-0">
          <div class="flex items-center justify-center gap-1 sm:gap-2 px-4 py-3 overflow-x-auto">
            <LayoutGroup id="settings-nav">
              <button
                v-for="section in settingSections"
                :key="section.id"
                type="button"
                class="group relative flex items-start justify-center h-14 pt-2.5 rounded-xl cursor-pointer transition-all duration-200"
                :class="[
                  activeSection === section.id
                    ? 'w-20 px-3 text-primary'
                    : 'w-16 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                ]"
                @click="activeSection = section.id"
                @mouseenter="hoveredSection = section.id"
                @mouseleave="hoveredSection = null"
              >
                <!-- 激活态背景：共享 layoutId，切换 tab 时由 motion-v 在按钮间平滑滑动 -->
                <Motion
                  v-if="activeSection === section.id"
                  layoutId="settings-active-tab"
                  :transition="{ type: 'spring', stiffness: 400, damping: 32 }"
                  class="absolute inset-0 z-0 rounded-xl bg-primary/10"
                />
                <span
                  class="relative z-[1] material-icons text-[28px] leading-none transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                  :class="activeSection === section.id ? 'scale-125' : 'group-hover:scale-125'"
                >{{ section.icon }}</span>
                <!-- 副标题：绝对定位，不占布局空间；激活或 hover 时淡入 -->
                <span
                  class="absolute top-[34px] left-1/2 -translate-x-1/2 z-[1] text-xs font-medium whitespace-nowrap pointer-events-none transition-opacity duration-200"
                  :class="activeSection === section.id || isHovered(section.id) ? 'opacity-100' : 'opacity-0'"
                >{{ t(section.name) }}</span>
              </button>
            </LayoutGroup>
          </div>
        </nav>

        <!-- 动态组件渲染 -->
        <div class="flex-1 p-4 overflow-y-auto min-h-0">
          <Transition name="panel-fade" mode="out-in">
            <component :is="currentComponent" :key="activeSection" />
          </Transition>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Motion, LayoutGroup } from 'motion-v'
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
const { t } = useI18n()

// Store
const settingsStore = useSettingsStore()

// 响应式状态
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const activeSection = ref('general')

// 当前 hover 的分类 id，用于控制副标题显隐
const hoveredSection = ref<string | null>(null)
const isHovered = (id: string) => hoveredSection.value === id

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
      console.error(t('business.settingsDialog.loadFailed'), error)
    }
  }
})
</script>

<style scoped>
/* 切换 tab 内容渐显动画 */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
