<template>
  <div class="login-view">
    <div class="login-container">
      <!-- Header buttons -->
      <button 
        class="header-button settings-button"
        @click="$router.push('/settings')"
        title="设置"
      >
        <span class="material-icons">settings</span>
      </button>
      <button 
        class="header-button close-button"
        @click="handleClose"
        title="关闭"
      >
        <span class="material-icons">close</span>
      </button>
      
      <!-- Login header with library selector -->
      <div class="login-header">
        <h1>登录</h1>
        <div class="library-selector">
          <button 
            class="library-button add-library" 
            title="添加媒体库"
            @click="showAddLibraryDialog = true"
          >
            <span class="material-icons">add</span>
          </button>
          <div 
            v-for="library in serverListStore.services" 
            :key="library.id"
            class="library-item"
            :class="{ 'active': library.id === serverListStore.activeServerId }"
            @click="selectLibrary(library.id)"
          >
            <span class="library-name">{{ library.name }}</span>
            <span class="library-number">{{ getLibraryNumber(library.id) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Login form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <span class="material-icons input-icon">person</span>
          <input
            id="username"
            v-model="credentials.username"
            type="text"
            placeholder="用户名或邮箱"
            :class="{ 'error': errors.username }"
            autocomplete="username"
            @input="clearInputErrors"
            @focus="clearInputErrors"
            required
          />
          <div v-if="errors.username" class="error-message">{{ errors.username }}</div>
        </div>
        
        <div class="input-group">
          <span class="material-icons input-icon">lock</span>
          <input
            id="password"
            v-model="credentials.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            :class="{ 'error': errors.password }"
            autocomplete="current-password"
            @input="clearInputErrors"
            @focus="clearInputErrors"
            required
          />
          <button
            type="button"
            class="password-toggle"
            @click="showPassword = !showPassword"
          >
            <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
          </button>
          <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
        </div>
        
        <div v-if="authStore.error" class="error-banner">
          <span class="material-icons error-icon">error</span>
          {{ authStore.error }}
          <button 
            type="button" 
            class="error-close" 
            @click="authStore.clearError()"
            title="关闭错误消息"
          >
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <!-- 记住登录选项 -->
        <div class="remember-login">
          <label class="checkbox-label">
            <Checkbox
              :checked="rememberLogin"
              @update:checked="rememberLogin = $event"
            />
            <span class="checkbox-text">记住登录信息，下次自动登录</span>
          </label>
        </div>
        
        <div class="form-actions">
          <button
            type="submit"
            class="login-button"
            :disabled="authStore.isLoading"
          >
            <span v-if="authStore.isLoading" class="loading-spinner"></span>
            登录
          </button>
          
          <button
            type="button"
            class="register-button"
            @click="showRegisterDialog = true"
          >
            注册
          </button>
        </div>
        
        <div class="edit-library">
          <a href="#" @click.prevent="handleEditLibrary" :class="{ 'disabled': !serverListStore.activeServer }">编辑当前素材库</a>
        </div>
      </form>
    </div>
    
    <!-- 添加素材库对话框 -->
    <ServerEditDialog
      v-model:visible="showAddLibraryDialog"
      @saved="handleLibraryAdded"
    />

    <!-- 编辑素材库对话框 -->
    <ServerEditDialog
      v-model:visible="showEditLibraryDialog"
      :library="serverListStore.activeServer"
      @saved="handleLibraryEdited"
    />
    
    <!-- 注册对话框 -->
    <RegisterDialog 
      :is-visible="showRegisterDialog"
      :server-config="currentServerConfig"
      @close="showRegisterDialog = false"
      @registered="handleUserRegistered"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useServerListStore } from '../stores/serverList'
import ServerEditDialog from '../components/business/ServerEditDialog.vue'
import RegisterDialog from '../components/RegisterDialog.vue'
import { Checkbox } from '@/components/ui/checkbox'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const serverListStore = useServerListStore()

const showPassword = ref(false)
const showAddLibraryDialog = ref(false)
const showEditLibraryDialog = ref(false)
const showRegisterDialog = ref(false)
const rememberLogin = ref(true) // 默认选中记住登录

const credentials = reactive({
  username: '',
  password: ''
})

const errors = reactive({
  username: '',
  password: ''
})

// 计算属性
const currentServerConfig = computed(() => {
  const activeServer = serverListStore.activeServer
  if (!activeServer) return undefined
  
  return {
    serverUrl: activeServer.serverUrl,
    websocketUrl: activeServer.websocketUrl
  }
})

// 获取素材库编号（显示用）
const getLibraryNumber = (libraryId: string) => {
  const index = serverListStore.services.findIndex(lib => lib.id === libraryId)
  return index + 1
}

// 选择素材库
const selectLibrary = async (libraryId: string) => {
  await serverListStore.setActiveServer(libraryId)
  // 重新检查保存的凭据
  await checkSavedCredentials()
}

// 处理添加素材库
const handleLibraryAdded = async (library: any) => {
  // 素材库已在store中添加，这里可以做一些额外处理
  console.log('Library added:', library)
  showAddLibraryDialog.value = false
}

// 处理编辑素材库
const handleLibraryEdited = async (library: any) => {
  // 素材库已在store中更新，这里可以做一些额外处理
  console.log('Library edited:', library)
  showEditLibraryDialog.value = false
}

// 处理用户注册成功
const handleUserRegistered = async (user: any) => {
  console.log('User registered:', user)
  // 注册成功后，可以直接跳转到主页面或显示成功消息
  const redirect = route.query.redirect as string
  router.push(redirect || '/')
}

// 清除输入错误
const clearInputErrors = () => {
  errors.username = ''
  errors.password = ''
  // 如果用户开始重新输入，也清除登录错误
  authStore.clearError()
}

const validateForm = () => {
  errors.username = ''
  errors.password = ''
  
  if (!credentials.username.trim()) {
    errors.username = '请输入用户名'
    return false
  }
  
  if (!credentials.password) {
    errors.password = '请输入密码'
    return false
  }
  
  return true
}

const handleLogin = async () => {
  if (!validateForm()) return
  
  // 检查是否选择了素材库
  if (!serverListStore.activeServer) {
    authStore.setError('请先选择一个素材库')
    return
  }
  
  authStore.clearError()
  
  // 创建纯数据对象，避免传递响应式对象
  const loginCredentials = {
    username: credentials.username,
    password: credentials.password
  }
  
  const serverConfig = currentServerConfig.value ? {
    serverUrl: currentServerConfig.value.serverUrl,
    websocketUrl: currentServerConfig.value.websocketUrl
  } : undefined
  
  const result = await authStore.login(loginCredentials, serverConfig, rememberLogin.value)
  
  if (result.success) {
    console.log('Login successful, authStore.isLoggedIn:', authStore.isLoggedIn)
    
    // 如果用户选择不记住登录，确保清除任何现有的保存凭据
    if (!rememberLogin.value && serverListStore.activeServer) {
      await authStore.clearSavedCredentials(serverListStore.activeServer.id)
      console.log('🗑️ Login credentials cleared as per user choice')
    }
    
    // 确保状态已经完全同步
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 登录成功，跳转到目标页面或主页
    const redirect = route.query.redirect as string
    console.log('Navigating to:', redirect || '/')
    router.push(redirect || '/')
  } else {
    // 登录失败，错误信息已经在authStore.error中
    console.error('Login failed:', result.error)
  }
}

const handleEditLibrary = () => {
  // 打开编辑当前素材库对话框
  if (!serverListStore.activeServer) {
    return
  }
  showEditLibraryDialog.value = true
}

const handleClose = () => {
  // 关闭应用或返回上一页
  if (window.electronAPI) {
    // 尝试关闭窗口或最小化到系统托盘
    window.close?.()
  } else {
    router.back()
  }
}

onMounted(async () => {
  // 清除之前的错误
  authStore.clearError()
  
  // 初始化素材库列表
  await serverListStore.initializeServerList()
  
  // 检查是否有活跃的素材库，如果有则尝试连接和恢复登录状态
  const activeServer = serverListStore.activeServer
  if (activeServer) {
    try {
      // 使用SDK服务直接测试连接
      const { miraSDKService } = await import('../services/MiraSDKService')

      // 构建完整的连接配置，同时支持token和用户名密码
      const connectionConfig = {
        serverUrl: activeServer.serverUrl,
        websocketUrl: activeServer.websocketUrl,
        timeout: 30000,
        ...(activeServer.authToken && { apiKey: activeServer.authToken }),
        ...(activeServer.savedCredentials && {
          username: activeServer.savedCredentials.username,
          password: activeServer.savedCredentials.encryptedPassword // 实际使用时需要解密
        })
      }

      const connectResult = await miraSDKService.connect(connectionConfig)
      if (connectResult.success) {
        // 连接成功，尝试恢复认证状态
        await authStore.initializeAuthAfterConnection()

        // 如果成功恢复了登录状态，跳转到主页
        if (authStore.isLoggedIn) {
          const redirect = route.query.redirect as string
          await router.push(redirect || '/')
          return
        }
      } else if (activeServer.authToken && activeServer.savedCredentials) {
        // 如果token认证失败但有保存的凭据，尝试用用户名密码重新连接
        console.log('Token authentication failed, trying with credentials...')

        const credentialConfig = {
          serverUrl: activeServer.serverUrl,
          websocketUrl: activeServer.websocketUrl,
          timeout: 30000,
          username: activeServer.savedCredentials.username,
          password: activeServer.savedCredentials.encryptedPassword // 实际使用时需要解密
        }

        const credentialResult = await miraSDKService.connect(credentialConfig)
        if (credentialResult.success) {
          // 用户名密码认证成功，尝试恢复认证状态
          await authStore.initializeAuthAfterConnection()

          if (authStore.isLoggedIn) {
            const redirect = route.query.redirect as string
            await router.push(redirect || '/')
            return
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore connection and auth state:', error)
      // 连接或认证失败，继续显示登录页面
    }
  }
  
  // 检查当前活跃素材库是否有保存的凭据
  await checkSavedCredentials()
})

// 检查保存的凭据并自动填充表单
const checkSavedCredentials = async () => {
  if (serverListStore.activeServer) {
    try {
      const savedCredentials = await authStore.getCredentialsFromLibrary(serverListStore.activeServer.id)
      if (savedCredentials) {
        credentials.username = savedCredentials.username
        // 不自动填充密码，但可以提示用户
        rememberLogin.value = true
        console.log('Found saved credentials for user:', savedCredentials.username)
      }
    } catch (error) {
      console.warn('Failed to check saved credentials:', error)
    }
  }
}
</script>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-image: url('https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=2020&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  font-family: Inter, 'Noto Sans', sans-serif;
  position: relative;
}

.login-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 250, 252, 0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Header buttons */
.header-button {
  position: absolute;
  top: 1rem;
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: color 0.2s ease;
}

.header-button:hover {
  color: #6b7280;
}

.settings-button {
  right: 3rem;
}

.close-button {
  right: 1rem;
}

/* Login header */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

/* Library selector */
.library-selector {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.library-button {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.add-library {
  background: #e5e7eb;
  color: #6b7280;
}

.add-library:hover {
  background: #d1d5db;
}

.library-item {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #e5e7eb;
  color: #374151;
}

.library-item:hover {
  background: #d1d5db;
}

.library-item.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.library-name {
  line-height: 1;
}

.library-number {
  line-height: 1;
  margin-top: 2px;
}

/* Form styles */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 2;
}

.input-group input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
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
  z-index: 2;
}

.password-toggle:hover {
  color: #6b7280;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  margin-left: 0.25rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  animation: slideIn 0.3s ease-out;
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-close {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.error-close:hover {
  background: rgba(220, 38, 38, 0.1);
}

.error-close .material-icons {
  font-size: 1rem;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 记住登录选项 */
.remember-login {
  margin: 1rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
}

.checkbox-text {
  user-select: none;
}

/* Form actions */
.form-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.login-button {
  width: 100%;
  background: #1173d4;
  color: white;
  font-weight: 700;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
}

.login-button:hover:not(:disabled) {
  background: rgba(17, 115, 212, 0.9);
  box-shadow: 0 0 0 2px rgba(17, 115, 212, 0.2);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-button {
  width: 100%;
  background: #e5e7eb;
  color: #374151;
  font-weight: 700;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.register-button:hover {
  background: #d1d5db;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.2);
}

/* Loading spinner */
.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Edit library */
.edit-library {
  text-align: center;
  margin-top: 1.5rem;
}

.edit-library a {
  color: #1173d4;
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.edit-library a:hover:not(.disabled) {
  text-decoration: underline;
}

.edit-library a.disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 480px) {
  .login-container {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .library-selector {
    gap: 0.25rem;
  }
  
  .library-button,
  .library-item {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 0.625rem;
  }
}
</style>
