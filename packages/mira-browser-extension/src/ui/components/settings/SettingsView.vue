<script setup lang="ts">
import { useSettings } from '@/ui/composables/useSettings';
import { useI18n } from 'vue-i18n';
import type { Locale } from '@/shared/types';
import Input from '@/ui/components/ui/Input.vue';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import { setDebug, refreshDebugFlag } from '@/shared/debug';
import { DEFAULT_IMAGE_URL_RULES } from '@/shared/types';
import { useDialog } from '@/ui/composables/useDialog';
import { ref, onMounted } from 'vue';

const { t } = useI18n();
const { settings, update } = useSettings();
const dialog = useDialog();

// 调试日志开关(独立于 ExtensionSettings,存 chrome.storage.local 的 mira_debug)
const debugOn = ref(false);
onMounted(async () => { debugOn.value = await refreshDebugFlag(); });
async function onToggleDebug(v: boolean) {
  debugOn.value = v;
  setDebug(v);
}

async function editImuRules() {
  const raw = await dialog.textarea({
    title: t('settings.imuRulesEdit'),
    message: t('settings.imuRulesEditorHint'),
    defaultValue: JSON.stringify(settings.value.imuRules, null, 2),
    okText: t('common.done'),
  });
  if (raw == null) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('invalid rule shape');
    for (const rule of parsed) {
      if (!rule || typeof rule !== 'object'
        || typeof (rule as any).name !== 'string'
        || typeof (rule as any).host !== 'string'
        || typeof (rule as any).path !== 'string'
        || typeof (rule as any).replacement !== 'string') throw new Error('invalid rule shape');
      new RegExp((rule as any).host);
      new RegExp((rule as any).path);
    }
    await update({ imuRules: parsed as any });
    await dialog.alert({ message: t('settings.imuRulesSaved') });
  } catch {
    await dialog.alert({ title: t('common.failed'), message: t('settings.imuRulesInvalid'), danger: true });
  }
}

async function resetImuRules() {
  if (!(await dialog.confirm({ message: t('settings.imuRulesReset') }))) return;
  await update({ imuRules: DEFAULT_IMAGE_URL_RULES });
}
</script>

<template>
  <div class="view">
    <section>
      <h3>{{ t('settings.groupTarget') }}</h3>
      <label>{{ t('settings.defaultTags') }}</label>
      <Input
        :model-value="(settings.tags ?? []).join(',')"
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
      <div class="row" :title="t('settings.imuHint')">
        <span>{{ t('settings.imu') }}</span><Switch :model-value="settings.imuEnabled" @update:model-value="v => update({ imuEnabled: v })" />
      </div>
      <div class="row rule-row">
        <span>{{ t('settings.imuRules') }}</span>
        <span class="rule-actions">
          <Button size="sm" variant="outline" @click="editImuRules">{{ t('settings.imuRulesEdit') }}</Button>
          <Button size="sm" variant="ghost" @click="resetImuRules">{{ t('settings.imuRulesReset') }}</Button>
        </span>
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
.rule-row { align-items: flex-start; gap: 8px; }
.rule-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
label { font-size: 12px; color: var(--muted); display: block; margin: 6px 0 2px; }
select { background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; }
</style>
