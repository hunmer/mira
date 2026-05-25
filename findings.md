# 研究发现

## mira-dashboard 源项目分析

### 技术栈
- Vben Admin (内部 monorepo，含 @vben/* 子包)
- Ant Design Vue
- VxeTable
- Monaco Editor (代码编辑)
- Turbo 构建

### API 端点（从 client.ts 和页面代码推断）
- `GET /libraries` — 素材库列表
- `GET /plugins` — 插件列表
- `GET /admins` — 管理员列表
- `GET /health` — 系统健康信息（uptime, version, nodeVersion）
- `POST /admins` — 创建管理员
- `PUT /api/admins/:id` — 更新管理员
- `DELETE /api/admins/:id` — 删除管理员
- 登录 API（返回 token + user）

### 认证方式
- Bearer token
- token 存 sessionStorage（mira 方式）或 accessStore（vben 方式）
- 401 时清除 token 并跳登录页

### 权限模型
- 角色：super（超级管理员）、admin（管理员）、user（普通用户）
- 路由级别权限控制
- super 独占：管理员管理页
- super + admin 共享：库/插件/数据库/设备/文件上传

## mira-dashboard-next 目标项目分析

### 已有配置
- shadcn-vue 已配置（reka-mira 风格，zinc 基础色，remixicon 图标）
- Tailwind CSS 4 + tw-animate-css
- CSS 变量主题已就绪（light/dark 两套变量）
- @ 别名已配置
- TypeScript strict mode

### 缺少的依赖
- vue-router（路由）
- pinia（状态管理）
- vue-i18n（多语言）
- axios（HTTP 客户端）
- @vueuse/core（工具函数）
