<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConnection } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';

const emit = defineEmits<{ connected: [] }>();
const { login } = useConnection();
const { settings, update, load } = useSettings();

const serverURL = ref('http://localhost:8081');
const username = ref('');
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
    error.value = e?.message ?? '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="form">
    <h2>Mira 连接</h2>
    <label>服务器地址</label>
    <Input v-model="serverURL" placeholder="http://localhost:8081" />
    <label>用户名</label>
    <Input v-model="username" placeholder="用户名" />
    <label>密码</label>
    <Input v-model="password" type="password" placeholder="密码" />
    <p v-if="error" class="err">{{ error }}</p>
    <Button :disabled="loading" @click="submit">
      {{ loading ? '连接中...' : '连接' }}
    </Button>
  </div>
</template>

<style scoped>
.form { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
h2 { margin: 0 0 8px; font-size: 16px; }
label { font-size: 12px; color: var(--muted); margin-top: 6px; }
.err { color: var(--danger); font-size: 12px; margin: 4px 0; }
</style>
