import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useServerListStore } from '../stores/serverList'
import { useAppState } from '../stores/appState'
import { initializationService } from '../services/InitializationService'

// 路由定义
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView/index.vue'),
    meta: {
      title: '主页',
      requiresAuth: true,
      requiresConnection: true,
      icon: 'home'
    }
  },
  {
    path: '/file-preview',
    name: 'FilePreview',
    component: () => import('../views/FilePreviewView.vue'),
    meta: {
      title: '文件预览',
      requiresAuth: false,
      icon: 'preview'
    }
  },
  {
    path: '/image-preview/:id?',
    name: 'ImagePreview',
    component: () => import('../components/preview/ImagePreview.vue'),
    meta: {
      title: '图片预览',
      requiresAuth: false,
      icon: 'image',
      transition: ''
    }
  },
  {
    path: '/video-preview/:id?',
    name: 'VideoPreview',
    component: () => import('../components/preview/VideoPreview.vue'),
    meta: {
      title: '视频预览',
      requiresAuth: false,
      icon: 'videocam',
      transition: ''
    }
  },
  {
    path: '/local-plugins',
    name: 'LocalPlugins',
    component: () => import('../components/business/IntegrationsList.vue'),
    meta: {
      title: '本地插件',
      requiresAuth: false,
      icon: 'extension'
    }
  },
  {
    path: '/upload',
    name: 'FileUpload',
    component: () => import('../views/FileUploadView.vue'),
    meta: {
      title: '文件上传',
      requiresAuth: true,
      requiresConnection: true,
      icon: 'upload_file'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: {
      title: '设置',
      requiresAuth: false,
      icon: 'settings'
    }
  },
  {
    path: '/menu-test',
    name: 'MenuTest',
    component: () => import('../views/MenuTestView.vue'),
    meta: {
      title: '菜单测试',
      requiresAuth: false,
      icon: 'menu'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      hideInNav: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: {
      title: '页面未找到',
      requiresAuth: false,
      hideInNav: true
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const settingsStore = useSettingsStore()
  const serverListStore = useServerListStore()
  const { isAppReady, needsInitialization, setAppInitializing, setAppReady } = useAppState()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - Mira Media Library`
  } else {
    document.title = 'Mira Media Library'
  }
  
  // 如果访问登录页面、设置页面或404页面，直接允许访问
  if (to.name === 'Login' || to.name === 'Settings' || to.name === 'NotFound') {
    // 如果已登录且已连接且访问登录页，重定向到主页
    if (to.name === 'Login' && authStore.isLoggedIn && settingsStore.isConnected) {
      next({ name: 'Home' })
      return
    }
    next()
    return
  }
  
  // 对于需要认证或连接的页面，检查应用状态
  if (to.meta.requiresAuth || to.meta.requiresConnection) {
    try {
      // 如果应用已就绪，直接通过
      if (isAppReady.value) {
        // 如果访问的是主页，确保主页数据已初始化
        if (to.name === 'Home') {
          try {
            const homeResult = await initializationService.initializeHomeView()
            
            if (!homeResult.success) {
              // 即使初始化失败，也允许用户进入页面，让用户手动重试
            }
            
          } catch (homeError) {
            // 即使初始化失败，也允许用户进入页面，让用户手动处理
          }
        }

        next()
        return
      }

      // 如果需要初始化且当前没有在初始化
      if (needsInitialization()) {
        
        // 1. 首先检查是否有保存的素材库
        await serverListStore.initializeServerList()
        const activeLibrary = serverListStore.activeServer
        
        if (!activeLibrary) {
          next({ name: 'Login', query: { redirect: to.fullPath } })
          return
        }

        // 2. 执行应用初始化
        setAppInitializing()
        
        try {
          const result = await initializationService.initializeApp()
          
          if (!result.success) {
            throw new Error(result.error || '应用初始化失败')
          }
          
          // 标记应用已就绪
          setAppReady()

        } catch (initError) {
          next({ name: 'Login', query: { redirect: to.fullPath } })
          return
        }
      }
      
      // 如果访问的是主页，确保主页数据已初始化
      if (to.name === 'Home') {
        try {
          const homeResult = await initializationService.initializeHomeView()
          
          if (!homeResult.success) {
            // 即使初始化失败，也允许用户进入页面，让用户手动重试
          }
          
        } catch (homeError) {
          // 即使初始化失败，也允许用户进入页面，让用户手动处理
        }
      }
      
      next()
      return
      
    } catch (error) {
      // 发生错误，跳转到登录页
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  }
  
  // 其他页面直接允许访问
  next()
})

// 全局后置钩子
router.afterEach(() => {
  // 页面访问统计等逻辑
})

// 路由工具函数
export const navigateToHome = () => router.push({ name: 'Home' })
export const navigateToSettings = () => router.push({ name: 'Settings' })
export const navigateToPlugins = () => router.push({ name: 'PluginMarketplace' })
export const navigateToLocalPlugins = () => router.push({ name: 'LocalPlugins' })
export const navigateToFileUpload = () => router.push({ name: 'FileUpload' })
export const navigateToImagePreview = (id?: string) =>
  router.push({ name: 'ImagePreview', params: { id } })
export const navigateToVideoPreview = (id?: string) =>
  router.push({ name: 'VideoPreview', params: { id } })

export default router
