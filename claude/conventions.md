# 约定与规则

## 编码规范

- TypeScript strict mode，所有模块使用 `tsconfig.json`
- 服务端代码使用 CommonJS (`require/module.exports`)，客户端使用 ESM
- Vue 3 Composition API 风格 (`<script setup>`)
- 组件按功能分层: views / components / composables / services / stores

## API 约定

- 统一响应格式：`{ code: number, data: any, message?: string, timestamp: string }`
- 错误处理：Express 错误中间件统一捕获，WebSocket 使用 `status: 'error'` 响应
- 路由前缀 `/api/`，认证相关 `/api/auth/`，管理 `/api/admins/`

## 插件系统

- 继承 `ServerPlugin` 基类，通过 `plugins.json` 注册
- 必须导出 `init(inst): PluginClass` 工厂函数
- 插件可注册 HTTP Hook、监听事件、注册前端路由、注册缩略图生成器

## 通信协议

- WebSocket 消息格式：`{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 连接地址：`ws://host:wsPort?clientId=xxx&libraryId=xxx`

## 安全机制

- Electron: Context Isolation 启用，Node Integration 禁用，Preload 强制使用
- IPC 通信通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- 权限体系：super > admin > user

## 命名约定

- 文件使用 PascalCase (类)、camelCase (函数/变量)
- 目录使用 camelCase 或 kebab-case
- 组件使用 PascalCase

## 构建

- `pnpm run start:server` 构建全部（core + server + 插件）
- 各模块独立构建命令见各模块 CLAUDE.md

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MIRA_SERVER_HTTP_PORT` / `HTTP_PORT` | 8081 | HTTP 端口 |
| `MIRA_SERVER_WS_PORT` / `WS_PORT` | 8018 | WebSocket 端口 |
| `DATA_PATH` | `./data` | 数据目录 |
| `FFMPEG_PATH` | -- | ffmpeg 路径 |
| `MAGICK_PATH` | -- | ImageMagick 路径 |
