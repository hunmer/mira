<script setup lang="ts">
import { useSettings } from '@/ui/composables/useSettings';
import { useI18n } from 'vue-i18n';
import type { Locale } from '@/shared/types';
import Input from '@/ui/components/ui/Input.vue';
import Switch from '@/ui/components/ui/Switch.vue';
import { setDebug, refreshDebugFlag } from '@/shared/debug';
import { ref, onMounted } from 'vue';

const { t } = useI18n();
const { settings, update } = useSettings();

// 调试日志开关(独立于 ExtensionSettings,存 chrome.storage.local 的 mira_debug)
const debugOn = ref(false);
onMounted(async () => { debugOn.value = await refreshDebugFlag(); });
async function onToggleDebug(v: boolean) {
  debugOn.value = v;
  setDebug(v);
}
</script>

<template>
  <div class="view">
    <section>
      <h3>{{ t('settings.groupTarget') }}</h3>
      <label>{{ t('settings.defaultTags') }}</label>
      <Input
        :model-value="settings.tags.join(',')"
        @update:model-value="v => update({ tags: v.split(',').map(s => s.trim()).filter(Boolean) })"
      />
    </section>
    <section>
      <h3>{{ t('settings.groupUI') }}</h3>
      <div class="row">
        <span>{{ t('settings.uiMode') }}</span>
        <select :value="settings.uiMode" @change="e => update({ uiMode: (e.target as HTMLSelectElement).value as any })">
          <option value="popup">{{ t('settings.uiModePopup') }}</option>
          <option value="sidePanel">{{ t('settings.uiModeSidePanel') }}</option>
        </select>
      </div>
      <div class="row">
        <span>{{ t('settings.language') }}</span>
        <select :value="settings.locale" @change="e => update({ locale: (e.target as HTMLSelectElement).value as Locale })">
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </div>
      <div class="row"><span>{{ t('settings.dragPopover') }}</span><Switch :model-value="settings.dragPopoverEnabled" @update:model-value="v => update({ dragPopoverEnabled: v })" /></div>
      <div class="row"><span>{{ t('settings.dropZone') }}</span><Switch :model-value="settings.dropZoneEnabled" @update:model-value="v => update({ dropZoneEnabled: v })" /></div>
    </section>
    <section>
      <h3>{{ t('settings.groupCapture') }}</h3>
      <div class="row"><span>{{ t('settings.sniffer') }}</span><Switch :model-value="settings.snifferEnabled" @update:model-value="v => update({ snifferEnabled: v })" /></div>
      <div class="row"><span>{{ t('settings.autoScroll') }}</span><Switch :model-value="settings.autoScrollEnabled" @update:model-value="v => update({ autoScrollEnabled: v })" /></div>
      <div class="row">
        <span>{{ t('settings.autoScrollDelay') }}</span>
        <Input
          type="number" :model-value="String(settings.autoScrollDelay)"
          @update:model-value="v => update({ autoScrollDelay: Number(v) || 800 })"
        />
      </div>
      <div class="row" :title="t('settings.imuHint')">
        <span>{{ t('settings.imu') }}</span><Switch :model-value="settings.imuEnabled" @update:model-value="v => update({ imuEnabled: v })" />
      </div>
    </section>
    <section>
      <h3>{{ t('settings.groupDebug') }}</h3>
      <div class="row" :title="t('settings.debugHint')">
        <span>{{ t('settings.debugLog') }}</span><Switch :model-value="debugOn" @update:model-value="onToggleDebug" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.view { padding: 12px; }
section { margin-bottom: 16px; }
h3 { margin: 0 0 8px; font-size: 13px; color: var(--muted); text-transform: uppercase; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
label { font-size: 12px; color: var(--muted); display: block; margin: 6px 0 2px; }
select { background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; }
</style>
