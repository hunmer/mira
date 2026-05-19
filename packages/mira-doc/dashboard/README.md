# Mira Dashboard - 管理面板文档

## 🎯 概述

Mira Dashboard 是 Mira 系统的核心管理界面，基于 Vue 3 + Vite + Ant Design Vue 构建的现代化 Web 管理平台。它提供了完整的系统管理功能，包括资源库管理、插件管理、设备监控、用户管理等。

## ✨ 特性

- 🎨 **现代化 UI**：基于 Ant Design Vue 的精美界面设计
- ⚡ **高性能**：Vite 构建，Vue 3 Composition API，极速开发体验
- 📱 **响应式设计**：完美适配桌面端和移动端
- 🔐 **权限控制**：基于角色的访问控制(RBAC)
- 🌐 **国际化**：支持多语言切换
- 🎯 **TypeScript**：完整的类型安全保障

## 🏗️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.4.0 | 前端框架 |
| Vite | ^5.0.0 | 构建工具 |
| TypeScript | ^5.0.0 | 类型系统 |
| Ant Design Vue | ^4.0.0 | UI 组件库 |
| Vue Router | ^4.0.0 | 路由管理 |
| Pinia | ^2.0.0 | 状态管理 |
| Tailwind CSS | ^3.0.0 | 样式框架 |

## 📦 项目结构

```
mira-dashboard/
├── public/                     # 静态资源
│   └── favicon.ico
├── src/
│   ├── api/                    # API 接口
│   │   ├── core/              # 核心 API
│   │   ├── mira/              # Mira 专用 API
│   │   ├── index.ts
│   │   └── request.ts
│   ├── components/            # 公共组件
│   │   ├── Library/           # 资源库相关组件
│   │   └── mira/              # Mira 专用组件
│   ├── layouts/               # 布局组件
│   │   ├── auth.vue           # 认证布局
│   │   ├── basic.vue          # 基础布局
│   │   └── index.ts
│   ├── locales/               # 国际化
│   │   ├── langs/             # 语言文件
│   │   ├── index.ts
│   │   └── README.md
│   ├── router/                # 路由配置
│   │   ├── routes/            # 路由定义
│   │   ├── access.ts          # 访问控制
│   │   ├── guard.ts           # 路由守卫
│   │   └── index.ts
│   ├── store/                 # 状态管理
│   │   └── auth.ts            # 认证状态
│   ├── styles/                # 样式文件
│   ├── types/                 # TypeScript 类型定义
│   ├── utils/                 # 工具函数
│   ├── views/                 # 页面组件
│   │   ├── dashboard/         # 仪表板页面
│   │   ├── mira/              # Mira 功能页面
│   │   │   ├── overview/      # 系统概览
│   │   │   ├── library/       # 资源库管理
│   │   │   ├── plugin/        # 插件管理
│   │   │   ├── plugin-routes/ # 插件路由管理
│   │   │   ├── admin/         # 管理员管理
│   │   │   ├── device/        # 设备管理
│   │   │   └── database/      # 数据库预览
│   │   └── _core/             # 核心页面
│   ├── app.vue                # 根组件
│   ├── bootstrap.ts           # 应用启动
│   ├── main.ts                # 入口文件
│   └── preferences.ts         # 偏好设置
├── index.html                 # HTML 模板
├── package.json              # 项目配置
├── tailwind.config.mjs       # Tailwind 配置
├── tsconfig.json             # TypeScript 配置
└── vite.config.mts           # Vite 配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 进入项目目录
cd mira-dashboard

# 安装依赖
pnpm install
```

### 启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 项目将在 http://localhost:3999 启动
```

### 构建生产版本

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 🎨 功能模块

### 1. 系统概览 (Overview)

系统概览页面提供了 Mira 系统的整体运行状况：

- **统计卡片**：显示资源库数量、插件数量、管理员数量、数据库大小
- **系统信息**：服务器状态、运行时间、系统版本、Node.js 版本
- **最近活动**：系统操作日志和活动记录

**特性：**
- 实时数据刷新
- 响应式设计
- 动画效果

### 2. 资源库管理 (Library)

资源库管理提供完整的文件库管理功能：

- **库列表**：显示所有资源库，支持搜索和筛选
- **库操作**：创建、编辑、删除资源库
- **批量操作**：批量选择和删除
- **库配置**：路径、类型、服务器端口等配置

**支持的库类型：**
- 本地库 (Local)
- 远程库 (Remote)

### 3. 插件管理 (Plugin)

插件管理提供完整的插件生命周期管理：

- **插件列表**：按资源库分组显示插件
- **插件操作**：启用/禁用、安装、卸载、配置
- **插件详情**：版本信息、依赖关系、标签等

**功能特性：**
- 插件分类筛选
- 多种排序方式
- 实时状态更新
- 配置验证

### 4. 插件路由管理 (Plugin Routes)

插件路由管理用于管理动态加载的插件页面：

- **路由列表**：显示各个资源库的插件路由
- **路由预览**：查看路由配置和元信息
- **路由编辑**：编辑路由配置
- **权限控制**：基于角色的路由访问控制

### 5. 设备管理 (Device)

设备管理提供实时的设备监控和管理：

- **设备统计**：总数、在线、离线、连接中设备数量
- **设备列表**：设备详情、状态、操作历史
- **设备操作**：连接、断开、发送消息
- **消息历史**：设备通信记录

**实时功能：**
- WebSocket 实时状态更新
- 设备连接/断开事件
- 消息推送

### 6. 管理员管理 (Admin)

管理员管理提供用户账户管理功能：

- **管理员列表**：显示所有管理员账户
- **账户操作**：创建、编辑、删除管理员
- **权限管理**：分配角色和权限
- **状态控制**：启用/禁用账户

**权限级别：**
- 超级管理员 (Super)
- 管理员 (Admin)

### 7. 数据库预览 (Database)

数据库预览提供数据库状态查看功能：

- **数据库信息**：大小、表数量、记录数
- **表结构**：查看表结构和索引
- **数据预览**：浏览表数据
- **性能监控**：查询性能和统计信息

## 🔐 权限系统

Mira Dashboard 实现了基于角色的访问控制 (RBAC)：

### 角色定义

| 角色 | 权限范围 | 可访问页面 |
|------|----------|------------|
| Super | 全部权限 | 所有页面 |
| Admin | 管理权限 | 除管理员管理外的所有页面 |
| User | 只读权限 | 仅系统概览 |

## 🌐 API 集成

### API 客户端

Mira Dashboard 使用统一的 API 客户端与后端通信：

```typescript
// API 客户端配置
export const miraApiClient = createMiraApiClient(apiURL);

// 请求示例
const libraries = await miraApiClient.get('/libraries');
const plugins = await miraApiClient.get('/plugins');
```

## ⚙ 环境配置
### 环境配置

```bash
# 开发环境
VITE_API_URL=http://localhost:8081
VITE_WS_URL=ws://localhost:8081

# 生产环境
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
```
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| VITE_API_URL | API 服务地址 | http://localhost:8081 |
| VITE_WS_URL | WebSocket 地址 | ws://localhost:8081 |
| VITE_APP_TITLE | 应用标题 | Mira Dashboard |
| VITE_ROUTER_HISTORY | 路由模式 | hash |

### Docker 部署

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📚 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Ant Design Vue](https://antdv.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
