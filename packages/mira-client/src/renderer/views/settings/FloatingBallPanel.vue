<template>
  <div class="p-4 space-y-6">
    <div>
      <!-- 启用悬浮球 -->
      <div class="flex items-center justify-between py-3">
      <div>
        <p class="text-sm font-medium text-foreground dark:text-muted-foreground">{{ $t('views.floatingBallPanel.enableTitle') }}</p>
        <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
          {{ $t('views.floatingBallPanel.enableDesc') }}
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
        <p class="text-sm font-medium text-foreground dark:text-muted-foreground">{{ $t('views.floatingBallPanel.clickActionTitle') }}</p>
        <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{{ $t('views.floatingBallPanel.clickActionDesc') }}</p>
      </div>
      <Select
        :model-value="settingsStore.settings.floatingBallClickAction"
        @update:model-value="(val: any) => handleSettingChange('floatingBallClickAction', val)"
      >
        <SelectTrigger class="w-64">
          <SelectValue :placeholder="$t('views.floatingBallPanel.selectAction')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openUpload">{{ $t('views.floatingBallPanel.openUpload') }}</SelectItem>
          <SelectItem value="toggleMain">{{ $t('views.floatingBallPanel.toggleMain') }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 位置 -->
    <div class="py-3 border-t border-border dark:border-border">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-foreground dark:text-muted-foreground">{{ $t('views.floatingBallPanel.position') }}</p>
          <p class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
            {{ $t('views.floatingBallPanel.positionDesc') }}<span v-if="position" class="font-mono">x: {{ position.x }}, y: {{ position.y }}</span><span v-else class="italic">{{ $t('views.floatingBallPanel.positionDefault') }}</span>
          </p>
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-border text-xs font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!settingsStore.settings.floatingBallEnabled || isResetting"
          @click="onResetPosition"
        >
          <span class="material-icons" style="font-size: 14px">restart_alt</span>
          {{ $t('views.floatingBallPanel.resetPosition') }}
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

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
    toast.add({ severity: 'success', summary: t('views.floatingBallPanel.resetDone'), detail: t('views.floatingBallPanel.resetDoneDetail'), life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: t('views.floatingBallPanel.resetFailed'), detail: String(e), life: 3000 })
  } finally {
    isResetting.value = false
  }
}

const handleSettingChange = async (key: string, _value: any) => {
  try {
    await settingsStore.saveSettings()
    toast.add({
      severity: 'success',
      summary: t('views.common.settingSaved'),
      detail: t('views.common.settingUpdated', { key }),
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('views.common.saveFailed'),
      detail: error instanceof Error ? error.message : t('views.common.saveError'),
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
