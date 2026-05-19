<template>
  <div class="settings h-full flex flex-col bg-slate-50">
    <!-- 顶部标题栏 -->
    <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-slate-200 px-10 py-3 bg-white">
      <div class="flex items-center gap-4 text-slate-900">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                class="flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-slate-900 hover:bg-slate-100 transition-colors"
                @click="goBack"
              >
                <span class="material-icons text-lg">arrow_back</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">返回</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span class="material-icons text-lg">settings</span>
        <h2 class="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em]">Settings</h2>
      </div>
      <div class="flex gap-3">
        <button
          class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          @click="importSettings"
        >
          <span class="material-icons text-sm">upload</span>
          导入设置
        </button>
        <button
          class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          @click="exportSettings"
        >
          <span class="material-icons text-sm">download</span>
          导出设置
        </button>
      </div>
    </header>

    <!-- 主内容区域 -->
    <div class="gap-1 px-6 flex flex-1 justify-center py-5">
      <!-- 左侧分类面板 -->
      <div class="layout-content-container flex flex-col w-80">
        <div class="flex h-full min-h-[700px] flex-col justify-between bg-slate-50 p-4">
          <div class="flex flex-col gap-4">
            <h1 class="text-slate-900 text-base font-medium leading-normal">Settings</h1>
            <div class="flex flex-col gap-2">
              <div 
                v-for="section in settingSections" 
                :key="section.id"
                class="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-full transition-colors"
                :class="activeSection === section.id ? 'bg-slate-200' : 'hover:bg-slate-100'"
                @click="activeSection = section.id"
              >
                <div class="text-slate-900">
                  <span class="material-icons text-lg">{{ section.icon }}</span>
                </div>
                <p class="text-slate-900 text-sm font-medium leading-normal">{{ section.name }}</p>
              </div>
            </div>
          </div>
          
          <!-- 底部反馈按钮 -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-full transition-colors" @click="openFeedback">
              <div class="text-slate-900">
                <span class="material-icons text-lg">campaign</span>
              </div>
              <p class="text-slate-900 text-sm font-medium leading-normal">Feedback</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧设置面板 -->
      <div class="layout-content-container flex flex-col max-w-[960px] flex-1">
        <div class="flex flex-wrap justify-between gap-3 p-4">
          <p class="text-slate-900 tracking-light text-[32px] font-bold leading-tight min-w-72">{{ getCurrentSectionName() }}</p>
        </div>

        <!-- 动态组件渲染 -->
        <component :is="currentComponent" />
      </div>
    </div>

    <!-- 导入/导出对话框 -->
    <SettingsImportExportDialog ref="importExportDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useToast } from '@/renderer/composables/useToast'

// 导入组件
import OverviewPanel from './settings/OverviewPanel.vue'
import GeneralPanel from './settings/GeneralPanel.vue'
import UsersPanel from './settings/UsersPanel.vue'
import NotificationsPanel from './settings/NotificationsPanel.vue'
import PluginsPanel from './settings/pluginPlan.vue'
import SettingsImportExportDialog from './settings/SettingsImportExportDialog.vue'

// 导入配置
import { settingSections } from './settings/settingsConfig'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Store 和工具
const router = useRouter()
const settingsStore = useSettingsStore()
const toast = useToast()

// 响应式状态
const activeSection = ref('overview')

// 组件引用
const importExportDialog = ref<InstanceType<typeof SettingsImportExportDialog>>()

// 计算属性
const currentComponent = computed(() => {
  const componentMap: Record<string, any> = {
    overview: OverviewPanel,
    general: GeneralPanel,
    users: UsersPanel,
    notifications: NotificationsPanel,
    plugins: PluginsPanel
  }
  return componentMap[activeSection.value] || OverviewPanel
})

// 方法
const getCurrentSectionName = () => {
  const section = settingSections.find(s => s.id === activeSection.value)
  return section?.name || 'Settings'
}

const goBack = () => {
  router.go(-1) // 返回上一页
}

const importSettings = () => {
  importExportDialog.value?.openImportDialog()
}

const exportSettings = () => {
  importExportDialog.value?.exportSettings()
}

const openFeedback = () => {
  // 打开反馈页面或对话框
  toast.add({
    severity: 'info',
    summary: '反馈功能',
    detail: '反馈功能即将推出',
    life: 3000
  })
}

// 生命周期
onMounted(async () => {
  // 初始化设置
  await settingsStore.loadSettings()

  // 自动连接功能已移至serverList store
  // 可以通过serverList store管理服务器连接
})
</script>
