import '../client/http_client.dart';
import '../models/library.dart';

/// 素材库模块：CRUD 与状态管理
class LibraryModule {
  final MiraHttpClient _httpClient;

  LibraryModule(this._httpClient);

  /// 获取所有素材库列表（该接口无外层包裹，直接是数组）
  Future<List<Library>> getAll() async {
    return _httpClient.get<List<Library>>(
      '/api/libraries',
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => Library.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// 根据 ID 获取单个素材库
  Future<Library> getById(String id) async {
    final libs = await getAll();
    final lib = libs.firstWhere(
      (l) => l.id == id,
      orElse: () => throw Exception('Library with id $id not found'),
    );
    return lib;
  }

  /// 创建素材库
  Future<void> create(CreateLibraryRequest data) async {
    await _httpClient.post('/api/libraries', body: data.toJson());
  }

  /// 创建本地素材库（便捷方法）
  Future<void> createLocal(String name, String path, String description, {Map<String, dynamic>? customFields}) =>
      create(CreateLibraryRequest(name: name, path: path, description: description, customFields: customFields));

  /// 更新素材库
  Future<void> update(String id, UpdateLibraryRequest data) async {
    await _httpClient.put('/api/libraries/$id', body: data.toJson());
  }

  /// 删除素材库
  Future<void> delete(String id) async {
    await _httpClient.delete('/api/libraries/$id');
  }

  /// 启动素材库服务
  Future<void> start(String id) async {
    await _httpClient.post('/api/libraries/$id/start');
  }

  /// 停止素材库服务
  Future<void> stop(String id) async {
    await _httpClient.post('/api/libraries/$id/stop');
  }

  /// 重启素材库服务
  Future<void> restart(String id) async {
    await stop(id);
    await start(id);
  }

  /// 获取活跃素材库
  Future<List<Library>> getActive() async => (await getAll()).where((l) => l.status == 'active').toList();

  /// 按状态筛选
  Future<List<Library>> getByStatus(String status) async =>
      (await getAll()).where((l) => l.status == status).toList();
}
