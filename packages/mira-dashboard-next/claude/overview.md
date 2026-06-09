# mira-dashboard-next 总览

## 模块职责

Mira Web 管理面板（全新版本），替代原有基于 Vben Admin 的 `mira-dashboard`。采用 shadcn-vue + Tailwind CSS 4 构建。

核心功能：
1. **仪表盘概览**: 系统状态总览
2. **素材库管理**: CRUD + 启用/禁用
3. **插件管理**: 安装/卸载/配置
4. **管理员面板**: 用户管理 (super 角色)
5. **数据库管理**: 数据库操作
6. **设备管理**: 连接设备查看/断开
7. **文件上传/管理**: 文件操作
8. **统计数据**: 上传统计/文件类型统计
9. **缩略图管理**: 缩略图生成/扫描/进度
10. **个人资料**: 用户信息
11. **认证**: 登录/注册，URL Token 自动登录
12. **i18n**: 中英文双语 (vue-i18n)
13. **插件路由**: 动态注册插件前端路由

## 入口

- **入口**: `src/main.ts` -- Vue App + Pinia + Router + i18n
- **构建**: `vue-tsc -b && vite build`
- **开发**: `pnpm run dev`

## 认证架构

认证已内置到服务端核心 (mira-app-server)：
- UserStorage: 基于 SQLite 的用户管理
- AuthRouter: HTTP REST API 认证端点
- 权限体系：super（全部）、admin（除管理员管理外全部）、user（仅概览和个人资料）

## 关键依赖

| 依赖 | 用途 |
|------|------|
| Vue 3.5 | 前端框架 |
| shadcn-vue 2.7 | UI 组件库 |
| Tailwind CSS 4 | 样式 |
| Pinia 3.0 | 状态管理 |
| vue-i18n 11 | 国际化 |
| axios | HTTP 客户端 |
| vee-validate + zod | 表单验证 |
| @unovis/vue | 数据可视化 |
| @tanstack/vue-table | 表格 |
