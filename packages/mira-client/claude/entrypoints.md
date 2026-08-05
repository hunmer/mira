# mira-client 入口与启动

## 入口文件

| 入口 | 路径 | 作用 |
|------|------|------|
| 主进程 | `src/main/main.ts` | MiraApplication 类:窗口管理、IPC 注册、协议、托盘、自动更新(~595 行) |
| 渲染进程 | `src/renderer/main.ts` | Vue App 挂载入口 |
| 渲染根组件 | `src/renderer/App.vue` | SPA 根 |
| 预加载 | `src/preload/preload.ts` | contextBridge 暴露安全 API |
| package.json main | `dist-main/main.js` | Electron 启动指向的构建产物 |

## 构建流程(三段 + float)

vite-plugin-electron 多段构建:

| 命令 | 配置 | 产物 |
|------|------|------|
| `pnpm run build` | 默认 vite config | `dist-renderer/` |
| `pnpm run build:main` | `vite.main.config.ts` | `dist-main/main.js` |
| `pnpm run build:preload` | `vite.preload.config.ts` | `dist-preload/` |
| `pnpm run build:float` | `scripts/build-float.js` | `dist-float/`(浮动窗口) |
| `pnpm run build:all` | 顺序执行以上四段 | 全部 |
| `pnpm run build:prod` | `cross-env NODE_ENV=production build:all` | 生产产物 |

## 运行时启动

- **开发**:`pnpm run electron:dev`(Win 含 `chcp 65001` 设 UTF-8 + `cross-env NODE_ENV=development vite --mode electron`);macOS 用 `electron:dev:mac`
- **启动已构建**:`pnpm run electron:start`(`scripts/start-electron.js`)
- **打包**:`pnpm run electron:build:win` / `:mac`(= build:prod + electron-builder)

## 运行时初始化顺序(主进程)

1. MiraApplication 单例创建
2. 注册自定义协议 `mira://`(ProtocolService)
3. 创建主窗口(electron-window-state 持久化窗口状态)
4. 注册 IPC 处理器(`ipc/handlers.ts` 注册中心)
5. 初始化托盘(TrayService)、自动更新(useAutoUpdater)
6. 加载渲染进程(`dist-renderer` 或 dev server)

## 客户端插件加载

- `scripts/build-client-plugins-index.mjs`(根级)扫描 `online_client_plugins/` 生成索引
- 渲染进程经插件系统动态加载,主进程 PluginHandler / PluginDiscoveryService 配合
