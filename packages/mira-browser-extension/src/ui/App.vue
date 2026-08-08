<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import i18n from '@/ui/i18n';
import { useConnection } from '@/ui/composables/useConnection';
import { useBackground } from '@/ui/composables/useBackground';
import { useSettings } from '@/ui/composables/useSettings';
import { migrateServersIfNeeded } from '@/shared/storage';
import { resolveTheme, applyTheme, watchSystemTheme } from '@/ui/theme';
import ConnectionForm from '@/ui/components/ConnectionForm.vue';
import GlobalHeader from '@/ui/components/GlobalHeader.vue';
import TabBar from '@/ui/components/TabBar.vue';
import ScreenshotView from '@/ui/components/screenshot/ScreenshotView.vue';
import SnifferView from '@/ui/components/sniffer/SnifferView.vue';
import SettingsView from '@/ui/components/settings/SettingsView.vue';
import LibraryTreeView from '@/ui/components/library/LibraryTreeView.vue';
import LibraryPicker from '@/ui/components/library/LibraryPicker.vue';
import ServerManagerView from '@/ui/components/server/ServerManagerView.vue';

const { t } = useI18n();
const props = defineProps<{ containerMode: 'popup' | 'sidePanel' }>();
const { status, verify, libraries, switchServer, startHealthCheck, stopHealthCheck } = useConnection();
const { settings, load, update } = useSettings();
const bg = useBackground();
const activeTab = ref('folders');
const screenshotOpen = ref(false);
const showServerManager = ref(false);

// 启动时先处于 connecting(自动登录中),避免登录界面一闪而过
const booting = ref(true);
const authenticated = computed(() => status.value === 'connected');

// 主题:settings.theme 变化或系统主题(auto 时)变化 → 应用
watch(() => settings.value.theme, t => applyTheme(resolveTheme(t)), { immediate: true });

// 语言:settings.locale 变化 → 同步到 i18n 实例(初始 locale 固定 zh-CN,settings 加载后切换)
watch(() => settings.value.locale, l => { if (l) i18n.global.locale.value = l; });
const unwatchSystem = watchSystemTheme(resolved => {
  if (settings.value.theme === 'auto') applyTheme(resolved);
});

onMounted(async () => {
  await load();
  // 多服务器迁移:旧版只有顶层 serverURL → 首条服务器(幂等)
  settings.value = await migrateServersIfNeeded(settings.value);

  // 自动登录:verify 内部先验 token,失败再用激活服务器凭据 / 顶层兼容字段登录;
  // 都失败才落回 idle(显示登录界面)
  await verify({
    serverURL: settings.value.serverURL,
    username: settings.value.username,
    password: settings.value.password,
  });
  booting.value = false;
  // 清理脏值:记住的素材库已被删/换服务器时清空,避免上传到不存在的库
  const lid = settings.value.libraryId;
  if (lid && libraries.value.length && !libraries.value.some(l => l.id === lid)) {
    await update({ libraryId: '' });
  }
  // 监听认证过期 → 切回登录
  bg.onAuthExpired(() => { status.value = 'idle'; });
  // 启动定时心跳:每 30s 探活一次,失败时把状态置 failed(红点提示),可达时恢复 connected。
  // 仅在已进入主界面时生效(idle/connecting 时 checkHealth 自身会跳过)。
  startHealthCheck();
});

onUnmounted(() => {
  unwatchSystem();
  // popup/side panel 关闭时清掉定时器,避免残留探活请求
  stopHealthCheck();
});

function onConnected() {
  status.value = 'connected';
}

// 未选素材库时(folders/tags tab)用卡片网格选择
const showLibraryPicker = computed(
  () => !settings.value.libraryId && (activeTab.value === 'folders' || activeTab.value === 'tags'),
);
</script>

<template>
  <div class="app" :class="containerMode">
    <!-- 启动自动登录中:显示 loading,避免登录界面一闪而过 -->
    <div v-if="booting" class="booting">{{ t('app.connecting') }}</div>
    <ConnectionForm v-else-if="!authenticated" @connected="onConnected" />
    <template v-else>
      <GlobalHeader
        :screenshot-open="screenshotOpen"
        @toggle-screenshot="screenshotOpen = !screenshotOpen"
        @manage-servers="showServerManager = true"
        @switch-server="switchServer"
      >
        <template #screenshot-menu><ScreenshotView /></template>
      </GlobalHeader>
      <TabBar v-model="activeTab" />
      <div class="content">
        <!-- 未选素材库:folders/tags tab 都显示卡片选择网格 -->
        <LibraryPicker v-if="showLibraryPicker" />
        <template v-else>
          <LibraryTreeView v-if="activeTab === 'folders'" mode="folder" />
          <LibraryTreeView v-else-if="activeTab === 'tags'" mode="tag" />
          <SnifferView v-else-if="activeTab === 'sniffer'" />
          <SettingsView v-else-if="activeTab === 'settings'" />
        </template>
      </div>

      <!-- 服务器管理全屏覆盖 -->
      <ServerManagerView v-if="showServerManager" @close="showServerManager = false" />
    </template>
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; background: var(--bg); position: relative; }
.app.popup { width: 380px; height: 600px; }
.content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.booting { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--muted); }
</style>
