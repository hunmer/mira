# src/shared - 共享模块

[根目录](../../CLAUDE.md) > **src/shared**

> 导航: [Main 模块](../main/CLAUDE.md) | [Renderer 模块](../renderer/CLAUDE.md) | [Preload 模块](../preload/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充核心类型清单 |

## 模块职责

跨进程共享的 TypeScript 类型定义，被主进程、渲染进程和预加载脚本共同引用。

## 入口与启动

- **唯一文件**: `types.ts` (372 行)

## 对外接口

### 核心类型定义

| 类型 | 描述 |
|------|------|
| `MiraConnectionConfig` | 服务器连接配置 |
| `BaseResponse` | 通用 API 响应 |
| `UserInfo` | 用户信息 |
| `FileInfo` | 文件元信息 |
| `LibraryInfo` | 媒体库信息 |
| `PluginInfo` | 插件信息 |
| `LocalPluginConfig` | 本地插件配置 |
| `PluginRuntime` | 插件运行时 |
| `PluginManagerConfig` | 插件管理器配置 |
| `ElectronAPI` | 预加载脚本暴露的 API 接口 |

## 关键依赖与配置

无外部依赖，纯类型定义文件。

## 数据模型

此文件即为整个项目的核心数据模型定义。

## 测试与质量

通过 TypeScript 编译器自动检查。

## 相关文件清单

- `types.ts` - 共享类型定义
