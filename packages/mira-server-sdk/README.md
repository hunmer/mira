# Mira App Server TypeScript SDK

一个功能完整的 TypeScript SDK，用于与 Mira App Server API 进行交互。支持链式调用、模块化设计，并提供完整的类型定义。

## 特性

- 🔗 **链式调用**: 支持 jQuery 风格的链式调用
- 📦 **模块化设计**: 清晰的模块分离，每个功能域独立管理
- 🔒 **类型安全**: 完整的 TypeScript 类型定义
- 🚀 **自动重试**: 内置重试机制处理网络波动
- 🛡️ **错误处理**: 统一的错误处理和恢复机制
- 📊 **实时监控**: 支持服务器状态实时监控
- 🔧 **高度可配置**: 灵活的配置选项
- 🌐 **WebSocket 支持**: 实时接收服务端推送的事件和数据

## 安装

```bash
npm install mira-app-server
```

## 快速开始

```typescript
import { MiraClient } from 'mira-app-server/sdk';

// 创建客户端实例
const client = new MiraClient('http://localhost:8081');

// 基础用法
async function example() {
  try {
    // 登录
    await client.login('username', 'password');
    
    // 获取用户信息
    const userInfo = await client.user().getInfo();
    console.log('用户信息:', userInfo);
    
    // 获取素材库列表
    const libraries = await client.libraries().getAll();
    console.log('素材库:', libraries);
    
  } catch (error) {
    console.error('操作失败:', error);
  }
}
```

## 链式调用

SDK 支持 jQuery 风格的链式调用，让操作更加流畅：

```typescript
// 链式登录并获取数据
const result = await client
  .login('username', 'password')
  .then(() => client.user().getInfo())
  .then(userInfo => {
    console.log('登录用户:', userInfo.username);
    return client.libraries().getAll();
  })
  .then(libraries => {
    console.log('素材库数量:', libraries.length);
    return libraries;
  });
```

## 模块介绍

### 认证模块 (Auth)

处理用户登录、登出、令牌验证等认证相关操作。

```typescript
// 登录
await client.auth().login('username', 'password');

// 验证令牌
const verification = await client.auth().verify();

// 获取权限码
const codes = await client.auth().getCodes();

// 登出
await client.auth().logout();

// 手动设置令牌
client.auth().setToken('your-token');
```

### 用户模块 (User)

管理用户信息和配置。

```typescript
// 获取用户信息
const userInfo = await client.user().getInfo();

// 更新用户信息
await client.user().updateInfo({
  realName: '新的真实姓名',
  avatar: 'https://example.com/avatar.jpg'
});

// 快捷更新方法
await client.user().updateRealName('新姓名');
await client.user().updateAvatar('新头像URL');
```

### 素材库模块 (Libraries)

管理素材库的创建、更新、启动、停止等操作。

```typescript
// 获取所有素材库
const libraries = await client.libraries().getAll();

// 创建本地素材库
await client.libraries().createLocal(
  '我的素材库',
  '/path/to/library',
  '素材库描述'
);

// 创建远程素材库
await client.libraries().createRemote(
  '远程素材库',
  '/remote/path',
  'http://remote-server.com',
  8080,
  '远程素材库描述'
);

// 启动素材库
await client.libraries().start('library-id');

// 停止素材库
await client.libraries().stop('library-id');

// 重启素材库
await client.libraries().restart('library-id');

// 筛选操作
const activeLibraries = await client.libraries().getActive();
const localLibraries = await client.libraries().getLocal();
const remoteLibraries = await client.libraries().getRemote();
```

### 插件模块 (Plugins)

管理插件的安装、启用、禁用、卸载等操作。

```typescript
// 获取所有插件
const plugins = await client.plugins().getAll();

// 按素材库分组获取插件
const pluginsByLibrary = await client.plugins().getByLibrary();

// 安装插件
await client.plugins().install({
  name: 'plugin-name',
  version: '1.0.0',
  libraryId: 'library-id'
});

// 启用/禁用插件
await client.plugins().enable('plugin-id');
await client.plugins().disable('plugin-id');

// 卸载插件
await client.plugins().uninstall('plugin-id');

// 搜索插件
const results = await client.plugins().search('keyword');

// 批量操作
await client.plugins().enableMultiple(['id1', 'id2', 'id3']);
await client.plugins().disableMultiple(['id1', 'id2', 'id3']);
```

### 文件模块 (Files)

处理文件上传、下载、删除等操作。

```typescript
// 上传单个文件
const file = new File(['content'], 'test.txt', { type: 'text/plain' });
const uploadResult = await client.files().uploadFile(file, 'library-id', {
  tags: ['标签1', '标签2'],
  folderId: 'folder-id'
});

// 上传多个文件
const files = [file1, file2, file3];
await client.files().uploadFiles(files, 'library-id');

// 下载文件
const blob = await client.files().download('library-id', 'file-id');

// 下载并保存文件
await client.files().downloadAndSave('library-id', 'file-id', 'saved-name.txt');

// 删除文件
await client.files().delete('library-id', 'file-id');

// 批量删除
await client.files().deleteMultiple('library-id', ['id1', 'id2', 'id3']);
```

### WebSocket 模块

实时接收服务端推送的各种数据和事件。

```typescript
// 创建 WebSocket 客户端
const wsClient = client.websocket(8082, {
  clientId: 'my-client',
  libraryId: 'my-library',
  reconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10
});

// 绑定事件监听器
wsClient.bind('dialog', (data) => {
  console.log('收到对话框事件:', data);
});

wsClient.bind('fileUpload', (data) => {
  console.log('文件上传进度:', data);
});

wsClient.bind('plugin', (data) => {
  console.log('插件事件:', data);
});

// 监听服务器的所有返回消息
wsClient.onData((data) => {
  console.log('服务器返回数据:', data);
});

// 监听连接状态
wsClient.on('connected', () => {
  console.log('WebSocket 已连接');
});

wsClient.on('disconnected', (data) => {
  console.log('WebSocket 已断开:', data);
});

// 启动连接
await wsClient.start();

// 发送消息
wsClient.sendPluginMessage('test', {
  message: 'Hello from client'
});

// 取消事件监听
wsClient.unbind('dialog');

// 关闭连接
wsClient.stop();
```

查看 [WebSocket 使用指南](./WEBSOCKET_GUIDE.md) 获取详细文档。

### 数据库模块 (Database)

查询数据库表信息和数据。

```typescript
// 获取所有表
const tables = await client.database().getTables();

// 获取表数据
const tableData = await client.database().getTableData('table-name');

// 获取表结构
const schema = await client.database().getTableSchema('table-name');

// 获取表详细信息
const details = await client.database().getTableDetails('table-name');

// 搜索表
const searchResults = await client.database().searchTables('user');

// 获取主键列
const primaryKeys = await client.database().getPrimaryKeys('table-name');

// 按行数排序获取表
const sortedTables = await client.database().getTablesByRowCount('desc');
```

### 设备模块 (Devices)

管理设备连接和通信。

```typescript
// 获取所有设备连接
const devices = await client.devices().getAll();

// 获取特定素材库的设备
const libraryDevices = await client.devices().getByLibrary('library-id');

// 断开设备连接
await client.devices().disconnect('client-id', 'library-id');

// 发送消息到设备
await client.devices().sendMessage('client-id', 'library-id', {
  type: 'notification',
  content: 'Hello, device!'
});

// 获取设备统计
const stats = await client.devices().getStats();

// 广播消息
await client.devices().broadcastToLibrary('library-id', { message: 'Hello all!' });
await client.devices().broadcastToAll({ message: 'Global message!' });

// 批量断开连接
await client.devices().disconnectAllInLibrary('library-id');
```

### 系统模块 (System)

监控系统状态和健康检查。

```typescript
// 获取系统健康状态
const health = await client.system().getHealth();

// 检查服务器是否可用
const isAvailable = await client.system().isServerAvailable();

// 获取系统信息
const systemInfo = await client.system().getSystemInfo();

// 等待服务器就绪
const isReady = await client.system().waitForServer(30000, 1000);

// 实时监控
const stopMonitoring = client.system().monitorHealth(
  (isHealthy, health, error) => {
    if (isHealthy) {
      console.log('服务器正常，运行时间:', health.uptime);
    } else {
      console.error('服务器异常:', error);
    }
  },
  5000 // 每5秒检查一次
);

// 停止监控
setTimeout(() => stopMonitoring(), 60000);
```

## 高级功能

### 错误处理和重试

```typescript
// 安全执行操作，失败时返回默认值
const userInfo = await client.safe(
  () => client.user().getInfo(),
  { id: 0, username: 'guest' } // 默认值
);

// 自动重试操作
const libraries = await client.retry(
  () => client.libraries().getAll(),
  3,    // 最大重试3次
  1000  // 每次间隔1秒
);

// 自定义错误处理
try {
  await client.auth().login('username', 'password');
} catch (error) {
  if (error.error === 'UNAUTHORIZED') {
    console.log('认证失败，请检查用户名和密码');
  } else if (error.error === 'NETWORK_ERROR') {
    console.log('网络连接失败，请稍后重试');
  } else {
    console.log('未知错误:', error.message);
  }
}
```

### 批量操作

```typescript
// 并行执行多个操作
const results = await client.batch([
  () => client.system().getHealth(),
  () => client.libraries().getAll(),
  () => client.plugins().getAll(),
  () => client.user().getInfo()
]);

console.log('批量操作结果:', results);
```

### 配置管理

```typescript
// 创建时配置
const client = new MiraClient('http://localhost:8081', {
  timeout: 15000,
  headers: {
    'Custom-Header': 'value'
  }
});

// 运行时更新配置
client.updateConfig({
  baseURL: 'http://new-server:8081',
  timeout: 20000
});

// 获取当前配置
const config = client.getConfig();
console.log('当前配置:', config);
```

### 多服务器支持

```typescript
// 创建多个客户端实例
const mainServer = new MiraClient('http://main-server:8081');
const backupServer = new MiraClient('http://backup-server:8081');

// 或使用工厂方法
const testServer = MiraClient.create('http://test-server:8081');
```

## 测试

SDK 包含完整的测试套件：

```bash
# 运行所有测试
npm run test

# 监视模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 构建

```bash
# 构建 SDK
npm run build:sdk

# 构建整个项目
npm run build
```

## 示例项目

查看 `sdk/examples/usage-examples.ts` 文件获取完整的使用示例。

## API 参考

完整的 API 参考文档请查看 `API_REFERENCE.md` 文件。

## 类型定义

SDK 提供完整的 TypeScript 类型定义，包括：

- 请求和响应类型
- 错误类型
- 配置类型
- 模块接口类型

所有类型都可以从主包导入：

```typescript
import { 
  MiraClient,
  LoginRequest,
  UserInfo,
  Library,
  Plugin,
  Device,
  HealthResponse
} from 'mira-app-server/sdk';
```

## 故障排除

### 常见问题

**问题**: 连接超时
```typescript
// 增加超时时间
const client = new MiraClient('http://localhost:8081', {
  timeout: 30000 // 30秒
});
```

**问题**: 认证失败
```typescript
// 检查令牌是否有效
if (!client.auth().isAuthenticated()) {
  await client.login('username', 'password');
}
```

**问题**: 网络不稳定
```typescript
// 使用重试机制
const result = await client.retry(
  () => client.libraries().getAll(),
  5,    // 重试5次
  2000  // 间隔2秒
);
```

### 调试模式

开启详细日志以便调试：

```typescript
// 在浏览器控制台或 Node.js 环境中设置
localStorage.setItem('mira-sdk-debug', 'true');
// 或
process.env.MIRA_SDK_DEBUG = 'true';
```

## 新功能 (v1.0.2+)

### 标签管理

SDK 现在支持完整的标签管理功能：

```typescript
// 获取所有标签
const tags = await client.tags().getAll(libraryId);

// 创建标签
const newTag = await client.tags().createTag(libraryId, '重要文档', 0xff0000);

// 为文件添加标签
await client.tags().addTagsToFile(libraryId, fileId, ['重要文档', '审核中']);

// 获取文件的标签
const fileTags = await client.tags().getFileTagList(libraryId, fileId);

// 查询标签
const foundTags = await client.tags().findByTitle(libraryId, '重要');
```

### 文件夹管理

支持文件夹的创建、管理和文件关联：

```typescript
// 获取所有文件夹
const folders = await client.folders().getAll(libraryId);

// 创建文件夹
const folder = await client.folders().createFolder(libraryId, '项目文档');

// 创建子文件夹
const subFolder = await client.folders().createFolder(libraryId, '设计文档', folder.data.id);

// 将文件移动到文件夹
await client.folders().moveFileToFolder(libraryId, fileId, folder.data.id);

// 获取根文件夹
const rootFolders = await client.folders().getRootFolders(libraryId);
```

### 增强的文件查询

新增强大的文件查询和筛选功能：

```typescript
// 基础文件查询
const files = await client.files().getAllFiles(libraryId);

// 按标签筛选
const taggedFiles = await client.files().getFilesByTags(libraryId, ['重要', '待审核']);

// 按文件夹筛选
const folderFiles = await client.files().getFilesByFolder(libraryId, folderId);

// 按文件标题搜索
const searchResults = await client.files().searchFilesByTitle(libraryId, 'document');

// 按扩展名筛选
const images = await client.files().getFilesByExtension(libraryId, '.jpg');

// 按大小范围筛选
const mediumFiles = await client.files().getFilesBySize(libraryId, 1024*1024, 10*1024*1024);

// 复合条件查询
const complexQuery = await client.files().getFiles({
  libraryId,
  filters: {
    extension: '.jpg',
    tags: ['重要'],
    folder_id: folderId,
    size_min: 100 * 1024,
    limit: 10
  }
});

// 分页查询
const paginatedFiles = await client.files().getFilesPaginated(libraryId, 1, 20);
```

### 完整示例

查看 `examples/tag-folder-example.ts` 获取完整的使用示例。

## 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

此项目采用 ISC 许可证 - 查看 LICENSE 文件了解详情。
