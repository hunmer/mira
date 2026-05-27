<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { User } from '@/types/auth'
import { adminApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { RiAddLine, RiEditLine, RiDeleteBinLine } from '@remixicon/vue'

const { t } = useI18n()
const admins = ref<User[]>([])
const loading = ref(false)
const dialogOpen = ref(false)
const editing = ref<{ id?: string; username: string; email: string; password: string; role: string } | null>(null)

async function loadAdmins() {
  loading.value = true
  try {
    const res = await adminApi.list()
    admins.value = Array.isArray(res.data) ? res.data : []
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = { username: '', email: '', password: '' }
  dialogOpen.value = true
}

function openEdit(user: User) {
  editing.value = { id: user.id, username: user.username, email: user.email, password: '' }
  dialogOpen.value = true
}

async function handleSave() {
  if (!editing.value) return
  try {
    if (editing.value.id) {
      await adminApi.update(editing.value.id, {
        username: editing.value.username,
        email: editing.value.email,
        ...(editing.value.password ? { password: editing.value.password } : {}),
      })
    } else {
      await adminApi.create({
        username: editing.value.username,
        email: editing.value.email,
        password: editing.value.password,
      })
    }
    toast.success(t('common.success'))
    dialogOpen.value = false
    await loadAdmins()
  } catch {
    toast.error(t('common.failed'))
  }
}

async function handleDelete(id: string) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await adminApi.delete(id)
    toast.success(t('common.success'))
    await loadAdmins()
  } catch {
    toast.error(t('common.failed'))
  }
}

onMounted(loadAdmins)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('admin.title') }}</h1>
      <Button @click="openCreate">
        <RiAddLine class="mr-2 size-4" /> {{ t('admin.createAdmin') }}
      </Button>
    </div>

    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('common.name') }}</TableHead>
            <TableHead>{{ t('admin.email') }}</TableHead>
            <TableHead>{{ t('admin.role') }}</TableHead>
            <TableHead>{{ t('common.createdAt') }}</TableHead>
            <TableHead>{{ t('common.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!admins.length">
            <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.noData') }}</TableCell>
          </TableRow>
          <TableRow v-for="admin in admins" :key="admin.id">
            <TableCell class="font-medium">{{ admin.username }}</TableCell>
            <TableCell class="text-muted-foreground">{{ admin.email }}</TableCell>
            <TableCell>
              <Badge :variant="admin.role === 'super' ? 'default' : admin.role === 'admin' ? 'secondary' : 'outline'">
                {{ admin.role === 'super' ? t('admin.superAdmin') : admin.role === 'admin' ? t('admin.admin') : admin.role }}
              </Badge>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ admin.createdAt?.slice(0, 10) }}</TableCell>
            <TableCell>
              <div class="flex gap-1">
                <Button variant="ghost" size="icon" @click="openEdit(admin)">
                  <RiEditLine class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="handleDelete(admin.id)">
                  <RiDeleteBinLine class="size-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editing?.id ? t('admin.editAdmin') : t('admin.createAdmin') }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4" v-if="editing">
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('common.name') }}</label>
            <Input v-model="editing.username" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('admin.email') }}</label>
            <Input v-model="editing.email" type="email" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('auth.password') }}</label>
            <Input v-model="editing.password" type="password" :placeholder="editing.id ? '(leave empty to keep)' : ''" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button @click="handleSave">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
