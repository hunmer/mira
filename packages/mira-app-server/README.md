# Mira Server

Mira Server是一个基于mira-app-core的独立服务器应用程序。

## 安装

### 全局安装
```bash
npm install -g mira-app-server
```

### 本地安装
```bash
npm install mira-app-server
```

## 使用方法

### 全局安装后使用
安装完成后，你可以在任何地方使用`mira-app-server`命令：

```bash
# 使用默认配置启动
mira-app-server

# 自定义端口启动
mira-app-server --http-port 8081 --ws-port 8018

# 自定义数据目录
mira-app-server --data-path /path/to/your/data

# 查看帮助
mira-app-server --help
```

### 可用选项

- `--http-port <port>`: HTTP服务器端口 (默认: 8081)
- `--ws-port <port>`: WebSocket服务器端口 (默认: 8018)  
- `--data-path <path>`: 数据目录路径 (默认: ./data)
- `--help`: 显示帮助信息

### 本地开发

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 启动开发服务器
npm run dev

# 使用TypeScript直接运行CLI
npm run cli -- --help
```

## 项目结构

- `src/cli.ts`: CLI入口文件
- `src/index.ts`: 服务器主文件
- `dist/`: 编译后的JavaScript文件

## 许可证

ISC
