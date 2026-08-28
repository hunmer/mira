<template>
  <div class="p-4">
    <!-- 总开关行：点击整行折叠/展开子项 -->
    <div
      class="flex items-center justify-between py-2 cursor-pointer select-none"
      @click="open = !open"
    >
      <div class="flex items-start gap-1">
        <span
          class="material-icons text-muted-foreground mt-0.5 transition-transform duration-200"
          :class="open ? 'rotate-90' : ''"
        >chevron_right</span>
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.notificationsPanel.enableTitle') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.notificationsPanel.enableDesc') }}</p>
        </div>
      </div>
      <div @click.stop>
        <Switch
          :model-value="settingsStore.settings.enableNotifications"
          @update:model-value="handleSettingChange('enableNotifications', $event)"
        />
      </div>
    </div>

    <!-- 子开关：总开关关闭时全部禁用 -->
    <div v-show="open" class="space-y-4 pl-7">
      <div
        class="flex items-center justify-between py-2 transition-opacity"
        :class="notificationsEnabled ? '' : 'opacity-50'"
      >
        <div>
          <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.notificationsPanel.importTitle') }}</p>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.notificationsPanel.importDesc') }}</p>
        </div>
        <Switch
          :model-value="settingsStore.settings.enableImportNotifications"
          :disabled="!notificationsEnabled"
          @update:model-value="handleSettingChange('enableImportNotifications', $event)"
        />
      </div>

      <!-- 最大展示数量 -->
      <div class="pt-1 transition-opacity" :class="notificationsEnabled ? '' : 'opacity-50 pointer-events-none'">
        <div class="flex items-center justify-between gap-4 mb-2.5">
          <div>
            <p class="text-foreground dark:text-muted-foreground text-base font-normal leading-normal">{{ $t('views.notificationsPanel.maxVisibleTitle') }}</p>
            <p class="text-muted-foreground dark:text-muted-foreground text-sm">{{ $t('views.notificationsPanel.maxVisibleDesc') }}</p>
          </div>
          <span class="text-sm font-medium text-foreground shrink-0 w-6 text-right tabular-nums">{{ settingsStore.settings.maxVisibleNotifications }}</span>
        </div>
        <Slider
          :model-value="[settingsStore.settings.maxVisibleNotifications]"
          :min="1"
          :max="5"
          :step="1"
          :disabled="!notificationsEnabled"
          @update:model-value="(v: number[] | undefined) => v && handleSettingChange('maxVisibleNotifications', v[0])"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settings'
import { useToast } from '@/renderer/composables/useToast'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'

const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const open = ref(true)
const notificationsEnabled = computed(() => !!settingsStore.settings.enableNotifications)

// 方法
const handleSettingChange = async (key: string, value: any) => {
  try {
    // 先写入 store，再保存（避免保存时读到旧值）
    ;(settingsStore.settings as any)[key] = value
    // 自动保存设置
    await settingsStore.saveSettings()

    toast.add({
      severity: 'success',
      summary: t('views.common.settingSaved'),
      detail: t('views.common.settingUpdated', { key }),
      life: 2000
    })
  } catch (error) {
    console.error('Setting change error:', error, 'Value:', value)
    toast.add({
      severity: 'error',
      summary: t('views.common.saveFailed'),
      detail: error instanceof Error ? error.message : t('views.common.saveError'),
      life: 5000
    })
  }
}
</script>
