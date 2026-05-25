import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
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
      path: '/',
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
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/auth/not-found.vue') },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth !== false && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles?.length && !to.meta.roles.includes(auth.userRole)) {
    return '/overview'
  }
})

export default router
