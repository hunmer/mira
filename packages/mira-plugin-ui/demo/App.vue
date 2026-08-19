<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileText, Folder, Loader2, LogOut, Moon, Server, Sun } from '@lucide/vue'
import { MiraClient } from 'mira-app-core/shared/sdk'
import { SaveLocationDialog, type SaveLocation } from '@/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const dark = ref(false)
function toggleDark () {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
}

/* ---------- Mira SDK 真实数据 ---------- */
// dev 模式经 vite 代理（/mira-api -> 127.0.0.1:8081），避免 server 无 CORS 的跨域问题
const STORE_KEY = 'mira-plugin-ui-demo'
const apiBaseUrl = ref('/mira-api')
const username = ref('admin')
const password = ref('admin123')
const token = ref('')
const connected = ref(false)
const connecting = ref(false)
const loadError = ref('')

const libraries = ref<any[]>([])
const folders = ref<any[]>([])
const tiptapCount = ref(0)
const currentLibraryId = ref('')
let client: MiraClient | null = null

const currentLibrary = computed(() => libraries.value.find(item => String(item.id) === currentLibraryId.value))

onMounted(() => {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  apiBaseUrl.value = saved.apiBaseUrl || '/mira-api'
  username.value = saved.username || 'admin'
  token.value = saved.token || ''
  if (token.value) void connect(token.value)
})

function persist () {
  localStorage.setItem(STORE_KEY, JSON.stringify({ apiBaseUrl: apiBaseUrl.value, username: username.value, token: token.value }))
}

async function connect (existingToken?: string) {
  connecting.value = true
  loadError.value = ''
  try {
    client = new MiraClient(apiBaseUrl.value)
    if (existingToken) client.setToken(existingToken)
    else {
      const response = await client.auth().login(username.value, password.value)
      token.value = response.accessToken || ''
    }
    await loadLibraries()
    connected.value = true
    persist()
  } catch (error) {
    loadError.value = error?.response?.data?.message || error?.message || String(error)
    connected.value = false
  } finally {
    connecting.value = false
  }
}

async function loadLibraries () {
  if (!client) return
  libraries.value = (await client.libraries().getAll()) as any[]
  currentLibraryId.value ||= String(libraries.value[0]?.id || '')
  await loadLibraryData()
}

async function loadLibraryData () {
  if (!client || !currentLibraryId.value) return
  folders.value = (await client.folders().getAll(currentLibraryId.value)) as any[]
  const docs = await client.files().getFilesByExtension(currentLibraryId.value, 'tiptap').catch(() => [])
  tiptapCount.value = (docs as any[] | undefined)?.length || 0
}

function logout () {
  connected.value = false
  token.value = ''
  libraries.value = []
  folders.value = []
  localStorage.removeItem(STORE_KEY)
}

/* ---------- SaveLocationDialog 演示 ---------- */
const showSave = ref(false)
const saved = ref('')

function handleSave (location: SaveLocation) {
  saved.value = JSON.stringify(location)
}
</script>

<template>
  <main class="bg-background text-foreground min-h-[100dvh]">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">mira-plugin-ui Demo</h1>
          <p class="text-muted-foreground text-sm">SaveLocationDialog 组件演示，数据来自 Mira SDK</p>
        </div>
        <Button variant="outline" size="icon" aria-label="切换主题" @click="toggleDark">
          <Sun v-if="dark" class="size-4" />
          <Moon v-else class="size-4" />
        </Button>
      </header>

      <div class="grid items-start gap-6 lg:grid-cols-3">
        <!-- 连接卡片：登录 / 会话 -->
        <section class="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border p-6 shadow-sm lg:col-span-2">
          <div class="flex items-center gap-2">
            <Server class="text-muted-foreground size-4" />
            <h2 class="text-base font-semibold">Mira Server</h2>
            <span
              class="bg-muted text-muted-foreground ms-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="connected && 'bg-primary/10 text-primary'"
            >
              {{ connected ? '已连接' : '未连接' }}
            </span>
          </div>

          <template v-if="!connected">
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="grid gap-2">
                <Label for="api-base">API 地址</Label>
                <Input id="api-base" v-model="apiBaseUrl" placeholder="/mira-api（代理到 127.0.0.1:8081）" />
              </div>
              <div class="grid gap-2">
                <Label for="username">用户名</Label>
                <Input id="username" v-model="username" autocomplete="username" />
              </div>
              <div class="grid gap-2">
                <Label for="password">密码</Label>
                <Input
                  id="password"
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  @keyup.enter="connect()"
                />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Button class="w-fit" :disabled="connecting || !username || !password" @click="connect()">
                <Loader2 v-if="connecting" class="size-4 animate-spin" />
                连接并登录
              </Button>
              <p v-if="loadError" class="text-destructive text-sm">{{ loadError }}</p>
            </div>
          </template>

          <template v-else>
            <p class="text-muted-foreground text-sm">
              接入 <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{{ apiBaseUrl }}</code>
            </p>
            <div class="grid gap-2 sm:max-w-72">
              <Label>当前素材库</Label>
              <Select v-model="currentLibraryId" @update:model-value="loadLibraryData">
                <SelectTrigger>
                  <SelectValue placeholder="选择素材库" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="library in libraries" :key="library.id" :value="String(library.id)">
                    {{ library.name || library.title || library.id }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button variant="outline" class="w-fit" @click="logout">
                <LogOut class="size-4" /> 断开连接
              </Button>
            </div>
          </template>
        </section>

        <!-- 概览卡片：库统计 -->
        <aside class="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
          <h2 class="text-base font-semibold">数据概览</h2>
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Server class="size-3.5" /> 素材库
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ libraries.length }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Folder class="size-3.5" /> 文件夹
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ folders.length }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground flex items-center gap-1.5 text-sm">
                <FileText class="size-3.5" /> .tiptap 文档
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ tiptapCount }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground text-sm">当前库</span>
              <span class="truncate text-sm font-medium">{{ currentLibrary?.name || currentLibrary?.title || currentLibraryId || '未选择' }}</span>
            </div>
          </div>
          <p v-if="!connected" class="text-muted-foreground mt-auto text-xs">连接 server 后显示实时统计，未连接时对话框使用 mock 数据</p>
        </aside>
      </div>

      <!-- 组件演示卡片 -->
      <section class="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold">SaveLocationDialog</h2>
            <p class="text-muted-foreground text-sm">
              {{ connected ? '数据来自当前素材库（真实 SDK 拉取）' : '未连接 server，仅展示 mock 数据' }}
            </p>
          </div>
          <Button class="w-fit shrink-0" :disabled="!connected" @click="showSave = true">保存文档到…</Button>
        </div>
        <p v-if="saved" class="bg-muted text-muted-foreground rounded-lg p-3 font-mono text-sm break-all">{{ saved }}</p>
        <SaveLocationDialog
          v-model:open="showSave"
          :libraries="connected ? libraries : [{ id: 1, name: 'Mock 素材库' }]"
          :folders="connected ? folders : [{ id: 101, title: 'Mock 文件夹' }]"
          :initial-library-id="currentLibraryId"
          initial-file-name="我的文档"
          @save="handleSave"
        />
      </section>
    </div>
  </main>
</template>
