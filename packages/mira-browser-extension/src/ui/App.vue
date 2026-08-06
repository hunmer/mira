<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useConnection } from '@/ui/composables/useConnection';
import { useBackground } from '@/ui/composables/useBackground';
import { useSettings } from '@/ui/composables/useSettings';
import { resolveTheme, applyTheme, watchSystemTheme } from '@/ui/theme';
import ConnectionForm from '@/ui/components/ConnectionForm.vue';
import GlobalHeader from '@/ui/components/GlobalHeader.vue';
import TabBar from '@/ui/components/TabBar.vue';
import ScreenshotView from '@/ui/components/screenshot/ScreenshotView.vue';
import SnifferView from '@/ui/components/sniffer/SnifferView.vue';
import SettingsView from '@/ui/components/settings/SettingsView.vue';
import LibraryTreeView from '@/ui/components/library/LibraryTreeView.vue';

const props = defineProps<{ containerMode: 'popup' | 'sidePanel' }>();
const { status, verify, libraries } = useConnection();
const { settings, load, update } = useSettings();
const bg = useBackground();
const activeTab = ref('folders');
const screenshotOpen = ref(false);

// 启动时先处于 connecting(自动登录中),避免登录界面一闪而过
const booting = ref(true);
const authenticated = computed(() => status.value === 'connected');

// 主题:settings.theme 变化或系统主题(auto 时)变化 → 应用
watch(() => settings.value.theme, t => applyTheme(resolveTheme(t)), { immediate: true });
const unwatchSystem = watchSystemTheme(resolved => {
  if (settings.value.theme === 'auto') applyTheme(resolved);
});

onMounted(async () => {
  await load();
  // 自动登录:verify 内部先验 token,失败再用保存的凭据 / 默认 admin/admin123 登录;
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
});

onUnmounted(unwatchSystem);

function onConnected() {
  status.value = 'connected';
}
</script>

<template>
  <div class="app" :class="containerMode">
    <!-- 启动自动登录中:显示 loading,避免登录界面一闪而过 -->
    <div v-if="booting" class="booting">连接中…</div>
    <ConnectionForm v-else-if="!authenticated" @connected="onConnected" />
    <template v-else>
      <GlobalHeader :screenshot-open="screenshotOpen" @toggle-screenshot="screenshotOpen = !screenshotOpen">
        <template #screenshot-menu><ScreenshotView /></template>
      </GlobalHeader>
      <TabBar v-model="activeTab" />
      <div class="content">
        <LibraryTreeView v-if="activeTab === 'folders'" mode="folder" />
        <LibraryTreeView v-else-if="activeTab === 'tags'" mode="tag" />
        <SnifferView v-else-if="activeTab === 'sniffer'" />
        <SettingsView v-else-if="activeTab === 'settings'" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; background: var(--bg); }
.app.popup { width: 380px; max-height: 600px; }
.content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.booting { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--muted); }
</style>
