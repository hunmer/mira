# mira-dashboard-next

Mira Web 管理面板（新版），基于 Vue 3 + shadcn-vue + Tailwind CSS 4 构建。

## 功能

- 系统概览（统计卡片、系统信息、最近活动）
- 资源库管理（CRUD、搜索）
- 插件管理（启用/禁用/配置/商店）
- 管理员管理（角色权限控制）
- 数据库预览（表浏览、数据查看）
- 设备管理（连接状态、断开）
- 文件上传（拖拽上传、进度条）
- 多语言（中文/英文）
- 主题切换（浅色/深色/跟随系统）

## 技术栈

- **框架**: Vue 3 + TypeScript
- **UI**: shadcn-vue (reka-ui) + Tailwind CSS 4
- **路由**: Vue Router 4
- **状态**: Pinia
- **HTTP**: Axios
- **国际化**: vue-i18n 11
- **图标**: @remixicon/vue + @lucide/vue
- **构建**: Vite 6

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器（默认 5173 端口）
pnpm dev

# 构建
pnpm build

# 预览构建产物
pnpm preview
```

开发模式下 `/api/*` 请求自动代理到 `http://127.0.0.1:8081`（mira-app-server）。

## 项目结构

```
src/
├── api/              # API 客户端 + 7 个模块
│   ├── client.ts     # Axios 实例（拦截器、token、错误处理）
│   └── modules/      # library/plugin/admin/device/system/auth/file
├── assets/           # CSS（Tailwind + shadcn-vue 变量）
├── components/
│   ├── ui/           # shadcn-vue 组件（自动生成）
│   └── common/       # 业务公共组件
├── composables/      # useTheme
├── i18n/             # vue-i18n（zh-CN / en）
├── layouts/          # DefaultLayout（Sidebar + 顶栏）
├── lib/              # utils（cn 函数）
├── router/           # 路由 + 权限守卫
├── stores/           # Pinia stores（auth / app）
├── types/            # TypeScript 类型定义
└── views/
    ├── auth/         # 登录、404
    └── mira/         # 7 个业务页面
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `/api` | API 基础路径 |
