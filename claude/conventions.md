# 约定与规则

## 编码规范

- TypeScript strict mode,所有模块使用 `tsconfig.json`
- 服务端代码使用 CommonJS(`require/module.exports`),客户端使用 ESM
- Vue 3 Composition API 风格(`<script setup>`)
- 组件按功能分层:views / components / composables / services / stores
- **客户端 UI 约定**:组件必须使用 `@/components/ui` 下的 shadcn-vue 组件,**禁止使用原生 HTML 组件**(如原生 `<select>`/`<dialog>`),禁止直接 import `reka-ui`

## API 约定

- 统一响应格式:`{ code: number, data: any, message?: string, timestamp: string }`
- 错误处理:Express 错误中间件统一捕获,WebSocket 使用 `status: 'error'` 响应
- 路由前缀 `/api/`,认证相关 `/api/auth/`,管理 `/api/admins/`

## 插件系统(双协议)

共 13 个插件,导出 `init(inst)` 工厂。推荐注册表 `plugins/plugins/plugins.recommend.json`,服务端运行时注册表 `packages/mira-app-server/src/plugins/plugins.json`。**两套并行协议**:

- **旧协议(`extends ServerPlugin`)**:mira_eagle_extension、mira_gallery_dl 等需深度介入服务端的插件。可注册 HTTP Hook、WebSocket 监听、缩略图生成器、前端路由
- **新协议(格式插件)**:`init(inst)` 内调用 `inst.pluginManager.registerFileFormat(pluginName, handler)`,声明 `extensions`/`mimeTypes`/`thumbnailExtensions`/`thumbnail(src,dest)`/`viewers[]`。用于 mira_3d_format、mira_spine_format、mira_epub_format、mira_livp_format、mira_lottie_format、mira_pag_format、mira_swf_format、mira_tiptap_format、mira_zipper_format、pdf-viewer、psd-viewer 等
- **客户端 web 插件**:格式插件 `web/` 子目录经 `plugins/plugins/*/web` 进入 workspace,内置 `plugin.json`(`pluginId`/`permissions`/`index`),由客户端动态加载;共享 UI 组件用 `mira-plugin-ui`
- 插件配置持久化在 `{pluginDir}/data/`

## 通信协议

- WebSocket 消息格式:`{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 连接地址:`ws://host:wsPort?clientId=xxx&libraryId=xxx`

## 安全机制

- Electron:Context Isolation 启用,Node Integration 禁用,Preload 强制使用
- IPC 通信通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- 权限体系:super > admin > user

## 命名约定

- 文件使用 PascalCase(类)、camelCase(函数/变量)
- 目录使用 camelCase 或 kebab-case
- 组件使用 PascalCase

## 常用命令(根级)

```bash
pnpm install                      # 安装依赖
pnpm run start:server             # 构建并启动(core + server + 插件)
pnpm run build:core               # 仅构建 mira-app-core
pnpm run build:server             # 仅构建 mira-app-server
```

各模块独立构建/测试命令见各包 `CLAUDE.md`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MIRA_SERVER_HTTP_PORT` / `HTTP_PORT` | 8081 | HTTP 端口 |
| `MIRA_SERVER_WS_PORT` / `WS_PORT` | 8018 | WebSocket 端口 |
| `DATA_PATH` | `./data` | 数据目录 |
| `FFMPEG_PATH` | -- | ffmpeg 路径 |
| `MAGICK_PATH` | -- | ImageMagick 路径 |
