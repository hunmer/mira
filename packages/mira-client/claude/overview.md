# mira-client 总览

## 模块职责

Mira 桌面媒体库管理客户端，基于 Electron + Vue 3 + TypeScript 构建。通过 mira-server-sdk 与服务端通信。

核心功能：
1. **媒体文件浏览/预览/管理** -- 图片、视频、音频、文档预览
2. **插件系统** -- 客户端插件加载/执行/沙箱运行
3. **Tab 导航** -- 基于视图的标签页系统
4. **全局搜索** -- 跨库搜索
5. **文件上传** -- 拖拽上传、FilePond
6. **多服务器管理** -- ServerListStore 管理多个服务端连接

## 架构

Electron 多进程架构：
- **主进程** (`src/main/`): MiraApplication 单例，窗口管理、IPC、自定义协议 `mira://`、托盘、自动更新
- **渲染进程** (`src/renderer/`): Vue 3 SPA，Pinia 状态管理，插件系统
- **预加载** (`src/preload/`): contextBridge 安全桥梁
- **共享类型** (`src/shared/`): 跨进程类型

## 入口

- **主进程**: `src/main/main.ts` -- MiraApplication 类
- **渲染进程**: `src/renderer/` -- Vue App
- **预加载**: `src/preload/preload.ts`

## 构建命令

```bash
pnpm run dev                # Vite 开发服务器
pnpm run electron:dev       # Electron 开发模式
pnpm run build:all          # 构建所有进程
pnpm run build:prod         # 生产构建
pnpm run electron:build:win # Windows 打包
pnpm run type-check         # TypeScript 类型检查
pnpm run lint               # ESLint
```

## 关键技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.13 | 前端框架 |
| Electron | 38 | 桌面平台 |
| Pinia | 3.0 | 状态管理 |
| Tailwind CSS | 4.0 | 样式 |
| reka-ui / radix-vue | 2.9 / 1.9 | UI 组件库 |
| vite-plugin-electron | 0.29 | Electron 集成 |
