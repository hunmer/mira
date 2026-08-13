/// 设备相关模型
library;

class Device {
  final String clientId;
  final String libraryId;
  final String connectionTime;
  final String lastActivity;
  final String status; // connected | disconnected
  final String userAgent;
  final String ipAddress;
  final Map<String, dynamic> requestInfo;

  const Device({
    required this.clientId,
    required this.libraryId,
    required this.connectionTime,
    required this.lastActivity,
    required this.status,
    required this.userAgent,
    required this.ipAddress,
    required this.requestInfo,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      clientId: json['clientId']?.toString() ?? '',
      libraryId: json['libraryId']?.toString() ?? '',
      connectionTime: json['connectionTime'] as String? ?? '',
      lastActivity: json['lastActivity'] as String? ?? '',
      status: json['status'] as String? ?? 'disconnected',
      userAgent: json['userAgent'] as String? ?? '',
      ipAddress: json['ipAddress'] as String? ?? '',
      requestInfo: json['requestInfo'] is Map
          ? Map<String, dynamic>.from(json['requestInfo'] as Map)
          : const <String, dynamic>{},
    );
  }
}

/// 设备列表响应（/api/devices 剥壳后；data 为 libraryId -> Device[] 的 map）
class DevicesResponse {
  final bool success;
  final Map<String, List<Device>> data;
  final String timestamp;

  const DevicesResponse({required this.success, required this.data, required this.timestamp});

  factory DevicesResponse.fromJson(Map<String, dynamic> json) {
    final raw = json['data'] is Map ? Map<String, dynamic>.from(json['data'] as Map) : <String, dynamic>{};
    final mapped = <String, List<Device>>{};
    raw.forEach((key, value) {
      if (value is List) {
        mapped[key] = value.map((e) => Device.fromJson(e as Map<String, dynamic>)).toList();
      }
    });
    return DevicesResponse(
      success: json['success'] as bool? ?? true,
      data: mapped,
      timestamp: json['timestamp'] as String? ?? '',
    );
  }
}

/// 设备统计响应（/api/devices/stats 剥壳后）
class DeviceStatsResponse {
  final bool success;
  final DeviceStatsData data;
  final String timestamp;

  const DeviceStatsResponse({required this.success, required this.data, required this.timestamp});

  factory DeviceStatsResponse.fromJson(Map<String, dynamic> json) {
    return DeviceStatsResponse(
      success: json['success'] as bool? ?? true,
      data: DeviceStatsData.fromJson(json['data'] is Map ? Map<String, dynamic>.from(json['data'] as Map) : const <String, dynamic>{}),
      timestamp: json['timestamp'] as String? ?? '',
    );
  }
}

class DeviceStatsData {
  final int totalLibraries;
  final int totalConnections;
  final Map<String, LibraryStat> libraryStats;

  const DeviceStatsData({
    required this.totalLibraries,
    required this.totalConnections,
    required this.libraryStats,
  });

  factory DeviceStatsData.fromJson(Map<String, dynamic> json) {
    final raw = json['libraryStats'] is Map ? Map<String, dynamic>.from(json['libraryStats'] as Map) : <String, dynamic>{};
    final mapped = <String, LibraryStat>{};
    raw.forEach((key, value) {
      if (value is Map) mapped[key] = LibraryStat.fromJson(Map<String, dynamic>.from(value));
    });
    return DeviceStatsData(
      totalLibraries: (json['totalLibraries'] as num?)?.toInt() ?? 0,
      totalConnections: (json['totalConnections'] as num?)?.toInt() ?? 0,
      libraryStats: mapped,
    );
  }
}

class LibraryStat {
  final int deviceCount;
  final int activeConnections;

  const LibraryStat({required this.deviceCount, required this.activeConnections});

  factory LibraryStat.fromJson(Map<String, dynamic> json) => LibraryStat(
        deviceCount: (json['deviceCount'] as num?)?.toInt() ?? 0,
        activeConnections: (json['activeConnections'] as num?)?.toInt() ?? 0,
      );
}
