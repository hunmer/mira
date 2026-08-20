# src/renderer - 渲染进程模块

[根目录](../../CLAUDE.md) > **src/renderer**

> 导航: [Main 模块](../main/CLAUDE.md) | [Preload 模块](../preload/CLAUDE.md) | [shadcn-vue UI 组件](../components/ui/CLAUDE.md) | [Shared 模块](../shared/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | 新增 i18n/(vue-i18n) 与 procm-ui-tests/(远程 UI 测试);Store 10→15;UI 框架更正为 shadcn-vue(原文误记 PrimeVue);路由新增 image/video-preview、playground、menu-test |
| 2026-05-12 | 架构扫描更新 | 补充入口分析、路由清单、子模块索引 |

## 模块职责

Vue 3 前端应用模块，负责用户界面和全部业务逻辑。包含 Tab 系统、插件系统、搜索系统、状态管理等核心功能。

## 入口与启动

- **入口文件**: `main.ts` (113 行)
- **启动流程**:
  1. 创建 Vue 应用 + Pinia + Router
  2. 安装 v-viewer / vue3-lazyload 等插件
  3. 初始化 `MiraAPI` 单例
  4. 初始化插件系统 `PluginSystemCore`
  5. 设置全局错误处理
  6. `initializeApp()`: 初始化 SettingsStore -> Electron 菜单 -> 挂载应用
- **全局 API**: `web-globals.ts` 将 `miraSDK` 暴露到 `window.mira`（Web 环境使用）

## 对外接口

### API 层 (`api/`)

| API | 描述 |
|-----|------|
| `MiraAPI` | 后端 API 统一封装（认证/文件/库/插件/系统） |
| `TabRegistryAPI` | Tab 注册公共 API |

### 路由 (`router/`)

| 路径 | 视图 | 认证 |
|------|------|------|
| `/` | HomeView (Tab 系统) | 需要认证 + 连接 |
| `/login` | LoginView | 无 |
| `/settings` | SettingsView | 无 |
| `/upload` | FileUploadView | 需要认证 + 连接 |
| `/file-preview` | FilePreviewView | 无 |
| `/image-preview/:id` / `/video-preview/:id` | 图片/视频预览 | 无 |
| `/local-plugins` | IntegrationsList | 无 |
| `/playground` | PlaygroundView | 无 |
| `/menu-test` | MenuTestView | 无 |

## 目录结构

```
src/renderer/
├── App.vue                    # 根组件 (799 行)
├── main.ts                    # 应用入口 (145 行)
├── web-globals.ts             # Web 环境全局 API (122 行)
├── api/                       # API 接口
│   ├── MiraAPI.ts            # Mira API 封装 (621 行)
│   └── TabRegistryAPI.ts     # Tab 注册 API (228 行)
├── components/               # UI 组件
│   ├── business/             # 业务组件 (30+ 个)
│   ├── common/               # 通用组件
│   ├── layout/               # 布局组件
│   ├── preview/              # 预览组件
│   ├── search/               # 搜索组件
│   └── tabs/                 # Tab 视图组件
├── composables/               # 组合式 API
│   ├── useTabs.ts            # Tab 管理
│   ├── TabRegistry.ts        # Tab 注册系统
│   ├── TabTypes.ts           # Tab 类型基类
│   ├── TabSystem.ts          # Tab 系统核心
│   ├── TabHistory.ts         # Tab 历史记录
│   ├── TabPersistence.ts     # Tab 持久化
│   └── tabs/                 # 7 种 Tab 类型定义
├── config/
│   └── defaultShortcuts.ts   # 默认快捷键
├── controllers/               # 业务控制器
│   ├── HomeController/       # 首页控制器 (多个子模块)
│   ├── ImagePreviewController.ts
│   └── VideoPreviewController.ts
├── i18n/                      # vue-i18n(zh-CN/en-US locales,v2.x 新增)
├── modules/
│   └── home/                 # 首页模块 (路由/文件夹/标签处理)
├── plugins/                   # 插件系统
├── procm-ui-tests/            # 真实页面 UI 测试注册表(约 30 用例,仅开发构建,v2.x 新增)
├── router/                    # 路由配置 (257 行)
├── services/                  # 业务服务
│   ├── InitializationService.ts # 初始化
│   ├── MiraSDKService.ts     # SDK 集成
│   ├── PluginService.ts      # 插件服务
│   ├── SearchHandlers.ts     # 搜索处理
│   ├── ShortcutService.ts    # 快捷键
│   ├── WebSocketService.ts   # WebSocket
│   ├── MenuService.ts        # 菜单服务
│   ├── ElectronService.ts    # Electron 环境
│   └── search/               # 搜索子服务
├── stores/                    # Pinia 状态管理 (15 个 Store)
├── types/                     # 类型定义
├── utils/                     # 工具函数
└── views/                     # 页面视图
    ├── HomeView/             # 首页模块 (含 ImportDropdown 等子组件)
    ├── LoginView/            # 登录模块
    ├── SettingsView.vue
    ├── FileUploadView.vue
    ├── FilePreviewView.vue
    ├── PlaygroundView.vue    # UI Playground
    ├── MenuTestView.vue
    ├── NotFoundView.vue
    └── settings/             # 设置子面板(含 playground/ 演练场)
```

## 核心系统详解

### 1. Tab 系统 (核心特色)

基于视图的标签页系统，每个标签页对应一个 Vue 组件。

**生命周期**: `onInit` -> `onActive` -> `onInactive` -> `onClose`

**核心文件**:
- `TabRegistry.ts`: 中央注册系统
- `TabTypes.ts`: BaseTabType / MediaViewTabType 基类
- `useTabs.ts` (809 行): Tab 管理核心
- `TabViewRenderer.vue`: 动态组件渲染

### 2. 状态管理

15 个 Pinia Store，全部支持持久化到 localStorage:

| Store | 描述 |
|-------|------|
| `media.ts` | 媒体文件核心状态 |
| `auth.ts` | 用户认证和会话管理 |
| `plugin.ts` | 插件市场和管理 |
| `settings.ts` | 应用配置和服务器设置 |
| `serverList.ts` | 服务器列表 |
| `tag.ts` | 标签管理 |
| `folder.ts` | 文件夹管理 |
| `uploadHistory.ts` | 上传历史 |
| `library.ts` | 媒体库管理 |
| `appState.ts` | 应用全局状态 |
| `dashboard.ts` | Dashboard Web URL |
| `dashboardLayout.ts` | Dashboard 布局持久化(多 layout) |
| `homeSidebarLayout.ts` | Home 侧边栏已启用模块持久化 |
| `urlImport.ts` | 「从 URL 导入」全局对话框状态 |
| `viewHistory.ts` | 预览浏览历史(「最近查看」) |

详见 [stores/CLAUDE.md](./stores/CLAUDE.md)。

### 3. 控制器系统

`controllers/HomeController/` 首页控制器:
- `stateManager.ts` (350 行): 视图状态管理
- `dataManager.ts` (247 行): 数据获取和缓存
- `fileOperations.ts` (268 行): 文件操作
- `interactionHandler.ts` (439 行): 用户交互处理

### 4. 插件系统

`plugins/` 完整的插件架构:
- `instanceManager.ts` (260 行): 插件实例管理
- `operationManager.ts` (244 行): 插件操作管理
- `scriptManager.ts` (135 行): 脚本加载管理
- `storage.ts` (79 行): 插件数据存储

## 关键依赖与配置

- Vue 3 + Vue Router + Pinia + vue-i18n 11
- `mira-app-core`: 后端通信
- shadcn-vue(`@/components/ui/*`,new-york)+ Tailwind CSS v4: UI 框架
- `v-viewer` / `vue3-lazyload`: 图片/媒体
- `plyr`: 视频播放器
- `@hunmer/vue-selection-box`(workspace): 框选

## 数据模型

所有数据模型定义在 `src/shared/types.ts`，渲染进程额外类型定义在 `types/` 目录。

## 测试与质量

- 远程真实页面 UI 测试: `procm-ui-tests/`(约 30 用例,`pnpm run test:ui:remote <name>` 经 procm-mcp 驱动,仅开发构建)
- 类型检查: `vue-tsc --noEmit`
- ESLint: `eslint . --ext .vue,.ts,.tsx --fix`

## 子模块文档

| 子模块 | 文档 |
|--------|------|
| API 接口 | [api/CLAUDE.md](./api/CLAUDE.md) |
| 业务组件 | [components/business/CLAUDE.md](./components/business/CLAUDE.md) |
| 通用组件 | [components/common/CLAUDE.md](./components/common/CLAUDE.md) |
| 布局组件 | [components/layout/CLAUDE.md](./components/layout/CLAUDE.md) |
| 预览组件 | [components/preview/CLAUDE.md](./components/preview/CLAUDE.md) |
| 搜索组件 | [components/search/CLAUDE.md](./components/search/CLAUDE.md) |
| Tab 视图 | [components/tabs/CLAUDE.md](./components/tabs/CLAUDE.md) |
| 组合式 API | [composables/CLAUDE.md](./composables/CLAUDE.md) |
| Tab 类型 | [composables/tabs/CLAUDE.md](./composables/tabs/CLAUDE.md) |
| 控制器 | [controllers/CLAUDE.md](./controllers/CLAUDE.md) |
| 功能模块 | [modules/CLAUDE.md](./modules/CLAUDE.md) |
| 首页模块 | [modules/home/CLAUDE.md](./modules/home/CLAUDE.md) |
| 插件系统 | [plugins/CLAUDE.md](./plugins/CLAUDE.md) |
| 路由 | [router/CLAUDE.md](./router/CLAUDE.md) |
| 业务服务 | [services/CLAUDE.md](./services/CLAUDE.md) |
| 搜索服务 | [services/search/CLAUDE.md](./services/search/CLAUDE.md) |
| 应用配置 | [config/CLAUDE.md](./config/CLAUDE.md) |
| 工具函数 | [utils/CLAUDE.md](./utils/CLAUDE.md) |
| 状态管理 | [stores/CLAUDE.md](./stores/CLAUDE.md) |
| 类型定义 | [types/CLAUDE.md](./types/CLAUDE.md) |
| 页面视图 | [views/CLAUDE.md](./views/CLAUDE.md) |
| 首页视图 | [views/HomeView/CLAUDE.md](./views/HomeView/CLAUDE.md) |
| 设置页面 | [views/settings/CLAUDE.md](./views/settings/CLAUDE.md) |

## 常见问题 (FAQ)

**Q: 如何新增页面?**
A: 在 `views/` 创建组件，在 `router/index.ts` 注册路由。

**Q: 如何新增 Tab 类型?**
A: 在 `composables/tabs/` 创建类型文件，在 `tabs/index.ts` 注册。

**Q: 如何新增 Store?**
A: 在 `stores/` 创建文件，在 `stores/index.ts` 导出并加入 `initializeStores()`。

**Q: 如何新增业务组件?**
A: 在 `components/business/` 创建，如涉及复杂交互可提取 composable。
