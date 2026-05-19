# ⚙️ 安装与配置

本指南将详细介绍如何在不同平台上安装和配置 Mira 系统。

## 📋 系统要求

在开始安装之前，请确保你的系统满足以下要求：

### 🖥️ 硬件要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **CPU** | 单核 1GHz | 双核 2GHz 以上 |
| **内存** | 512MB | 2GB 以上 |
| **存储** | 1GB 可用空间 | 10GB 以上 |
| **网络** | 无要求 | 稳定网络连接 |

### 💿 软件要求

| 软件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| **Node.js** | 16.0+ | 18.0+ LTS |
| **NPM** | 7.0+ | 8.0+ |
| **操作系统** | Windows 10, macOS 10.15, Ubuntu 18.04 | 最新版本 |

## 🔧 安装 Node.js

Mira 基于 Node.js 构建，因此首先需要安装 Node.js 环境。

### Windows 用户 🪟

#### 方法一：官网下载（推荐）
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本（长期支持版本）
3. 运行 `.msi` 安装包
4. 按照安装向导完成安装

#### 方法二：使用 Chocolatey
```powershell
# 安装 Chocolatey（如果未安装）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 Node.js
choco install nodejs
```

#### 方法三：使用 Winget
```powershell
winget install OpenJS.NodeJS
```

### macOS 用户 🍎

#### 方法一：官网下载
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 macOS 版本
3. 运行 `.pkg` 安装包
4. 按照安装向导完成安装

#### 方法二：使用 Homebrew（推荐）
```bash
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node
```

#### 方法三：使用 MacPorts
```bash
sudo port install nodejs18 +universal
```

### Linux 用户 🐧

#### Ubuntu/Debian
```bash
# 更新包管理器
sudo apt update

# 安装 Node.js 和 npm
sudo apt install nodejs npm

# 验证安装
node --version
npm --version
```

#### CentOS/RHEL/Fedora
```bash
# CentOS/RHEL
sudo yum install nodejs npm

# Fedora
sudo dnf install nodejs npm

# 验证安装
node --version
npm --version
```

#### Arch Linux
```bash
sudo pacman -S nodejs npm
```

#### 使用 NodeSource 仓库（推荐，获取最新版本）
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL/Fedora
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs
```

### 🔍 验证 Node.js 安装

安装完成后，打开终端/命令提示符，运行以下命令验证：

```bash
# 检查 Node.js 版本
node --version
# 输出示例：v18.17.0

# 检查 npm 版本
npm --version
# 输出示例：9.6.7
```

::: tip 💡 版本检查
确保 Node.js 版本为 16.0 或更高，npm 版本为 7.0 或更高。如果版本过低，请升级到最新的 LTS 版本。
:::

## 📦 安装 Mira Server

Node.js 环境准备好后，就可以安装 Mira Server 了。

### 🌍 全局安装（推荐）

全局安装可以让你在任何地方使用 `mira-app-server` 命令：

```bash
npm install -g mira-app-server
```

安装完成后，验证安装：

```bash
# 检查版本
mira-app-server --version

# 查看帮助
mira-app-server --help
```

### 📁 本地安装

如果你偏好本地安装或需要在特定项目中使用：

```bash
# 创建项目目录
mkdir my-mira-project
cd my-mira-project

# 初始化 package.json
npm init -y

# 安装 Mira Server
npm install mira-app-server

# 使用 npx 运行
npx mira-app-server --version
```

### 🔄 从源码安装（开发者选项）

如果你想获取最新的开发版本或参与开发：

```bash
# 克隆源码
git clone https://github.com/hunmer/mira_typescript.git
cd mira_typescript

# 安装依赖
npm install

# 构建项目
npm run build

# 运行开发版本
cd packages/mira-app-server
npm run dev
```

## 🎬 启动 Mira Server

### 🔧 自定义配置

Mira Server 支持多种配置选项：

```bash
mira-app-server --start --http-port 8081 --ws-port 8018 --data-path ./my-data
```

### 📊 配置选项详解

| 选项 | 简写 | 默认值 | 说明 |
|------|------|--------|------|
| `--http-port` | `-p` | 8081 | HTTP 服务器端口 |
| `--ws-port` | `-w` | 8018 | WebSocket 服务器端口 |
| `--data-path` | `-d` | ./data | 数据存储目录路径 |
| `--host` | `-h` | 0.0.0.0 | 服务器绑定的主机地址 |
| `--help` | | | 显示帮助信息 |
| `--version` | `-v` | | 显示版本信息 |

成功启动后，你会看到类似以下的输出：

```
🚀 Mira Server 启动成功！
📡 HTTP 服务: http://localhost:8081
⚡ WebSocket 服务: ws://localhost:8018
📁 数据目录: ./data
👤 管理员界面（需安装 mira-dashboard): http://localhost:3999/admin
```

### 📄 配置文件

你也可以使用配置文件来管理设置：

```json
// mira.config.json
{
  "server": {
    "httpPort": 8081,
    "wsPort": 8018,
    "host": "0.0.0.0"
  },
  "storage": {
    "dataPath": "./data"
  },
  "logging": {
    "level": "info",
    "debug": false
  }
}
```

## 🌐 首次访问和初始化

### 访问 Web 界面

启动成功后，安装 mira-dashboard 后打开浏览器访问：

```
http://localhost:3999
```

### 👤 创建管理员账户

首次访问时，系统会提示你创建管理员账户：

1. **访问创建页面**：点击 "创建管理员账户" 按钮
2. **填写信息**：
   - 用户名：建议使用有意义的名称
   - 密码：至少 8 位，包含大小写字母、数字
   - 确认密码：再次输入密码
3. **创建账户**：点击 "创建" 按钮完成注册

::: warning 🔒 安全提醒
管理员账户拥有系统的最高权限，请务必：
- 使用强密码
- 定期更换密码
- 不要与他人分享账户信息
:::

### 🎯 初始配置

创建管理员账户后，建议进行以下初始配置：

1. **🔧 系统设置**
   - 修改系统名称和描述
   - 配置文件上传限制
   - 设置默认权限

2. **📚 创建第一个库**
   - 为不同用途创建文件库
   - 设置库的权限和配置
   - 上传一些测试文件

3. **👥 用户管理**
   - 根据需要创建其他用户
   - 分配适当的权限
   - 设置用户组

## 🐧 Linux 服务配置

如果你在 Linux 服务器上部署 Mira，建议将其配置为系统服务：

### 创建服务文件

```bash
sudo nano /etc/systemd/system/mira.service
```

服务文件内容：

```ini
[Unit]
Description=Mira File Management Server
After=network.target

[Service]
Type=simple
User=mira
WorkingDirectory=/opt/mira
ExecStart=/usr/bin/node /opt/mira/dist/cli.js --data-path /var/lib/mira
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 启用和启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启用服务（开机自启）
sudo systemctl enable mira

# 启动服务
sudo systemctl start mira

# 查看服务状态
sudo systemctl status mira

# 查看日志
sudo journalctl -u mira -f
```

## 🔧 高级配置

### 环境变量配置

Mira 支持通过环境变量进行配置：

```bash
# 设置端口
export MIRA_HTTP_PORT=8081
export MIRA_WS_PORT=8018

# 设置数据路径
export MIRA_DATA_PATH=/var/lib/mira

# 启动服务器
mira-app-server
```

### 反向代理配置

在生产环境中，建议使用 Nginx 或 Apache 作为反向代理：

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://localhost:8018;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/HTTPS 配置

为了安全，建议在生产环境中启用 HTTPS：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # 其他配置与上面相同...
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🐛 故障排除

### 常见问题及解决方案

#### 问题：端口被占用
```
Error: listen EADDRINUSE: address already in use :::8081
```

**解决方案：**
1. 更换端口：`mira-app-server --http-port 3001`
2. 或终止占用端口的进程：
   ```bash
   # Windows
   netstat -ano | findstr :8081
   taskkill /PID <PID> /F

   # Linux/macOS
   lsof -ti:8081 | xargs kill -9
   ```

#### 问题：权限错误
```
Error: EACCES: permission denied
```

**解决方案：**
1. 使用管理员权限运行
2. 更改数据目录权限：`chmod 755 ./data`
3. 检查文件所有者：`chown -R $USER:$USER ./data`

#### 问题：Node.js 版本过低
```
Error: Node.js version 14.x is not supported
```

**解决方案：**
升级 Node.js 到 16.0 或更高版本。

#### 问题：NPM 安装失败
```
npm ERR! network timeout
```

**解决方案：**
1. 使用国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```
2. 或使用 cnpm：
   ```bash
   npm install -g cnpm --registry=https://registry.npmmirror.com
   cnpm install -g mira-app-server
   ```
### 📞 获取帮助

如果遇到其他问题，可以：

1. **查看日志**：检查控制台输出的错误信息
2. **查阅文档**：阅读相关功能的文档说明
3. **社区求助**：在 [GitHub Discussions](https://github.com/hunmer/mira_typescript/discussions) 提问
4. **报告问题**：在 [GitHub Issues](https://github.com/hunmer/mira_typescript/issues) 反馈 bug

---

恭喜！你已经成功完成了 Mira 的安装和配置。接下来可以继续阅读 [🏗️ 系统架构](/guide/architecture) 了解更多系统细节。🎉
