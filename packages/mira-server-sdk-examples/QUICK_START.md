# 快速开始指南

## 安装步骤

### 1. 安装依赖

```bash
# 在 mira-server-sdk-examples 目录中
cd packages/mira-server-sdk-examples

# 自动安装 SDK 和示例项目依赖
npm run setup
```

或者手动安装：

```bash
# 先构建 SDK
cd ../mira-server-sdk
npm install
npm run build

# 然后安装示例项目
cd ../mira-server-sdk-examples
npm install
npm run build
```

### 2. 配置环境

复制环境配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
MIRA_SERVER_URL=http://localhost:8081
MIRA_USERNAME=admin
MIRA_PASSWORD=admin123
MIRA_LIBRARY_ID=default-library
ENABLE_INTEGRATION_TESTS=false
```

### 3. 启动 Mira 服务器

确保 Mira 服务器正在运行：
```bash
# 在主项目根目录
npm run start:full-stack
```

## 运行示例

### 单个示例

```bash
# 认证示例
npm run example:login

# 文件上传示例
npm run example:upload

# 基本功能示例
npm run example:basic

# 高级链式操作示例
npm run example:advanced
```

### 运行所有示例

```bash
npm run example:all
# 或者
npm run demo
```

### 使用脚本运行器

```bash
# 查看帮助
node run-examples.js help

# 运行特定示例
node run-examples.js login
node run-examples.js upload

# 运行所有示例
node run-examples.js all
```

## 运行测试

### 单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:auth
npm run test:upload

# 观察模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 集成测试

启用集成测试需要修改 `.env` 文件：
```env
ENABLE_INTEGRATION_TESTS=true
```

然后运行测试：
```bash
npm test
```

**注意：** 集成测试需要 Mira 服务器正在运行，并且有有效的登录凭据。

## 开发

### 监听模式

```bash
# TypeScript 编译监听
npm run dev

# 测试监听
npm run test:watch
```

### 代码检查

```bash
npm run lint
```

## 故障排除

### 常见问题

1. **模块找不到错误**
   ```bash
   npm run setup
   ```

2. **连接错误**
   - 检查 Mira 服务器是否运行
   - 验证 `.env` 中的服务器地址

3. **认证失败**
   - 验证用户名密码
   - 检查用户账户状态

4. **文件上传失败**
   - 检查素材库是否存在
   - 验证文件权限

### 调试

启用详细日志：
```bash
DEBUG=mira:* npm run example:login
```

## 目录结构

```
mira-server-sdk-examples/
├── examples/              # 示例代码
│   ├── auth/              # 认证示例
│   ├── files/             # 文件操作示例
│   ├── basic/             # 基本功能示例
│   └── advanced/          # 高级示例
├── tests/                 # 测试代码
├── src/                   # 源代码
├── dist/                  # 编译输出
├── .env.example          # 环境配置模板
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── jest.config.js        # Jest 测试配置
└── README.md             # 说明文档
```

## 下一步

- 查看 [API 文档](../mira-server-sdk/README.md)
- 阅读 [SDK 使用指南](../mira-server-sdk/SDK_USAGE_GUIDE.md)
- 探索更多 [示例代码](./examples/)
- 运行 [测试套件](./tests/)

## 需要帮助？

- 查看 [常见问题](./README.md#故障排除)
- 提交 [Issue](https://github.com/hunmer/mira_typescript/issues)
- 查看 [API 参考](../mira-app-server/API_REFERENCE.md)
