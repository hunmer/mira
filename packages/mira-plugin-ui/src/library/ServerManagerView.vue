<script setup lang="ts">
/**
 * 服务器管理(全屏覆盖视图):服务器列表卡片 + 新增/编辑表单 + 删除。
 * 自 mira-browser-extension 迁移:数据(CRUD/激活/测试)/弹窗/文案全部由宿主注入。
 *
 * - 顶栏:标题 + 关闭× + 「+ 新增服务器」
 * - 列表:每条卡片显示 name / serverURL / 状态点(激活项标绿);右侧 切换/编辑/删除
 * - 编辑/新增 → 切换到内嵌表单;表单含「测试连接」
 * - 删除确认走内置 AlertDialog(与 LibraryTreeView 一致,不依赖宿主 dialog)
 * - 激活成功(services.activate 返回 true)后自动 emit('close')
 *
 * 样式为 tailwind/shadcn 原子类;absolute inset-0 全屏覆盖,宿主需提供定位父级。
 */
import { ref, computed } from 'vue'
import { Loader2 } from '@lucide/vue'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { createLibraryTreeT } from './i18n'
import type { LibraryTreeT, ManagedServer, ServerManagerServices } from './types'

const props = withDefaults(defineProps<{
  /** 服务器列表(宿主持久化配置,响应式) */
  servers: ManagedServer[]
  /** 当前激活服务器 id;列表对应项高亮并禁用「切换到此」 */
  activeServerId?: string
  /** 数据服务:增删改 + 测试连接 + 激活 */
  services: ServerManagerServices
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT
}>(), {
  activeServerId: '',
})

const emit = defineEmits<{ close: [] }>()

const fallbackT = createLibraryTreeT()
/** 宿主未传 t 或宿主缺 key(vue-i18n 返回 key 本身)时回退内置中文(与 LibraryTreeView 一致) */
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params)
  const r = props.t(key, params)
  return r === key ? fallbackT(key, params) : r
}

// 表单态:null=列表;否则正在编辑/新增这条(新增时 isNew=true,id 临时空)
type Draft = { id: string; name: string; serverURL: string; username: string; password: string }
const draft = ref<Draft | null>(null)
const isNew = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; msg: string } | null>(null)
const error = ref('')

function startAdd () {
  isNew.value = true
  draft.value = {
    id: '',
    name: tt('server.defaultName', { n: props.servers.length + 1 }),
    serverURL: 'http://localhost:8081',
    username: 'admin',
    password: '',
  }
  testResult.value = null
  error.value = ''
}

function startEdit (id: string) {
  const s = props.servers.find(x => x.id === id)
  if (!s) return
  isNew.value = false
  draft.value = { ...s }
  testResult.value = null
  error.value = ''
}

function cancel () {
  draft.value = null
}

async function save () {
  if (!draft.value) return
  const d = draft.value
  if (!d.serverURL.trim() || !d.username.trim()) {
    error.value = tt('server.requireFields')
    return
  }
  saving.value = true
  error.value = ''
  try {
    if (isNew.value) {
      await props.services.add({ name: d.name.trim() || d.serverURL, serverURL: d.serverURL.trim(), username: d.username.trim(), password: d.password })
    } else {
      await props.services.edit(d.id, { name: d.name.trim() || d.serverURL, serverURL: d.serverURL.trim(), username: d.username.trim(), password: d.password })
    }
    draft.value = null
  } catch (e: any) {
    error.value = e?.message ?? tt('server.saveFail')
  } finally {
    saving.value = false
  }
}

async function testConn () {
  if (!draft.value) return
  testing.value = true
  testResult.value = null
  try {
    const r = await props.services.test(draft.value.serverURL.trim(), draft.value.username.trim(), draft.value.password)
    testResult.value = r.ok
      ? { ok: true, msg: tt('server.testOk') }
      : { ok: false, msg: tt('server.testFail') + (r.error ? `: ${r.error}` : '') }
  } finally {
    testing.value = false
  }
}

// ---- 删除确认:内置 AlertDialog(取消 / 遮罩 / Esc 关闭,失败错误留在框内可重试) ----
const deleteTarget = ref<ManagedServer | null>(null)
const deleting = ref(false)
const deleteError = ref('')

function requestRemove (id: string) {
  deleteTarget.value = props.servers.find(s => s.id === id) ?? null
  deleteError.value = ''
}

function closeRemove () {
  deleteTarget.value = null
  deleteError.value = ''
}

async function confirmRemove () {
  const target = deleteTarget.value
  if (!target || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await props.services.remove(target.id)
    closeRemove()
  } catch (e: any) {
    deleteError.value = tt('server.deleteFailed', { error: e?.message ?? String(e) })
  } finally {
    deleting.value = false
  }
}

async function onActivate (id: string) {
  const ok = await props.services.activate(id)
  if (ok) emit('close')
}

const draftTitle = computed(() => isNew.value ? tt('server.add') : tt('server.edit'))
</script>

<template>
  <div class="bg-background absolute inset-0 z-50 flex flex-col">
    <!-- 列表态 -->
    <template v-if="!draft">
      <div class="flex items-center gap-2 border-b px-3 py-2">
        <span class="flex-1 text-sm font-semibold">{{ tt('server.manager') }}</span>
        <Button variant="outline" size="xs" class="text-primary border-primary hover:bg-primary/10" @click="startAdd">
          + {{ tt('server.add') }}
        </Button>
        <Button variant="ghost" size="icon-xs" :title="tt('common.close')" @click="emit('close')">×</Button>
      </div>
      <div class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <div v-if="!servers.length" class="text-muted-foreground py-8 text-center text-xs">{{ tt('server.noServers') }}</div>
        <div
          v-for="s in servers"
          :key="s.id"
          class="bg-card flex items-center justify-between gap-2 rounded-lg border p-2.5"
          :class="{ 'border-primary': s.id === activeServerId }"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-[13px] font-medium">
              <span class="bg-border size-2 shrink-0 rounded-full" :class="{ 'bg-primary': s.id === activeServerId }" />
              {{ s.name }}
              <span v-if="s.id === activeServerId" class="bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[10px]">{{ tt('server.current') }}</span>
            </div>
            <div class="text-muted-foreground mt-0.5 truncate text-[11px]">{{ s.serverURL }}</div>
            <div class="text-muted-foreground text-[11px]">{{ s.username }}</div>
          </div>
          <div class="flex shrink-0 flex-col gap-1">
            <Button size="xs" variant="ghost" :disabled="s.id === activeServerId" @click="onActivate(s.id)">
              {{ tt('server.activate') }}
            </Button>
            <Button size="xs" variant="outline" @click="startEdit(s.id)">{{ tt('server.edit') }}</Button>
            <Button size="xs" variant="destructive" @click="requestRemove(s.id)">{{ tt('server.delete') }}</Button>
          </div>
        </div>
      </div>
    </template>

    <!-- 表单态 -->
    <template v-else>
      <div class="flex items-center gap-2 border-b px-3 py-2">
        <span class="flex-1 text-sm font-semibold">{{ draftTitle }}</span>
        <Button variant="ghost" size="icon-xs" :title="tt('common.close')" @click="cancel">×</Button>
      </div>
      <div class="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <label class="text-muted-foreground mt-2 text-xs first:mt-0">{{ tt('server.name') }}</label>
        <Input v-model="draft.name" :placeholder="tt('server.namePlaceholder')" />
        <label class="text-muted-foreground mt-2 text-xs">{{ tt('server.serverURL') }}</label>
        <Input v-model="draft.serverURL" placeholder="http://localhost:8081" />
        <label class="text-muted-foreground mt-2 text-xs">{{ tt('server.username') }}</label>
        <Input v-model="draft.username" :placeholder="tt('connection.usernamePlaceholder')" />
        <label class="text-muted-foreground mt-2 text-xs">{{ tt('server.password') }}</label>
        <Input v-model="draft.password" type="password" :placeholder="tt('connection.passwordPlaceholder')" />

        <p v-if="testResult" class="mt-1.5 text-xs" :class="testResult.ok ? 'text-primary' : 'text-destructive'">{{ testResult.msg }}</p>
        <p v-if="error" class="text-destructive mt-1.5 text-xs">{{ error }}</p>

        <div class="mt-3.5 flex items-center justify-between gap-2">
          <Button variant="outline" size="xs" :disabled="testing" @click="testConn">
            {{ testing ? tt('server.testing') : tt('server.test') }}
          </Button>
          <div class="flex gap-1.5">
            <Button variant="ghost" size="xs" @click="cancel">{{ tt('common.cancel') }}</Button>
            <Button variant="default" size="xs" :disabled="saving" @click="save">{{ tt('server.save') }}</Button>
          </div>
        </div>
      </div>
    </template>

    <!-- 删除确认(内置 AlertDialog) -->
    <AlertDialog :open="!!deleteTarget" @update:open="(value: boolean) => !value && closeRemove()">
      <AlertDialogContent class="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ tt('server.deleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ tt('server.confirmDelete') }}{{ deleteTarget ? `（${deleteTarget.name}）` : '' }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p v-if="deleteError" class="text-destructive text-sm">{{ deleteError }}</p>
        <AlertDialogFooter>
          <Button variant="outline" :disabled="deleting" @click="closeRemove">{{ tt('common.cancel') }}</Button>
          <Button variant="destructive" :disabled="deleting" @click="confirmRemove">
            <Loader2 v-if="deleting" class="size-4 animate-spin" />
            {{ tt('server.delete') }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
