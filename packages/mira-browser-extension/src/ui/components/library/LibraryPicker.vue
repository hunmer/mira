<script setup lang="ts">
/**
 * 素材库卡片选择网格:未选素材库时铺满内容区。
 *
 * - 卡片网格(2 列):icon + name + 描述/文件数;点击 → update({ libraryId })
 * - 空态(无任何库):提示去服务器端创建
 * - 顶部标题 + 刷新按钮
 *
 * 列表数据来自 useConnection.libraries(连接成功后已 refresh)。
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import type { Library } from 'mira-app-core/shared/sdk';

const { t } = useI18n();
const { libraries, refreshLibraries } = useConnection();
const { update } = useSettings();

onMounted(refreshLibraries);

// 图标:库自带的 icon 字段优先,否则按文件类型给默认 emoji
function icon(lib: Library): string {
  if (lib.icon) return lib.icon;
  return '🗂️';
}

function desc(lib: Library): string {
  if (lib.description) return lib.description;
  return t('library.fileCount', { n: lib.fileCount ?? 0 });
}

const sorted = computed(() => [...libraries.value].sort((a, b) => a.name.localeCompare(b.name)));

async function pick(lib: Library) {
  await update({ libraryId: lib.id });
}
</script>

<template>
  <div class="picker">
    <div class="bar">
      <span class="title">{{ t('library.chooseTitle') }}</span>
      <button class="refresh" :title="t('common.refresh')" @click="refreshLibraries">↻</button>
    </div>
    <p class="hint">{{ t('library.chooseHint') }}</p>

    <div v-if="!sorted.length" class="empty">
      <span class="big">📚</span>
      <span>{{ t('library.emptyLibraries') }}</span>
    </div>

    <div v-else class="grid">
      <button v-for="lib in sorted" :key="lib.id" class="card" @click="pick(lib)">
        <span class="icon">{{ icon(lib) }}</span>
        <span class="name" :title="lib.name">{{ lib.name }}</span>
        <span class="desc" :title="desc(lib)">{{ desc(lib) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
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

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
  transition: border-color .12s, transform .06s;
  min-height: 84px;
}
.card:hover { border-color: var(--primary); transform: translateY(-1px); }
.icon { font-size: 22px; line-height: 1; }
.name {
  font-size: 13px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  width: 100%;
}
.desc {
  font-size: 11px; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  width: 100%;
}

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
