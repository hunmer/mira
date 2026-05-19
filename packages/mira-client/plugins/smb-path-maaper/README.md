# SMB路径映射器插件

## 功能描述

SMB路径映射器是一个强大的Mira客户端插件，专为使用NAS（网络附加存储）的用户设计。它能够自动将HTTP媒体文件路径映射为SMB网络路径，并为媒体项添加原生拖拽功能，让您可以直接从Mira界面拖拽文件到其他应用程序。

## 🎯 核心功能

### 📡 HTTP请求监控
- 实时监控`api/files/getFiles`请求
- 自动捕获文件列表响应数据
- 支持自定义监控端点配置

### 🗂️ SMB路径映射
- **智能路径转换**: 自动将HTTP文件路径转换为SMB网络路径
- **多库支持**: 为不同素材库配置独立的SMB映射
- **实时同步**: 自动为新加载的媒体项应用路径映射
- **路径验证**: 可选的路径有效性检查

### 🖱️ 原生拖拽功能
- **Electron集成**: 支持原生文件拖拽操作
- **跨应用拖拽**: 可将文件直接拖拽到其他应用程序
- **视觉反馈**: 提供完整的拖拽视觉效果
- **多文件支持**: 计划支持多文件同时拖拽

### 🔄 DOM智能监控
- **MutationObserver**: 自动检测新添加的媒体项
- **自动处理**: 为新媒体项自动添加SMB路径和拖拽功能
- **性能优化**: 避免重复处理已映射的文件

## 🛠️ 配置选项

### 基础配置
- **enableSmbMapping**: 启用SMB路径映射（默认: true）
- **enableDragDrop**: 启用拖拽功能（默认: true）
- **showNotifications**: 显示操作通知（默认: true）
- **logToConsole**: 输出调试日志到控制台（默认: false）

### 高级配置
- **smbMappings**: SMB路径映射配置对象
- **defaultSmbProtocol**: 默认SMB协议（默认: "smb://"）
- **autoSyncInterval**: 自动同步间隔毫秒数（默认: 5000）
- **enablePathValidation**: 启用路径验证（默认: true）

## ⌨️ 快捷键

- **Ctrl+Shift+S**: 显示SMB配置信息
- **Ctrl+Alt+M**: 添加当前库的SMB映射
- **Ctrl+Shift+D**: 切换拖拽功能开关

## 🚀 使用指南

### 1. 初始设置

插件安装后会自动启动，但需要为您的素材库配置SMB映射：

1. 打开包含媒体文件的素材库
2. 按 `Ctrl+Alt+M` 添加SMB映射
3. 输入HTTP基础路径（例如：`http://192.168.1.100:8080/files/`）
4. 输入对应的SMB路径（例如：`\\192.168.1.100\share\`）

### 2. SMB路径格式说明

#### HTTP基础路径示例：
```
http://192.168.1.100:8080/files/
http://nas.local:8080/media/
https://server.example.com/api/files/
```

#### SMB路径示例：
```
\\192.168.1.100\share\
\\nas.local\media\
smb://server.example.com/files/
```

### 3. 使用拖拽功能

当SMB映射配置完成后：

1. 媒体项会自动获得`data-file`属性
2. 鼠标悬停时光标变为抓取状态
3. 直接拖拽媒体项到其他应用程序
4. 文件会以SMB路径传递给目标应用

## 📊 工作原理

### HTTP到SMB路径转换流程：

```
1. 监听getFiles API响应
   ↓
2. 获取当前库ID
   ↓
3. 查找对应SMB映射配置
   ↓
4. 扫描页面中的.media-item元素
   ↓
5. 提取img/video元素的src属性
   ↓
6. 转换HTTP路径为SMB路径
   ↓
7. 设置data-file属性
   ↓
8. 启用拖拽功能
```

### 路径转换示例：

```javascript
// 输入HTTP路径
"http://192.168.1.100:8080/files/photos/2024/image.jpg"

// 映射配置
{
  httpBase: "http://192.168.1.100:8080/files/",
  smbBase: "\\\\192.168.1.100\\share\\"
}

// 输出SMB路径
"\\\\192.168.1.100\\share\\photos\\2024\\image.jpg"
```

## 🔧 开发与调试

### 检查插件状态
```javascript
// 在浏览器控制台中执行
const plugin = window.pluginSystem.getPluginInstance('a9386ff4-7310-44a6-b54b-30710f3f6247')
console.log(plugin.getStatus())
```

### 查看SMB映射配置
```javascript
// 显示当前所有SMB映射
plugin.showSmbConfig()

// 手动添加SMB映射
plugin.addSmbMapping()

// 切换拖拽功能
plugin.toggleDragDrop()
```

### 调试信息输出
将配置中的`logToConsole`设置为`true`可以看到详细的调试信息：

```javascript
plugin.updateConfig({ logToConsole: true })
```

## 🛡️ 权限和安全

### 所需权限
- **ui**: 显示通知和对话框
- **config**: 读写配置数据
- **fileSystem**: 访问文件系统（用于路径验证）
- **mediaAccess**: 访问媒体文件信息

### 安全考虑
- SMB路径映射配置存储在本地
- 不会修改原始HTTP响应数据
- 仅在前端DOM层面添加属性
- 支持路径验证防止无效映射

## 🔄 自动同步机制

插件包含多层自动同步机制：

1. **事件驱动同步**: 监听getFiles API响应
2. **DOM观察器**: 检测新添加的媒体项
3. **定时同步**: 可配置的定期同步（默认5秒）

## 🎨 用户体验优化

### 视觉反馈
- 拖拽时媒体项透明度变化
- 鼠标光标状态变化（grab/grabbing）
- 通知消息显示操作状态

### 性能优化
- 避免重复处理已映射的文件
- 延迟DOM处理确保元素完全加载
- 批量处理多个媒体项

## 📝 配置文件示例

```json
{
  "enableSmbMapping": true,
  "enableDragDrop": true,
  "showNotifications": true,
  "logToConsole": false,
  "smbMappings": {
    "library-001": {
      "httpBase": "http://192.168.1.100:8080/files/",
      "smbBase": "\\\\192.168.1.100\\share\\",
      "enabled": true,
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    },
    "library-002": {
      "httpBase": "http://nas.local:8080/media/",
      "smbBase": "\\\\nas.local\\media\\",
      "enabled": true,
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    }
  },
  "defaultSmbProtocol": "smb://",
  "autoSyncInterval": 5000,
  "enablePathValidation": true
}
```

## 🐛 故障排除

### 常见问题

#### 1. SMB映射不生效
- 检查HTTP基础路径是否正确匹配
- 确认SMB路径格式是否正确
- 验证当前库ID是否正确识别

#### 2. 拖拽功能不工作
- 确认在Electron环境中运行
- 检查SMB路径是否有效
- 验证文件是否实际存在

#### 3. 新媒体项没有自动处理
- 检查DOM观察器是否正常工作
- 确认`.media-item`元素类名正确
- 查看控制台是否有错误信息

### 调试步骤

1. **启用调试日志**:
   ```javascript
   plugin.updateConfig({ logToConsole: true })
   ```

2. **检查SMB映射**:
   ```javascript
   plugin.showSmbConfig()
   ```

3. **查看插件状态**:
   ```javascript
   console.log(plugin.getStatus())
   ```

4. **手动触发同步**:
   ```javascript
   plugin.syncMediaItems()
   ```

## 🔮 未来功能计划

- [ ] 支持多文件同时拖拽
- [ ] 添加拖拽预览图标
- [ ] 支持更多网络协议（FTP、SFTP等）
- [ ] 图形化配置界面
- [ ] 路径映射规则模板
- [ ] 批量配置导入/导出

## 📄 更新日志

### v2.0.0
- 完全重写插件架构
- 添加SMB路径映射功能
- 实现原生Electron拖拽支持
- 添加DOM智能监控
- 支持多素材库配置
- 优化性能和用户体验

### v1.0.0
- 初始HTTP请求监控功能
- 基础控制台输出
- 简单的事件监听系统

---

**让您的NAS体验更加顺畅！** 🚀