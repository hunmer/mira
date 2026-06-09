# mira-client

Electron 桌面客户端。基于 Vue 3 + TypeScript + shadcn-vue 构建，提供媒体文件的整理、查看、搜索和管理功能。支持插件扩展、自定义协议 `mira://`、全局搜索。通过 mira-server-sdk 与服务端通信。

组件要使用现有组件库的组件，避免使用原生组件。

## 约定

- Vue 3 Composition API (`<script setup>`)
- Pinia 持久化状态管理 (11 个 Store)
- Electron Context Isolation 启用，Node Integration 禁用
- IPC 通信通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- Tab 系统基于 `TabRegistry` + `TabTypes` + `tabs/` 目录

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、架构、构建命令 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | Store 列表、IPC 通道、Views、Tab 系统 |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 子模块文档

| 模块 | 说明 |
|------|------|
| [src/main/](src/main/CLAUDE.md) | 主进程 |
| [src/preload/](src/preload/CLAUDE.md) | 预加载 |
| [src/renderer/](src/renderer/CLAUDE.md) | 渲染进程 |
| [src/shared/](src/shared/CLAUDE.md) | 共享类型 |

## 扫描状态

- **版本**: 1.0.5
- **扫描时间**: 2026-06-09T11:59:31+08:00
- **测试**: 无独立测试，依赖 `pnpm run type-check`
