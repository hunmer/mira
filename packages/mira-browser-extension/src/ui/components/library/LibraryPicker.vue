<script setup lang="ts">
/**
 * 素材库选择页:未选素材库时铺满内容区。
 *
 * - LibrarySelect(mira-plugin-ui)下拉选择,v-model → update({ libraryId })
 * - 空态(无任何库):提示去服务器端创建
 * - 顶部标题 + 刷新按钮
 *
 * 列表数据来自 useConnection.libraries(连接成功后已 refresh)。
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import { LibrarySelect } from 'mira-plugin-ui/library';
import type { LibrarySelectServer } from 'mira-plugin-ui/library';

const { t } = useI18n();
const { libraries, activeServer, refreshLibraries } = useConnection();
const { settings, update } = useSettings();

onMounted(refreshLibraries);

/** LibrarySelect 按服务器分组:仅展示当前激活服务器的库列表(按名称排序) */
const libServers = computed<LibrarySelectServer[]>(() => [{
  id: activeServer.value?.id ?? '',
  name: activeServer.value?.name || activeServer.value?.serverURL || '',
  libraries: [...libraries.value].sort((a, b) => a.name.localeCompare(b.name)),
}]);

async function onLibChange(libraryId: string) {
  await update({ libraryId });
}
</script>

<template>
  <div class="picker">
    <div class="bar">
      <span class="title">{{ t('library.chooseTitle') }}</span>
      <button class="refresh" :title="t('common.refresh')" @click="refreshLibraries">↻</button>
    </div>
    <p class="hint">{{ t('library.chooseHint') }}</p>

    <div v-if="!libraries.length" class="empty">
      <span class="big">📚</span>
      <span>{{ t('library.emptyLibraries') }}</span>
    </div>

    <LibrarySelect
      v-else
      class="select"
      :servers="libServers"
      :model-value="settings.libraryId"
      :placeholder="t('header.selectLibrary')"
      @update:model-value="onLibChange"
    />
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 12px;
  overflow-y: auto;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}
.title { font-size: 14px; font-weight: 600; }
.refresh {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  line-height: 1;
}
.refresh:hover { color: var(--fg); }
.hint { font-size: 12px; color: var(--muted); margin: 4px 0 12px; }

.select { width: 100%; }

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
  text-align: center;
}
.empty .big { font-size: 40px; }
</style>
