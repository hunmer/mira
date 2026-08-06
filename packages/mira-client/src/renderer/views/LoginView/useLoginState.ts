/**
 * 登录页共享 UI 状态
 *
 * 聚合三个步骤通用的状态（步骤序号、加载、错误）以及各步骤的表单字段与开关，
 * 供 index.vue 分发给子组件。
 */
import { reactive, ref } from 'vue'
import type { HealthResponse } from 'mira-app-core/shared/sdk'
import type { ServerConfig } from '@renderer/stores/serverList'

export function useLoginState() {
  // Stepper state
  const currentStep = ref(1)
  const loading = ref(false)
  const error = ref('')

  // Step 1: 服务器连接
  const serverName = ref('')
  const serverAddress = ref('')
  const wsAddress = ref('')
  const showWsField = ref(false)
  const showAddForm = ref(false)
  const deleteTarget = ref<ServerConfig | null>(null)
  const selectedServerId = ref('')
  const healthData = ref<HealthResponse | null>(null)

  // Step 2: 认证
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)
  const credentials = reactive({ username: '', password: '' })
  const registerForm = reactive({ email: '', confirmPassword: '' })
  const userRole = ref('')
  const authToken = ref('')

  // Step 3: 素材库选择
  // （libraries / selectedLibraryId 由 useConnectionFlow 维护，见该文件）

  return {
    // 通用
    currentStep,
    loading,
    error,
    // Step 1
    serverName,
    serverAddress,
    wsAddress,
    showWsField,
    showAddForm,
    deleteTarget,
    selectedServerId,
    healthData,
    // Step 2
    showPassword,
    showConfirmPassword,
    credentials,
    registerForm,
    userRole,
    authToken,
  }
}
