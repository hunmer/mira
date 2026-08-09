<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.serverManagementDialog.title') }}</DialogTitle>
      </DialogHeader>
    <!-- 服务器列表 -->
    <div class="max-h-[400px] overflow-y-auto">
      <div v-if="servers.length === 0" class="flex flex-col items-center p-6 text-center">
        <span class="material-icons text-muted-foreground text-4xl mb-4">folder_off</span>
        <p class="text-muted-foreground mb-2">{{ $t('business.serverManagementDialog.emptyTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('business.serverManagementDialog.emptyDesc') }}</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="server in servers"
          :key="server.id"
          class="server-item flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted transition-colors"
        >
          <div class="flex items-center space-x-3 flex-1">
            <span class="material-icons text-primary">dns</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <h3 class="font-medium text-foreground truncate">{{ server.name }}</h3>
                <span
                  v-if="server.id === activeServerId"
                  class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full"
                >
                  {{ $t('business.serverManagementDialog.current') }}
                </span>
              </div>
              <p class="text-sm text-muted-foreground truncate">{{ server.serverUrl }}</p>
              <p class="text-xs text-muted-foreground">
                {{ $t('business.serverManagementDialog.createdAt', { date: formatDate(server.createdAt) }) }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <!-- 切换为当前服务器 -->
            <button
              v-if="server.id !== activeServerId"
              @click="handleSetActive(server.id)"
              class="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              :title="$t('business.serverManagementDialog.setCurrent')"
            >
              <span class="material-icons text-sm">radio_button_unchecked</span>
            </button>

            <!-- 编辑按钮 -->
            <button
              @click="handleEdit(server)"
              class="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              :title="$t('business.serverManagementDialog.edit')"
            >
              <span class="material-icons text-sm">edit</span>
            </button>

            <!-- 删除按钮 -->
            <button
              @click="handleDelete(server)"
              :disabled="servers.length === 1"
              class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :title="$t('business.serverManagementDialog.delete')"
            >
              <span class="material-icons text-sm">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <DialogFooter>
      <button
        @click="handleAddNew"
        class="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors"
      >
        <span class="material-icons text-sm">add</span>
        <span>{{ $t('business.serverManagementDialog.connectServer') }}</span>
      </button>
    </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 确认删除对话框 -->
  <Dialog
    :open="showDeleteConfirm"
    @update:open="showDeleteConfirm = $event"
  >
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.serverManagementDialog.confirmDeleteTitle') }}</DialogTitle>
      </DialogHeader>
    <div class="flex items-start space-x-3">
      <span class="material-icons text-destructive text-2xl">warning</span>
      <div>
        <p class="text-foreground mb-2">
          {{ $t('business.serverManagementDialog.confirmDeleteMsg', { name: deleteTarget?.name }) }}
        </p>
        <p class="text-sm text-muted-foreground">
          {{ $t('business.serverManagementDialog.confirmDeleteDesc') }}
        </p>
      </div>
    </div>

    <DialogFooter>
      <div class="flex justify-end space-x-3">
        <button
          @click="showDeleteConfirm = false"
          class="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
        >
          {{ $t('business.serverManagementDialog.cancel') }}
        </button>
        <button
          @click="confirmDelete"
          class="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive transition-colors"
        >
          {{ $t('business.serverManagementDialog.deleteBtn') }}
        </button>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useServerListStore, type ServerConfig } from '@renderer/stores/serverList'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'edit-server', server: ServerConfig): void
  (e: 'add-server'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const serverListStore = useServerListStore()

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const servers = computed(() => serverListStore.services)
const activeServerId = computed(() => serverListStore.activeServerId)

const showDeleteConfirm = ref(false)
const deleteTarget = ref<ServerConfig | null>(null)

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const handleSetActive = async (serverId: string) => {
  try {
    await serverListStore.setActiveServer(serverId)
  } catch (error) {
    console.error('设置活跃服务器失败:', error)
  }
}

const handleEdit = (server: ServerConfig) => {
  emit('edit-server', server)
}

const handleAddNew = () => {
  emit('add-server')
}

const handleDelete = (server: ServerConfig) => {
  deleteTarget.value = server
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  try {
    await serverListStore.deleteServer(deleteTarget.value.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } catch (error) {
    console.error('删除服务器失败:', error)
  }
}
</script>
