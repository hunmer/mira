<script setup lang="ts">
/**
 * 服务器管理(全屏覆盖视图):服务器列表卡片 + 新增/编辑表单 + 删除。
 *
 * - 顶栏:标题 + 关闭× + 「+ 新增服务器」
 * - 列表:每条卡片显示 name / serverURL / 状态点(激活项标绿);右侧 编辑/删除
 * - 编辑/新增 → 切换到内嵌表单(ServerForm);表单含「测试连接」
 * - 删除激活项 → useServers.remove 自动切到第一个
 *
 * 切换激活由父组件在 manage 关闭后用 ServerBar 完成;这里只做 CRUD。
 */
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServers } from '@/ui/composables/useServers';
import { useConnection } from '@/ui/composables/useConnection';
import Button from '@/ui/components/ui/Button.vue';
import Input from '@/ui/components/ui/Input.vue';

const { t } = useI18n();
const emit = defineEmits<{ close: [] }>();

const { servers, activeServer, add, edit, remove, test } = useServers();
const { switchServer } = useConnection();

// 表单态:null=列表;否则正在编辑/新增这条(新增时 isNew=true,id 临时空)
type Draft = { id: string; name: string; serverURL: string; username: string; password: string };
const draft = ref<Draft | null>(null);
const isNew = ref(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref<{ ok: boolean; msg: string } | null>(null);
const error = ref('');

function startAdd() {
  isNew.value = true;
  draft.value = {
    id: '',
    name: t('server.defaultName', { n: servers.value.length + 1 }),
    serverURL: 'http://localhost:8081',
    username: 'admin',
    password: '',
  };
  testResult.value = null;
  error.value = '';
}

function startEdit(id: string) {
  const s = servers.value.find(x => x.id === id);
  if (!s) return;
  isNew.value = false;
  draft.value = { ...s };
  testResult.value = null;
  error.value = '';
}

function cancel() {
  draft.value = null;
}

async function save() {
  if (!draft.value) return;
  const d = draft.value;
  if (!d.serverURL.trim() || !d.username.trim()) {
    error.value = t('server.requireFields');
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    if (isNew.value) {
      await add({ name: d.name.trim() || d.serverURL, serverURL: d.serverURL.trim(), username: d.username.trim(), password: d.password });
    } else {
      await edit(d.id, { name: d.name.trim() || d.serverURL, serverURL: d.serverURL.trim(), username: d.username.trim(), password: d.password });
    }
    draft.value = null;
  } catch (e: any) {
    error.value = e?.message ?? t('server.saveFail');
  } finally {
    saving.value = false;
  }
}

async function testConn() {
  if (!draft.value) return;
  testing.value = true;
  testResult.value = null;
  try {
    const r = await test(draft.value.serverURL.trim(), draft.value.username.trim(), draft.value.password);
    testResult.value = r.ok
      ? { ok: true, msg: t('server.testOk') }
      : { ok: false, msg: t('server.testFail') + (r.error ? `: ${r.error}` : '') };
  } finally {
    testing.value = false;
  }
}

async function onRemove(id: string) {
  if (!confirm(t('server.confirmDelete'))) return;
  await remove(id);
}

async function onActivate(id: string) {
  const ok = await switchServer(id);
  if (ok) emit('close');
}

const draftTitle = computed(() => isNew.value ? t('server.add') : t('server.edit'));
</script>

<template>
  <div class="overlay">
    <!-- 列表态 -->
    <template v-if="!draft">
      <div class="top">
        <span class="title">{{ t('server.manager') }}</span>
        <button class="add" @click="startAdd">+ {{ t('server.add') }}</button>
        <button class="close" :title="t('common.close')" @click="$emit('close')">×</button>
      </div>
      <div class="body">
        <div v-if="!servers.length" class="empty">{{ t('server.noServers') }}</div>
        <div v-for="s in servers" :key="s.id" class="card" :class="{ active: s.id === activeServer?.id }">
          <div class="info">
            <div class="name">
              <span class="mark" :class="{ on: s.id === activeServer?.id }" />
              {{ s.name }}
              <span v-if="s.id === activeServer?.id" class="tag">{{ t('server.current') }}</span>
            </div>
            <div class="url">{{ s.serverURL }}</div>
            <div class="user">{{ s.username }}</div>
          </div>
          <div class="ops">
            <Button size="sm" variant="ghost" :disabled="s.id === activeServer?.id" @click="onActivate(s.id)">
              {{ t('server.activate') }}
            </Button>
            <Button size="sm" variant="outline" @click="startEdit(s.id)">{{ t('server.edit') }}</Button>
            <Button size="sm" variant="danger" @click="onRemove(s.id)">{{ t('server.delete') }}</Button>
          </div>
        </div>
      </div>
    </template>

    <!-- 表单态 -->
    <template v-else>
      <div class="top">
        <span class="title">{{ draftTitle }}</span>
        <button class="close" :title="t('common.close')" @click="cancel">×</button>
      </div>
      <div class="body form">
        <label>{{ t('server.name') }}</label>
        <Input v-model="draft.name" :placeholder="t('server.namePlaceholder')" />
        <label>{{ t('server.serverURL') }}</label>
        <Input v-model="draft.serverURL" placeholder="http://localhost:8081" />
        <label>{{ t('server.username') }}</label>
        <Input v-model="draft.username" :placeholder="t('connection.usernamePlaceholder')" />
        <label>{{ t('server.password') }}</label>
        <Input v-model="draft.password" type="password" :placeholder="t('connection.passwordPlaceholder')" />

        <p v-if="testResult" class="test" :class="{ ok: testResult.ok, fail: !testResult.ok }">{{ testResult.msg }}</p>
        <p v-if="error" class="err">{{ error }}</p>

        <div class="form-ops">
            <Button variant="outline" size="sm" :disabled="testing" @click="testConn">
            {{ testing ? t('server.testing') : t('server.test') }}
          </Button>
          <div class="right">
            <Button variant="ghost" size="sm" @click="cancel">{{ t('common.cancel') }}</Button>
            <Button variant="default" size="sm" :disabled="saving" @click="save">{{ t('server.save') }}</Button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.title { flex: 1; font-size: 14px; font-weight: 600; }
.add {
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
}
.add:hover { background: color-mix(in srgb, var(--primary) 12%, transparent); }
.close {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.close:hover { color: var(--fg); }

.body { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.empty { color: var(--muted); text-align: center; padding: 32px 12px; font-size: 12px; }

.card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.card.active { border-color: var(--primary); }
.info { min-width: 0; flex: 1; }
.name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}
.mark {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--border); flex-shrink: 0;
}
.mark.on { background: var(--primary); }
.tag {
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: var(--primary); color: var(--primary-fg);
}
.url { font-size: 11px; color: var(--muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user { font-size: 11px; color: var(--muted); }
.ops { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }

.form { gap: 4px; }
label { font-size: 12px; color: var(--muted); margin-top: 8px; }
.form label:first-child { margin-top: 0; }
.test { font-size: 12px; margin: 6px 0 0; }
.test.ok { color: var(--primary); }
.test.fail { color: var(--danger); }
.err { color: var(--danger); font-size: 12px; margin: 6px 0 0; }
.form-ops { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 8px; }
.right { display: flex; gap: 6px; }
</style>
