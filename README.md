# Mira TypeScript

一个基于 TypeScript 的现代化媒体资源管理系统，包含后端服务和前端管理面板。

## 项目架构

```
mira_typescript/
├── packages/
│   ├── mira-app-core/              # 核心库
│   ├── mira-app-server/            # 后端服务
│   ├── mira-dashboard/         # 前端管理面板 ⭐ 新增
│   └── mira-storage-sqlite/    # SQLite 存储适配器
├── plugins/                    # 插件目录
├── data/                       # 数据目录
└── .vscode/                    # VS Code 配置
```

## 功能特性

### 后端服务 (mira-app-server)
- 🚀 基于 Node.js + TypeScript 的高性能服务
- 📁 资源库管理（本地/远程）
- 🔌 插件系统支持
- 🌐 WebSocket 实时通信
- 🗄️ SQLite 数据存储
- 🔒 用户认证和权限管理

### 前端管理面板 (mira-dashboard) ⭐ 新增
- 🎨 基于 Vue 3 + Vite + TailwindCSS 的现代化界面
- 📊 系统概览和统计信息
- 📁 **资源库管理器** - 可视化管理所有资源库
- 🔌 **插件管理器** - 插件的安装、配置、启用/禁用
- 👥 **管理员管理** - 管理员账户的增删改查
- 🗄️ **SQLite数据库预览** - 可视化数据库操作和SQL查询
- 🔧 环境变量支持设置初始管理员

## 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn

### 1. 安装依赖
```bash
# 安装所有包的依赖
npm run install-all
```

### 2. 启动开发环境

#### 方式一：启动完整全栈（推荐）
```bash
# Windows
./start-full-stack.bat

# PowerShell
./start-full-stack.ps1

# 或使用 VS Code 任务
# Ctrl+Shift+P -> Tasks: Run Task -> start-full-stack
```

#### 方式二：分别启动服务
```bash
# 启动后端服务
cd packages/mira-app-server
npm run dev

# 启动前端管理面板
cd packages/mira-dashboard
npm run dev
```

### 3. 访问应用
- **后端API**: http://localhost:8081
- **WebSocket**: ws://localhost:8018
- **前端管理面板**: http://localhost:3999 (需要安装 mira-dashboard)
- **默认登录**: 用户名 `admin`，密码 `admin123`

## 开发配置

### VS Code 任务
项目已配置完整的 VS Code 开发环境：

- **start-mira-dashboard-dev**: 启动前端开发服务器
- **build-mira-dashboard**: 构建前端生产版本
- **start-full-stack**: 启动完整全栈应用
- **build-full-stack**: 构建完整全栈应用

### 调试配置
- **Debug Mira Dashboard (Chrome/Edge)**: 前端调试
- **Debug Full Stack**: 全栈调试

### 环境变量配置
在 `packages/mira-dashboard/.env` 中配置：

```env
# 应用配置
APP_TITLE=Mira Dashboard
API_BASE_URL=http://localhost:8081
WS_BASE_URL=ws://localhost:8018

# 初始管理员配置
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin123
INITIAL_ADMIN_EMAIL=admin@mira.local
```

## 技术栈

### 后端
- **Node.js** + **TypeScript**
- **Express.js** - Web 框架
- **WebSocket** - 实时通信
- **SQLite** - 数据存储
- **插件系统** - 模块化扩展

### 前端 ⭐
- **Vue 3** - 前端框架（Composition API）
- **Vite** - 构建工具
- **TypeScript** - 类型安全
- **Element Plus** - UI 组件库
- **TailwindCSS** - CSS 框架
- **Pinia** - 状态管理
- **Axios** - HTTP 客户端

## 项目结构

### 前端管理面板详细结构
```
packages/mira-dashboard/
├── src/
│   ├── components/         # 可复用组件
│   │   ├── StatCard.vue    # 统计卡片
│   ├── layouts/            # 布局组件
│   │   └── DashboardLayout.vue
│   ├── views/              # 页面组件
│   │   ├── Login.vue       # 登录页面
│   │   ├── Overview.vue    # 系统概览
│   │   ├── LibraryManager.vue    # 资源库管理器
│   │   ├── PluginManager.vue     # 插件管理器
│   │   ├── AdminManager.vue      # 管理员管理
│   │   └── DatabaseViewer.vue    # 数据库预览器
│   ├── router/             # 路由配置
│   ├── stores/             # Pinia 状态管理
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   └── style.css           # 全局样式
└── README.md               # 详细使用说明
```

## 功能模块详解

### 🎯 系统概览 (Overview)
- 系统运行状态监控
- 资源统计信息
- 最近活动记录
- 系统信息展示

### 📁 资源库管理器 (LibraryManager)
- 资源库的增删改查
- 本地/远程资源库支持
- 搜索和状态筛选
- 文件数量和大小统计
- 批量操作支持

### 🔌 插件管理器 (PluginManager)
- 插件安装（本地上传/远程仓库）
- 插件配置管理（JSON 编辑器）
- 插件状态控制（启用/禁用）
- 插件更新和卸载
- 依赖关系管理

### 👥 管理员管理 (AdminManager)
- 管理员账户创建和删除
- 权限管理
- 邮箱和密码管理
- 环境变量初始管理员配置

### 🗄️ 数据库预览器 (DatabaseViewer)
- SQLite 数据库表浏览
- 表结构查看
- 数据的增删改查
- SQL 查询执行
- 数据导出（CSV 格式）

## 插件开发

系统支持插件扩展，插件目录：`plugins/`

已包含示例插件：
- **mira_thumb**: 缩略图生成
- **mira_user**: 用户管理
- **upload_statistics**: 上传统计

## 构建和部署

### 开发环境
```bash
npm run dev  # 所有包的开发模式
```

### 生产构建
```bash
npm run build  # 构建所有包
```

### 前端单独部署
```bash
cd packages/mira-dashboard
npm run build
# 部署 dist/ 目录到 Web 服务器
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

