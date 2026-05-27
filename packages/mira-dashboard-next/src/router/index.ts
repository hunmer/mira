import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { registerAllPluginRoutes } from './pluginRoutes'
import { authApi } from '@/api'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
    isPlugin?: boolean
    libraryId?: string
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/auth/register.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'MainLayout',
      component: () => import('@/layouts/DefaultLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/overview' },
        { path: 'overview', name: 'Overview', component: () => import('@/views/mira/overview/index.vue') },
        { path: 'library', name: 'Library', component: () => import('@/views/mira/library/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'plugin', name: 'Plugin', component: () => import('@/views/mira/plugin/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'admin', name: 'Admin', component: () => import('@/views/mira/admin/index.vue'), meta: { roles: ['super'] } },
        { path: 'database', name: 'Database', component: () => import('@/views/mira/database/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'device', name: 'Device', component: () => import('@/views/mira/device/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'file-manager', name: 'FileManager', component: () => import('@/views/mira/file-manager/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'statistics', name: 'Statistics', component: () => import('@/views/mira/statistics/index.vue') },
        { path: 'thumbnail', name: 'Thumbnail', component: () => import('@/views/mira/thumbnail/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'profile', name: 'Profile', component: () => import('@/views/mira/profile/index.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/auth/not-found.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 从 URL 中识别 token 参数，自动登录
  const tokenParam = to.query.token as string | undefined
  if (tokenParam) {
    localStorage.setItem('token', tokenParam)
    auth.token = tokenParam
    try {
      const meRes = await authApi.me()
      auth.user = meRes.data?.data || meRes.data
      localStorage.setItem('user', JSON.stringify(auth.user))
    } catch { /* ignore */ }
    const cleanQuery = { ...to.query }
    delete cleanQuery.token
    return { path: to.path, query: cleanQuery, hash: to.hash }
  }

  if (to.meta.requiresAuth !== false && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'NotFound' && auth.isLoggedIn) {
    try {
      await registerAllPluginRoutes(router)
      const resolved = router.resolve(to.fullPath)
      if (resolved.name !== 'NotFound') {
        return to.fullPath
      }
    } catch (e) {
      console.error('Failed to register plugin routes before navigation:', e)
    }
  }

  if (to.meta.roles?.length && !to.meta.roles.includes(auth.userRole)) {
    return '/overview'
  }
  if (to.meta.libraryId) {
    useAppStore().setCurrentLibrary(to.meta.libraryId)
  }
})

export default router
