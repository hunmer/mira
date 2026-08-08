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
import ServerBar from '@/ui/components/server/ServerBar.vue';
import ServerManagerView from '@/ui/components/server/ServerManagerView.vue';

const { t } = useI18n();
const props = defineProps<{ containerMode: 'popup' | 'sidePanel' }>();
const { status, verify, libraries, switchServer, startHealthCheck, stopHealthCheck } = useConnection();
const { settings, load, update } = useSettings();
const bg = useBackground();
const activeTab = ref('folders');
const screenshotOpen = ref(false);
const showServerManager = ref(false);
const showSettings = ref(false);

// 启动时先处于 connecting(自动登录中),避免登录界面一闪而过
const booting = ref(true);
const authenticated = computed(() => status.value === 'connected');

// 未选素材库时:整页展示卡片选择网格(不显示 header / tabs / 底部服务器栏)
const needsLibrary = computed(() => !settings.value.libraryId);

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
</script>

<template>
  <div class="app" :class="containerMode">
    <!-- 启动自动登录中:显示 loading,避免登录界面一闪而过 -->
    <div v-if="booting" class="booting">{{ t('app.connecting') }}</div>
    <ConnectionForm v-else-if="!authenticated" @connected="onConnected" />

    <!-- 未选素材库:整页卡片选择网格(无 header / tabs / 底部栏) -->
    <LibraryPicker v-else-if="needsLibrary" />

    <template v-else>
      <GlobalHeader
        :screenshot-open="screenshotOpen"
        @toggle-screenshot="screenshotOpen = !screenshotOpen"
      >
        <template #screenshot-menu><ScreenshotView /></template>
      </GlobalHeader>
      <TabBar v-model="activeTab" />
      <div class="content">
        <LibraryTreeView v-if="activeTab === 'folders'" mode="folder" />
        <LibraryTreeView v-else-if="activeTab === 'tags'" mode="tag" />
        <SnifferView v-else-if="activeTab === 'sniffer'" />
      </div>

      <!-- 底部栏:服务器列表 + 设置按钮 -->
      <div class="bottom-bar">
        <ServerBar
          @manage="showServerManager = true"
          @switch="switchServer"
        />
        <button
          class="settings-btn"
          :title="t('tab.settings')"
          :aria-label="t('tab.settings')"
          @click="showSettings = true"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
            <path d="M9.6 1.6a1 1 0 0 1 .9.6l.5 1.3a7.8 7.8 0 0 1 2 0l.5-1.3a1 1 0 0 1 1.2-.6l1.9.7a1 1 0 0 1 .6 1.2l-.5 1.3a7.8 7.8 0 0 1 1.4 1.4l1.3-.5a1 1 0 0 1 1.2.6l.7 1.9a1 1 0 0 1-.6 1.2l-1.3.5a7.8 7.8 0 0 1 0 2l1.3.5a1 1 0 0 1 .6 1.2l-.7 1.9a1 1 0 0 1-1.2.6l-1.3-.5a7.8 7.8 0 0 1-1.4 1.4l.5 1.3a1 1 0 0 1-.6 1.2l-1.9.7a1 1 0 0 1-1.2-.6l-.5-1.3a7.8 7.8 0 0 1-2 0l-.5 1.3a1 1 0 0 1-1.2.6l-1.9-.7a1 1 0 0 1-.6-1.2l.5-1.3a7.8 7.8 0 0 1-1.4-1.4l-1.3.5a1 1 0 0 1-1.2-.6l-.7-1.9a1 1 0 0 1 .6-1.2l1.3-.5a7.8 7.8 0 0 1 0-2l-1.3-.5a1 1 0 0 1-.6-1.2l.7-1.9a1 1 0 0 1 1.2-.6l1.3.5a7.8 7.8 0 0 1 1.4-1.4l-.5-1.3a1 1 0 0 1 .6-1.2l1.9-.7zm.9 2.7a1 1 0 0 1-.9.6l-.4.04a1 1 0 0 1-.8-.4l-.3-.4-.5.2.06.5a1 1 0 0 1-.3.86l-.3.27a1 1 0 0 1-.88.22l-.5-.1-.2.5.4.3a1 1 0 0 1 .35.85l-.04.43a1 1 0 0 1-.5.78l-.45.25.1.52.5.03a1 1 0 0 1 .82.5l.22.37a1 1 0 0 1 0 .92l-.25.45.4.4.45-.25a1 1 0 0 1 .92 0l.37.22a1 1 0 0 1 .5.82l.03.5.52.1.25-.45a1 1 0 0 1 .78-.5l.43-.04a1 1 0 0 1 .85.35l.3.4.5-.2-.1-.5a1 1 0 0 1 .22-.88l.27-.3a1 1 0 0 1 .86-.3l.5.06.2-.5-.4-.3a1 1 0 0 1-.35-.85l.04-.43a1 1 0 0 1 .5-.78l.45-.25-.1-.52-.5-.03a1 1 0 0 1-.82-.5l-.22-.37a1 1 0 0 1 0-.92l.25-.45-.4-.4-.45.25a1 1 0 0 1-.92 0l-.37-.22a1 1 0 0 1-.5-.82L13 4.9l-.52-.1z" fill="currentColor" opacity=".5"/>
          </svg>
        </button>
      </div>

      <!-- 服务器管理全屏覆盖 -->
      <ServerManagerView v-if="showServerManager" @close="showServerManager = false" />
      <!-- 设置全屏覆盖 -->
      <div v-if="showSettings" class="overlay">
        <div class="overlay-top">
          <span class="overlay-title">{{ t('tab.settings') }}</span>
          <button class="overlay-close" :title="t('common.close')" @click="showSettings = false">×</button>
        </div>
        <div class="overlay-body">
          <SettingsView />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; background: var(--bg); position: relative; }
.app.popup { width: 380px; height: 600px; }
.content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.booting { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--muted); }

/* 底部栏:服务器栏 + 设置按钮 */
.bottom-bar {
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--border);
}
.bottom-bar :deep(.bar) {
  /* ServerBar 自带 border-bottom,作为底部栏时换成无边框融入 */
  border-bottom: none;
  flex: 1;
}
.settings-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  background: transparent;
  border: none;
  border-left: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
  transition: color .12s, background .12s;
}
.settings-btn:hover { color: var(--fg); background: var(--bg-elev); }

/* 设置覆盖层(与 ServerManagerView 同款全屏) */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.overlay-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.overlay-title { flex: 1; font-size: 14px; font-weight: 600; }
.overlay-close {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.overlay-close:hover { color: var(--fg); }
.overlay-body { flex: 1; overflow-y: auto; }
</style>
