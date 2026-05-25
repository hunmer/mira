import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { registerAllPluginRoutes } from './pluginRoutes'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
    isPlugin?: boolean
    libraryId?: string
  }
}

const router = createRouter({
  history: createWebHistory(),
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
        { path: 'file-upload', name: 'FileUpload', component: () => import('@/views/mira/file-upload/index.vue'), meta: { roles: ['super', 'admin'] } },
        { path: 'profile', name: 'Profile', component: () => import('@/views/mira/profile/index.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/auth/not-found.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
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
