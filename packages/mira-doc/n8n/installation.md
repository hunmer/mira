# 📦 N8N 安装与配置

本指南将详细介绍如何安装和配置 Mira 的 N8N 集成组件，让你快速开始构建自动化工作流。

## 🎯 前置条件

在开始安装之前，请确保你的环境满足以下要求：

### 📋 系统要求

| 项目 | 要求 | 推荐 |
|------|------|------|
| **Node.js** | 16.0+ | 18.0+ LTS |
| **NPM** | 7.0+ | 8.0+ |
| **N8N** | 0.180.0+ | 最新版本 |
| **Mira Server** | 已安装并运行 | 最新版本 |

### 🔧 环境检查

```bash
# 检查 Node.js 版本
node --version

# 检查 NPM 版本
npm --version

# 检查 N8N 版本
n8n --version

# 检查 Mira Server 状态
curl http://localhost:8081/api/v1/system/health
```

## 🚀 安装 N8N

如果你还没有安装 N8N，请先完成 N8N 的安装：

### 🌍 全局安装 N8N

```bash
# 安装 N8N
npm install -g n8n

# 验证安装
n8n --version
```

### 🐳 使用 Docker 安装

```bash
# 拉取 N8N 镜像
docker pull n8nio/n8n

# 运行 N8N 容器
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

## 📦 安装 Mira 节点包

### 🔧 安装 Mira API 节点

```bash
# 全局安装（推荐）
npm install -g n8n-nodes-mira-apis

# 或者在 N8N 项目中安装
npm install n8n-nodes-mira-apis
```

### ⚡ 安装 WebSocket 触发器

```bash
# 全局安装
npm install -g n8n-nodes-mira-ws-trigger

# 或者在 N8N 项目中安装
npm install n8n-nodes-mira-ws-trigger
```

### 🎯 一键安装所有组件

```bash
# 安装完整的 Mira N8N 集成包
npm install -g n8n-nodes-mira-apis n8n-nodes-mira-ws-trigger
```

## 🔐 配置 Mira 凭据

###  创建 Mira 凭据

1. **进入凭据管理**
   - 点击右上角的 "Settings"
   - 选择 "Credentials"

2. **添加新凭据**
   - 点击 "Add Credential"
   - 搜索并选择 "Mira API"

3. **填写凭据信息**
   ```json
   {
     "name": "Mira Production",
     "serverUrl": "http://localhost:8081",
     "username": "your-mira-username",
     "password": "your-mira-password"
   }
   ```

4. **测试连接**
   - 点击 "Test" 按钮验证连接
   - 确认显示 "Connection successful"

###  配置 WebSocket 凭据

对于 WebSocket 触发器，还需要配置 WebSocket 连接信息：

```json
{
  "name": "Mira WebSocket",
  "websocketUrl": "ws://localhost:8081",
  "authToken": "your-auth-token"
}
```

::: tip 💡 获取认证令牌
你可以通过 Mira API 的登录接口获取认证令牌：

```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```
:::

## ✅ 验证安装

### 🔍 检查节点是否可用

1. **创建新工作流**
   - 在 N8N 中点击 "New Workflow"

2. **查看可用节点**
   - 点击 "+" 添加节点
   - 搜索 "Mira" 查看是否显示 Mira 相关节点

3. **预期可见的节点**
   - 🔐 Mira Auth
   - 📁 Mira File
   - 📚 Mira Library  
   - 🔌 Mira Plugin
   - 👥 Mira User
   - 📊 Mira Device
   - 💾 Mira Database
   - ⚡ Mira WebSocket Trigger

```bash
# 测试登录
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```
## 🎯 下一步

恭喜！你已经成功安装和配置了 Mira 的 N8N 集成。接下来你可以：

1. **🔧 探索节点功能**：查看 [Mira API 节点](/n8n/mira-api-nodes) 了解所有可用节点
2. **⚡ 设置实时监听**：学习 [WebSocket 触发器](/n8n/websocket-trigger) 的使用
3. **📖 查看示例**：参考 [使用示例](/n8n/examples) 构建你的第一个工作流
4. **🐛 解决问题**：如遇问题请查看 [故障排除](/n8n/troubleshooting) 指南

让我们开始构建强大的自动化工作流吧！🚀
