# src/preload - 预加载脚本模块

[根目录](../../CLAUDE.md) > **src/preload**

> 导航: [Main 模块](../main/CLAUDE.md) | [Renderer 模块](../renderer/CLAUDE.md) | [Shared 模块](../shared/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充 API 清单、IPC 通道映射 |

## 模块职责

预加载脚本模块作为主进程和渲染进程之间的安全桥梁，使用 Electron 的 `contextBridge` 将安全 API 暴露到渲染进程的 `window.electronAPI`。

## 入口与启动

- **主入口**: `preload.ts` (185 行) -- 通过 `contextBridge.exposeInMainWorld` 暴露 API
- **搜索窗口入口**: `search-preload.js` (71 行) -- 独立搜索窗口的预加载脚本

## 对外接口

`window.electronAPI` 暴露的 API 命名空间:

| 命名空间 | 描述 |
|----------|------|
| `protocol` | 协议注册/注销/查询/URL 生成 |
| `tray` | 托盘设置/闪烁/提示 |
| `searchWindow` | 搜索窗口显示/隐藏/切换 |
| `shortcut` | 快捷键注册/注销 |
| `plugin` | 插件发现/安装/执行/卸载/导入 |
| `dragDrop` | 拖拽启动 |
| `fs` | 文件系统读写/目录选择 |
| `hotUpdate` | 热更新源获取/启动更新 |
| `app` | 应用信息/版本/路径 |
| `ipcRenderer` | 底层 IPC 访问（用于搜索窗口） |
| `logger` | 日志转发到主进程 |

通用方法:
- `invoke(channel, ...args)`: 调用 IPC handle
- `send(channel, ...args)`: 发送 IPC 消息
- `on(channel, callback)`: 监听 IPC 事件
- `removeAllListeners(channel)`: 移除监听

## 关键依赖与配置

- `electron` 的 `contextBridge` 和 `ipcRenderer`
- 类型定义来自 `src/shared/types.ts` 的 `ElectronAPI` 接口

## 数据模型

无独立数据模型，所有类型通过 `src/shared/types.ts` 共享。

## 测试与质量

- 无独立测试文件

## 安全说明

- 使用 `contextBridge.exposeInMainWorld` 而非直接暴露 `ipcRenderer`
- 渲染进程无法直接访问 Node.js API
- 所有 IPC 通信通过预定义的通道进行

## 相关文件清单

- `preload.ts` - 主预加载脚本
- `search-preload.js` - 搜索窗口预加载脚本
