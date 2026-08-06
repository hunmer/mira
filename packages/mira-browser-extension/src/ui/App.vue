<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useConnection } from '@/ui/composables/useConnection';
import { useBackground } from '@/ui/composables/useBackground';
import ConnectionForm from '@/ui/components/ConnectionForm.vue';
import GlobalHeader from '@/ui/components/GlobalHeader.vue';
import TabBar from '@/ui/components/TabBar.vue';
import UploadView from '@/ui/components/upload/UploadView.vue';
import ScreenshotView from '@/ui/components/screenshot/ScreenshotView.vue';
import SnifferView from '@/ui/components/sniffer/SnifferView.vue';
import SettingsView from '@/ui/components/settings/SettingsView.vue';

const props = defineProps<{ containerMode: 'popup' | 'sidePanel' }>();
const { status, verify, libraries } = useConnection();
const bg = useBackground();
const activeTab = ref('upload');

const authenticated = computed(() => status.value === 'connected');

onMounted(async () => {
  await verify();
  // 监听认证过期 → 切回登录
  bg.onAuthExpired(() => { status.value = 'idle'; });
});

function onConnected() {
  status.value = 'connected';
}
</script>

<template>
  <div class="app" :class="containerMode">
    <ConnectionForm v-if="!authenticated" @connected="onConnected" />
    <template v-else>
      <GlobalHeader />
      <TabBar v-model="activeTab" />
      <div class="content">
        <UploadView v-if="activeTab === 'upload'" />
        <ScreenshotView v-else-if="activeTab === 'screenshot'" />
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
</style>
