import 'http_client.dart';
import 'websocket_client.dart';
import '../models/common.dart';
import '../modules/auth_module.dart';
import '../modules/user_module.dart';
import '../modules/library_module.dart';
import '../modules/file_module.dart';
import '../modules/folder_module.dart';
import '../modules/tag_module.dart';
import '../modules/plugin_module.dart';
import '../modules/database_module.dart';
import '../modules/device_module.dart';
import '../modules/system_module.dart';

/// Mira SDK 主客户端
///
/// 使用示例：
/// ```dart
/// final client = MiraClient('http://localhost:8081');
/// await client.login('admin', 'admin123');
/// final libraries = await client.libraries().getAll();
/// ```
class MiraClient {
  final MiraHttpClient _httpClient;
  final int? _wsPort;
  final String _host;
  final String? _wsUrl;

  late final AuthModule _auth;
  late final UserModule _user;
  late final LibraryModule _libraries;
  late final FileModule _files;
  late final FolderModule _folders;
  late final TagModule _tags;
  late final PluginModule _plugins;
  late final DatabaseModule _database;
  late final DeviceModule _devices;
  late final SystemModule _system;

  MiraClient(String baseUrl, {int? wsPort, String? wsUrl, ClientConfig? config})
    : _wsPort = wsPort,
      _host = Uri.parse(baseUrl).host,
      _wsUrl = wsUrl,
      _httpClient = MiraHttpClient(config ?? ClientConfig(baseUrl: baseUrl)) {
    _auth = AuthModule(_httpClient);
    _user = UserModule(_httpClient);
    _libraries = LibraryModule(_httpClient);
    _files = FileModule(_httpClient);
    _folders = FolderModule(_httpClient);
    _tags = TagModule(_httpClient);
    _plugins = PluginModule(_httpClient);
    _database = DatabaseModule(_httpClient);
    _devices = DeviceModule(_httpClient);
    _system = SystemModule(_httpClient);
  }

  /// 认证模块
  AuthModule auth() => _auth;

  /// 用户模块
  UserModule user() => _user;

  /// 素材库模块
  LibraryModule libraries() => _libraries;

  /// 文件模块
  FileModule files() => _files;

  /// 文件夹模块
  FolderModule folders() => _folders;

  /// 标签模块
  TagModule tags() => _tags;

  /// 插件模块
  PluginModule plugins() => _plugins;

  /// 数据库模块
  DatabaseModule database() => _database;

  /// 设备模块
  DeviceModule devices() => _devices;

  /// 系统模块
  SystemModule system() => _system;

  /// 创建 WebSocket 客户端
  MiraWebSocketClient websocket({WebSocketOptions? options}) {
    return MiraWebSocketClient(
      port: _wsPort ?? 8018,
      host: _host,
      url: _wsUrl,
      options: options ?? const WebSocketOptions(),
    );
  }

  /// 设置认证令牌（返回自身以支持链式调用）
  MiraClient setToken(String token) {
    _httpClient.setToken(token);
    return this;
  }

  /// 清除认证令牌
  MiraClient clearToken() {
    _httpClient.clearToken();
    return this;
  }

  /// 快速登录
  Future<MiraClient> login(String username, String password) async {
    await _auth.login(username, password);
    return this;
  }

  /// 快速登出
  Future<MiraClient> logout() async {
    await _auth.logout();
    return this;
  }

  /// 检查服务器是否可达
  Future<bool> isConnected() => _system.isServerAvailable();

  /// 等待服务器就绪
  Future<bool> waitForServer({
    Duration timeout = const Duration(seconds: 30),
    Duration interval = const Duration(seconds: 1),
  }) => _system.waitForServer(timeout: timeout, checkInterval: interval);

  /// 获取 HTTP 客户端（高级用法）
  MiraHttpClient getHttpClient() => _httpClient;

  /// 关闭客户端
  void dispose() => _httpClient.dispose();
}
