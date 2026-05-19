/**
 * 动态路由加载器
 * 用于从后端获取插件路由并动态添加到路由系统中
 */

import type { RouteRecordRaw } from 'vue-router';

import type { PluginRouteDefinition } from '#/api/core/plugin-routes';

import { getPluginRoutes } from '#/api/core/plugin-routes';

/**
 * 将插件路由定义转换为 Vue Router 路由配置
 */
function convertPluginRouteToVueRoute(
  pluginRoute: PluginRouteDefinition,
): RouteRecordRaw[] {
  const component = () => {
    // 这里需要根据插件的 component 路径动态加载组件
    // 如果有 builder 函数，则使用 builder 生成组件
    if (pluginRoute.builder) {
      try {
        // 执行 builder 函数生成组件 UI
        const componentHTML = pluginRoute.builder();
        // 返回一个简单的 Vue 组件，包含动态生成的 HTML
        return Promise.resolve({
          template: componentHTML,
          name: pluginRoute.name,
        });
      } catch (error) {
        console.error(
          `Error executing builder for plugin route ${pluginRoute.name}:`,
          error,
        );
        // 返回错误组件
        return Promise.resolve({
          template: `
            <div class="plugin-error">
              <h3>插件加载错误</h3>
              <p>无法加载插件: ${pluginRoute.name}</p>
              <p>错误信息: ${error}</p>
            </div>
          `,
          name: `${pluginRoute.name}Error`,
        });
      }
    }

    // 如果没有 builder，尝试动态导入组件文件
    if (pluginRoute.component) {
      try {
        // 根据组件路径动态加载Vue组件
        // 支持从插件服务器或本地路径加载
        const componentPath = pluginRoute.component;

        if (componentPath.startsWith('http')) {
          // 如果是完整URL，直接加载
          return import(/* @vite-ignore */ componentPath);
        } else {
          // 如果是相对路径，构建完整的插件URL
          // componentPath 可能包含 plugins/{pluginName}/ 前缀，需要去掉避免双重拼接
          const libraryId = pluginRoute.libraryId || 'default';
          const pluginName = pluginRoute.pluginName || 'unknown';
          const normalizedPath = componentPath
            .replace(new RegExp(`^plugins/${pluginName}/`), '')
            .replace(new RegExp(`^${pluginName}/`), '');
          const pluginBaseUrl = 'http://localhost:8081/plugins';
          const fullUrl = `${pluginBaseUrl}/${libraryId}/${pluginName}/${normalizedPath}`;

          // 动态创建一个Vue组件加载器
          return new Promise((resolve, _reject) => {
            // 使用动态script加载编译后的JS组件
            const loadComponentScript = (url: string) => {
              return new Promise<void>((scriptResolve, scriptReject) => {
                const script = document.createElement('script');
                script.src = url;
                script.type = 'module';
                script.addEventListener('load', () => scriptResolve());
                script.addEventListener('error', () =>
                  scriptReject(new Error(`Failed to load ${url}`)),
                );
                document.head.append(script);
              });
            };

            // 尝试加载组件脚本
            loadComponentScript(fullUrl)
              .then(() => {
                // 检查全局对象中是否有注册的组件
                const globalComponents =
                  (window as any)?.MiraPluginComponents || {};
                const componentKey = `${pluginName}_${normalizedPath.replaceAll(
                  /[/.]/g,
                  '_',
                )}`;
                const ComponentDefinition = globalComponents[componentKey];

                if (ComponentDefinition) {
                  // 如果找到了组件定义，直接使用
                  resolve(ComponentDefinition);
                } else {
                  // 如果没有找到，创建一个容器组件来显示插件内容
                  const sanitizedPluginName = pluginName.replaceAll(
                    /[^a-z\d]/gi,
                    '_',
                  );
                  resolve({
                    template: `
                      <div class="plugin-component-wrapper">
                        <h3>{{ title }}</h3>
                        <p>插件组件: {{ pluginInfo }}</p>
                        <div :id="mountId" class="plugin-mount-point"></div>
                      </div>
                    `,
                    data() {
                      return {
                        title: pluginRoute.meta?.title || pluginRoute.name,
                        pluginInfo: `${libraryId}/${pluginName}/${componentPath}`,
                        mountId: `plugin-mount-${sanitizedPluginName}`,
                      };
                    },
                    mounted(this: any) {
                      // 尝试初始化插件组件
                      this.initializePluginComponent();
                    },
                    methods: {
                      initializePluginComponent(this: any) {
                        const mountPoint = document.querySelector(
                          `#${this.mountId}`,
                        );
                        if (
                          mountPoint &&
                          typeof (window as any).initializePluginComponent ===
                            'function'
                        ) {
                          (window as any).initializePluginComponent(
                            mountPoint,
                            {
                              pluginName,
                              libraryId,
                              componentPath,
                            },
                          );
                        }
                      },
                    },
                    name: pluginRoute.name,
                  });
                }
              })
              .catch((error) => {
                console.error(
                  `Failed to load plugin script: ${fullUrl}`,
                  error,
                );
                // 返回错误组件
                resolve({
                  template: `
                    <div class="plugin-component-error">
                      <h3>组件脚本加载失败</h3>
                      <p>无法加载插件脚本: {{ componentPath }}</p>
                      <p>错误信息: {{ error }}</p>
                      <p>尝试的URL: {{ fullUrl }}</p>
                      <details>
                        <summary>调试信息</summary>
                        <p>Library ID: {{ libraryId }}</p>
                        <p>Plugin Name: {{ pluginName }}</p>
                        <p>Component Path: {{ componentPath }}</p>
                      </details>
                    </div>
                  `,
                  data() {
                    return {
                      componentPath,
                      error: error.message,
                      fullUrl,
                      libraryId,
                      pluginName,
                    };
                  },
                  name: `${pluginRoute.name}_error`,
                });
              });
          });
        }
      } catch (error) {
        console.error(
          `Error loading component for plugin route ${pluginRoute.name}:`,
          error,
        );
      }
    }

    // 返回默认的插件组件
    return Promise.resolve({
      template: `
        <div class="plugin-placeholder">
          <h3>{{ title }}</h3>
          <p>插件组件: {{ component || '无' }}</p>
          <p>插件路径: {{ path }}</p>
        </div>
      `,
      data() {
        return {
          title: pluginRoute.meta?.title || pluginRoute.name,
          component: pluginRoute.component,
          path: pluginRoute.path,
        };
      },
      name: pluginRoute.name,
    });
  };

  const routes: RouteRecordRaw[] = [];

  // 主路由：使用后端返回的完整路径（包含库ID）
  routes.push({
    name: pluginRoute.name,
    path: pluginRoute.path,
    component,
    meta: {
      ...pluginRoute.meta,
      isPlugin: true,
      pluginGroup: pluginRoute.group,
      hideInMenu: true, // 隐藏在侧边栏菜单中
      hideInTab: false, // 允许在标签页中显示
    },
  });

  // 如果有原始路径，也注册一个别名路由，方便直接访问
  if (pluginRoute.originalPath && pluginRoute.pluginName) {
    // 标准别名路径：/mira/plugin/{pluginName}/{originalPath}
    const aliasPath = `/mira/plugin/${pluginRoute.pluginName}${pluginRoute.originalPath}`;

    const aliasRoutes = [
      {
        name: `${pluginRoute.name}_alias`,
        path: aliasPath,
        redirect: pluginRoute.path, // 重定向到主路由
        meta: {
          ...pluginRoute.meta,
          isPlugin: true,
          isAlias: true,
          pluginGroup: pluginRoute.group,
          hideInMenu: true, // 隐藏在侧边栏菜单中
          hideInTab: true, // 别名路由也隐藏在标签页中
        },
      },
      // 简化别名路径：直接使用原始路径，方便开发调试
      {
        name: `${pluginRoute.name}_simple_alias`,
        path: pluginRoute.originalPath,
        redirect: pluginRoute.path, // 重定向到主路由
        meta: {
          ...pluginRoute.meta,
          isPlugin: true,
          isAlias: true,
          isSimpleAlias: true,
          pluginGroup: pluginRoute.group,
          hideInMenu: true, // 隐藏在侧边栏菜单中
          hideInTab: true, // 别名路由也隐藏在标签页中
        },
      },
    ];

    routes.push(...aliasRoutes);
  }

  return routes;
}

/**
 * 从后端获取插件路由并转换为 Vue Router 格式
 */
export async function loadPluginRoutes(): Promise<RouteRecordRaw[]> {
  try {
    const pluginRoutes = await getPluginRoutes();

    if (pluginRoutes.length === 0) {
      return [];
    }

    // 转换插件路由为 Vue Router 格式
    const vueRoutes = pluginRoutes.flatMap((route) =>
      convertPluginRouteToVueRoute(route),
    );

    return vueRoutes;
  } catch (error) {
    console.error('❌ Error loading plugin routes:', error);
    return [];
  }
}

/**
 * 根据插件路由分组进行排序
 */
export function sortPluginRoutesByGroup(
  routes: RouteRecordRaw[],
): RouteRecordRaw[] {
  return routes.sort((a, b) => {
    const orderA = a.meta?.order || 999;
    const orderB = b.meta?.order || 999;

    // 先按 order 排序
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // 然后按组名排序
    const groupA = (a.meta?.pluginGroup as string) || '';
    const groupB = (b.meta?.pluginGroup as string) || '';

    if (groupA !== groupB) {
      return groupA.localeCompare(groupB);
    }

    // 最后按标题排序
    const titleA = (a.meta?.title as string) || '';
    const titleB = (b.meta?.title as string) || '';
    return titleA.localeCompare(titleB);
  });
}
