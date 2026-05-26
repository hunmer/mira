<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="server-edit-dialog sm:max-w-[700px] max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? '编辑服务器' : '连接服务器' }}</DialogTitle>
      </DialogHeader>
    <div class="dialog-content">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- 基本信息 - 双栏布局 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 服务器名称 -->
          <div class="form-field">
            <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
              服务器名称 *
            </label>
            <Input
              id="name"
              v-model="formData.name"
              :class="[
                'w-full',
                errors.name ? 'border-red-500' : ''
              ]"
              placeholder="请输入服务器名称"
              :data-invalid="!!errors.name"
            />
            <span v-if="errors.name" class="text-red-500 text-sm mt-1">{{ errors.name }}</span>
          </div>

          <!-- 服务器 ID -->
          <div class="form-field">
            <label for="id" class="block text-sm font-medium text-gray-700 mb-2">
              服务器 ID *
            </label>
            <Input
              id="id"
              v-model="formData.id"
              :class="[
                'w-full',
                errors.id ? 'border-red-500' : ''
              ]"
              placeholder="请输入或使用生成的 ID"
              :data-invalid="!!errors.id"
              :readonly="isEdit"
            />
            <span v-if="errors.id" class="text-red-500 text-sm mt-1">{{ errors.id }}</span>
            <p class="text-xs text-gray-500 mt-1">
              {{ isEdit ? '编辑时无法修改 ID' : '唯一标识符，用于区分不同的服务器' }}
            </p>
          </div>
        </div>

        <!-- 网络配置 - 双栏布局 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 服务器地址 -->
          <div class="form-field">
            <label for="serverUrl" class="block text-sm font-medium text-gray-700 mb-2">
              服务器地址 *
            </label>
            <Input
              id="serverUrl"
              v-model="formData.serverUrl"
              :class="[
                'w-full',
                errors.serverUrl ? 'border-red-500' : ''
              ]"
              placeholder="http://localhost:8081"
              :data-invalid="!!errors.serverUrl"
            />
            <span v-if="errors.serverUrl" class="text-red-500 text-sm mt-1">{{ errors.serverUrl }}</span>
            <p class="text-xs text-gray-500 mt-1">
              WebSocket地址将自动根据服务器地址生成
            </p>
          </div>

          <!-- WebSocket 地址 -->
          <div class="form-field">
            <label for="websocketUrl" class="block text-sm font-medium text-gray-700 mb-2">
              WebSocket 地址 *
            </label>
            <Input
              id="websocketUrl"
              v-model="formData.websocketUrl"
              :class="[
                'w-full',
                errors.websocketUrl ? 'border-red-500' : ''
              ]"
              placeholder="ws://localhost:8018"
              :data-invalid="!!errors.websocketUrl"
            />
            <span v-if="errors.websocketUrl" class="text-red-500 text-sm mt-1">{{ errors.websocketUrl }}</span>
            <p class="text-xs text-gray-500 mt-1">
              用于实时通信的 WebSocket 连接地址
            </p>
          </div>
        </div>

        <!-- 认证配置 -->
        <div class="form-field">
          <div class="flex items-center justify-between mb-4">
            <label class="block text-sm font-medium text-gray-700">
              认证方式
            </label>
            <!-- 认证方式切换 -->
            <div class="flex items-center space-x-3">
              <Toggle
                :modelValue="authTokenMode"
                @update:modelValue="authTokenMode = $event"
                class="w-20"
              >
                {{ authTokenMode ? 'Token' : 'Auth' }}
              </Toggle>
            </div>
          </div>

          <!-- 用户名密码输入框 -->
          <div v-if="!authTokenMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <Input
                id="username"
                v-model="formData.username"
                :class="[
                  'w-full',
                  errors.username ? 'border-red-500' : ''
                ]"
                placeholder="请输入用户名"
                :data-invalid="!!errors.username"
              />
              <span v-if="errors.username" class="text-red-500 text-sm mt-1">{{ errors.username }}</span>
              <p class="text-xs text-gray-500 mt-1">
                连接服务器时需要的用户名
              </p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <Input
                id="password"
                v-model="formData.password"
                :class="[
                  'w-full',
                  errors.password ? 'border-red-500' : ''
                ]"
                placeholder="请输入密码"
                :data-invalid="!!errors.password"
                type="password"
              />
              <span v-if="errors.password" class="text-red-500 text-sm mt-1">{{ errors.password }}</span>
              <p class="text-xs text-gray-500 mt-1">
                连接服务器时需要的密码
              </p>
            </div>
          </div>

          <!-- Token 输入框 -->
          <div v-if="authTokenMode" class="space-y-2">
            <label for="authTokenValue" class="block text-sm font-medium text-gray-700">
              API Token
            </label>
            <Input
              id="authTokenValue"
              v-model="formData.authToken"
              :class="[
                'w-full',
                errors.authToken ? 'border-red-500' : ''
              ]"
              placeholder="请输入 API Token"
              :data-invalid="!!errors.authToken"
              type="password"
            />
            <span v-if="errors.authToken" class="text-red-500 text-sm mt-1">{{ errors.authToken }}</span>
            <p class="text-xs text-gray-500">
              使用 API Token 可以跳过用户名密码认证
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
            <span>连接测试成功</span>
          </div>
          <div
            v-else
            class="flex items-center space-x-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200"
          >
            <span class="material-icons text-sm">error</span>
            <span>连接测试失败: {{ connectionTestResult.error }}</span>
          </div>
        </div>

        <!-- SMB 配置 -->
        <div class="form-field mt-4">
          <div class="flex items-center justify-between mb-4">
            <label class="text-sm font-medium text-gray-700">
              SMB 共享
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
              <label for="mountPath" class="block text-sm font-medium text-gray-700 mb-2">
                挂载路径
              </label>
              <Input
                id="mountPath"
                v-model="formData.mountPath"
                :class="[
                  'w-full',
                  errors.mountPath ? 'border-red-500' : ''
                ]"
                placeholder="/mnt/media"
                :data-invalid="!!errors.mountPath"
              />
              <span v-if="errors.mountPath" class="text-red-500 text-sm mt-1">{{ errors.mountPath }}</span>
              <p class="text-xs text-gray-500 mt-1">
                服务器上的挂载路径前缀
              </p>
            </div>

            <!-- SMB 路径 -->
            <div>
              <label for="smbPath" class="block text-sm font-medium text-gray-700 mb-2">
                SMB 路径
              </label>
              <Input
                id="smbPath"
                v-model="formData.smbPath"
                :class="[
                  'w-full',
                  errors.smbPath ? 'border-red-500' : ''
                ]"
                placeholder="\\\\server\\share\\path"
                :data-invalid="!!errors.smbPath"
              />
              <span v-if="errors.smbPath" class="text-red-500 text-sm mt-1">{{ errors.smbPath }}</span>
              <p class="text-xs text-gray-500 mt-1">
                SMB 共享的网络路径，用于本地文件访问
              </p>
            </div>
          </div>
        </div>

      <!-- 保存登录信息（新增时显示） -->
      <div v-if="!isEdit" class="form-field">
        <div class="flex items-center space-x-2">
          <Checkbox
            id="saveCredentials"
            :checked="formData.saveCredentials"
            @update:checked="formData.saveCredentials = $event"
          />
          <label for="saveCredentials" class="text-sm text-gray-700">
            保存登录信息（如果服务器需要认证）
          </label>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          勾选后，首次登录时会保存您的用户名和密码（加密存储）
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
          class="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="material-icons text-sm" :class="{ 'animate-spin': isTesting }">
            {{ isTesting ? 'sync' : 'wifi_find' }}
          </span>
          <span>{{ isTesting ? '连接测试中...' : '测试连接' }}</span>
        </button>

        <!-- 右侧：操作按钮 -->
        <div class="flex space-x-3">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="!isFormValid || isSubmitting"
            class="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting" class="material-icons text-sm animate-spin">sync</span>
            <span>{{ isEdit ? '保存' : '添加' }}</span>
          </button>
        </div>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
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

// ToggleButton 的计算属性
const authTokenMode = computed({
  get: () => formData.value.authMethod === 'token',
  set: (value: boolean) => {
    formData.value.authMethod = value ? 'token' : 'credentials'
    if (!value) {
      formData.value.authToken = '' // 切换到密码模式时清空 token
    } else {
      // 切换到 token 模式时清空用户名密码
      formData.value.username = ''
      formData.value.password = ''
    }
  }
})

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
    errors.value.serverUrl = '请输入有效的服务器地址（如：http://localhost:8081）'
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
    console.log('SMB status changing to:', value)
    formData.value.smbEnabled = value
  }
})

const validateForm = () => {
  errors.value = {}

  if (!formData.value.id.trim()) {
    errors.value.id = '请输入服务器ID'
  } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.value.id.trim())) {
    errors.value.id = 'ID只能包含字母、数字、下划线和连字符'
  }

  if (!formData.value.name.trim()) {
    errors.value.name = '请输入服务器名称'
  }

  if (!formData.value.serverUrl.trim()) {
    errors.value.serverUrl = '请输入服务器地址'
  } else {
    validateServerUrl()
  }

  if (!formData.value.websocketUrl.trim()) {
    errors.value.websocketUrl = '请输入 WebSocket 地址'
  } else if (!formData.value.websocketUrl.match(/^wss?:\/\/.+/)) {
    errors.value.websocketUrl = '请输入有效的 WebSocket 地址（如：ws://localhost:8018）'
  }

  // 认证验证
  if (authTokenMode.value) {
    if (!formData.value.authToken.trim()) {
      errors.value.authToken = '请输入 API Token'
    }
  } else {
    // 用户名密码模式的验证可以设为可选，或者根据需要设为必填
    // if (!formData.value.username.trim()) {
    //   errors.value.username = '请输入用户名'
    // }
    // if (!formData.value.password.trim()) {
    //   errors.value.password = '请输入密码'
    // }
  }

  // SMB 验证
  if (formData.value.smbEnabled) {
    if (!formData.value.mountPath.trim()) {
      errors.value.mountPath = '启用 SMB 时必须输入挂载路径'
    }
    if (!formData.value.smbPath.trim()) {
      errors.value.smbPath = '启用 SMB 时必须输入 SMB 路径'
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
      error: error instanceof Error ? error.message : '未知错误'
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
.form-field {
  margin-bottom: 1.5rem;
}

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

/* 对话框滚动样式 */
.library-edit-dialog :deep([data-radix-dialog-content]) {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 0;
}

.dialog-content {
  max-height: calc(90vh - 180px); /* 减去标题栏、底部按钮和内边距的高度 */
  overflow-y: auto;
  padding: 1.5rem;
  padding-bottom: 1rem;
}

/* 自定义滚动条样式 */
.dialog-content::-webkit-scrollbar {
  width: 8px;
}

.dialog-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.dialog-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.dialog-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .library-edit-dialog {
    margin: 1rem;
  }

  .library-edit-dialog :deep([data-radix-dialog-content]) {
    width: calc(100vw - 2rem) !important;
    max-width: none !important;
  }

  /* 小屏幕下强制单栏布局 */
  .grid.md\\:grid-cols-2 {
    grid-template-columns: 1fr !important;
  }
}

/* 双栏布局优化 */
.form-field {
  margin-bottom: 0; /* 移除默认边距，使用 space-y 控制间距 */
}

/* ToggleButton 样式优化 */
.library-edit-dialog :deep(.p-togglebutton) {
  min-width: 80px;
}
</style>
