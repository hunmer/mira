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
前端 router/pluginRoutes.ts registerPluginRoutes()
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
        ensurePluginRuntime() 挂载 window.MiraDashboard / window.MiraDashboardUI
                │
                ▼
        Vue 渲染组件（需要 vue runtime compiler）
```

## 涉及文件

| 文件 | 职责 |
|------|------|
| `src/router/index.ts` | 布局路由加 `name: 'MainLayout'`；守卫更新 `currentLibraryId`；刷新命中 404 时补注册插件路由 |
| `src/router/pluginRoutes.ts` | 拉取插件路由；动态 `router.addRoute()`；解析 builder/component；动态加载插件 JS |
| `src/pluginRuntime.ts` | 挂载 `window.MiraDashboard` 和 `window.MiraDashboardUI`，给插件提供运行时上下文和宿主 UI 组件 |
| `src/stores/app.ts` | `useAppStore` 存 `currentLibraryId`；`MiraDashboardContext` 接口；`getDashboardContext()` 工厂 |
| `src/views/mira/plugin/index.vue` | 插件管理页；展示插件列表和入口；调用 `registerPluginRoutes()` 获取并注册当前素材库的插件路由 |
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

### 2. 前端拉取路由

插件路由由 `src/router/pluginRoutes.ts` 统一注册：

- 插件管理页加载时，遍历当前展示的素材库并调用 `registerPluginRoutes(router, libraryId)`。
- 刷新插件深链接时，如果初始路由命中 `NotFound`，`src/router/index.ts` 会调用 `registerAllPluginRoutes(router)` 补注册全部插件路由，然后重新解析当前 URL。

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

插件组件需要知道当前素材库 ID、用户信息、API 基础路径，并且可以复用宿主 shadcn-vue 组件。提供以下途径：

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

#### 宿主 UI 组件（`window.MiraDashboardUI`）

插件 JS 是通过 `<script>` 动态加载的浏览器脚本，不能直接使用 `import '@/components/ui/button'` 等 Vite alias。因此 Dashboard 通过 `src/pluginRuntime.ts` 暴露一组已存在的 shadcn-vue 组件：

```typescript
window.MiraDashboardUI = {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
}
```

插件组件通过本地 `components` 字段注册这些组件。建议使用插件私有前缀命名，避免和宿主或其他插件组件名冲突：

```javascript
const ui = window.MiraDashboardUI || {};

const MyComponent = {
  name: 'MyPlugin',
  components: {
    MiraButton: ui.Button,
    MiraCard: ui.Card,
    MiraCardContent: ui.CardContent,
  },
  template: `
    <MiraCard>
      <MiraCardContent>
        <MiraButton @click="refresh">刷新</MiraButton>
      </MiraCardContent>
    </MiraCard>
  `
};
```

约束：

- 插件不能直接 `import` Dashboard 源码中的 shadcn-vue 组件。
- `window.MiraDashboardUI` 只暴露宿主明确支持的组件，不等同于完整 shadcn-vue 包。
- 插件仍应优先通过 Tailwind token 类名（如 `text-muted-foreground`、`bg-muted`、`border`）保持视觉一致。

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
    components: {
      MiraButton: window.MiraDashboardUI?.Button,
      MiraCard: window.MiraDashboardUI?.Card,
      MiraCardContent: window.MiraDashboardUI?.CardContent,
    },
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
