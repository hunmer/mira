<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { toast } from 'vue-sonner'
import {
  RiFileCopyLine, RiExternalLinkLine, RiArrowDownSLine, RiKeyLine, RiCheckLine, RiCloseLine,
} from '@remixicon/vue'
import type { Library } from '@/types/mira'
import type { ApiToken } from '@/types/auth'
import { adminApi } from '@/api'
import { getApiBaseURL } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput,
  ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger, ComboboxViewport,
} from '@/components/ui/combobox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  library: Library | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const shareUrl = ref('')
const qrDataUrl = ref('')

// Token 选择（分享链接可携带某个账号的 API Token），空 = 不携带
interface TokenGroup {
  username: string
  tokens: ApiToken[]
}
const tokenGroups = ref<TokenGroup[]>([])
const tokenSearch = ref('')
const selectedTokenId = ref<string>('')

const selectedToken = computed(() => {
  for (const group of tokenGroups.value) {
    const tk = group.tokens.find(item => String(item.id) === selectedTokenId.value)
    if (tk) return tk
  }
  return null
})

// 按搜索词过滤后的分组
const filteredGroups = computed(() => {
  const q = tokenSearch.value.toLowerCase()
  return tokenGroups.value
    .map(group => ({
      ...group,
      tokens: group.tokens.filter(tk => !q || (tk.name || tk.token).toLowerCase().includes(q)),
    }))
    .filter(group => group.tokens.length > 0)
})

function tokenLabel(value: string) {
  const tk = value ? tokenGroups.value.flatMap(g => g.tokens).find(item => String(item.id) === value) : null
  return tk ? (tk.name || `Token #${tk.id}`) : ''
}

// 过期时间文本：永久 / 日期 / 已过期
function expiryText(tk: ApiToken) {
  if (tk.expiresAt === -1) return t('admin.token.neverExpires')
  if (tk.expiresAt < Date.now()) return t('admin.token.expired')
  const d = new Date(tk.expiresAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isExpired(tk: ApiToken) {
  return tk.expiresAt !== -1 && tk.expiresAt < Date.now()
}

function clearToken() {
  selectedTokenId.value = ''
}

// 与 mira-client serverList store 的推导规则保持一致（ws 端口 8018）
function toWebSocketUrl(serverUrl: string): string {
  try {
    const u = new URL(serverUrl)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.port = '8018'
    u.pathname = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return serverUrl.replace(/^http/, 'ws')
  }
}

// 生成 mira://server_import 协议链接（Base64 JSON，见 mira-client ProtocolService）
function buildShareUrl(lib: Library): string {
  const serverUrl = getApiBaseURL().replace(/\/api$/, '')
  const payload = {
    type: 'server_import',
    data: {
      id: lib.id,
      name: lib.name,
      serverUrl,
      websocketUrl: toWebSocketUrl(serverUrl),
      ...(selectedToken.value ? { authToken: selectedToken.value.token } : {}),
    },
  }
  // UTF-8 安全的 base64（库名可能含中文）
  const json = JSON.stringify(payload)
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
  return `mira://?json=${base64}`
}

// 拉取所有账号及其 token，按账号分组展示
async function loadTokens() {
  try {
    const res = await adminApi.list()
    const users = Array.isArray(res.data) ? res.data : []
    const groups = await Promise.all(users.map(async (user) => {
      try {
        const r = await adminApi.listTokens(user.id)
        return { username: user.username, tokens: Array.isArray(r.data) ? r.data : [] }
      } catch {
        return { username: user.username, tokens: [] }
      }
    }))
    tokenGroups.value = groups.filter(group => group.tokens.length > 0)
  } catch {
    tokenGroups.value = []
  }
}

async function refreshShare() {
  if (!props.library) return
  shareUrl.value = buildShareUrl(props.library)
  qrDataUrl.value = await QRCode.toDataURL(shareUrl.value, { width: 176, margin: 1 })
}

watch(() => props.open, async (open) => {
  if (!open) return
  selectedTokenId.value = ''
  tokenSearch.value = ''
  await loadTokens()
  await refreshShare()
})

// 切换 token 后重新生成分享链接
watch(selectedTokenId, () => {
  if (props.open) void refreshShare()
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success(t('common.success'))
  } catch {
    toast.error(t('common.failed'))
  }
}

function openApp() {
  window.location.href = shareUrl.value
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('library.shareTitle') }}</DialogTitle>
        <DialogDescription>{{ t('library.shareHint') }}</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col items-center gap-4">
        <div v-if="qrDataUrl" class="rounded-md border p-2">
          <img :src="qrDataUrl" :alt="t('library.shareTitle')" class="size-44" />
        </div>

        <!-- 选择要携带的 API Token（按账号分组，右侧展示过期日期） -->
        <div class="w-full space-y-2">
          <Label class="flex items-center gap-1">
            <RiKeyLine class="size-3.5" /> {{ t('library.shareToken') }}
          </Label>
          <Combobox v-model="selectedTokenId" :display-value="tokenLabel" ignore-filter>
            <ComboboxAnchor as-child>
              <ComboboxTrigger as-child>
                <Button variant="outline" class="w-full justify-between gap-1 font-normal">
                  <span class="truncate">{{ tokenLabel(selectedTokenId) || t('library.shareTokenPlaceholder') }}</span>
                  <span class="flex shrink-0 items-center gap-1">
                    <!-- 清除已选 token（回到不携带状态） -->
                    <RiCloseLine
                      v-if="selectedTokenId"
                      class="size-4 rounded-sm opacity-50 hover:opacity-100"
                      @click.stop.prevent="clearToken"
                    />
                    <RiArrowDownSLine class="size-4 opacity-50" />
                  </span>
                </Button>
              </ComboboxTrigger>
            </ComboboxAnchor>
            <ComboboxList class="z-[60]">
              <ComboboxInput
                :model-value="tokenSearch"
                :placeholder="t('common.search')"
                @update:model-value="tokenSearch = String($event ?? '')"
              />
              <ComboboxEmpty>{{ t('common.noData') }}</ComboboxEmpty>
              <ComboboxViewport>
                <ComboboxGroup v-for="group in filteredGroups" :key="group.username" :heading="group.username">
                  <ComboboxItem
                    v-for="tk in group.tokens"
                    :key="tk.id"
                    :value="String(tk.id)"
                    class="justify-between gap-2"
                  >
                    <span class="min-w-0 flex-1 truncate">{{ tk.name || `Token #${tk.id}` }}</span>
                    <span class="shrink-0 text-xs" :class="isExpired(tk) ? 'text-destructive' : 'text-muted-foreground'">
                      {{ expiryText(tk) }}
                    </span>
                    <ComboboxItemIndicator>
                      <RiCheckLine class="size-4" />
                    </ComboboxItemIndicator>
                  </ComboboxItem>
                </ComboboxGroup>
              </ComboboxViewport>
            </ComboboxList>
          </Combobox>
        </div>

        <div class="flex w-full gap-2">
          <Input :model-value="shareUrl" readonly class="font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
          <Button variant="outline" size="icon" @click="copyUrl">
            <RiFileCopyLine class="size-4" />
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button @click="openApp">
          <RiExternalLinkLine class="mr-2 size-4" /> {{ t('library.openApp') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
