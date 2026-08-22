import {
  createRouter,
  createWebHashHistory,
  type LocationQuery,
  type NavigationFailure,
  type RouteLocationRaw,
  type RouteRecordRaw
} from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useServerListStore } from '../stores/serverList'
import { useAppState } from '../stores/appState'
import { useMediaStore } from '../stores/media'
import { initializationService } from '../services/InitializationService'

export interface TabNavigationOptions {
  /** 使用应用内标签页打开；未传入时默认关闭。 */
  openInTab?: boolean
}

declare module 'vue-router' {
  interface Router {
    push(to: RouteLocationRaw & TabNavigationOptions): Promise<void | NavigationFailure | undefined>
  }
}

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
    path: '/playground',
    name: 'Playground',
    component: () => import('../views/PlaygroundView.vue'),
    meta: {
      title: 'Playground',
      requiresAuth: true,
      requiresConnection: true,
      icon: 'science'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView/index.vue'),
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

const originalPush = router.push.bind(router)

const openFilePreviewTab = async (query: LocationQuery): Promise<void> => {
  const [{ useTabs }, { default: FilePreviewView }] = await Promise.all([
    import('../composables/useTabs'),
    import('../views/FilePreviewView.vue')
  ])
  const fileId = String(query.id || '')
  const libraryId = String(query.libraryId || '')

  await useTabs().createCustomTab(FilePreviewView, {
    id: `file-preview-${libraryId}-${fileId}`,
    label: String(query.title || '文件预览'),
    icon: 'visibility',
    props: {
      routeQuery: query,
      embedded: true
    }
  })
}

const getFilePreviewQuery = (fileId: string): LocationQuery | null => {
  const mediaStore = useMediaStore()
  const file = [...mediaStore.imagePreviewItems, ...mediaStore.files]
    .find(item => String(item.id) === fileId)
  if (!file) return null

  return {
    id: fileId,
    libraryId: String(file.libraryId || ''),
    title: String(file.name || file.title || ''),
    path: String(file.path || file.url || ''),
    mimeType: String(file.mimeType || '')
  }
}

router.push = (async (to: RouteLocationRaw & TabNavigationOptions) => {
  if (typeof to === 'string') {
    const resolved = router.resolve(to)
    const settingsStore = useSettingsStore()
    const shouldOpenInTab = (resolved.path.startsWith('/image-preview/') || resolved.path.startsWith('/video-preview/'))
      && settingsStore.settings.openFilePreviewInTab
    if (shouldOpenInTab) {
      const fileId = String(resolved.params.id || '')
      const query = getFilePreviewQuery(fileId)
      if (query) {
        await openFilePreviewTab(query)
        return
      }
    }
    return originalPush(to)
  }

  const { openInTab, ...rawLocation } = to
  const location = rawLocation as RouteLocationRaw
  const resolved = router.resolve(location)
  const settingsStore = useSettingsStore()
  const isPreviewRoute = resolved.path === '/file-preview'
    || resolved.name === 'ImagePreview'
    || resolved.name === 'VideoPreview'
  const previewQuery = resolved.path === '/file-preview'
    ? resolved.query
    : getFilePreviewQuery(String(resolved.params.id || ''))
  const shouldOpenInTab = isPreviewRoute
    && (openInTab ?? settingsStore.settings.openFilePreviewInTab ?? false)
    && Boolean(previewQuery)

  if (shouldOpenInTab) {
    if (previewQuery) await openFilePreviewTab(previewQuery)
    return
  }

  return originalPush(location)
}) as typeof router.push

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
          console.error('[BrowserView][router] redirecting to Login after initialization failure', {
            path: to.fullPath,
            error: initError,
          })
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
export const navigateToPlayground = () => router.push({ name: 'Playground' })
export const navigateToPlugins = () => router.push({ name: 'PluginMarketplace' })
export const navigateToFileUpload = () => router.push({ name: 'FileUpload' })
export const navigateToImagePreview = (id?: string) =>
  router.push({ name: 'ImagePreview', params: { id } })
export const navigateToVideoPreview = (id?: string) =>
  router.push({ name: 'VideoPreview', params: { id } })

export default router
