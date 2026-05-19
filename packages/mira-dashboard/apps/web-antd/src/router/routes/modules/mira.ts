import type { RouteRecordRaw } from 'vue-router';

// 基础的 Mira 路由配置（静态路由）
const routes: RouteRecordRaw[] = [
  // Mira主要功能路由（需要认证）
  {
    meta: {
      icon: 'lucide:monitor',
      order: 1,
      title: 'Mira 管理面板',
    },
    name: 'Mira',
    path: '/mira',
    children: [
      {
        name: 'MiraOverview',
        path: '/mira/overview',
        component: () => import('#/views/mira/overview/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:home',
          title: '系统概览',
        },
      },
      {
        name: 'MiraLibrary',
        path: '/mira/library',
        component: () => import('#/views/mira/library/index.vue'),
        meta: {
          roles: ['super', 'admin'], // 需要超级管理员或管理员角色
          icon: 'lucide:folder',
          title: '资源库管理',
        },
      },
      {
        name: 'MiraPlugin',
        path: '/mira/plugin',
        component: () => import('#/views/mira/plugin/index.vue'),
        meta: {
          roles: ['super', 'admin'], // 需要超级管理员或管理员角色
          icon: 'lucide:puzzle',
          title: '插件管理',
        },
      },
      {
        name: 'MiraAdmin',
        path: '/mira/admin',
        component: () => import('#/views/mira/admin/index.vue'),
        meta: {
          roles: ['super'], // 需要超级管理员角色
          icon: 'lucide:user',
          title: '管理员管理',
        },
      },
      {
        name: 'MiraDatabase',
        path: '/mira/database',
        component: () => import('#/views/mira/database/index.vue'),
        meta: {
          roles: ['super', 'admin'], // 需要超级管理员或管理员角色
          icon: 'lucide:database',
          title: '数据库预览',
        },
      },
      {
        name: 'MiraDevice',
        path: '/mira/device',
        component: () => import('#/views/mira/device/index.vue'),
        meta: {
          roles: ['super', 'admin'], // 需要超级管理员或管理员角色
          icon: 'lucide:smartphone',
          title: '设备管理',
        },
      },
      {
        name: 'MiraFileUpload',
        path: '/mira/file-upload',
        component: () => import('#/views/mira/file-upload/index.vue'),
        meta: {
          roles: ['super', 'admin'], // 需要超级管理员或管理员角色
          icon: 'lucide:upload',
          title: '文件上传',
        },
      },
    ],
  },
];

export default routes;
