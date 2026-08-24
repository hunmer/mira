<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { cookieSiteApi } from '@/api'
import type { CookieSite, CookieItem } from '@/types/mira'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'vue-sonner'
import {
  RiAddLine, RiLoginBoxLine, RiEdit2Line,
  RiDeleteBin7Line, RiClipboardLine, RiStarLine, RiStarFill,
} from '@remixicon/vue'
import SiteEditDialog, { type SiteFormData } from './SiteEditDialog.vue'
import ManualCookieDialog from './ManualCookieDialog.vue'

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

function requestErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: unknown; response?: { data?: { message?: unknown } } }
    if (typeof value.message === 'string' && value.message) return value.message
    if (typeof value.response?.data?.message === 'string' && value.response.data.message) return value.response.data.message
  }
  return fallback
}

async function load() {
  loading.value = true
  try {
    sites.value = await cookieSiteApi.list()
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
  } catch (e: unknown) {
    toast.error(requestErrorMessage(e, t('common.failed')))
  }
}

// 已添加的 url 集合（用于「添加站点」Dialog 提示同站点新增组）
const addedUrls = computed(() => new Set(grouped.value.map((g) => g.key)))

// ===== 添加/编辑 站点组 =====
const showAdd = ref(false)
const addForm = ref<SiteFormData>({ name: '', url: '', remark: '', label: '' })
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
  } catch (e: unknown) {
    toast.error(requestErrorMessage(e, t('common.failed')))
  }
}

async function removeSite(site: CookieSite) {
  if (!confirm(t('settings.download.deleteConfirm'))) return
  try {
    await cookieSiteApi.remove(site.id)
    await load()
  } catch (e: unknown) {
    toast.error(requestErrorMessage(e, t('common.failed')))
  }
}

async function setDefault(site: CookieSite) {
  try {
    await cookieSiteApi.setDefault(site.id)
    await load()
  } catch (e: unknown) {
    toast.error(requestErrorMessage(e, t('common.failed')))
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
onMounted(() => {
  if (window.electronAPI?.onLoginCookies) {
    offLoginCookies = window.electronAPI.onLoginCookies(async ({ siteId, cookies }) => {
      try {
        await cookieSiteApi.update(siteId, { cookies })
        toast.success(t('settings.download.saveOk'))
        await load()
      } catch (e: unknown) {
        toast.error(requestErrorMessage(e, t('common.failed')))
      }
    })
  }
  void load()
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
  } catch (e: unknown) {
    toast.error(requestErrorMessage(e, t('common.failed')))
  }
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener')
}

function cookieCount(site: CookieSite) {
  return site.cookies?.length || 0
}
</script>

<template>
  <div class="space-y-6">
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

    <!-- 添加/编辑 站点组 Dialog -->
    <SiteEditDialog
      v-model:open="showAdd"
      v-model="addForm"
      :url-exists="urlExists"
      @save="saveSite"
    />

    <!-- 手动录入 Cookie Dialog -->
    <ManualCookieDialog
      v-model:open="showManual"
      v-model="manualText"
      :site="manualSite"
      @save="saveManual"
    />
  </div>
</template>
