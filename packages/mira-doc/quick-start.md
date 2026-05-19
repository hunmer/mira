# 🚀 快速开始

欢迎使用 Mira！本指南将帮助你在几分钟内快速搭建和运行 Mira 系统。

## 📋 系统要求

在开始之前，请确保你的系统满足以下要求：

::: info 📊 最低要求
- **Node.js**: 版本 16.0 或更高
- **NPM**: 版本 7.0 或更高
- **内存**: 至少 512MB 可用内存
- **磁盘空间**: 至少 1GB 可用空间
- **操作系统**: Windows 10/11, macOS 10.15+, 或 Linux
:::

## 🔧 步骤一：安装 Node.js

如果你还没有安装 Node.js，请按照以下步骤操作：

### Windows 用户 🪟
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本安装包
3. 运行安装程序并按照向导完成安装

### macOS 用户 🍎
```bash
# 使用 Homebrew 安装（推荐）
brew install node

# 或者访问官网下载安装包
```

### Linux 用户 🐧
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm
```

## 📦 步骤二：安装 Mira Server

选择你偏好的安装方式：

### 全局安装（推荐） 🌍

```bash
npm install -g mira-app-server
```

::: tip 💡 提示
全局安装可以让你在任何地方使用 `mira-app-server` 命令
:::

### 本地安装 📁

```bash
# 创建项目目录
mkdir my-mira-project
cd my-mira-project

# 安装 Mira Server
npm install mira-app-server
```

## 🎬 步骤三：启动 Mira Server

### 全局安装后启动

```bash
# 使用默认配置启动
mira-app-server

# 或者自定义配置
mira-app-server --http-port 3001 --ws-port 8018
```

### 本地安装后启动

```bash
# 使用 npx 启动
npx mira-app-server

# 或者添加到 package.json scripts
```

## 🌐 步骤四：访问 Mira 界面

启动成功后，你会看到类似以下的输出：

```
🚀 Mira Server 启动成功！
📡 HTTP 服务: http://localhost:3000
⚡ WebSocket 服务: ws://localhost:8081
📁 数据目录: ./data
```

现在你可以：

1. **安装 mira-dashboard 后打开浏览器**，访问 `http://localhost:3999`
2. **创建管理员账户**（首次访问时）
3. **开始使用 Mira**！

## 👤 步骤五：创建管理员账户

首次访问 Mira 时，系统会引导你创建管理员账户：

1. 在登录页面点击 "**创建管理员账户**"
2. 填写以下信息：
   - **用户名**: 你的管理员用户名
   - **密码**: 安全的密码（建议至少8位）
   - **确认密码**: 再次输入密码确认
3. 点击 "**创建账户**" 完成注册

::: warning 🔒 安全提醒
请使用强密码来保护你的管理员账户，建议包含大小写字母、数字和特殊字符。
:::

## 🎉 恭喜！开始探索 Mira

现在你已经成功搭建了 Mira 系统！接下来你可以：

### 📁 文件管理
- 上传文件到系统
- 创建文件夹组织文件
- 下载和分享文件

### 📚 库管理
- 创建不同用途的文件库
- 管理库的权限和设置
- 启动和停止库服务

### 🔌 插件管理
- 浏览可用插件
- 安装需要的插件
- 配置插件设置

## 🔧 常用配置选项

Mira Server 支持多种配置选项，让你根据需要自定义：

```bash
# 自定义端口
mira-app-server --http-port 3001 --ws-port 8018

# 自定义数据目录
mira-app-server --data-path /path/to/your/data

# 查看所有可用选项
mira-app-server --help
```

### 配置选项说明

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--http-port` | 3000 | HTTP 服务器端口 |
| `--ws-port` | 8081 | WebSocket 服务器端口 |
| `--data-path` | ./data | 数据存储目录 |

## 🐛 遇到问题？

如果在安装或启动过程中遇到问题，请查看：

- [📖 完整安装指南](/guide/installation) - 详细的安装说明
- [🔧 故障排除](/guide/troubleshooting) - 常见问题解决方案
- [💬 社区讨论](https://github.com/hunmer/mira_typescript/discussions) - 获取社区帮助

## 📚 下一步

现在你已经成功启动了 Mira，建议你继续阅读：

- [📖 系统介绍](/guide/introduction) - 了解 Mira 的核心概念
- [🏗️ 系统架构](/guide/architecture) - 深入了解系统设计
- [📁 文件管理](/guide/file-management) - 学习文件管理功能
- [🔗 N8N 集成](/n8n/overview) - 构建自动化工作流

祝你使用愉快！🎉
