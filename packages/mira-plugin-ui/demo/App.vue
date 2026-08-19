<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Loader2, LogOut, Moon, Sun } from '@lucide/vue'
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
  <main class="bg-background text-foreground min-h-screen p-8">
    <div class="mx-auto flex max-w-3xl flex-col gap-10">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">mira-plugin-ui Demo</h1>
          <p class="text-muted-foreground mt-1 text-sm">SaveLocationDialog · 接入 Mira SDK 真实数据</p>
        </div>
        <Button variant="outline" size="icon" @click="toggleDark">
          <Sun v-if="dark" class="size-4" />
          <Moon v-else class="size-4" />
        </Button>
      </header>

      <!-- Mira server 连接 -->
      <section class="flex flex-col gap-3 rounded-lg border p-5">
        <h2 class="text-lg font-semibold">Mira Server</h2>
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
              <Input id="password" v-model="password" type="password" autocomplete="current-password" @keyup.enter="connect()" />
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
          <div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>已连接 <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{{ apiBaseUrl }}</code></span>
            <span>素材库 <b class="text-foreground">{{ libraries.length }}</b> 个</span>
            <span>当前库 <b class="text-foreground">{{ currentLibrary?.name || currentLibrary?.title || currentLibraryId }}</b></span>
            <span>文件夹 <b class="text-foreground">{{ folders.length }}</b> 个</span>
            <span>.tiptap 文档 <b class="text-foreground">{{ tiptapCount }}</b> 篇</span>
          </div>
          <div class="grid gap-2 sm:w-72">
            <Label>切换素材库</Label>
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
          <Button variant="outline" class="w-fit" @click="logout">
            <LogOut class="size-4" /> 断开
          </Button>
        </template>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">SaveLocationDialog</h2>
        <p class="text-muted-foreground text-sm">
          {{ connected ? '数据来自当前素材库（真实 SDK 拉取）' : '未连接 server，仅展示 mock 数据' }}
        </p>
        <Button class="w-fit" :disabled="!connected" @click="showSave = true">保存文档到…</Button>
        <p v-if="saved" class="bg-muted text-muted-foreground rounded-md p-3 font-mono text-sm">{{ saved }}</p>
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
