<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnection, DEFAULT_SERVER_URL, DEFAULT_USERNAME } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';

const { t } = useI18n();
const emit = defineEmits<{ connected: [] }>();
const { login } = useConnection();
const { settings, update, load } = useSettings();

// 默认值:自动登录用的 admin/admin123;回退到手动登录时预填
const serverURL = ref(DEFAULT_SERVER_URL);
const username = ref(DEFAULT_USERNAME);
const password = ref('');
const error = ref('');
const loading = ref(false);

// 预填上次保存的服务器地址/账号,避免每次重新输入
onMounted(async () => {
  await load();
  if (settings.value.serverURL) serverURL.value = settings.value.serverURL;
  if (settings.value.username) username.value = settings.value.username;
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(serverURL.value, username.value, password.value);
    // 保留上次选择的素材库(若已存在),仅在从未选过时留空触发后续默认选库
    if (!settings.value.libraryId) await update({ libraryId: '' });
    emit('connected');
  } catch (e: any) {
    error.value = e?.message ?? t('connection.failed');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="form">
    <h2>{{ t('connection.title') }}</h2>
    <label>{{ t('connection.serverURL') }}</label>
    <Input v-model="serverURL" placeholder="http://localhost:8081" />
    <label>{{ t('connection.username') }}</label>
    <Input v-model="username" :placeholder="t('connection.usernamePlaceholder')" />
    <label>{{ t('connection.password') }}</label>
    <Input v-model="password" type="password" :placeholder="t('connection.passwordPlaceholder')" />
    <p v-if="error" class="err">{{ error }}</p>
    <Button :disabled="loading" @click="submit">
      {{ loading ? t('connection.connecting') : t('connection.connect') }}
    </Button>
  </div>
</template>

<style scoped>
.form { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
h2 { margin: 0 0 8px; font-size: 16px; }
label { font-size: 12px; color: var(--muted); margin-top: 6px; }
.err { color: var(--danger); font-size: 12px; margin: 4px 0; }
</style>
