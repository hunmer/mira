<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { cookieSiteApi } from '@/api'
import { usePluginSources } from '@/composables/usePluginSources'
import type { CookieSite, CookieItem } from '@/types/mira'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'vue-sonner'
import {
  RiAddLine, RiDownloadCloud2Line, RiLoginBoxLine, RiEdit2Line,
  RiDeleteBin7Line, RiClipboardLine, RiExternalLinkLine, RiStarLine, RiStarFill,
  RiStore2Line,
} from '@remixicon/vue'

const { t } = useI18n()

// Electron 环境：与 device 页一致用 userAgent 判定
const isElectron = computed(() => typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent))

// 站点列表
const sites = ref<CookieSite[]>([])
const loading = ref(false)

// 预设站点
const PRESET_SITES = [
  { name: 'Pinterest', url: 'https://www.pinterest.com' },
  { name: 'Pixiv', url: 'https://www.pixiv.net' },
  { name: 'X / Twitter', url: 'https://x.com' },
  { name: 'Danbooru', url: 'https://danbooru.donmai.us' },
]

async function load() {
  loading.value = true
  try {
    const res = await cookieSiteApi.list()
    sites.value = res.data?.data || []
  } catch {
    toast.error(t('settings.download.loadFailed'))
  } finally {
    loading.value = false
  }
}

function normalizeUrl(u: string) {
  return (u || '').replace(/\/$/, '').toLowerCase()
}

// ===== 按站点分组（key = normalized url）=====
interface SiteGroup {
  key: string
  url: string
  name: string
  groups: CookieSite[]
}
const grouped = computed<SiteGroup[]>(() => {
  const map = new Map<string, SiteGroup>()
  for (const s of sites.value) {
    const key = normalizeUrl(s.url)
    if (!map.has(key)) map.set(key, { key, url: s.url, name: s.name, groups: [] })
    map.get(key)!.groups.push(s)
  }
  // 每组内默认组排前面
  for (const g of map.values()) {
    g.groups.sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
  }
  return Array.from(map.values())
})

async function addPreset(preset: { name: string; url: string }) {
  try {
    await cookieSiteApi.create({ name: preset.name, url: preset.url })
    toast.success(t('settings.download.added'))
    await load()
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  }
}

// 已添加的 url 集合（用于「添加站点」Dialog 提示同站点新增组）
const addedUrls = computed(() => new Set(grouped.value.map((g) => g.key)))

// ===== 添加/编辑 站点组 =====
const showAdd = ref(false)
const addForm = ref({ name: '', url: '', remark: '', label: '' })
const editingId = ref<number | null>(null)
// 当 url 已存在时提示新增组
const urlExists = computed(() => !!addForm.value.url && addedUrls.value.has(normalizeUrl(addForm.value.url)) && editingId.value == null)

function openAdd(preset?: { name?: string; url?: string }) {
  editingId.value = null
  addForm.value = { name: preset?.name || '', url: preset?.url || '', remark: '', label: '' }
  showAdd.value = true
}

function openEdit(site: CookieSite) {
  editingId.value = site.id
  addForm.value = { name: site.name, url: site.url, remark: site.remark || '', label: site.label || '' }
  showAdd.value = true
}

async function saveSite() {
  if (!addForm.value.name || !addForm.value.url) {
    toast.error(t('common.failed'))
    return
  }
  try {
    if (editingId.value != null) {
      await cookieSiteApi.update(editingId.value, {
        name: addForm.value.name, url: addForm.value.url, remark: addForm.value.remark, label: addForm.value.label,
      })
    } else {
      await cookieSiteApi.create({
        name: addForm.value.name, url: addForm.value.url, remark: addForm.value.remark, label: addForm.value.label,
      })
    }
    toast.success(t('settings.download.saveOk'))
    showAdd.value = false
    await load()
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  }
}

async function removeSite(site: CookieSite) {
  if (!confirm(t('settings.download.deleteConfirm'))) return
  try {
    await cookieSiteApi.remove(site.id)
    await load()
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  }
}

async function setDefault(site: CookieSite) {
  try {
    await cookieSiteApi.setDefault(site.id)
    await load()
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  }
}

// ===== Electron 登录子窗口提取 cookie =====
declare global {
  interface Window {
    electronAPI?: {
      openLoginWindow?: (siteId: number, url: string) => Promise<any>
      onLoginCookies?: (cb: (payload: { siteId: number; cookies: CookieItem[] }) => void) => () => void
    }
  }
}

function openLoginWindow(site: CookieSite) {
  if (!isElectron.value || !window.electronAPI?.openLoginWindow) {
    toast.info(t('settings.download.webEnvHint'))
    return
  }
  window.electronAPI.openLoginWindow(site.id, site.url)
  toast.info(t('settings.download.loginWindowHint'))
}

let offLoginCookies: (() => void) | null = null
onMounted(async () => {
  await load()
  if (window.electronAPI?.onLoginCookies) {
    offLoginCookies = window.electronAPI.onLoginCookies(async ({ siteId, cookies }) => {
      try {
        await cookieSiteApi.update(siteId, { cookies })
        toast.success(t('settings.download.saveOk'))
        await load()
      } catch (e: any) {
        toast.error(e.response?.data?.message || t('common.failed'))
      }
    })
  }
})
onBeforeUnmount(() => { offLoginCookies?.() })

// ===== 手动录入 cookie =====
const showManual = ref(false)
const manualSite = ref<CookieSite | null>(null)
const manualText = ref('')

function openManual(site: CookieSite) {
  manualSite.value = site
  manualText.value = ''
  showManual.value = true
}

function parseCookieText(text: string): CookieItem[] | null {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed)
      if (Array.isArray(arr)) {
        return arr.map((c: any) => ({ name: String(c.name), value: String(c.value), domain: c.domain, path: c.path }))
      }
    } catch { /* fallthrough */ }
  }
  const result: CookieItem[] = []
  for (const part of trimmed.split(/[;\n]/)) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (name) result.push({ name, value })
  }
  return result
}

async function saveManual() {
  if (!manualSite.value) return
  const parsed = parseCookieText(manualText.value)
  if (parsed == null) { toast.error(t('common.failed')); return }
  try {
    await cookieSiteApi.update(manualSite.value.id, { cookies: parsed })
    toast.success(t('settings.download.saveOk'))
    showManual.value = false
    await load()
  } catch (e: any) {
    toast.error(e.response?.data?.message || t('common.failed'))
  }
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener')
}

function cookieCount(site: CookieSite) {
  return site.cookies?.length || 0
}

// ===== 插件源管理 (插件商店的 JSON 源, 持久化在 localStorage, 与插件页共享) =====
const {
  sources: pluginSources, activeId: pluginActiveId,
  addSource: addPluginSource, removeSource: removePluginSource, setActive: setPluginSourceActive,
} = usePluginSources()
const pluginForm = ref({ name: '', url: '' })

function addPluginSrc() {
  const url = pluginForm.value.url.trim()
  if (!url) { toast.error('请填写插件源 URL'); return }
  addPluginSource(pluginForm.value.name, url)
  pluginForm.value = { name: '', url: '' }
  toast.success('已添加插件源')
}

function removePluginSrc(id: string) {
  if (!confirm('确定删除该插件源？')) return
  removePluginSource(id)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ t('settings.title') }}</h1>
      <p class="text-sm text-muted-foreground mt-1">{{ t('settings.download.subtitle') }}</p>
    </div>

    <Tabs default-value="download">
      <TabsList>
        <TabsTrigger value="download">
          <RiDownloadCloud2Line class="size-4 mr-1.5" />
          {{ t('settings.tabs.download') }}
        </TabsTrigger>
        <TabsTrigger value="plugin">
          <RiStore2Line class="size-4 mr-1.5" />
          插件
        </TabsTrigger>
      </TabsList>

      <TabsContent value="download" class="space-y-6 mt-4">
        <!-- 站点分组列表 -->
        <Card>
          <CardHeader class="flex-row items-center justify-between space-y-0">
            <CardTitle class="text-base">{{ t('settings.download.addSite') }}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button size="sm">
                  <RiAddLine class="size-4 mr-1" />
                  {{ t('settings.download.addSite') }}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-52">
                <DropdownMenuLabel>{{ t('settings.download.presetSites') }}</DropdownMenuLabel>
                <DropdownMenuItem
                  v-for="p in PRESET_SITES"
                  :key="p.url"
                  @click="addPreset(p)"
                >
                  <RiAddLine class="size-4 mr-2" />
                  {{ p.name }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="openAdd()">
                  <RiEdit2Line class="size-4 mr-2" />
                  {{ t('settings.download.customSite') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="text-sm text-muted-foreground py-8 text-center">{{ t('common.loading') }}</div>
            <div v-else-if="grouped.length === 0" class="text-sm text-muted-foreground py-8 text-center">
              {{ t('common.noData') }}
            </div>
            <div v-else class="space-y-4">
              <!-- 一个站点分组 -->
              <div v-for="group in grouped" :key="group.key" class="rounded-xl border p-4 space-y-3">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ group.name }}</span>
                  <Badge variant="secondary">{{ t('settings.download.groupCount', { n: group.groups.length }) }}</Badge>
                  <a class="text-xs text-muted-foreground hover:text-primary truncate cursor-pointer" @click="openExternal(group.url)">
                    {{ group.url }}
                  </a>
                </div>
                <!-- 该站点下的每个 cookie 组 -->
                <div
                  v-for="site in group.groups"
                  :key="site.id"
                  class="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
                >
                  <button
                    class="shrink-0"
                    :title="site.isDefault ? t('settings.download.isDefault') : t('settings.download.setDefault')"
                    @click="setDefault(site)"
                  >
                    <RiStarFill v-if="site.isDefault" class="size-4 text-yellow-500" />
                    <RiStarLine v-else class="size-4 text-muted-foreground hover:text-yellow-500" />
                  </button>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span v-if="site.label" class="text-sm font-medium">{{ site.label }}</span>
                      <Badge v-if="site.isDefault" variant="default">{{ t('settings.download.isDefault') }}</Badge>
                      <span class="text-xs text-muted-foreground">
                        {{ cookieCount(site) > 0 ? t('settings.download.cookieCount', { n: cookieCount(site) }) : t('settings.download.cookieEmpty') }}
                      </span>
                    </div>
                    <div v-if="site.remark" class="text-xs text-muted-foreground mt-0.5 truncate">{{ site.remark }}</div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <Button v-if="isElectron" variant="ghost" size="sm" :title="t('settings.download.loginGetCookie')" @click="openLoginWindow(site)">
                      <RiLoginBoxLine class="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" :title="t('settings.download.manualInput')" @click="openManual(site)">
                      <RiClipboardLine class="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" :title="t('settings.download.edit')" @click="openEdit(site)">
                      <RiEdit2Line class="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" :title="t('settings.download.delete')" @click="removeSite(site)">
                      <RiDeleteBin7Line class="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="plugin" class="space-y-6 mt-4">
        <Card>
          <CardHeader class="flex-row items-center justify-between space-y-0">
            <CardTitle class="text-base">插件源</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- 添加表单 -->
            <div class="flex flex-col gap-2 sm:flex-row">
              <Input v-model="pluginForm.name" placeholder="源名称（可选）" class="sm:flex-1" />
              <Input v-model="pluginForm.url" placeholder="https://.../plugins.recommend.json" class="sm:flex-[2]" />
              <Button @click="addPluginSrc">
                <RiAddLine class="size-4 mr-1" /> 添加
              </Button>
            </div>

            <!-- 源列表 -->
            <div v-if="pluginSources.length" class="space-y-2">
              <div
                v-for="s in pluginSources"
                :key="s.id"
                class="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
              >
                <button
                  class="shrink-0"
                  :title="s.id === pluginActiveId ? '当前应用' : '设为当前应用'"
                  @click="setPluginSourceActive(s.id)"
                >
                  <RiStarFill v-if="s.id === pluginActiveId" class="size-4 text-yellow-500" />
                  <RiStarLine v-else class="size-4 text-muted-foreground hover:text-yellow-500" />
                </button>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium truncate">{{ s.name }}</span>
                    <Badge v-if="s.id === pluginActiveId" variant="default" class="text-[10px]">当前</Badge>
                  </div>
                  <div class="text-xs text-muted-foreground truncate">{{ s.url }}</div>
                </div>
                <Button variant="ghost" size="icon" title="删除" @click="removePluginSrc(s.id)">
                  <RiDeleteBin7Line class="size-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div v-else class="text-sm text-muted-foreground py-6 text-center">暂无插件源，请添加</div>

            <p class="text-xs text-muted-foreground">
              星标选中的源将用于「插件」页的插件商店，插件商店中无需再填写地址。
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- 添加/编辑 站点组 Dialog -->
    <Dialog v-model:open="showAdd">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('settings.download.addDialog.title') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <Label>{{ t('settings.download.addDialog.name') }}</Label>
            <Input v-model="addForm.name" :placeholder="t('settings.download.addDialog.namePlaceholder')" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('settings.download.addDialog.url') }}</Label>
            <Input v-model="addForm.url" :placeholder="t('settings.download.addDialog.urlPlaceholder')" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('settings.download.label') }}</Label>
            <Input v-model="addForm.label" :placeholder="t('settings.download.labelPlaceholder')" />
          </div>
          <p v-if="urlExists" class="text-xs text-yellow-600 dark:text-yellow-400">
            {{ t('settings.download.newGroupHint') }}
          </p>
          <div class="space-y-2">
            <Label>{{ t('settings.download.addDialog.remark') }}</Label>
            <Input v-model="addForm.remark" :placeholder="t('settings.download.addDialog.remarkPlaceholder')" />
          </div>
        </div>
        <DialogFooter>
          <Button @click="saveSite">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 手动录入 Cookie Dialog -->
    <Dialog v-model:open="showManual">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('settings.download.manualDialog.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('settings.download.manualDialog.desc') }}
            <span v-if="manualSite" class="font-medium text-foreground">{{ manualSite.name }}{{ manualSite.label ? ' / ' + manualSite.label : '' }}</span>
          </DialogDescription>
        </DialogHeader>
        <div class="py-2">
          <Textarea
            v-model="manualText"
            :placeholder="t('settings.download.manualDialog.placeholder')"
            rows="8"
            class="font-mono text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" class="mr-auto" @click="openExternal(manualSite?.url || '')">
            <RiExternalLinkLine class="size-4 mr-1" />
            {{ t('settings.download.addDialog.url') }}
          </Button>
          <Button @click="saveManual">{{ t('settings.download.manualDialog.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
