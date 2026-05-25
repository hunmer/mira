# 任务计划：mira-dashboard → mira-dashboard-next 迁移

## 目标

将 `packages/mira-dashboard` 的 Mira 管理面板迁移到 `packages/mira-dashboard-next`，使用 shadcn-vue 组件库，添加多语言、主题切换、统一 API 调用管理。

## 现状分析

### mira-dashboard (源)
- 基于 Vben Admin + Ant Design Vue
- 7 个路由页面：overview, library, plugin, admin, database, device, file-upload
- 26 个 .vue 文件（含组件）
- API 层：`api/mira/client.ts`（封装 RequestClient + 拦截器）、`api/mira/admin.ts`
- 类型定义：`types/mira/index.ts`、`types/mira/auth.ts`

### mira-dashboard-next (目标)
- 已初始化：Vue 3 + Vite + Tailwind CSS 4 + shadcn-vue + reka-ui
- 已配置 `components.json`（shadcn-vue，reka-mira 风格）
- 目前只有空的 App.vue 和 main.ts
- 缺少：vue-router、pinia、i18n、API 层、布局系统

## 迁移策略

核心思路：不搬运 Vben 框架，只迁移 Mira 业务逻辑，用 shadcn-vue 组件重写 UI。

---

## 阶段 1：基础设施搭建 [complete]

**目标**：安装依赖、配置路由/状态管理/API 客户端/多语言/主题切换

### 1.1 安装依赖
```
vue-router, pinia, @vueuse/core, axios, vue-i18n
```

### 1.2 目录结构
```
src/
├── api/           # 统一 API 调用
│   ├── client.ts  # axios 实例 + 拦截器
│   ├── modules/   # 按模块拆分 API
│   └── index.ts
├── assets/
├── components/
│   ├── ui/        # shadcn-vue 组件（自动生成）
│   └── common/   # 公共业务组件
├── composables/   # 可复用逻辑
│   ├── useTheme.ts
│   └── useAuth.ts
├── i18n/          # 多语言
│   ├── index.ts
│   └── locales/
│       ├── zh-CN.ts
│       └── en.ts
├── layouts/       # 布局组件
│   ├── DefaultLayout.vue
│   └── AuthLayout.vue
├── lib/
├── router/
│   ├── index.ts
│   ├── guards.ts
│   └── routes/
│       ├── mira.ts
│       └── auth.ts
├── stores/        # Pinia stores
│   ├── auth.ts
│   └── app.ts
├── types/
│   ├── mira.ts
│   └── auth.ts
├── views/
│   ├── mira/
│   │   ├── overview/
│   │   ├── library/
│   │   ├── plugin/
│   │   ├── admin/
│   │   ├── database/
│   │   ├── device/
│   │   └── file-upload/
│   └── auth/
│       ├── login.vue
│       └── not-found.vue
├── App.vue
└── main.ts
```

### 1.3 统一 API 客户端
- 基于 axios，不用 Vben 的 RequestClient
- 请求拦截：自动添加 Authorization header
- 响应拦截：401 → 跳登录、统一错误提示
- base URL 通过环境变量配置

### 1.4 多语言（vue-i18n）
- 中文（zh-CN）、英文（en）
- 按页面拆分翻译 key
- 默认中文

### 1.5 主题切换
- CSS 变量方案（已有 light/dark）
- useTheme composable，localStorage 持久化
- 跟随系统 prefers-color-scheme

## 阶段 2：布局与路由 [complete]

**目标**：实现带侧边栏的 Dashboard 布局 + 路由守卫

### 2.1 布局组件
- `DefaultLayout.vue`：侧边栏 + 顶栏 + 主内容区
- 侧边栏使用 shadcn-vue 的 Sidebar 组件
- 顶栏包含：主题切换按钮、语言切换、用户菜单

### 2.2 路由配置
迁移 mira-dashboard 的 7 个路由：
| 路径 | 组件 | 权限 |
|------|------|------|
| `/overview` | views/mira/overview/index.vue | 所有 |
| `/library` | views/mira/library/index.vue | super, admin |
| `/plugin` | views/mira/plugin/index.vue | super, admin |
| `/admin` | views/mira/admin/index.vue | super |
| `/database` | views/mira/database/index.vue | super, admin |
| `/device` | views/mira/device/index.vue | super, admin |
| `/file-upload` | views/mira/file-upload/index.vue | super, admin |

### 2.3 路由守卫
- 未登录 → 跳登录页
- 无权限 → 跳 403 页

## 阶段 3：类型定义与 API 模块 [complete]

**目标**：迁移类型定义、创建 API 模块

### 3.1 类型定义
迁移 `types/mira/index.ts` 和 `types/mira/auth.ts`

### 3.2 API 模块
按功能拆分：
- `api/modules/library.ts` — 素材库 CRUD
- `api/modules/plugin.ts` — 插件管理
- `api/modules/admin.ts` — 管理员管理
- `api/modules/device.ts` — 设备管理
- `api/modules/system.ts` — 系统信息/健康检查
- `api/modules/auth.ts` — 登录/登出/刷新 token
- `api/modules/file.ts` — 文件上传

## 阶段 4：页面迁移（核心） [complete]

**目标**：用 shadcn-vue 组件重写 7 个页面

按优先级逐个迁移：
1. **Overview** — 统计卡片 + 系统信息 + 最近活动
2. **Library** — 表格 + 搜索 + 表单弹窗
3. **Plugin** — 卡片列表 + 详情抽屉 + 配置弹窗 + 插件商店
4. **Admin** — 用户表格 + CRUD
5. **Database** — 数据表浏览 + 数据编辑
6. **Device** — 设备列表 + 状态
7. **File Upload** — 文件拖拽上传

每个页面需要：
- shadcn-vue 组件替换 Ant Design 组件
- 多语言 key 替换硬编码中文
- 统一 API 调用

### 需要的 shadcn-vue 组件
- Card, Button, Input, Table, Dialog, Drawer, Dropdown, Badge, Tabs, Select, Form, Toast, Sidebar, Avatar, Skeleton

## 阶段 5：认证与权限 [complete]

**目标**：登录页 + 权限控制

### 5.1 登录页
- 表单：用户名 + 密码
- token 存 localStorage
- 登录后跳转到 overview

### 5.2 权限 Store
- Pinia store 管理用户信息和角色
- 路由守卫检查角色

### 5.3 错误页面
- 404 Not Found
- 403 Forbidden

## 阶段 6：联调与验证 [pending]

**目标**：确保所有页面可用

- 启动 mira-app-server
- 启动 mira-dashboard-next dev
- 验证每个页面的 CRUD 操作
- 验证主题切换、语言切换
- 验证权限控制

---

## 遇到的错误

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| (暂无) | | |

## 决策记录

| 决策 | 原因 |
|------|------|
| 用 axios 替代 Vben RequestClient | 去 Vben 依赖，轻量化 |
| CSS 变量主题 | 已有 light/dark 变量，直接用 |
| vue-i18n 多语言 | Vue 生态标准方案 |
| Pinia 状态管理 | Vue 3 官方推荐 |
