import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';
import {
  loadPluginRoutes,
  sortPluginRoutesByGroup,
} from '#/router/dynamic-plugin-routes';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  try {
    // 动态加载插件路由
    const pluginRoutes = await loadPluginRoutes();

    if (pluginRoutes.length > 0) {
      // 对插件路由进行排序
      const sortedPluginRoutes = sortPluginRoutesByGroup(pluginRoutes);

      // 找到 Mira 主路由并添加插件路由作为子路由
      const miraRoute = options.routes.find((route) => route.name === 'Mira');
      if (miraRoute && miraRoute.children) {
        // 将插件路由添加到 Mira 主路由的子路由中
        miraRoute.children.push(...sortedPluginRoutes);
      }
    }
  } catch (error) {
    console.error('❌ Failed to load plugin routes:', error);
    // 即使插件路由加载失败，也继续正常的路由生成过程
  }

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      return await getAllMenusApi();
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
