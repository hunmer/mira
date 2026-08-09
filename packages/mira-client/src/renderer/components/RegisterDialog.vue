<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" @click.self="closeDialog">
    <div class="bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.15)] w-full max-w-[500px] max-h-[90vh] overflow-y-auto m-4">
      <div class="flex items-center justify-between p-6 pb-0 border-b border-border mb-6">
        <h2 class="text-xl font-semibold text-foreground m-0">{{ $t('commonUi.registerDialog.title') }}</h2>
        <button class="bg-transparent border-none text-muted-foreground cursor-pointer p-1 rounded transition-colors duration-200 hover:text-muted-foreground" @click="closeDialog">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="px-6 pb-6 flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label for="username" class="text-sm font-medium text-foreground">{{ $t('commonUi.registerDialog.username') }}</label>
          <input
            id="username"
            v-model="formData.username"
            type="text"
            :placeholder="$t('commonUi.registerDialog.usernamePlaceholder')"
            :class="{ 'error': errors.username }"
            required
          />
          <div v-if="errors.username" class="text-destructive text-sm">{{ errors.username }}</div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="email" class="text-sm font-medium text-foreground">{{ $t('commonUi.registerDialog.email') }}</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            :placeholder="$t('commonUi.registerDialog.emailPlaceholder')"
            :class="{ 'error': errors.email }"
          />
          <div v-if="errors.email" class="text-destructive text-sm">{{ errors.email }}</div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="realName" class="text-sm font-medium text-foreground">{{ $t('commonUi.registerDialog.realName') }}</label>
          <input
            id="realName"
            v-model="formData.realName"
            type="text"
            :placeholder="$t('commonUi.registerDialog.realNamePlaceholder')"
            :class="{ 'error': errors.realName }"
          />
          <div v-if="errors.realName" class="text-destructive text-sm">{{ errors.realName }}</div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="password" class="text-sm font-medium text-foreground">{{ $t('commonUi.registerDialog.password') }}</label>
          <div class="relative">
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('commonUi.registerDialog.passwordPlaceholder')"
              :class="{ 'error': errors.password }"
              required
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted-foreground cursor-pointer p-1 hover:text-muted-foreground"
              @click="showPassword = !showPassword"
            >
              <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <div v-if="errors.password" class="text-destructive text-sm">{{ errors.password }}</div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="confirmPassword" class="text-sm font-medium text-foreground">{{ $t('commonUi.registerDialog.confirmPassword') }}</label>
          <div class="relative">
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="$t('commonUi.registerDialog.confirmPasswordPlaceholder')"
              :class="{ 'error': errors.confirmPassword }"
              required
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted-foreground cursor-pointer p-1 hover:text-muted-foreground"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <span class="material-icons">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <div v-if="errors.confirmPassword" class="text-destructive text-sm">{{ errors.confirmPassword }}</div>
        </div>

        <div v-if="error" class="bg-destructive border border-destructive text-destructive p-3 rounded-lg text-sm">
          {{ error }}
        </div>

        <div class="flex gap-3 justify-end mt-4">
          <button
            type="button"
            class="cancel-button"
            @click="closeDialog"
            :disabled="isLoading"
          >
            {{ $t('commonUi.registerDialog.cancel') }}
          </button>
          <button
            type="submit"
            class="submit-button"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            {{ $t('commonUi.registerDialog.submit') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()

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
    errors.username = t('commonUi.registerDialog.errUsernameRequired')
    isValid = false
  } else if (!validateUsername(formData.username)) {
    isValid = false
  }

  if (formData.email.trim() && !validateEmail(formData.email)) {
    isValid = false
  }

  if (!formData.password) {
    errors.password = t('commonUi.registerDialog.errPasswordRequired')
    isValid = false
  } else if (!validatePassword(formData.password)) {
    isValid = false
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = t('commonUi.registerDialog.errConfirmRequired')
    isValid = false
  } else if (!validateConfirmPassword(formData.confirmPassword)) {
    isValid = false
  }

  return isValid
}

const validateUsername = (username: string) => {
  if (username.length < 3) {
    errors.username = t('commonUi.registerDialog.errUsernameMinLength')
    return false
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    errors.username = t('commonUi.registerDialog.errUsernameInvalid')
    return false
  }
  return true
}

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.email = t('commonUi.registerDialog.errEmailInvalid')
    return false
  }
  return true
}

const validatePassword = (_password: string) => {
  return true
}

const validateConfirmPassword = (confirmPassword: string) => {
  if (confirmPassword !== formData.password) {
    errors.confirmPassword = t('commonUi.registerDialog.errConfirmMismatch')
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
      error.value = result.error || t('commonUi.registerDialog.errRegisterFailed')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('commonUi.registerDialog.errRegisterFailed')
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
.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
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

.password-input-container input {
  padding-right: 2.5rem;
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
