<script setup lang="ts">
import { useSettings } from '@/ui/composables/useSettings';
import { useI18n } from 'vue-i18n';
import type { Locale, Theme } from '@/shared/types';
import Input from '@/ui/components/ui/Input.vue';
import Switch from '@/ui/components/ui/Switch.vue';
import Button from '@/ui/components/ui/Button.vue';
import {
  DEFAULT_DEBUG_CATEGORIES,
  refreshDebugSettings,
  setDebug,
  setDebugCategory,
  type DebugCategories,
  type DebugCategory,
} from '@/shared/debug';
import { DEFAULT_IMAGE_URL_RULES } from '@/shared/types';
import { useDialog } from '@/ui/composables/useDialog';
import { ref, onMounted } from 'vue';

const { t } = useI18n();
const { settings, update } = useSettings();
const dialog = useDialog();

// 调试日志开关(独立于 ExtensionSettings,存 chrome.storage.local 的 mira_debug)
const debugOn = ref(false);
const debugCategories = ref<DebugCategories>({ ...DEFAULT_DEBUG_CATEGORIES });
const debugCategoryKeys = Object.keys(DEFAULT_DEBUG_CATEGORIES) as DebugCategory[];
onMounted(async () => {
  const debug = await refreshDebugSettings();
  debugOn.value = debug.enabled;
  debugCategories.value = debug.categories;
});
async function onToggleDebug(v: boolean) {
  debugOn.value = v;
  setDebug(v);
}
function onToggleDebugCategory(category: DebugCategory, enabled: boolean) {
  debugCategories.value = { ...debugCategories.value, [category]: enabled };
  setDebugCategory(category, enabled);
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

/** textarea 文本 → host 列表(每行一个,去空白行) */
function parseHosts(raw: string): string[] {
  return raw.split('\n').map(s => s.trim()).filter(Boolean);
}

/** 把当前活动标签页的 host 追加到拖拽快传启用站点列表 */
async function addCurrentHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  try { host = tab?.url ? new URL(tab.url).host : ''; } catch { host = ''; }
  if (!host) {
    await dialog.alert({ message: t('settings.addCurrentSiteUnsupported') });
    return;
  }
  const hosts = [...(settings.value.dragPopoverHosts ?? [])];
  if (hosts.some(h => h.trim().toLowerCase() === host.toLowerCase())) {
    await dialog.alert({ message: t('settings.addCurrentSiteDuplicate') });
    return;
  }
  hosts.push(host);
  await update({ dragPopoverHosts: hosts });
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
        <span>{{ t('settings.theme') }}</span>
        <select :value="settings.theme" @change="e => update({ theme: (e.target as HTMLSelectElement).value as Theme })">
          <option value="auto">{{ t('header.themeAuto') }}</option>
          <option value="light">{{ t('header.themeLight') }}</option>
          <option value="dark">{{ t('header.themeDark') }}</option>
        </select>
      </div>
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
      <div v-if="settings.dragPopoverEnabled" class="hosts-editor">
        <label :title="t('settings.dragPopoverHostsHint')">{{ t('settings.dragPopoverHosts') }}</label>
        <textarea
          class="hosts-textarea"
          rows="3"
          spellcheck="false"
          placeholder="www.example.com"
          :value="(settings.dragPopoverHosts ?? []).join('\n')"
          @change="e => update({ dragPopoverHosts: parseHosts((e.target as HTMLTextAreaElement).value) })"
        />
        <Button size="sm" variant="outline" @click="addCurrentHost">{{ t('settings.addCurrentSite') }}</Button>
      </div>
      <div class="row" :title="t('settings.imageHoverButtonHint')">
        <span>{{ t('settings.imageHoverButton') }}</span><Switch :model-value="settings.imageHoverButtonEnabled" @update:model-value="v => update({ imageHoverButtonEnabled: v })" />
      </div>
      <div class="row"><span>{{ t('settings.dropZone') }}</span><Switch :model-value="settings.dropZoneEnabled" @update:model-value="v => update({ dropZoneEnabled: v })" /></div>
    </section>
    <section>
      <h3>{{ t('settings.groupCapture') }}</h3>
      <div class="row"><span>{{ t('settings.sniffer') }}</span><Switch :model-value="settings.snifferEnabled" @update:model-value="v => update({ snifferEnabled: v })" /></div>
      <div class="row" :title="t('settings.batchImportConcurrencyHint')">
        <span>{{ t('settings.batchImportConcurrency') }}</span>
        <Input
          class="number-input"
          type="number"
          min="1"
          max="10"
          step="1"
          :model-value="String(settings.batchImportConcurrency)"
          @update:model-value="v => update({ batchImportConcurrency: Math.min(10, Math.max(1, Math.floor(Number(v) || 3))) })"
        />
      </div>
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
      <div class="debug-categories" :class="{ disabled: !debugOn }">
        <div v-for="category in debugCategoryKeys" :key="category" class="row debug-category-row">
          <span>{{ t(`settings.debugCategory.${category}`) }}</span>
          <Switch
            :model-value="debugCategories[category]"
            :disabled="!debugOn"
            @update:model-value="v => onToggleDebugCategory(category, v)"
          />
        </div>
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
.number-input { width: 72px; }
.debug-categories { padding-left: 10px; border-left: 2px solid var(--border); }
.hosts-editor { display: flex; flex-direction: column; gap: 4px; padding: 2px 0 6px; }
.hosts-editor label { margin: 0; }
.hosts-textarea {
  background: var(--bg); color: var(--fg);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 4px 6px; font: inherit; font-size: 12px;
  resize: vertical; min-height: 56px;
}
.hosts-editor button { align-self: flex-start; }
.debug-categories.disabled { opacity: .5; }
.debug-category-row { font-size: 12px; }
</style>
