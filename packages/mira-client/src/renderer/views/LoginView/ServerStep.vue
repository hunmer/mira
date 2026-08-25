<script setup lang="ts">
/**
 * 步骤 1：服务器连接
 *
 * 两个视图：
 * - 服务器列表：展示已保存服务器（带后端可用性徽标）+ 添加入口 + 删除确认
 * - 添加表单：服务器名称 / 地址 / WebSocket 地址
 */
import { ref, nextTick } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-vue-next'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ServerConfig } from '@renderer/stores/serverList'
import type { BackendStatus } from './useBackendStatus'

defineOptions({ name: 'ServerStep' })

defineProps<{
  loading: boolean
  selectedServerId: string
  // 服务器列表
  services: ServerConfig[]
  // 后端可用性
  backendStatus: Record<string, BackendStatus>
  backendStatusLabel: (id: string) => string
  backendStatusClass: (id: string) => string
  backendStatusDotClass: (id: string) => string
}>()

// 表单字段与开关通过 v-model 与父级双向绑定
const showAddForm = defineModel<boolean>('showAddForm', { required: true })
const showWsField = defineModel<boolean>('showWsField', { required: true })
const serverName = defineModel<string>('serverName', { required: true })
const serverAddress = defineModel<string>('serverAddress', { required: true })
const wsAddress = defineModel<string>('wsAddress', { required: true })

const emit = defineEmits<{
  quickConnect: [server: ServerConfig]
  testConnection: []
  deleteServer: [id: string]
}>()

// 删除确认对话框（自包含，父级无需感知）
const deleteTarget = ref<ServerConfig | null>(null)

function openDeleteDialog(server: ServerConfig) {
  deleteTarget.value = server
}

function handleDeleteDialogOpenChange(open: boolean) {
  if (!open) closeDeleteDialog()
}

function closeDeleteDialog() {
  deleteTarget.value = null
}

// 进入添加表单前清空表单，避免残留上一次连接/预填的服务器数据
function openAddForm() {
  serverName.value = ''
  serverAddress.value = ''
  wsAddress.value = ''
  showWsField.value = false
  showAddForm.value = true
}

async function handleDeleteServer() {
  const target = deleteTarget.value
  if (!target) return
  closeDeleteDialog()
  await nextTick()
  emit('deleteServer', target.id)
}
</script>

<template>
  <div>
    <!-- Server List View -->
    <div v-if="!showAddForm" class="flex flex-col gap-4">
      <div class="flex flex-col gap-3">
        <!-- Add Server Card -->
        <div
          class="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border dark:border-border rounded-xl cursor-pointer transition-all hover:border-primary dark:hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/10"
          @click="openAddForm"
        >
          <span class="material-icons text-2xl text-muted-foreground dark:text-muted-foreground">add</span>
          <span class="text-sm text-muted-foreground dark:text-muted-foreground">{{ $t('views.serverStep.addServer') }}</span>
        </div>
        <!-- Existing Server Cards -->
        <div
          v-for="server in services"
          :key="server.id"
          class="relative flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all overflow-hidden group"
          :class="loading && selectedServerId === server.id
            ? 'border-primary dark:border-primary bg-primary/15 dark:bg-primary/10'
            : 'border-border dark:border-border hover:border-primary dark:hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/10'"
          @click="emit('quickConnect', server)"
        >
          <!-- 连接中 loader 遮罩 -->
          <div
            v-if="loading && selectedServerId === server.id"
            class="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
          >
            <div class="flex items-center gap-2 text-primary dark:text-primary">
              <Loader2 class="w-4 h-4 animate-spin" />
              <span class="text-xs font-medium">{{ $t('views.serverStep.connecting') }}</span>
            </div>
          </div>
          <!-- 顶部扫描线动效 -->
          <div
            v-if="loading && selectedServerId === server.id"
            class="absolute inset-x-0 top-0 h-0.5 bg-primary/70 dark:bg-primary/70 animate-[scan_1.2s_ease-in-out_infinite]"
          />
          <span class="material-icons text-lg text-primary dark:text-primary">dns</span>
          <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm text-foreground dark:text-muted-foreground truncate">{{ server.name }}</span>
              <!-- 后端可用性徽标 -->
              <Badge
                :variant="'outline'"
                :class="backendStatusClass(server.id)"
                class="shrink-0 gap-1 px-1.5 py-0 text-[10px]"
              >
                <span
                  v-if="backendStatus[server.id] === 'checking'"
                  class="material-icons text-[10px] animate-spin"
                >sync</span>
                <span
                  v-else
                  class="w-1.5 h-1.5 rounded-full"
                  :class="backendStatusDotClass(server.id)"
                />
                {{ backendStatusLabel(server.id) }}
              </Badge>
            </div>
            <span class="text-xs text-muted-foreground dark:text-muted-foreground truncate">{{ server.serverUrl }}</span>
          </div>
          <Button variant="ghost" size="icon-sm" class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive" @click.stop="openDeleteDialog(server)">
            <span class="material-icons text-base">delete</span>
          </Button>
        </div>
      </div>
      <div v-if="services.length === 0" class="text-center py-4 text-sm text-muted-foreground dark:text-muted-foreground">
        {{ $t('views.serverStep.noServers') }}
      </div>

      <!-- Delete Confirmation Dialog -->
      <AlertDialog v-if="deleteTarget" :open="true" @update:open="handleDeleteDialogOpenChange">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ $t('views.serverStep.deleteTitle') }}</AlertDialogTitle>
            <AlertDialogDescription>{{ $t('views.serverStep.deleteDesc', { name: deleteTarget?.name }) }}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" @click="closeDeleteDialog">{{ $t('views.serverStep.cancel') }}</Button>
            <Button type="button" class="bg-destructive hover:bg-destructive text-white" @click="handleDeleteServer">{{ $t('views.serverStep.delete') }}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    <!-- Add Server Form -->
    <form v-else @submit.prevent="emit('testConnection')" class="flex flex-col gap-4 relative">
      <button type="button" class="absolute -top-1 right-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-muted-foreground bg-transparent border-none cursor-pointer" @click="showAddForm = false">
        <span class="material-icons text-sm">arrow_back</span>
        {{ $t('views.serverStep.backToList') }}
      </button>
      <div class="flex flex-col gap-1">
        <Label>{{ $t('views.serverStep.serverName') }}</Label>
        <Input v-model="serverName" type="text" :placeholder="$t('views.serverStep.serverName')" required />
      </div>
      <div class="flex flex-col gap-1">
        <Label>{{ $t('views.serverStep.serverAddress') }}</Label>
        <Input v-model="serverAddress" type="text" placeholder="http://192.168.1.100" required />
      </div>
      <Button type="button" variant="ghost" size="sm" @click="showWsField = !showWsField">
        <span class="material-icons text-sm">{{ showWsField ? 'expand_less' : 'expand_more' }}</span>
        {{ $t('views.serverStep.wsAddressToggle') }}
      </Button>
      <div v-if="showWsField" class="flex flex-col gap-1">
        <Label>{{ $t('views.serverStep.wsAddressLabel') }}</Label>
        <Input v-model="wsAddress" type="text" :placeholder="$t('views.serverStep.wsPortPlaceholder')" />
      </div>
      <Button type="submit" class="w-full" :disabled="loading">
        <Loader2 v-if="loading" class="animate-spin" />
        {{ loading ? $t('views.serverStep.connecting') : $t('views.serverStep.next') }}
      </Button>
    </form>
  </div>
</template>

<style scoped>
@keyframes scan {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
