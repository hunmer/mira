<template>
  <div v-if="isVisible" class="register-dialog-overlay" @click.self="closeDialog">
    <div class="register-dialog">
      <div class="dialog-header">
        <h2>用户注册</h2>
        <button class="close-button" @click="closeDialog">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="dialog-form">
        <div class="input-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="formData.username"
            type="text"
            placeholder="请输入用户名"
            :class="{ 'error': errors.username }"
            required
          />
          <div v-if="errors.username" class="error-message">{{ errors.username }}</div>
        </div>

        <div class="input-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            placeholder="请输入邮箱地址"
            :class="{ 'error': errors.email }"
          />
          <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
        </div>

        <div class="input-group">
          <label for="realName">真实姓名</label>
          <input
            id="realName"
            v-model="formData.realName"
            type="text"
            placeholder="请输入真实姓名"
            :class="{ 'error': errors.realName }"
          />
          <div v-if="errors.realName" class="error-message">{{ errors.realName }}</div>
        </div>

        <div class="input-group">
          <label for="password">密码</label>
          <div class="password-input-container">
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              :class="{ 'error': errors.password }"
              required
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
            >
              <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
        </div>

        <div class="input-group">
          <label for="confirmPassword">确认密码</label>
          <div class="password-input-container">
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              :class="{ 'error': errors.confirmPassword }"
              required
            />
            <button
              type="button"
              class="password-toggle"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <span class="material-icons">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <div v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</div>
        </div>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <div class="dialog-actions">
          <button
            type="button"
            class="cancel-button"
            @click="closeDialog"
            :disabled="isLoading"
          >
            取消
          </button>
          <button
            type="submit"
            class="submit-button"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            注册
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

// Props
interface Props {
  isVisible: boolean
  serverConfig?: { serverUrl: string; websocketUrl: string }
}

// Emits
interface Emits {
  (e: 'close'): void
  (e: 'registered', user: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Store
const authStore = useAuthStore()

// 状态
const isLoading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const formData = reactive({
  username: '',
  email: '',
  realName: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  username: '',
  email: '',
  realName: '',
  password: '',
  confirmPassword: ''
})

// 计算属性
const isFormValid = computed(() => {
  return formData.username.trim() && 
         formData.password && 
         formData.confirmPassword &&
         formData.password === formData.confirmPassword &&
         !errors.username && 
         !errors.email && 
         !errors.realName && 
         !errors.password && 
         !errors.confirmPassword
})

// 监听表单变化进行验证
watch(() => formData.username, (newValue) => {
  if (newValue.trim() && errors.username) {
    errors.username = ''
  }
  validateUsername(newValue)
})

watch(() => formData.email, (newValue) => {
  if (newValue.trim() && errors.email) {
    errors.email = ''
  }
  if (newValue.trim()) {
    validateEmail(newValue)
  }
})

watch(() => formData.password, (newValue) => {
  if (newValue && errors.password) {
    errors.password = ''
  }
  validatePassword(newValue)
  
  // 重新验证确认密码
  if (formData.confirmPassword) {
    validateConfirmPassword(formData.confirmPassword)
  }
})

watch(() => formData.confirmPassword, (newValue) => {
  if (newValue && errors.confirmPassword) {
    errors.confirmPassword = ''
  }
  validateConfirmPassword(newValue)
})

// 方法
const validateForm = () => {
  errors.username = ''
  errors.email = ''
  errors.realName = ''
  errors.password = ''
  errors.confirmPassword = ''
  error.value = null

  let isValid = true

  if (!formData.username.trim()) {
    errors.username = '请输入用户名'
    isValid = false
  } else if (!validateUsername(formData.username)) {
    isValid = false
  }

  if (formData.email.trim() && !validateEmail(formData.email)) {
    isValid = false
  }

  if (!formData.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (!validatePassword(formData.password)) {
    isValid = false
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    isValid = false
  } else if (!validateConfirmPassword(formData.confirmPassword)) {
    isValid = false
  }

  return isValid
}

const validateUsername = (username: string) => {
  if (username.length < 3) {
    errors.username = '用户名至少需要3个字符'
    return false
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    errors.username = '用户名只能包含字母、数字、下划线和中文'
    return false
  }
  return true
}

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.email = '请输入有效的邮箱地址'
    return false
  }
  return true
}

const validatePassword = (password: string) => {
  if (password.length < 6) {
    errors.password = '密码至少需要6个字符'
    return false
  }
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    errors.password = '密码需要包含字母和数字'
    return false
  }
  return true
}

const validateConfirmPassword = (confirmPassword: string) => {
  if (confirmPassword !== formData.password) {
    errors.confirmPassword = '两次输入的密码不一致'
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = null

  try {
    const registrationData = {
      username: formData.username.trim(),
      email: formData.email.trim() || undefined,
      realName: formData.realName.trim() || undefined,
      password: formData.password
    }

    const result = await authStore.register(registrationData, props.serverConfig)

    if (result.success) {
      emit('registered', result.data)
      closeDialog()
    } else {
      error.value = result.error || '注册失败'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败'
  } finally {
    isLoading.value = false
  }
}

const closeDialog = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  formData.username = ''
  formData.email = ''
  formData.realName = ''
  formData.password = ''
  formData.confirmPassword = ''
  
  errors.username = ''
  errors.email = ''
  errors.realName = ''
  errors.password = ''
  errors.confirmPassword = ''
  
  error.value = null
  isLoading.value = false
  showPassword.value = false
  showConfirmPassword.value = false
}

// 监听对话框显示状态，重置表单
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>

<style scoped>
.register-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.register-dialog {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 1rem;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.dialog-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #6b7280;
}

.dialog-form {
  padding: 0 1.5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.password-input-container {
  position: relative;
}

.password-input-container input {
  padding-right: 2.5rem;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
}

.password-toggle:hover {
  color: #6b7280;
}

.input-group input:focus {
  outline: none;
  border-color: #1173d4;
  box-shadow: 0 0 0 2px rgba(17, 115, 212, 0.2);
}

.input-group input.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-button {
  background: #e5e7eb;
  color: #374151;
}

.cancel-button:hover:not(:disabled) {
  background: #d1d5db;
}

.submit-button {
  background: #1173d4;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: rgba(17, 115, 212, 0.9);
}

.cancel-button:disabled,
.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 480px) {
  .register-dialog {
    margin: 0.5rem;
  }
  
  .dialog-header {
    padding: 1rem 1rem 0 1rem;
  }
  
  .dialog-form {
    padding: 0 1rem 1rem 1rem;
  }
  
  .dialog-actions {
    flex-direction: column;
  }
  
  .cancel-button,
  .submit-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
