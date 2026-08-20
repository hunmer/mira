<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="server-edit-dialog sm:max-w-[700px] max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? $t('business.serverEditDialog.editTitle') : $t('business.serverEditDialog.createTitle') }}</DialogTitle>
      </DialogHeader>
    <div class="max-h-[calc(90vh-180px)] overflow-y-auto p-6 pb-4">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- 基本信息 - 双栏布局 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 服务器名称 -->
          <div class="form-field">
            <label for="name" class="block text-sm font-medium text-foreground mb-2">
              {{ $t('business.serverEditDialog.nameLabel') }}
            </label>
            <Input
              id="name"
              v-model="formData.name"
              :class="[
                'w-full',
                errors.name ? 'border-destructive' : ''
              ]"
              :placeholder="$t('business.serverEditDialog.namePlaceholder')"
              :data-invalid="!!errors.name"
            />
            <span v-if="errors.name" class="text-destructive text-sm mt-1">{{ errors.name }}</span>
          </div>

          <!-- 服务器 ID -->
          <div class="form-field">
            <label for="id" class="block text-sm font-medium text-foreground mb-2">
              {{ $t('business.serverEditDialog.idLabel') }}
            </label>
            <Input
              id="id"
              v-model="formData.id"
              :class="[
                'w-full',
                errors.id ? 'border-destructive' : ''
              ]"
              :placeholder="$t('business.serverEditDialog.idPlaceholder')"
              :data-invalid="!!errors.id"
              :readonly="isEdit"
            />
            <span v-if="errors.id" class="text-destructive text-sm mt-1">{{ errors.id }}</span>
            <p class="text-xs text-muted-foreground mt-1">
              {{ isEdit ? $t('business.serverEditDialog.idEditHint') : $t('business.serverEditDialog.idCreateHint') }}
            </p>
          </div>
        </div>

        <!-- 网络配置 - 双栏布局 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 服务器地址 -->
          <div class="form-field">
            <label for="serverUrl" class="block text-sm font-medium text-foreground mb-2">
              {{ $t('business.serverEditDialog.serverUrlLabel') }}
            </label>
            <Input
              id="serverUrl"
              v-model="formData.serverUrl"
              :class="[
                'w-full',
                errors.serverUrl ? 'border-destructive' : ''
              ]"
              placeholder="http://localhost:8081"
              :data-invalid="!!errors.serverUrl"
            />
            <span v-if="errors.serverUrl" class="text-destructive text-sm mt-1">{{ errors.serverUrl }}</span>
            <p class="text-xs text-muted-foreground mt-1">
              {{ $t('business.serverEditDialog.serverUrlHint') }}
            </p>
          </div>

          <!-- WebSocket 地址 -->
          <div class="form-field">
            <label for="websocketUrl" class="block text-sm font-medium text-foreground mb-2">
              {{ $t('business.serverEditDialog.wsUrlLabel') }}
            </label>
            <Input
              id="websocketUrl"
              v-model="formData.websocketUrl"
              :class="[
                'w-full',
                errors.websocketUrl ? 'border-destructive' : ''
              ]"
              placeholder="ws://localhost:8018"
              :data-invalid="!!errors.websocketUrl"
            />
            <span v-if="errors.websocketUrl" class="text-destructive text-sm mt-1">{{ errors.websocketUrl }}</span>
            <p class="text-xs text-muted-foreground mt-1">
              {{ $t('business.serverEditDialog.wsUrlHint') }}
            </p>
          </div>
        </div>

        <!-- 认证配置 -->
        <div class="form-field">
          <div class="flex items-center justify-between mb-4">
            <label class="block text-sm font-medium text-foreground">
              {{ $t('business.serverEditDialog.authMethod') }}
            </label>
            <!-- 认证方式切换 -->
            <ToggleGroup
              type="single"
              :model-value="formData.authMethod"
              @update:model-value="handleAuthMethodChange"
            >
              <ToggleGroupItem value="credentials">Auth</ToggleGroupItem>
              <ToggleGroupItem value="token">Token</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <!-- 用户名密码输入框 -->
          <div v-if="!authTokenMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="username" class="block text-sm font-medium text-foreground mb-2">
                {{ $t('business.serverEditDialog.usernameLabel') }}
              </label>
              <Input
                id="username"
                v-model="formData.username"
                :class="[
                  'w-full',
                  errors.username ? 'border-destructive' : ''
                ]"
                :placeholder="$t('business.serverEditDialog.usernamePlaceholder')"
                :data-invalid="!!errors.username"
              />
              <span v-if="errors.username" class="text-destructive text-sm mt-1">{{ errors.username }}</span>
              <p class="text-xs text-muted-foreground mt-1">
                {{ $t('business.serverEditDialog.usernameHint') }}
              </p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-foreground mb-2">
                {{ $t('business.serverEditDialog.passwordLabel') }}
              </label>
              <Input
                id="password"
                v-model="formData.password"
                :class="[
                  'w-full',
                  errors.password ? 'border-destructive' : ''
                ]"
                :placeholder="$t('business.serverEditDialog.passwordPlaceholder')"
                :data-invalid="!!errors.password"
                type="password"
              />
              <span v-if="errors.password" class="text-destructive text-sm mt-1">{{ errors.password }}</span>
              <p class="text-xs text-muted-foreground mt-1">
                {{ $t('business.serverEditDialog.passwordHint') }}
              </p>
            </div>
          </div>

          <!-- Token 输入框 -->
          <div v-if="authTokenMode" class="space-y-2">
            <label for="authTokenValue" class="block text-sm font-medium text-foreground">
              {{ $t('business.serverEditDialog.authTokenLabel') }}
            </label>
            <Input
              id="authTokenValue"
              v-model="formData.authToken"
              :class="[
                'w-full',
                errors.authToken ? 'border-destructive' : ''
              ]"
              :placeholder="$t('business.serverEditDialog.authTokenPlaceholder')"
              :data-invalid="!!errors.authToken"
              type="password"
            />
            <span v-if="errors.authToken" class="text-destructive text-sm mt-1">{{ errors.authToken }}</span>
            <p class="text-xs text-muted-foreground">
              {{ $t('business.serverEditDialog.authTokenHint') }}
            </p>
          </div>
        </div>

        <!-- 连接测试结果显示区域 -->
        <div v-if="connectionTestResult" class="form-field">
          <div
            v-if="connectionTestResult.success"
            class="flex items-center space-x-2 text-green-600 text-sm p-3 bg-green-50 rounded-lg border border-green-200"
          >
            <span class="material-icons text-sm">check_circle</span>
            <span>{{ $t('business.serverEditDialog.connectionSuccess') }}</span>
          </div>
          <div
            v-else
            class="flex items-center space-x-2 text-destructive text-sm p-3 bg-destructive rounded-lg border border-destructive"
          >
            <span class="material-icons text-sm">error</span>
            <span>{{ $t('business.serverEditDialog.connectionFailed', { error: connectionTestResult.error }) }}</span>
          </div>
        </div>

        <!-- SMB 配置 -->
        <div class="form-field mt-4">
          <div class="flex items-center justify-between mb-4">
            <label class="text-sm font-medium text-foreground">
              {{ $t('business.serverEditDialog.smbLabel') }}
            </label>
            <div class="flex items-center space-x-3">
              <Switch
                :modelValue="smbEnabled"
                @update:modelValue="smbEnabled = $event"
                class="scale-75"
              />
            </div>
          </div>

          <!-- SMB 路径配置 -->
          <div v-if="smbEnabled" class="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 挂载路径 -->
            <div>
              <label for="mountPath" class="block text-sm font-medium text-foreground mb-2">
                {{ $t('business.serverEditDialog.mountPathLabel') }}
              </label>
              <Input
                id="mountPath"
                v-model="formData.mountPath"
                :class="[
                  'w-full',
                  errors.mountPath ? 'border-destructive' : ''
                ]"
                placeholder="/mnt/media"
                :data-invalid="!!errors.mountPath"
              />
              <span v-if="errors.mountPath" class="text-destructive text-sm mt-1">{{ errors.mountPath }}</span>
              <p class="text-xs text-muted-foreground mt-1">
                {{ $t('business.serverEditDialog.mountPathHint') }}
              </p>
            </div>

            <!-- SMB 路径 -->
            <div>
              <label for="smbPath" class="block text-sm font-medium text-foreground mb-2">
                {{ $t('business.serverEditDialog.smbPathLabel') }}
              </label>
              <Input
                id="smbPath"
                v-model="formData.smbPath"
                :class="[
                  'w-full',
                  errors.smbPath ? 'border-destructive' : ''
                ]"
                placeholder="\\\\server\\share\\path"
                :data-invalid="!!errors.smbPath"
              />
              <span v-if="errors.smbPath" class="text-destructive text-sm mt-1">{{ errors.smbPath }}</span>
              <p class="text-xs text-muted-foreground mt-1">
                {{ $t('business.serverEditDialog.smbPathHint') }}
              </p>
            </div>
          </div>
        </div>

      <!-- 保存登录信息（新增时显示） -->
      <div v-if="!isEdit" class="form-field">
        <div class="flex items-center space-x-2">
          <Checkbox
            id="saveCredentials"
            :model-value="formData.saveCredentials"
            @update:model-value="formData.saveCredentials = Boolean($event)"
          />
          <label for="saveCredentials" class="text-sm text-foreground">
            {{ $t('business.serverEditDialog.saveCredentialsLabel') }}
          </label>
        </div>
        <p class="text-xs text-muted-foreground mt-1">
          {{ $t('business.serverEditDialog.saveCredentialsHint') }}
        </p>
      </div>
      </form>
    </div>

    <DialogFooter>
      <div class="flex justify-between items-center">
        <!-- 左侧：连接测试按钮 -->
        <button
          type="button"
          @click="testConnection"
          :disabled="!formData.serverUrl || isTesting"
          class="flex items-center space-x-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="material-icons text-sm" :class="{ 'animate-spin': isTesting }">
            {{ isTesting ? 'sync' : 'wifi_find' }}
          </span>
          <span>{{ isTesting ? $t('business.serverEditDialog.testing') : $t('business.serverEditDialog.testConnection') }}</span>
        </button>

        <!-- 右侧：操作按钮 -->
        <div class="flex space-x-3">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {{ $t('business.serverEditDialog.cancel') }}
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="!isFormValid || isSubmitting"
            class="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting" class="material-icons text-sm animate-spin">sync</span>
            <span>{{ isEdit ? $t('business.serverEditDialog.save') : $t('business.serverEditDialog.add') }}</span>
          </button>
        </div>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useServerListStore, type ServerConfig } from '@renderer/stores/serverList'

interface Props {
  visible: boolean
  library?: ServerConfig | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'saved', library: ServerConfig): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const serverListStore = useServerListStore()
const DEFAULT_WS_PORT = '8018'

const createWebSocketUrl = (serverUrl: string): string => {
  try {
    const url = new URL(serverUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.port = DEFAULT_WS_PORT
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return serverUrl.replace(/^http/, 'ws')
  }
}

// 生成唯一的库ID
const generateLibraryId = (): string => {
  return `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const isEdit = computed(() => !!props.library)

const formData = ref({
  id: '',
  name: '',
  serverUrl: '',
  websocketUrl: '',
  saveCredentials: true,
  // 认证相关字段
  authMethod: 'credentials', // 'token' | 'credentials'
  authToken: '',
  username: '',
  password: '',
  // SMB 相关字段
  smbEnabled: false,
  mountPath: '',
  smbPath: ''
})

// 认证方式：仅读 computed（切换通过 handleAuthMethodChange）
const authTokenMode = computed(() => formData.value.authMethod === 'token')

// ToggleGroup 切换处理（点击已选中项时值为 undefined，需忽略）
const handleAuthMethodChange = (value: string | undefined) => {
  if (!value || value === formData.value.authMethod) return
  formData.value.authMethod = value
  if (value === 'token') {
    // 切换到 token 模式时清空用户名密码
    formData.value.username = ''
    formData.value.password = ''
  } else {
    // 切换到密码模式时清空 token
    formData.value.authToken = ''
  }
}

const errors = ref<{
  id?: string
  name?: string
  serverUrl?: string
  websocketUrl?: string
  authToken?: string
  username?: string
  password?: string
  mountPath?: string
  smbPath?: string
}>({})

const isTesting = ref(false)
const isSubmitting = ref(false)
const connectionTestResult = ref<{
  success: boolean
  error?: string
} | null>(null)

// 函数定义
const validateServerUrl = () => {
  const url = formData.value.serverUrl.trim()
  if (url && !url.match(/^https?:\/\/.+/)) {
    errors.value.serverUrl = t('business.serverEditDialog.errServerUrl')
  } else if (errors.value.serverUrl) {
    delete errors.value.serverUrl
  }
}

const resetForm = () => {
  formData.value = {
    id: generateLibraryId(), // 为新增模式生成默认ID
    name: '',
    serverUrl: '',
    websocketUrl: '',
    saveCredentials: true,
    // 认证相关字段
    authMethod: 'credentials',
    authToken: '',
    username: '',
    password: '',
    // SMB 相关字段
    smbEnabled: false,
    mountPath: '',
    smbPath: ''
  }
  errors.value = {}
  connectionTestResult.value = null
}

const isFormValid = computed(() => {
  return formData.value.id.trim() &&
         formData.value.name.trim() &&
         formData.value.serverUrl.trim() &&
         formData.value.websocketUrl.trim() &&
         !errors.value.id &&
         !errors.value.name &&
         !errors.value.serverUrl &&
         !errors.value.websocketUrl
})

// 当编辑库发生变化时，更新表单数据
watch(() => props.library, (newLibrary) => {
  if (newLibrary) {
    formData.value = {
      id: newLibrary.id,
      name: newLibrary.name,
      serverUrl: newLibrary.serverUrl,
      websocketUrl: newLibrary.websocketUrl,
      saveCredentials: true,
      // 认证相关字段
      authMethod: newLibrary.authToken ? 'token' : 'credentials',
      authToken: newLibrary.authToken || '',
      username: newLibrary.savedCredentials?.username || '',
      password: '', // 出于安全考虑，不回填密码
      // SMB 相关字段
      smbEnabled: newLibrary.smb?.enabled || false,
      mountPath: newLibrary.smb?.mountPath || '',
      smbPath: newLibrary.smb?.smbPath || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听可见性变化，重置表单
watch(isVisible, (visible) => {
  if (visible && !props.library) {
    resetForm()
  }
  if (!visible) {
    connectionTestResult.value = null
    errors.value = {}
  }
})

// 监听服务器URL变化，自动生成WebSocket URL
watch(() => formData.value.serverUrl, () => {
  // 清除连接测试结果
  connectionTestResult.value = null
  formData.value.websocketUrl = createWebSocketUrl(formData.value.serverUrl.trim())
  // 清除服务器URL错误
  if (errors.value.serverUrl) {
    validateServerUrl()
  }
})

// SMB 状态的计算属性（确保响应性）
const smbEnabled = computed({
  get: () => formData.value.smbEnabled,
  set: (value: boolean) => {
    formData.value.smbEnabled = value
  }
})

const validateForm = () => {
  errors.value = {}

  if (!formData.value.id.trim()) {
    errors.value.id = t('business.serverEditDialog.errIdRequired')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.value.id.trim())) {
    errors.value.id = t('business.serverEditDialog.errIdInvalid')
  }

  if (!formData.value.name.trim()) {
    errors.value.name = t('business.serverEditDialog.errNameRequired')
  }

  if (!formData.value.serverUrl.trim()) {
    errors.value.serverUrl = t('business.serverEditDialog.errServerUrlRequired')
  } else {
    validateServerUrl()
  }

  if (!formData.value.websocketUrl.trim()) {
    errors.value.websocketUrl = t('business.serverEditDialog.errWsUrlRequired')
  } else if (!formData.value.websocketUrl.match(/^wss?:\/\/.+/)) {
    errors.value.websocketUrl = t('business.serverEditDialog.errWsUrlInvalid')
  }

  // 认证验证
  if (authTokenMode.value) {
    if (!formData.value.authToken.trim()) {
      errors.value.authToken = t('business.serverEditDialog.errAuthTokenRequired')
    }
  } else {
    // 用户名密码模式的验证可以设为可选，或者根据需要设为必填
    // if (!formData.value.username.trim()) {
    //   errors.value.username = t('business.serverEditDialog.errUsernameRequired')
    // }
    // if (!formData.value.password.trim()) {
    //   errors.value.password = t('business.serverEditDialog.errPasswordRequired')
    // }
  }

  // SMB 验证
  if (formData.value.smbEnabled) {
    if (!formData.value.mountPath.trim()) {
      errors.value.mountPath = t('business.serverEditDialog.errMountPathRequired')
    }
    if (!formData.value.smbPath.trim()) {
      errors.value.smbPath = t('business.serverEditDialog.errSmbPathRequired')
    }
  }

  return Object.keys(errors.value).length === 0
}


const testConnection = async () => {
  if (!formData.value.serverUrl) return

  isTesting.value = true
  connectionTestResult.value = null

  try {
    const result = await serverListStore.testServerConnection({
      serverUrl: formData.value.serverUrl
    })
    connectionTestResult.value = result
  } catch (error) {
    connectionTestResult.value = {
      success: false,
      error: error instanceof Error ? error.message : t('business.serverEditDialog.unknownError')
    }
  } finally {
    isTesting.value = false
  }
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    let result

    if (isEdit.value && props.library) {
      // 更新现有服务器
      result = await serverListStore.updateServer(props.library.id, {
        name: formData.value.name.trim(),
        serverUrl: formData.value.serverUrl.trim(),
        websocketUrl: formData.value.websocketUrl.trim(),
        authToken: authTokenMode.value ? formData.value.authToken.trim() : undefined,
        savedCredentials: !authTokenMode.value && formData.value.saveCredentials && formData.value.username.trim() ? {
          username: formData.value.username.trim(),
          encryptedPassword: formData.value.password.trim(), // 实际应用中需要加密
          autoLogin: true
        } : undefined,
        smb: formData.value.smbEnabled ? {
          enabled: true,
          mountPath: formData.value.mountPath.trim(),
          smbPath: formData.value.smbPath.trim()
        } : { enabled: false }
      })
    } else {
      // 添加新服务器
      const ServerConfig = {
        id: formData.value.id.trim(), // 使用表单中的ID
        name: formData.value.name.trim(),
        serverUrl: formData.value.serverUrl.trim(),
        websocketUrl: formData.value.websocketUrl.trim(),
        authToken: authTokenMode.value ? formData.value.authToken.trim() : undefined,
        savedCredentials: !authTokenMode.value && formData.value.saveCredentials && formData.value.username.trim() ? {
          username: formData.value.username.trim(),
          encryptedPassword: formData.value.password.trim(), // 实际应用中需要加密
          autoLogin: true
        } : undefined,
        smb: formData.value.smbEnabled ? {
          enabled: true,
          mountPath: formData.value.mountPath.trim(),
          smbPath: formData.value.smbPath.trim()
        } : { enabled: false }
      }

      result = await serverListStore.addServer(ServerConfig)
    }

    if (result.success && result.data) {
      emit('saved', result.data)
      emit('update:visible', false)
    } else {
      // 处理错误
      console.error('保存失败:', result.error)
    }
  } catch (error) {
    console.error('保存服务器失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.library-edit-dialog :deep([data-radix-dialog-content]) {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 0;
}

.max-h-\[calc\(90vh-180px\)\]::-webkit-scrollbar {
  width: 8px;
}

.max-h-\[calc\(90vh-180px\)\]::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.max-h-\[calc\(90vh-180px\)\]::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.max-h-\[calc\(90vh-180px\)\]::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

@media (max-width: 768px) {
  .library-edit-dialog {
    margin: 1rem;
  }

  .library-edit-dialog :deep([data-radix-dialog-content]) {
    width: calc(100vw - 2rem) !important;
    max-width: none !important;
  }

  .grid.md\\:grid-cols-2 {
    grid-template-columns: 1fr !important;
  }
}

.library-edit-dialog :deep(.p-togglebutton) {
  min-width: 80px;
}
</style>
