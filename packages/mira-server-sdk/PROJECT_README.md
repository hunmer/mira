# Mira Server SDK

一个独立的 TypeScript Node.js 项目，为 Mira App Server 提供完整的 SDK 解决方案。

## 项目结构

```
mira-server-sdk/
├── client/                 # HTTP 客户端和主客户端
│   ├── HttpClient.ts      # 底层 HTTP 通信
│   └── MiraClient.ts      # 主客户端类
├── modules/               # 功能模块
│   ├── AuthModule.ts      # 认证管理
│   ├── UserModule.ts      # 用户管理
│   ├── LibraryModule.ts   # 库管理
│   ├── PluginModule.ts    # 插件管理
│   ├── FileModule.ts      # 文件操作
│   ├── DatabaseModule.ts  # 数据库操作
│   ├── DeviceModule.ts    # 设备管理
│   └── SystemModule.ts    # 系统信息
├── tests/                 # 测试套件
│   ├── client/            # 客户端测试
│   ├── modules/           # 模块测试
│   ├── integration/       # 集成测试
│   ├── helpers.ts         # 测试辅助工具
│   └── setup.ts          # 测试环境设置
├── examples/              # 使用示例
│   └── usage-examples.ts  # 完整用法示例
├── scripts/               # 构建和工具脚本
│   └── test-and-fix.js    # 自动测试修复
├── dist/                  # 构建输出目录
├── index.ts               # 主入口文件
├── types.ts               # TypeScript 类型定义
├── verify-sdk.js          # SDK 验证脚本
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── jest.config.js         # Jest 测试配置
├── .eslintrc.js          # ESLint 配置
├── .gitignore            # Git 忽略文件
├── .npmignore            # NPM 发布忽略文件
└── README.md             # 项目说明文档
```

## 快速开始

### 安装依赖

```bash
cd packages/mira-server-sdk
npm install
```

### 构建项目

```bash
# 构建 TypeScript
npm run build

# 监听模式构建
npm run dev
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 自动修复测试错误
npm run test:fix
```

### 验证 SDK

```bash
# 运行基本功能验证
npm run verify
```

## 主要特性

### 1. jQuery 风格链式调用

```javascript
const client = new MiraClient('http://localhost:8081');

// 链式调用设置
client
  .setToken('your-token')
  .setConfig({ timeout: 10000 })
  .auth()
  .login('username', 'password')
  .then(() => console.log('登录成功'));
```

### 2. 模块化架构

每个功能域都有独立的模块：

```javascript
// 用户管理
const users = await client.users().getAll();

// 库管理
const libraries = await client.libraries().search('keyword');

// 文件操作
const result = await client.files().upload('/api/upload', formData);
```

### 3. 完整的 TypeScript 支持

- 完整的类型定义
- 智能代码补全
- 编译时类型检查
- 强类型接口定义

### 4. 自动错误处理和重试

```javascript
// 自动重试失败的请求
const result = await client.retry(
  () => client.users().getById(1),
  { maxRetries: 3, delay: 1000 }
);

// 安全调用，失败时返回默认值
const safeResult = await client.safe(
  () => client.libraries().getAll(),
  [] // 默认值
);
```

### 5. 测试友好设计

- 完整的单元测试覆盖
- 集成测试支持
- 自动测试修复功能
- Mock 服务器支持

## 使用示例

### 基本用法

```javascript
const { MiraClient } = require('mira-server-sdk');

const client = new MiraClient('http://localhost:8081');

// 登录
await client.auth().login('username', 'password');

// 获取用户信息
const userInfo = await client.user().getInfo();

// 获取库列表
const libraries = await client.libraries().getAll();
```

### 高级用法

```javascript
// 批量操作
const results = await client.batch([
  () => client.users().getAll(),
  () => client.libraries().getAll(),
  () => client.plugins().getAll()
]);

// 链式操作
const result = await client
  .setToken('token')
  .libraries()
  .search('keyword');
```

## 开发指南

### 添加新模块

1. 在 `modules/` 目录创建新模块文件
2. 继承 `BaseModule` 类
3. 实现具体的 API 方法
4. 在 `MiraClient` 中注册模块
5. 添加相应的测试文件

### 运行开发环境

```bash
# 启动监听模式
npm run dev

# 在另一个终端运行测试监听
npm run test:watch
```

### 代码质量检查

```bash
# 运行 ESLint
npm run lint

# 自动修复代码风格问题
npm run lint --fix
```

## 发布准备

### 构建发布版本

```bash
# 清理并构建
npm run clean
npm run build

# 验证构建结果
npm run verify
```

### 发布到 NPM

```bash
# 发布（自动运行 prepublishOnly 脚本）
npm publish
```

## 项目状态

- ✅ **核心架构** - 完整的模块化设计
- ✅ **HTTP 客户端** - 支持认证、重试、错误处理
- ✅ **8 个功能模块** - 覆盖所有 Mira 服务器 API
- ✅ **TypeScript 支持** - 完整的类型定义
- ✅ **测试框架** - Jest + 58 个测试用例（50 个通过）
- ✅ **构建系统** - TypeScript 编译 + 输出优化
- ✅ **开发工具** - ESLint + 自动修复 + 监听模式
- ✅ **文档** - 完整的 API 文档和使用示例

## 下一步计划

1. 修复剩余的 8 个测试用例
2. 完善错误处理机制
3. 添加更多的使用示例
4. 性能优化和监控
5. 发布到 NPM 仓库

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 添加测试
4. 确保所有测试通过
5. 提交 Pull Request

## 许可证

MIT License
