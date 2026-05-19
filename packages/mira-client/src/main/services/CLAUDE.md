# src/main/services - 主进程服务

[根目录](../../../CLAUDE.md) > [src/main](../CLAUDE.md) > **services**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、接口详情 |

## 概述

主进程服务目录包含在 Electron 主进程中运行的后端服务，全部采用单例模式。

## 服务列表

| 服务 | 行数 | 描述 |
|------|------|------|
| `MiraService.ts` | 366 | mira-server-sdk 封装，HTTP 通信 |
| `ProtocolService.ts` | 279 | `mira://` 自定义协议处理 |
| `TrayService.ts` | 321 | 系统托盘管理（图标/菜单/通知） |
| `PluginDiscoveryService.ts` | - | 插件发现（空实现） |

## MiraService

与后端服务器的 HTTP/WebSocket 通信封装:
- 单例模式 (`getInstance()`)
- 连接管理 (`initialize`, `testConnection`, `disconnect`)
- 使用 `mira-server-sdk` 的 `MiraClient`

## ProtocolService

深度链接协议处理:
- 单例模式
- 协议格式: `mira://<action>?<params>`
- 内置处理器: `server_import` (Base64 JSON)
- 开发/生产环境自动适配注册方式

## TrayService

系统托盘功能:
- 单例模式
- 可配置的托盘行为 (toggle/show/minimize)
- 托盘图标和菜单管理
- 支持启用/禁用切换
