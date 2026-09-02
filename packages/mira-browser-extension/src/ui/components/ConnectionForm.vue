<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnection, DEFAULT_SERVER_URL, DEFAULT_USERNAME } from '@/ui/composables/useConnection';
import { useSettings } from '@/ui/composables/useSettings';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';

const { t } = useI18n();
const emit = defineEmits<{ connected: [] }>();
const { login, saveAndActivateServer, servers } = useConnection();
const { settings, update, load } = useSettings();

// 默认值:自动登录用的 admin/admin123;回放手动登录时预填
const serverURL = ref(DEFAULT_SERVER_URL);
const username = ref(DEFAULT_USERNAME);
const password = ref('');
const error = ref('');
const loading = ref(false);
// 选中已保存服务器:点「连接」时直接激活它登录;不选(手动填)则登录后自动入库
const selectedId = ref('');

// 预填:若有激活服务器用其凭据;否则用 settings 里保存的;都没则默认值
onMounted(async () => {
  await load();
  const active = settings.value.servers.find(s => s.id === settings.value.activeServerId);
  if (active) {
    selectedId.value = active.id;
    serverURL.value = active.serverURL;
    username.value = active.username;
    password.value = active.password;
  } else if (settings.value.serverURL) {
    serverURL.value = settings.value.serverURL;
    if (settings.value.username) username.value = settings.value.username;
  }
});

// 选中已保存服务器 → 预填其凭据
function onSelectSaved(id: string) {
  const s = servers.value.find(x => x.id === id);
  if (!s) return;
  serverURL.value = s.serverURL;
  username.value = s.username;
  password.value = s.password;
}

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(serverURL.value, username.value, password.value);
    // 登录成功后:手动填入的地址若不在 servers 中,自动入库并激活
    const exists = servers.value.some(s => s.serverURL === serverURL.value);
    if (!exists) {
      await saveAndActivateServer({
        name: serverURL.value.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        serverURL: serverURL.value,
        username: username.value,
        password: password.value,
      });
    } else if (selectedId.value && settings.value.activeServerId !== selectedId.value) {
      // 选了某个已保存服务器但尚未激活 → 激活它
      await saveAndActivateServer({
        name: servers.value.find(s => s.id === selectedId.value)?.name || serverURL.value,
        serverURL: serverURL.value,
        username: username.value,
        password: password.value,
      });
    }
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

    <!-- 已保存服务器快捷选择 -->
    <div v-if="servers.length" class="saved">
      <label>{{ t('server.saved') }}</label>
      <div class="server-list">
        <button
          v-for="s in servers"
          :key="s.id"
          class="server-chip"
          :class="{ active: selectedId === s.id }"
          :title="s.serverURL"
          @click="selectedId = s.id; onSelectSaved(s.id)"
        >
          {{ s.name }}
        </button>
      </div>
    </div>

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
.form { padding: 16px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
h2 { margin: 0 0 8px; font-size: 16px; }
label { font-size: 12px; color: var(--muted-foreground); margin-top: 6px; }
.err { color: var(--danger); font-size: 12px; margin: 4px 0; }

.saved { margin-bottom: 6px; }
.server-list { display: flex; flex-wrap: wrap; gap: 6px; }
.server-chip {
  padding: 4px 10px;
  font-size: 12px;
  background: transparent;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition: all .12s;
}
.server-chip:hover { color: var(--fg); border-color: var(--muted-foreground); }
.server-chip.active {
  background: var(--primary);
  color: var(--primary-fg);
  border-color: var(--primary);
}
</style>
