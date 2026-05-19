# src/main/ipc - IPC 处理器

[根目录](../../../CLAUDE.md) > [src/main](../CLAUDE.md) > **ipc**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、通道清单 |

## 概述

IPC 处理器目录包含主进程与渲染进程之间通信的所有处理器。

## 处理器列表

| 处理器 | 行数 | 描述 |
|--------|------|------|
| `handlers.ts` | 198 | 处理器注册入口，管理所有 Handler 生命周期 |
| `SearchWindowHandlers.ts` | 485 | 搜索窗口通信（创建/显示/隐藏/消息转发） |
| `HotUpdateHandlers.ts` | 319 | 热更新功能（获取源/启动更新） |
| `MenuHandlers.ts` | 289 | 应用菜单事件 |
| `ShortcutHandlers.ts` | 231 | 全局快捷键注册/管理 |
| `FileSystemHandlers.ts` | 201 | 文件系统操作（读写/目录选择） |
| `AppHandlers.ts` | 134 | 应用级操作（窗口/版本/路径） |
| `SystemHandlers.ts` | 101 | 系统信息/剪贴板 |
| `TrayHandlers.ts` | 97 | 托盘交互 |
| `ProtocolHandlers.ts` | 84 | 协议处理 |

## IPC 通信架构

```
渲染进程 → preload.ts (contextBridge) → 主进程
                ↓
          IPC 通道 (invoke/handle)
                ↓
          对应的 Handler 处理
                ↓
          返回结果 → 渲染进程
```

## 通道清单

| 通道前缀 | 描述 |
|----------|------|
| `protocol:*` | 协议注册/注销/查询/URL 生成 |
| `tray:*` | 托盘设置/闪烁/提示 |
| `search-window:*` | 搜索窗口显示/隐藏/切换 |
| `shortcut:*` | 快捷键注册/注销 |
| `plugin:*` | 插件发现/安装/执行/卸载 |
| `drag-drop:*` | 拖拽启动 |
| `fs:*` | 文件系统读写/目录选择 |
| `hot-update:*` | 热更新获取/启动 |
| `app:*` | 应用信息/版本/路径 |
| `window:*` | 窗口操作 |
| `system:*` | 系统信息/剪贴板 |
| `menu:*` | 菜单事件 |
| `dev:*` | 开发者工具 |
