# src/renderer/api - API 接口

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **api**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航、接口详情 |

## 概述

API 接口目录包含对外通信的接口封装，作为渲染进程所有服务访问的统一入口。

## 文件列表

| 文件 | 行数 | 描述 |
|------|------|------|
| `MiraAPI.ts` | 603 | Mira 后端 API 统一封装（单例） |
| `TabRegistryAPI.ts` | 204 | Tab 注册公共 API（单例） |

## MiraAPI

后端 API 统一封装，包含:
- **pluginService**: 插件服务实例
- **electron**: Electron 原生 API（仅 Electron 环境）
- **fs**: 文件系统操作
- **连接管理**: connect/disconnect/testConnection
- **认证**: login/register/logout
- **文件**: list/upload/download/delete
- **库**: getLibraries/createLibrary
- **菜单**: menu 服务
- **系统**: info/health

自动检测环境（Electron/Web），选择合适的实现方式。

## TabRegistryAPI

Tab 注册公共 API:
- `registerTabType(type)`: 注册 Tab 类型
- `getTabType(name)`: 获取 Tab 类型
- `getViewConfig(name, context)`: 获取视图配置
- `createTabType(def)`: 工厂方法创建 Tab 类型
