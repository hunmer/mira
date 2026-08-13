import '../client/http_client.dart';
import '../models/system.dart';

/// 系统模块：健康检查与状态监控
class SystemModule {
  final MiraHttpClient _httpClient;

  SystemModule(this._httpClient);

  /// 详细健康状态
  Future<HealthResponse> getHealth() async {
    return _httpClient.get<HealthResponse>(
      '/api/health',
      fromJson: (data) => HealthResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 简单健康状态（无 /api 前缀，精简版）
  Future<HealthResponse> getSimpleHealth() async {
    return _httpClient.get<HealthResponse>(
      '/health',
      fromJson: (data) => HealthResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 服务器是否可用
  Future<bool> isServerAvailable() async {
    try {
      final h = await getSimpleHealth();
      return h.status == 'ok';
    } catch (_) {
      return false;
    }
  }

  /// 服务器运行时间（秒）
  Future<double> getUptime() async => (await getHealth()).uptime;

  /// 服务器版本
  Future<String> getVersion() async => (await getHealth()).version;

  /// Node.js 版本
  Future<String?> getNodeVersion() async => (await getHealth()).nodeVersion;

  /// 运行环境
  Future<String?> getEnvironment() async => (await getHealth()).environment;

  /// 等待服务器就绪
  Future<bool> waitForServer({
    Duration timeout = const Duration(seconds: 30),
    Duration checkInterval = const Duration(seconds: 1),
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      if (await isServerAvailable()) return true;
      await Future.delayed(checkInterval);
    }
    return false;
  }

  /// 带重试的健康检查
  Future<bool> checkHealthWithRetry({int maxRetries = 3, Duration retryDelay = const Duration(seconds: 1)}) async {
    for (var i = 0; i < maxRetries; i++) {
      if (await isServerAvailable()) return true;
      if (i < maxRetries - 1) await Future.delayed(retryDelay);
    }
    return false;
  }
}
