# src/renderer/plugins - 插件系统

[根目录](../../../CLAUDE.md) > [src/renderer](../../CLAUDE.md) > **plugins**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

插件系统模块负责应用的插件化扩展功能，提供完整的插件生命周期管理。

## 文件列表

| 文件 | 行数 | 描述 |
|------|------|------|
| `index.ts` | 21 | 插件系统入口（统一导出） |
| `types.ts` | 64 | 类型定义（PluginSystemAPI 等） |
| `instanceManager.ts` | 260 | 插件实例管理（加载/卸载/获取） |
| `operationManager.ts` | 244 | 插件操作管理（安装/卸载/启用/禁用） |
| `scriptManager.ts` | 135 | 脚本加载和沙箱执行 |
| `storage.ts` | 79 | 插件配置和数据持久化 |
| `utils.ts` | 101 | 工具函数 |

## 核心功能

| 模块 | 职责 |
|------|------|
| `instanceManager` | 插件实例的生命周期管理（加载/卸载/获取实例） |
| `operationManager` | 插件操作（安装/卸载/启用/禁用/重载/导入） |
| `scriptManager` | 插件脚本的加载和沙箱执行 |
| `storage` | 插件配置和数据的持久化存储 |

## 插件类型

支持 `PluginInfo` 中定义的各种类型，包括 UI 插件、功能插件和主题插件。

## PluginSystemAPI 接口

```typescript
interface PluginSystemAPI {
  plugins: Map<string, any>
  instancesFactory: Map<string, () => any>
  instances: Map<string, any>
  registerPlugin(pluginId, pluginInfo): void
  registerPluginInstance(pluginId, factory): void
  loadPluginInstance(pluginId, context): Promise<any>
  events: { on, emit, off }
}
```
