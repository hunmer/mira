### mira-client/src/renderer/stores/plugin.ts
**职责**：插件状态管理和业务逻辑
- 统一管理本地和在线插件
- 处理插件的加载/卸载/启用/禁用等操作
- 管理插件脚本注入到 document
- 提供全局插件系统 API
- 状态持久化管理

### mira-client/src/main/handlers/PluginHandler.ts  
**职责**：Electron 环境下的 IPC 处理和文件系统操作
- 本地插件发现和配置解析（集成了原 PluginDiscoveryService 功能）
- 文件系统操作（目录选择、ZIP文件选择）
- 简化的插件导入功能（集成了原 PluginImporter 的基础功能）
- 定时扫描插件目录
- **不处理**插件的加载/卸载/启用/禁用等业务逻辑

### mira-client/src/renderer/services/PluginService.ts
**职责**：跨平台插件服务抽象层
- 统一 Electron 和 Web 环境的插件管理接口
- 管理在线插件配置（存储在 localStorage）
- 合并本地和在线插件数据
- 提供插件服务的单例接口

### mira-client/src/renderer/services/PluginSystemCore.ts
**职责**：插件实例管理功能（保留）
- 插件实例的创建、管理和销毁
- 插件工厂模式实现
- 插件运行时上下文管理

## ✅ 解决的问题

### 1. 消除重复代码
- **删除**：`PluginDiscoveryService.ts` - 功能合并到 `PluginHandler.ts`
- **删除**：`PluginImporter.ts` - 基础功能合并到 `PluginHandler.ts`  
- **删除**：主进程的重复 `PluginService.ts`
- **简化**：各文件职责更加清晰，减少功能重叠

### 2. 建立单一职责原则
- **PluginHandler**：只负责 Electron 环境的文件系统操作
- **PluginService**：只负责跨平台抽象和数据管理
- **PluginStore**：只负责状态管理和业务逻辑
- **PluginSystemCore**：只负责插件实例管理

### 3. 新增在线插件支持
- 用户可以添加在线插件地址
- 在线插件配置存储在 localStorage
- 加载时合并本地和在线插件
- 支持在线插件的增删改操作

### 4. 简化调用流程
- **统一入口**：通过 `pluginService` 单例访问所有功能
- **清晰分层**：Store → Service → Handler (仅Electron)
- **减少耦合**：各层职责明确，依赖关系清晰

## 🚀 新的架构优势

### 1. 职责清晰
```
┌─────────────────────────────────────────────────────────────┐
│                    PluginStore                              │
│  (状态管理 + 业务逻辑 + 脚本注入)                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  PluginService                              │
│     (跨平台抽象 + 本地/在线插件合并)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ (仅Electron环境)
┌─────────────────────▼───────────────────────────────────────┐
│                 PluginHandler                               │
│          (文件系统操作 + 插件发现)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. 支持多种插件来源
- **本地插件**：扫描本地目录，通过文件系统管理
- **在线插件**：用户手动添加URL，存储在浏览器本地
- **统一管理**：两种插件类型通过统一API管理

### 3. 简化的导入流程
- **本地导入**：通过文件对话框选择ZIP文件（暂时简化实现）
- **在线导入**：直接添加插件URL到配置
- **一键添加**：减少复杂的解压和验证逻辑

## 🔄 升级指导

### 对于现有代码
```typescript
// 旧方式 - 多个服务
const pluginDiscovery = PluginDiscoveryService.getInstance()
const pluginImporter = PluginImporter.getInstance()

// 新方式 - 统一服务
import { pluginService } from '@/services/PluginService'
const pluginStore = usePluginStore()
```

### 对于插件开发者
插件开发方式保持不变，仍然通过 `window.pluginSystem` API 注册和使用插件。

### 对于应用开发者
现在通过更简洁的API管理插件：
```typescript
// 初始化插件系统
await pluginStore.initializeLocalPlugins(config)

// 添加在线插件
await pluginStore.addOnlinePlugin({
  pluginId: 'my-online-plugin',
  pluginName: 'My Online Plugin', 
  url: 'https://example.com/plugin.js',
  // ... 其他配置
})

// 统一获取所有插件
const allPlugins = pluginStore.allPlugins
```

## 📋 后续优化建议

1. **完善导入功能**：实现完整的ZIP插件导入和在线插件下载
2. **添加插件市场**：集成插件仓库和一键安装功能  
3. **改进错误处理**：更详细的错误信息和恢复机制
4. **性能优化**：插件懒加载和按需激活机制

