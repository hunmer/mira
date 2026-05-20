[根目录](../../CLAUDE.md) > [packages](..) > **mira-dashboard**

# mira-dashboard

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira Web 管理面板，基于 **Vben Admin (Vue 3 + Ant Design + Vite)** 构建的 Web 后台管理系统。提供以下功能：

1. **系统概览**: 服务器状态、素材库统计
2. **素材库管理**: 库的创建/启用/禁用/配置
3. **插件管理**: 服务端插件的安装/启用/禁用/配置
4. **管理员管理**: 用户和角色管理（需要 super 角色）
5. **数据库预览**: 直接查看/编辑素材库数据
6. **设备管理**: 已连接设备的管理
7. **文件上传**: Web 端文件上传

本项目是 Vben Admin 框架的定制化应用，内部包含大量 Vben 内部包 (`@vben/*`)。

## 入口与启动

- **应用入口**: `apps/web-antd/src/main.ts`
- **开发命令**: `pnpm run dev` 或 `pnpm run dev:antd`
- **构建命令**: `pnpm run build` 或 `pnpm run build:antd`
- **预览**: `pnpm run preview`

## 对外接口

本模块不暴露 API，而是消费 `mira-app-server` 的 HTTP API。

### 路由结构 (apps/web-antd/src/router/routes/modules/mira.ts)

| 路径 | 组件 | 权限 | 说明 |
|------|------|------|------|
| `/mira/overview` | `views/mira/overview/index.vue` | 所有 | 系统概览 |
| `/mira/library` | `views/mira/library/index.vue` | super, admin | 资源库管理 |
| `/mira/plugin` | `views/mira/plugin/index.vue` | super, admin | 插件管理 |
| `/mira/admin` | `views/mira/admin/index.vue` | super | 管理员管理 |
| `/mira/database` | `views/mira/database/index.vue` | super, admin | 数据库预览 |
| `/mira/device` | `views/mira/device/index.vue` | super, admin | 设备管理 |
| `/mira/file-upload` | `views/mira/file-upload/index.vue` | super, admin | 文件上传 |

### API 层 (apps/web-antd/src/api/)

| 文件 | 说明 |
|------|------|
| `mira/client.ts` | Mira 服务端 API 调用 |
| `mira/admin.ts` | 管理员 API |
| `core/auth.ts` | 认证 API |
| `core/user.ts` | 用户 API |
| `core/plugin-routes.ts` | 动态插件路由 API |

## 关键依赖与配置

- **框架**: Vben Admin (内部 monorepo，含 `@vben/*` 多个子包)
- **UI**: Ant Design Vue, VxeTable, Monaco Editor
- **构建**: Turbo (monorepo 构建), Vite
- **语言**: TypeScript, Vue 3
- **包管理**: pnpm >= 9.12.0
- **Node**: >= 20.10.0
- **环境**: ESM (`"type": "module"`)

## 数据模型

前端类型定义在 `apps/web-antd/src/types/mira/`：

- `index.ts`: Mira 通用类型
- `auth.ts`: 认证相关类型

## 测试与质量

- **单元测试**: Vitest (`pnpm run test:unit`)
- **类型检查**: `pnpm run check:type`
- **Lint**: `pnpm run lint`
- **格式化**: `pnpm run format`
- **循环依赖检查**: `pnpm run check:circular`

## 相关文件清单

| 文件/目录 | 说明 |
|-----------|------|
| `apps/web-antd/` | 主应用 (Ant Design 版本) |
| `apps/web-antd/src/views/mira/` | Mira 功能页面 (6 个视图) |
| `apps/web-antd/src/api/mira/` | Mira API 封装 |
| `apps/web-antd/src/types/mira/` | Mira 类型定义 |
| `apps/web-antd/src/router/routes/modules/mira.ts` | Mira 路由配置 |
| `apps/web-antd/src/components/mira/` | Mira 专用组件 (StatCard, MonacoEditor) |
| `apps/web-antd/src/components/Library/` | 素材库组件 |
| `packages/` | Vben Admin 内部共享包 (utils, stores, types 等) |
| `internal/` | Vben 内部构建工具 (eslint-config, vite-config 等) |
| `package.json` | 包配置 (v5.5.9) |
