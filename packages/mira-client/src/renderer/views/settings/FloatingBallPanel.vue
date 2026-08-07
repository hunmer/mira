<template>
  <div class="p-4 space-y-6">
    <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">悬浮球</h3>

    <!-- 启用悬浮球 -->
    <div class="flex items-center justify-between py-3">
      <div>
        <p class="text-sm font-medium text-foreground dark:text-muted-foreground">启用悬浮球</p>
        <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
          开启后显示一个常驻悬浮球，支持拖拽移动、拖入文件快速上传，单击触发下方设定的动作
        </p>
      </div>
      <Switch
        :model-value="settingsStore.settings.floatingBallEnabled"
        @update:model-value="onToggleEnabled"
      />
    </div>

    <!-- 单击行为 -->
    <div class="flex flex-col gap-2 py-3">
      <div>
        <p class="text-sm font-medium text-foreground dark:text-muted-foreground">单击悬浮球时</p>
        <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">选择单击悬浮球触发的动作</p>
      </div>
      <Select
        :model-value="settingsStore.settings.floatingBallClickAction"
        @update:model-value="(val: any) => handleSettingChange('floatingBallClickAction', val)"
      >
        <SelectTrigger class="w-64">
          <SelectValue placeholder="选择动作" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openUpload">打开文件上传对话框</SelectItem>
          <SelectItem value="toggleMain">显示 / 隐藏主窗口</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 位置 -->
    <div class="py-3 border-t border-border dark:border-border">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-foreground dark:text-muted-foreground">位置</p>
          <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
            当前坐标：<span v-if="position" class="font-mono">x: {{ position.x }}, y: {{ position.y }}</span><span v-else class="italic">默认（右下角）</span>
          </p>
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-border text-xs font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!settingsStore.settings.floatingBallEnabled || isResetting"
          @click="onResetPosition"
        >
          <span class="material-icons" style="font-size: 14px">restart_alt</span>
          重置位置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const settingsStore = useSettingsStore()
const toast = useToast()

const position = ref<{ x: number; y: number } | null>(null)
const isResetting = ref(false)

async function refreshPosition() {
  try {
    if (!window.electronAPI?.floatingBall) return
    position.value = await window.electronAPI.floatingBall.getState()
  } catch {
    /* ignore */
  }
}

async function onToggleEnabled(val: boolean) {
  settingsStore.settings.floatingBallEnabled = val
  await handleSettingChange('floatingBallEnabled', val)
  // 立即生效：开启则显示，关闭则隐藏
  try {
    if (val) {
      await window.electronAPI?.floatingBall?.show()
      await refreshPosition()
    } else {
      await window.electronAPI?.floatingBall?.hide()
    }
  } catch (e) {
    console.error('切换悬浮球显示失败:', e)
  }
}

async function onResetPosition() {
  if (isResetting.value) return
  isResetting.value = true
  try {
    await window.electronAPI?.floatingBall?.setPosition(null)
    await refreshPosition()
    toast.add({ severity: 'success', summary: '已重置', detail: '悬浮球位置已重置到右下角', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: '重置失败', detail: String(e), life: 3000 })
  } finally {
    isResetting.value = false
  }
}

const handleSettingChange = async (key: string, _value: any) => {
  try {
    await settingsStore.saveSettings()
    toast.add({
      severity: 'success',
      summary: '设置已保存',
      detail: `${key} 设置已成功更新`,
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error instanceof Error ? error.message : '保存设置时发生错误',
      life: 5000
    })
  }
}

onMounted(() => {
  refreshPosition()
})

// 启用状态变化时刷新坐标显示
watch(() => settingsStore.settings.floatingBallEnabled, (enabled) => {
  if (enabled) refreshPosition()
})
</script>
