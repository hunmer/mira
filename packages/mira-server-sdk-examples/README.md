# Mira Server SDK Examples

这个包提供了 Mira Server SDK 的示例代码和测试用例，帮助开发者快速了解和使用 SDK 的各种功能。

## 安装和设置

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
```

然后编辑 `.env` 文件，设置你的 Mira 服务器配置：
```env
MIRA_SERVER_URL=http://localhost:8081
MIRA_USERNAME=admin
MIRA_PASSWORD=admin123
MIRA_LIBRARY_ID=default-library
```

3. 构建项目：
```bash
npm run build
```

## 示例程序

### 认证示例

演示用户登录、令牌管理、权限获取等功能：

```bash
npm run example:login
```

包含的示例：
- 基本登录流程
- 链式调用登录
- 错误处理
- 令牌管理

### 文件上传示例

演示文件上传、下载、批量操作等功能：

```bash
npm run example:upload
```

包含的示例：
- 单文件上传
- 批量文件上传
- 高级上传选项
- 文件下载
- 错误处理

### 基本使用示例

演示 SDK 的基本功能和常见用法：

```bash
npm run example:basic
```

包含的示例：
- 快速开始
- 素材库管理
- 用户管理
- 系统监控
- 设备管理

## 测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试

```bash
# 认证功能测试
npm run test:auth

# 文件上传测试
npm run test:upload
```

### 运行集成测试

默认情况下，集成测试是禁用的。要启用集成测试，请在 `.env` 文件中设置：

```env
ENABLE_INTEGRATION_TESTS=true
```

然后运行测试：

```bash
npm test
```

**注意：** 集成测试需要一个运行中的 Mira 服务器实例。

### 测试覆盖率

```bash
npm run test:coverage
```

## 示例目录结构

```
examples/
├── auth/
│   └── login-example.ts          # 认证示例
├── files/
│   └── upload-example.ts         # 文件上传示例
├── basic/
│   └── basic-usage.ts            # 基本使用示例
└── advanced/
    └── chain-operations.ts       # 高级链式操作示例

tests/
├── setup.ts                      # 测试环境设置
├── auth.test.ts                  # 认证功能测试
└── upload.test.ts                # 文件上传测试
```

## API 使用示例

### 快速开始

```typescript
import { MiraClient } from 'mira-server-sdk';

// 创建客户端
const client = new MiraClient('http://localhost:8081');

// 登录
await client.auth().login('username', 'password');

// 获取用户信息
const userInfo = await client.user().getInfo();
console.log(`欢迎, ${userInfo.realName}!`);

// 获取素材库列表
const libraries = await client.libraries().getAll();
console.log(`找到 ${libraries.length} 个素材库`);

// 登出
await client.auth().logout();
```

### 链式调用

```typescript
// 链式操作：登录 -> 获取素材库 -> 启动第一个库
const result = await client
  .auth()
  .login('username', 'password')
  .then(async () => {
    const libraries = await client.libraries().getAll();
    if (libraries.length > 0) {
      await client.libraries().start(libraries[0].id);
    }
    return libraries;
  });
```

### 文件上传

```typescript
// 单文件上传
const file = new File([fileBuffer], 'example.txt', { type: 'text/plain' });
const uploadResult = await client.files().uploadFile(
  file,
  'library-id',
  {
    sourcePath: '/uploads',
    tags: ['example', 'test']
  }
);

// 批量上传
const uploadRequest = {
  files: [file1, file2, file3],
  libraryId: 'library-id',
  sourcePath: '/batch',
  fields: {
    category: 'documents',
    batch: true
  }
};
const batchResult = await client.files().upload(uploadRequest);
```

## 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0
- 运行中的 Mira 服务器实例（用于集成测试）

## 故障排除

### 连接问题

如果遇到连接错误，请检查：

1. Mira 服务器是否正在运行
2. 服务器地址和端口是否正确
3. 网络连接是否正常

### 认证问题

如果登录失败，请检查：

1. 用户名和密码是否正确
2. 用户账户是否已激活
3. 服务器认证配置是否正确

### 文件上传问题

如果文件上传失败，请检查：

1. 文件大小是否超过限制
2. 文件类型是否被允许
3. 素材库ID是否存在且有权限
4. 磁盘空间是否充足

## 贡献

欢迎提交示例代码和改进建议！请确保：

1. 代码风格一致
2. 添加适当的注释
3. 包含必要的测试
4. 更新相关文档

## 许可证

MIT
