# Mira 插件目录

这里包含了Mira应用的示例本地插件，展示了插件系统的各种功能和最佳实践。

## 📋 插件规范说明

所有插件都遵循Mira插件规范，每个插件包含：

### 必需文件
- `plugin.json` - 插件配置文件
- `index.js` - 插件主入口文件

### 可选文件
- `README.md` - 插件说明文档
- `package.json` - NPM包信息（可选）
- 其他资源文件

### plugin.json 格式
```json
{
  "pluginName": "插件名称",
  "pluginId": "唯一UUID",
  "priority": 1,
  "version": "1.0.0",
  "index": "index.js",
  "tags": ["标签"],
  "description": "插件描述",
  "author": "作者",
  "homepage": "主页URL",
  "enable": true,
  "config": {},
  "hotkey": {},
  "events": [],
  "dependencies": [],
  "permissions": [],
  "minAppVersion": "1.0.0",
  "platform": ["win32", "darwin", "linux"]
}
```

## 🔧 插件开发指南

### 基本结构
```javascript
// index.js 基本结构
async function initialize(context) {
  // 插件初始化逻辑
}

async function cleanup() {
  // 插件清理逻辑
}

// 导出插件方法
module.exports = {
  initialize,
  cleanup,
  // 其他插件方法...
}
```

### 可用API
插件可以通过 `context.api` 访问以下API：

#### 日志API
```javascript
api.log.info('信息')
api.log.warn('警告')
api.log.error('错误')
api.log.debug('调试')
```

#### 配置API
```javascript
api.config.get('key')
api.config.set('key', 'value')
api.config.has('key')
api.config.delete('key')
```

#### 事件API
```javascript
api.events.emit('event', data)
api.events.on('event', handler)
api.events.off('event', handler)
```

#### UI API
```javascript
api.ui.showNotification('消息', 'success')
api.ui.showDialog({
  title: '标题',
  message: '内容',
  type: 'confirm'
})
```

#### 应用信息API
```javascript
api.app.version    // 应用版本
api.app.platform   // 运行平台
api.app.isDev      // 是否开发模式
```

### 事件监听
插件可以监听以下Mira事件：
- `mediaSelected` - 媒体文件选择
- `mediaOpened` - 媒体文件打开
- `mediaClosed` - 媒体文件关闭
- `playbackStateChanged` - 播放状态变化
- `libraryUpdated` - 媒体库更新
- `fileImported` - 文件导入
- `tagAdded` - 标签添加
- `tagRemoved` - 标签移除

## 🛡️ 安全注意事项

### 插件权限
插件需要在 `plugin.json` 中声明所需权限：
- `ui` - UI交互权限
- `config` - 配置读写权限
- `fileSystem` - 文件系统访问权限
- `mediaAccess` - 媒体文件访问权限
- `libraryModify` - 媒体库修改权限

### 安全最佳实践
1. 只请求必需的权限
2. 验证用户输入
3. 处理错误和异常
4. 避免执行不安全的代码
5. 使用官方API而不是直接访问系统

## 📊 性能优化

### 最佳实践
1. **异步操作** - 使用 async/await 避免阻塞
2. **批量处理** - 大量操作时使用批处理
3. **内存管理** - 及时清理资源
4. **错误处理** - 完善的错误处理机制
5. **日志记录** - 适度的日志记录

### 性能监控
```javascript
// 获取插件状态
function getStatus() {
  return {
    name: '插件名称',
    version: '1.0.0',
    status: 'active',
    // 其他状态信息...
  }
}
```

## 🐛 调试技巧

### 日志调试
```javascript
// 在插件中添加调试日志
api.log.debug('调试信息', { data: 'some data' })
```

### 错误处理
```javascript
try {
  // 插件逻辑
} catch (error) {
  api.log.error('操作失败:', error)
  api.ui.showNotification('操作失败', 'error')
}
```

### 状态检查
在浏览器开发者工具中可以检查插件状态：
```javascript
// 在控制台中执行
window.electronAPI.localPlugins.getAll()
```

## 🤝 贡献指南

### 如何贡献
1. Fork 项目仓库
2. 创建您的插件或改进现有插件
3. 确保遵循插件规范
4. 添加完整的文档和测试
5. 提交 Pull Request

### 插件提交清单
- [ ] plugin.json 格式正确
- [ ] 插件ID是唯一的UUID
- [ ] 实现了 initialize 和 cleanup 方法
- [ ] 包含 README.md 文档
- [ ] 错误处理完善
- [ ] 性能优化合理

## 📞 支持与反馈

如果您在使用这些插件时遇到问题，或有新的插件想法：

1. **问题报告**: 在项目仓库提交 Issue
2. **功能建议**: 在社区论坛讨论
3. **插件开发**: 参考开发文档和示例代码
4. **技术支持**: 加入Mira开发者社区

## 📄 许可证

所有示例插件均使用 MIT 许可证，您可以自由使用、修改和分发。

---

**快乐插件开发！** 🎉