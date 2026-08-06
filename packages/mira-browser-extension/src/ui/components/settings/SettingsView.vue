<script setup lang="ts">
import { useSettings } from '@/ui/composables/useSettings';
import Input from '@/ui/components/ui/Input.vue';
import Switch from '@/ui/components/ui/Switch.vue';

const { settings, update } = useSettings();
</script>

<template>
  <div class="view">
    <section>
      <h3>目标</h3>
      <label>默认标签(逗号分隔)</label>
      <Input
        :model-value="settings.tags.join(',')"
        @update:model-value="v => update({ tags: v.split(',').map(s => s.trim()).filter(Boolean) })"
      />
    </section>
    <section>
      <h3>界面</h3>
      <div class="row">
        <span>UI 模式</span>
        <select :value="settings.uiMode" @change="e => update({ uiMode: (e.target as HTMLSelectElement).value as any })">
          <option value="popup">Popup</option>
          <option value="sidePanel">侧边栏</option>
        </select>
      </div>
      <div class="row"><span>拖拽快传按钮</span><Switch :model-value="settings.dragPopoverEnabled" @update:model-value="v => update({ dragPopoverEnabled: v })" /></div>
      <div class="row"><span>面板拖放区</span><Switch :model-value="settings.dropZoneEnabled" @update:model-value="v => update({ dropZoneEnabled: v })" /></div>
    </section>
    <section>
      <h3>采集</h3>
      <div class="row"><span>资源嗅探</span><Switch :model-value="settings.snifferEnabled" @update:model-value="v => update({ snifferEnabled: v })" /></div>
      <div class="row"><span>自动滚动</span><Switch :model-value="settings.autoScrollEnabled" @update:model-value="v => update({ autoScrollEnabled: v })" /></div>
      <div class="row">
        <span>滚动间隔(ms)</span>
        <Input
          type="number" :model-value="String(settings.autoScrollDelay)"
          @update:model-value="v => update({ autoScrollDelay: Number(v) || 800 })"
        />
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
