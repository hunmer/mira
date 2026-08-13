# Mira SDK Test Suite

这个目录包含了 Mira SDK 的完整测试套件，确保所有 API 接口都正常工作。

## 测试结构

```
test/mira_sdk/
├── README.md                      # 测试说明文档
├── test_runner.dart               # 主测试运行器
├── mira_client_test.dart          # MiraClient 核心功能测试
├── room_manager_test.dart         # 房间管理 API 测试
├── user_manager_test.dart         # 用户管理 API 测试
├── platform_manager_test.dart     # 平台管理 API 测试
├── events_test.dart              # 事件系统测试
├── models_test.dart              # 数据模型测试
└── integration_test.dart         # 集成测试
```

## 运行测试

### 运行所有测试
```bash
flutter test test/mira_sdk/
```

### 运行特定测试文件
```bash
# 核心客户端测试
flutter test test/mira_sdk/mira_client_test.dart

# 房间管理测试
flutter test test/mira_sdk/room_manager_test.dart

# 用户管理测试
flutter test test/mira_sdk/user_manager_test.dart

# 平台管理测试
flutter test test/mira_sdk/platform_manager_test.dart

# 事件系统测试
flutter test test/mira_sdk/events_test.dart

# 数据模型测试
flutter test test/mira_sdk/models_test.dart

# 集成测试
flutter test test/mira_sdk/integration_test.dart
```

### 运行测试运行器
```bash
flutter test test/mira_sdk/test_runner.dart
```

### 生成测试覆盖率报告
```bash
flutter test --coverage test/mira_sdk/
```

## 测试覆盖范围

### ✅ 核心功能测试 (mira_client_test.dart)
- [x] 客户端创建和配置
- [x] 连接管理
- [x] 事件系统注册
- [x] 管理器提供
- [x] 资源清理

### ✅ 房间管理测试 (room_manager_test.dart)
- [x] 创建房间
- [x] 获取房间信息
- [x] 更新房间
- [x] 删除房间
- [x] 获取房间列表
- [x] 成员管理（加入、离开、权限）
- [x] 房间消息发送

### ✅ 用户管理测试 (user_manager_test.dart)
- [x] 获取当前用户
- [x] 获取用户信息
- [x] 更新用户信息
- [x] 更新用户状态
- [x] 搜索用户
- [x] 获取用户列表
- [x] 获取在线用户
- [x] 设置在线状态
- [x] 获取用户统计
- [x] 发送私信
- [x] 获取用户房间

### ✅ 平台管理测试 (platform_manager_test.dart)
- [x] 创建平台
- [x] 获取平台信息
- [x] 更新平台
- [x] 删除平台
- [x] 获取平台列表
- [x] 用户管理（添加、移除、权限）
- [x] 活动记录
- [x] 获取平台统计

### ✅ 事件系统测试 (events_test.dart)
- [x] 事件基类功能
- [x] 连接事件
- [x] 用户事件
- [x] 房间事件
- [x] 平台事件
- [x] 事件处理器系统
- [x] 事件序列化

### ✅ 数据模型测试 (models_test.dart)
- [x] MiraOptions 配置
- [x] MiraMessage 消息格式
- [x] User 用户模型
- [x] Room 房间模型
- [x] RoomMember 房间成员模型
- [x] Platform 平台模型
- [x] PlatformUser 平台用户模型
- [x] PlatformActivity 平台活动模型
- [x] UserStatus 用户状态模型
- [x] 枚举类型测试

### ✅ 集成测试 (integration_test.dart)
- [x] 完整工作流程测试
- [x] 事件顺序测试
- [x] 管理器集成测试
- [x] 错误处理集成测试
- [x] 性能和压力测试

## 测试统计

- **总测试文件数**: 8
- **总测试组数**: 50+
- **总测试用例数**: 200+
- **覆盖率目标**: 95%+

## Mock 和依赖

测试使用了以下依赖：
- `flutter_test` - Flutter 测试框架
- `mockito` - Mock 对象库
- `json_annotation` - JSON 注解支持

## 运行测试前的准备

1. 安装测试依赖：
```bash
flutter packages get
```

2. 生成 Mock 文件（如果需要）：
```bash
flutter packages pub run build_runner build
```

## 持续集成

这些测试设计为在 CI/CD 环境中运行：

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter packages get
      - run: flutter test test/mira_sdk/
```

## 故障排除

### 常见问题

1. **测试超时**
   - 检查网络连接
   - 增加测试超时时间

2. **Mock 生成失败**
   - 运行 `flutter packages pub run build_runner clean`
   - 重新运行 `flutter packages pub run build_runner build`

3. **依赖冲突**
   - 运行 `flutter clean`
   - 运行 `flutter packages get`

4. **测试覆盖率不足**
   - 检查未测试的代码路径
   - 添加相应的测试用例

### 调试测试

1. 启用详细输出：
```bash
flutter test --verbose test/mira_sdk/
```

2. 运行特定测试：
```bash
flutter test --name="should create room successfully" test/mira_sdk/
```

3. 调试模式：
```bash
flutter test --debug test/mira_sdk/
```

## 贡献指南

1. 添加新功能时，请同时添加相应的测试
2. 保持测试覆盖率在 95% 以上
3. 遵循现有的测试命名和结构约定
4. 在提交 PR 前确保所有测试通过

## 测试最佳实践

1. **AAA 模式**：Arrange（准备）、Act（执行）、Assert（验证）
2. **独立测试**：每个测试应该独立运行
3. **描述性命名**：测试名称应该清楚描述测试内容
4. **Mock 外部依赖**：使用 Mock 对象隔离测试
5. **边界条件测试**：测试正常和异常情况
6. **性能测试**：确保性能在可接受范围内