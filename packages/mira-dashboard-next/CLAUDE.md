# mira-dashboard-next

Mira 的 Web 管理面板。基于 Vue 3.5 + Tailwind CSS 4 + shadcn-vue（reka-ui）构建的 SPA，替代旧版 Vben Admin 实现。提供素材库/插件/管理员/设备/文件/统计/缩略图等管理能力，支持中英文 i18n 与动态插件前端路由。

## 约定的规则

- 包管理：pnpm monorepo 子包（`private: true`，不发布）。
- 脚本（`package.json`）：
  - `dev`: `vite`（dev server 代理 `/api`、`/health` 到 `http://127.0.0.1:8081`，mira-app-server）
  - `build`: `vue-tsc -b && vite build`
  - `preview`: `vite preview`
- 无 test 脚本（未发现测试配置）。
- 路径别名 `@/*` -> `src/*`（tsconfig + vite）。
- UI 规则：仅 shadcn-vue（reka-ui），不引入其他 UI 框架；组件生成配置见 `components.json`（style=reka-mira, baseColor=zinc, iconLibrary=remixicon）。
- 表单：vee-validate + zod。
- API 统一经由 `src/api/client.ts`（axios 封装 + Bearer token + baseURL 可运行时配置）。
- 路由采用 hash 模式（`createWebHashHistory`）。

## 文件索引

| 路径 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、职责、认证架构、依赖 |
| [claude/conventions.md](claude/conventions.md) | 编码与工程约定 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 各目录职责划分 |
| [claude/entrypoints.md](claude/entrypoints.md) | 应用入口与构建命令 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 页面路由、API 模块、Store、共享组件 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖、构建与运行时配置 |
| [claude/data-model.md](claude/data-model.md) | Pinia store 与类型 |
| [claude/file-map.md](claude/file-map.md) | 源文件清单 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 |

## 扫描状态

- **版本**: 0.0.0 (private)
- **扫描时间**: 2026-08-05
- **测试**: 无（未发现）
