/**
 * 插件路由 API 服务
 */

import { requestClient } from '#/api/request';

export interface PluginRouteDefinition {
  name: string;
  group: string;
  path: string; // 完整路径，包含库ID
  originalPath?: string; // 原始路径，不包含库ID
  component: string; // vue编译后的模板文件路径
  pluginName?: string; // 所属插件的名称
  libraryId?: string; // 所属素材库ID
  libraryName?: string; // 所属素材库名称
  meta: {
    affixTab?: boolean;
    icon?: string;
    order?: number;
    roles?: string[]; // 需要的权限角色
    title: string;
  };
  builder?: () => string; // eval code并返回组件ui的函数
}

export interface PluginRoutesResponse {
  code: number;
  data: PluginRouteDefinition[];
  total: number;
  timestamp: string;
}

export interface PluginRoutesError {
  code: number;
  error: string;
  message: string;
  timestamp: string;
}

export interface LibraryInfo {
  id: string;
  name: string;
  routeCount: number;
}

/**
 * 获取所有插件的路由定义
 */
export async function getPluginRoutes(): Promise<PluginRouteDefinition[]> {
  try {
    const data =
      await requestClient.get<PluginRouteDefinition[]>('/plugin-routes');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching plugin routes:', error);
    return [];
  }
}

/**
 * 获取指定素材库的插件路由定义
 */
export async function getPluginRoutesByLibrary(
  libraryId: string,
): Promise<PluginRouteDefinition[]> {
  try {
    const data = await requestClient.get<PluginRouteDefinition[]>(
      `/plugin-routes/${libraryId}`,
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching routes for library ${libraryId}:`, error);
    return [];
  }
}

/**
 * 获取所有素材库信息及其插件路由数量
 */
export async function getLibrariesWithPluginRoutes(): Promise<{
  allRoutes: PluginRouteDefinition[];
  libraries: LibraryInfo[];
}> {
  try {
    const allRoutes = await getPluginRoutes();

    // 按素材库分组路由
    const libraryMap = new Map<
      string,
      { name: string; routes: PluginRouteDefinition[] }
    >();

    allRoutes.forEach((route) => {
      if (route.libraryId) {
        if (!libraryMap.has(route.libraryId)) {
          libraryMap.set(route.libraryId, {
            name: route.libraryName || route.libraryId,
            routes: [],
          });
        }
        const libraryData = libraryMap.get(route.libraryId);
        if (libraryData) {
          libraryData.routes.push(route);
        }
      }
    });

    // 转换为库信息数组
    const libraries: LibraryInfo[] = [...libraryMap.entries()].map(
      ([id, info]) => ({
        id,
        name: info.name,
        routeCount: info.routes.length,
      }),
    );

    return {
      allRoutes,
      libraries,
    };
  } catch (error) {
    console.error('Error fetching libraries with plugin routes:', error);
    return {
      allRoutes: [],
      libraries: [],
    };
  }
}
