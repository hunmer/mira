# 插件动态加载机制

Dashboard 通过运行时动态加载插件组件，实现插件的 UI 页面注入。整个流程涉及后端路由注册、前端路由动态挂载、组件加载和上下文注入。

## 流程概览

```
服务端插件 registerRoutes()
        │
        ▼
GET /api/plugin-routes/:libraryId  ──►  返回路由定义数组
        │
        ▼
前端 plugin/index.vue loadPluginRoutes()
        │
        ├─ 存入 pluginRoutes (展示按钮)
        └─ router.addRoute('MainLayout', child) (注册路由)
                │
                ▼
        用户点击插件入口 / 路由跳转
                │
                ▼
        resolvePluginComponent() 解析组件
          ├─ builder 模式: 直接用返回 HTML 作 template
          └─ component 模式: <script> 加载 JS → window.MiraPluginComponents 取组件
                │
                ▼
        withMixin() 注入 getLibraryId() 方法
                │
                ▼
        Vue 渲染组件（需要 vue runtime compiler）
```

## 涉及文件

| 文件 | 职责 |
|------|------|
| `src/router/index.ts` | 布局路由加 `name: 'MainLayout'`，守卫更新 `currentLibraryId` |
| `src/stores/app.ts` | `useAppStore` 存 `currentLibraryId`；`MiraDashboardContext` 接口；`getDashboardContext()` 工厂 |
| `src/views/mira/plugin/index.vue` | `loadPluginRoutes` 加载并注册路由；`resolvePluginComponent` 解析组件；`window.MiraDashboard` 挂载 |
| `vite.config.ts` | Vue alias 指向完整构建（含 runtime compiler）；`/api` proxy 到后端 |

后端侧：

| 文件 | 职责 |
|------|------|
| `packages/mira-app-server/src/HttpServer.ts` | `HttpRouter` 挂在 `/api`，插件静态文件和 API 路由统一前缀 |
| `packages/mira-app-server/src/routes/HttpRouter.ts` | `/api/plugins/:libraryId/:pluginName/*` 静态文件服务 |
| `plugins/plugins/{plugin}/index.ts` | 插件通过 `registerRoutes()` 注册前端路由定义 |

## 详细步骤

### 1. 插件注册路由定义（服务端）

插件在 `initializeRoutes()` 中调用 `this.registerRoutes()` 注册 `PluginRouteDefinition`：

```typescript
const route: PluginRouteDefinition = {
  name: 'ThumbnailManager',
  group: '媒体管理',
  path: '/media/thumbnails',
  component: 'components/ThumbnailManager.js',  // 相对于插件目录
  pluginName: 'mira_thumb',
  meta: { title: '缩略图管理', roles: ['super', 'admin', 'user'] }
}
```

### 2. 前端拉取路由（plugin/index.vue）

`onMounted` 时遍历所有素材库，对每个库调用 `loadPluginRoutes(libraryId)`：

```
GET /api/plugin-routes/:libraryId → [{ name, path, component, pluginName, meta, ... }]
```

### 3. 动态注册 Vue Router 路由

对每条路由调用 `router.addRoute('MainLayout', child)`，注册为布局的子路由：

- 路由名: `plugin_{libraryId}_{route.name}`
- 路径: `route.path` 去掉前导 `/`（作为 `/` 的子路由）
- meta 中附带 `libraryId`，供路由守卫更新 store

### 4. 组件解析（resolvePluginComponent）

三种模式，优先级从高到低：

#### builder 模式
```typescript
if (route.builder) {
  const html = route.builder()
  return defineComponent({ template: html })
}
```
插件提供 `builder` 函数，直接返回 HTML 字符串作为模板。

#### component 模式（主要方式）
```typescript
if (route.component) {
  // src = /api/plugins/{libraryId}/{pluginName}/{component路径}
  // 动态 <script> 加载 JS
  // 从 window.MiraPluginComponents[key] 取出注册的组件
}
```
流程：
1. 拼接 URL: `/api/plugins/{libraryId}/{pluginName}/{component}`
2. 创建 `<script>` 标签加载
3. 脚本执行后通过 IIFE 把组件注册到 `window.MiraPluginComponents`
4. 从全局对象取出组件，用 `withMixin` 包装

#### fallback
如果 builder 和 component 都没有，返回占位组件显示路由名称。

### 5. 上下文注入

插件组件需要知道当前素材库 ID 和用户信息。提供两种途径：

#### mixin 注入（`this.getLibraryId()`）
注册路由时通过 Vue mixin 注入 `getLibraryId()` 方法，闭包捕获 `libraryId`：

```typescript
const mixin = {
  methods: { getLibraryId: () => libraryId }
}
// withMixin 把 mixin 合并进组件
```

#### 全局接口（`window.MiraDashboard`）

```typescript
window.MiraDashboard = {
  getLibraryId(): string   // 从 app store 读取
  getUser(): User | null   // 从 auth store 读取
  getApiBase(): string     // 返回 '/api'
}
```

路由守卫在进入插件页时把 `meta.libraryId` 写入 store：

```typescript
router.beforeEach((to) => {
  if (to.meta.libraryId) {
    useAppStore().setCurrentLibrary(to.meta.libraryId)
  }
})
```

### 6. 插件组件编写规范

插件组件 JS 文件需遵循以下约定：

```javascript
(function () {
  // 1. 注册到全局命名空间
  if (!window.MiraPluginComponents) {
    window.MiraPluginComponents = {};
  }

  const MyComponent = {
    name: 'MyPlugin',
    template: `<div>...</div>`,  // 需要 Vue runtime compiler
    data() { return { ... } },
    methods: {
      getLibraryId() {
        // 优先用 mixin 注入，fallback 到全局接口
        const ctx = window.MiraDashboard;
        if (ctx) return ctx.getLibraryId();
        return 'default';
      },
      getApiBase() {
        const ctx = window.MiraDashboard;
        if (ctx) return ctx.getApiBase();
        return '/api';
      }
    }
  };

  // 2. 注册 key 格式: {pluginName}_{component路径，/ 和 . 替换为 _}
  window.MiraPluginComponents['myplugin_components_MyComponent_js'] = MyComponent;
})();
```

API 请求必须走 `getApiBase()` 而非硬编码地址：

```javascript
// 正确
const res = await fetch(`${this.getApiBase()}/thumb/stats?libraryId=${this.getLibraryId()}`);

// 错误 - 硬编码地址和 libraryId
const res = await fetch(`http://127.0.0.1:8081/thumb/stats?libraryId=default`);
```

## 构建要求

- **Vue 完整构建**: `vite.config.ts` 中 alias `vue` → `vue/dist/vue.esm-bundler.js`，支持运行时模板编译
- **API Proxy**: Vite dev server 代理 `/api` → `http://127.0.0.1:8081`
- **服务端路由前缀**: `HttpRouter` 挂在 `/api`，插件静态文件路径为 `/api/plugins/:libraryId/:pluginName/*`
