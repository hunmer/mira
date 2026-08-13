import '../client/http_client.dart';
import '../models/device.dart';

/// 设备模块：连接管理与状态查询
class DeviceModule {
  final MiraHttpClient _httpClient;

  DeviceModule(this._httpClient);

  /// 所有设备连接信息
  Future<DevicesResponse> getAll() async {
    return _httpClient.get<DevicesResponse>(
      '/api/devices',
      fromJson: (data) => DevicesResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 指定素材库的设备
  Future<List<Device>> getByLibrary(String libraryId) async {
    return _httpClient.get<List<Device>>(
      '/api/devices/library/$libraryId',
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => Device.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// 断开设备
  Future<void> disconnect(String clientId, String libraryId) async {
    await _httpClient.post('/api/devices/disconnect', body: {'clientId': clientId, 'libraryId': libraryId});
  }

  /// 向设备发消息
  Future<void> sendMessage(String clientId, String libraryId, Map<String, dynamic> message) async {
    await _httpClient.post('/api/devices/send-message', body: {
      'clientId': clientId,
      'libraryId': libraryId,
      'message': message,
    });
  }

  /// 设备统计
  Future<DeviceStatsResponse> getStats() async {
    return _httpClient.get<DeviceStatsResponse>(
      '/api/devices/stats',
      fromJson: (data) => DeviceStatsResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 所有已连接设备
  Future<List<Device>> getConnectedDevices() async {
    final resp = await getAll();
    return resp.data.values.expand((ds) => ds).where((d) => d.status == 'connected').toList();
  }

  /// 所有已断开设备
  Future<List<Device>> getDisconnectedDevices() async {
    final resp = await getAll();
    return resp.data.values.expand((ds) => ds).where((d) => d.status == 'disconnected').toList();
  }

  /// 按 clientId 查找
  Future<Device?> findByClientId(String clientId) async {
    final resp = await getAll();
    for (final ds in resp.data.values) {
      final found = ds.firstWhere((d) => d.clientId == clientId, orElse: null);
      if (found != null) return found;
    }
    return null;
  }

  /// 指定素材库的连接数
  Future<int> getLibraryConnectionCount(String libraryId) async {
    final ds = await getByLibrary(libraryId);
    return ds.where((d) => d.status == 'connected').length;
  }
}
