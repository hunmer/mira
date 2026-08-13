/// Mira App Server Dart SDK
///
/// 与 mira-app-core TypeScript SDK 对应的 Dart/Flutter 实现，
/// 提供链式调用风格，用于与 Mira App Server API 交互。
///
/// 使用示例：
/// ```dart
/// import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
///
/// final client = MiraClient('http://localhost:8081');
/// await client.login('admin', 'admin123');
/// final libraries = await client.libraries().getAll();
/// await client.dispose();
/// ```
library mira_sdk;

// 客户端
export 'client/http_client.dart';
export 'client/websocket_client.dart';
export 'client/mira_client.dart';

// 模型
export 'models/models.dart';

// 模块
export 'modules/auth_module.dart';
export 'modules/user_module.dart';
export 'modules/library_module.dart';
export 'modules/file_module.dart';
export 'modules/folder_module.dart';
export 'modules/tag_module.dart';
export 'modules/plugin_module.dart';
export 'modules/database_module.dart';
export 'modules/device_module.dart';
export 'modules/system_module.dart';
