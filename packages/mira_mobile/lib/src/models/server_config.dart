/// 服务器配置模型
class ServerConfig {
  final String id;
  final String name;
  final String serverUrl;
  final String wsUrl;
  final int authMethod; // 0: Auth, 1: Token
  final String? username;
  final String? password;
  final String? token;
  final bool smbEnabled;
  final String? mountPath;
  final String? smbPath;
  final DateTime createdAt;
  final bool isCurrent;
  /// 上次在该服务器选中的素材库 id（用于下次启动自动恢复）
  final String? lastLibraryId;

  ServerConfig({
    required this.id,
    required this.name,
    required this.serverUrl,
    required this.wsUrl,
    this.authMethod = 0,
    this.username,
    this.password,
    this.token,
    this.smbEnabled = false,
    this.mountPath,
    this.smbPath,
    DateTime? createdAt,
    this.isCurrent = false,
    this.lastLibraryId,
  }) : createdAt = createdAt ?? DateTime.now();

  /// 从 JSON 创建 ServerConfig
  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    return ServerConfig(
      id: json['id'] as String,
      name: json['name'] as String,
      serverUrl: json['serverUrl'] as String,
      wsUrl: json['wsUrl'] as String,
      authMethod: json['authMethod'] as int? ?? 0,
      username: json['username'] as String?,
      password: json['password'] as String?,
      token: json['token'] as String?,
      smbEnabled: json['smbEnabled'] as bool? ?? false,
      mountPath: json['mountPath'] as String?,
      smbPath: json['smbPath'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      isCurrent: json['isCurrent'] as bool? ?? false,
      lastLibraryId: json['lastLibraryId'] as String?,
    );
  }

  /// 转换为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'serverUrl': serverUrl,
      'wsUrl': wsUrl,
      'authMethod': authMethod,
      'username': username,
      'password': password,
      'token': token,
      'smbEnabled': smbEnabled,
      'mountPath': mountPath,
      'smbPath': smbPath,
      'createdAt': createdAt.toIso8601String(),
      'isCurrent': isCurrent,
      'lastLibraryId': lastLibraryId,
    };
  }

  /// 创建带修改的副本
  ServerConfig copyWith({
    String? id,
    String? name,
    String? serverUrl,
    String? wsUrl,
    int? authMethod,
    String? username,
    String? password,
    String? token,
    bool? smbEnabled,
    String? mountPath,
    String? smbPath,
    DateTime? createdAt,
    bool? isCurrent,
    String? lastLibraryId,
  }) {
    return ServerConfig(
      id: id ?? this.id,
      name: name ?? this.name,
      serverUrl: serverUrl ?? this.serverUrl,
      wsUrl: wsUrl ?? this.wsUrl,
      authMethod: authMethod ?? this.authMethod,
      username: username ?? this.username,
      password: password ?? this.password,
      token: token ?? this.token,
      smbEnabled: smbEnabled ?? this.smbEnabled,
      mountPath: mountPath ?? this.mountPath,
      smbPath: smbPath ?? this.smbPath,
      createdAt: createdAt ?? this.createdAt,
      isCurrent: isCurrent ?? this.isCurrent,
      lastLibraryId: lastLibraryId ?? this.lastLibraryId,
    );
  }

  /// 格式化创建日期（年月日数字串，由调用方用 'server.createdAt' key 包装本地化）。
  String get formattedCreatedAtDate {
    return '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';
  }

  /// 生成唯一 ID
  static String generateId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }

  /// 根据服务器地址自动生成 WebSocket 地址
  static String generateWsUrl(String serverUrl) {
    try {
      final uri = Uri.parse(serverUrl);
      final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
      // 默认 WebSocket 端口使用服务器端口 + 1
      final wsPort = uri.port > 0 ? uri.port + 1 : 8018;
      return '$wsScheme://${uri.host}:$wsPort';
    } catch (e) {
      return 'ws://127.0.0.1:8018';
    }
  }
}
