<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { User, ApiToken } from '@/types/auth'
import { adminApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { toast } from 'vue-sonner'
import {
  RiAddLine, RiFileCopyLine, RiEditLine, RiDeleteBinLine,
} from '@remixicon/vue'

const props = defineProps<{
  open: boolean
  user: User | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  changed: []
}>()

const { t } = useI18n()
const { confirmDialog, requireConfirm } = useConfirmDialog()
const tokens = ref<ApiToken[]>([])
const loading = ref(false)

// 创建/编辑表单
const formOpen = ref(false)
const editingToken = ref<ApiToken | null>(null)
const form = ref({ name: '', expiresInDays: 0 })

// 有效期选项（天），0 = 永久
const EXPIRY_OPTIONS = [0, 7, 30, 90, 365]

function expiryLabel(days: number) {
  return days === 0 ? t('admin.token.neverExpires') : t('admin.token.days', { n: days })
}

async function loadTokens() {
  if (!props.user) return
  loading.value = true
  try {
    const res = await adminApi.listTokens(props.user.id)
    tokens.value = Array.isArray(res) ? res : []
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (open) => {
  if (open) void loadTokens()
})

function openCreate() {
  editingToken.value = null
  form.value = { name: '', expiresInDays: 0 }
  formOpen.value = true
}

function openEdit(token: ApiToken) {
  editingToken.value = token
  // 编辑时默认显示"永久"，选择天数后从当前时间重新计算
  form.value = { name: token.name, expiresInDays: 0 }
  formOpen.value = true
}

async function handleSave() {
  if (!props.user) return
  try {
    if (editingToken.value) {
      await adminApi.updateToken(props.user.id, editingToken.value.id, {
        name: form.value.name,
        expiresInDays: form.value.expiresInDays,
      })
    } else {
      await adminApi.createToken(props.user.id, {
        name: form.value.name,
        expiresInDays: form.value.expiresInDays,
      })
    }
    toast.success(t('common.success'))
    formOpen.value = false
    await loadTokens()
    emit('changed')
  } catch {
    toast.error(t('common.failed'))
  }
}

async function handleDelete(token: ApiToken) {
  if (!props.user) return
  if (!(await requireConfirm({ description: t('admin.token.deleteConfirm') }))) return
  try {
    await adminApi.deleteToken(props.user.id, token.id)
    toast.success(t('common.success'))
    await loadTokens()
    emit('changed')
  } catch {
    toast.error(t('common.failed'))
  }
}

async function copyToken(token: ApiToken) {
  try {
    await navigator.clipboard.writeText(token.token)
    toast.success(t('common.success'))
  } catch {
    toast.error(t('common.failed'))
  }
}

function isExpired(token: ApiToken) {
  return token.expiresAt !== -1 && token.expiresAt < Date.now()
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ t('admin.token.manageTitle', { name: props.user?.username ?? '' }) }}</DialogTitle>
        <DialogDescription>{{ t('admin.token.manageHint') }}</DialogDescription>
      </DialogHeader>

      <div class="flex justify-end">
        <Button @click="openCreate">
          <RiAddLine class="mr-2 size-4" /> {{ t('admin.token.create') }}
        </Button>
      </div>

      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('common.name') }}</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>{{ t('admin.token.expiry') }}</TableHead>
              <TableHead>{{ t('common.createdAt') }}</TableHead>
              <TableHead>{{ t('common.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.loading') }}</TableCell>
            </TableRow>
            <TableRow v-else-if="!tokens.length">
              <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.noData') }}</TableCell>
            </TableRow>
            <TableRow v-for="token in tokens" :key="token.id">
              <TableCell class="font-medium">{{ token.name || '-' }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-1">
                  <code class="max-w-[220px] truncate font-mono text-xs text-muted-foreground">{{ token.token }}</code>
                  <Button variant="ghost" size="icon" :title="t('admin.token.copy')" @click="copyToken(token)">
                    <RiFileCopyLine class="size-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-1">
                  <Badge v-if="token.expiresAt === -1" variant="secondary">{{ t('admin.token.neverExpires') }}</Badge>
                  <template v-else>
                    <span class="text-xs">{{ formatTime(token.expiresAt) }}</span>
                    <Badge v-if="isExpired(token)" variant="destructive">{{ t('admin.token.expired') }}</Badge>
                  </template>
                </div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ formatTime(token.createdAt) }}</TableCell>
              <TableCell>
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon" @click="openEdit(token)">
                    <RiEditLine class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" @click="handleDelete(token)">
                    <RiDeleteBinLine class="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Create/Edit Token Dialog -->
      <Dialog v-model:open="formOpen">
        <DialogContent class="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{{ editingToken ? t('admin.token.edit') : t('admin.token.create') }}</DialogTitle>
          </DialogHeader>
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">{{ t('common.name') }}</label>
              <Input v-model="form.name" :placeholder="t('admin.token.namePlaceholder')" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">{{ t('admin.token.expiry') }}</label>
              <select v-model.number="form.expiresInDays" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option v-for="days in EXPIRY_OPTIONS" :key="days" :value="days">{{ expiryLabel(days) }}</option>
              </select>
              <p v-if="editingToken" class="text-xs text-muted-foreground">{{ t('admin.token.expiryEditHint') }}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="formOpen = false">{{ t('common.cancel') }}</Button>
            <Button @click="handleSave">{{ t('common.save') }}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContent>
  </Dialog>

  <!-- Delete confirmation -->
  <ConfirmDialog
    v-bind="confirmDialog"
    @update:open="confirmDialog.open = $event"
    @confirm="confirmDialog.resolve(true)"
    @cancel="confirmDialog.resolve(false)"
  />
</template>
