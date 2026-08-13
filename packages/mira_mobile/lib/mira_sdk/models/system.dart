/// 系统状态相关模型
library;

/// 详细健康状态（/api/health 剥壳后）
class HealthResponse {
  final bool success;
  final String status;
  final String timestamp;
  final double uptime;
  final String version;
  final String? nodeVersion;
  final String? environment;
  final bool? isDocker;
  final bool? authRequired;
  final bool? allowRegistration;

  const HealthResponse({
    required this.success,
    required this.status,
    required this.timestamp,
    required this.uptime,
    required this.version,
    this.nodeVersion,
    this.environment,
    this.isDocker,
    this.authRequired,
    this.allowRegistration,
  });

  factory HealthResponse.fromJson(Map<String, dynamic> json) {
    return HealthResponse(
      success: json['success'] as bool? ?? (json['status'] == 'ok'),
      status: json['status'] as String? ?? 'unknown',
      timestamp: json['timestamp'] as String? ?? '',
      uptime: (json['uptime'] as num?)?.toDouble() ?? 0,
      version: json['version'] as String? ?? '',
      nodeVersion: json['nodeVersion'] as String?,
      environment: json['environment'] as String?,
      isDocker: json['isDocker'] as bool?,
      authRequired: json['authRequired'] as bool?,
      allowRegistration: json['allowRegistration'] as bool?,
    );
  }
}
