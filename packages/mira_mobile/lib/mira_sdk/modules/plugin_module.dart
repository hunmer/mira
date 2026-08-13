import '../client/http_client.dart';
import '../models/plugin.dart';

/// 插件模块：列表、启用/禁用、卸载
class PluginModule {
  final MiraHttpClient _httpClient;

  PluginModule(this._httpClient);

  /// 获取所有插件
  Future<List<Plugin>> getAll() async {
    return _httpClient.get<List<Plugin>>(
      '/api/plugins',
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => Plugin.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// 按素材库分组获取插件
  Future<List<PluginsByLibrary>> getByLibrary() async {
    return _httpClient.get<List<PluginsByLibrary>>(
      '/api/plugins/by-library',
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => PluginsByLibrary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// 根据 ID 获取插件
  Future<Plugin> getById(String id) async {
    final plugins = await getAll();
    return plugins.firstWhere(
      (p) => p.id == id,
      orElse: () => throw Exception('Plugin with id $id not found'),
    );
  }

  /// 安装插件
  Future<void> install(InstallPluginRequest data) async {
    await _httpClient.post('/api/plugins/install', body: data.toJson());
  }

  /// 安装最新版本
  Future<void> installLatest(String name, String libraryId) =>
      install(InstallPluginRequest(name: name, version: 'latest', libraryId: libraryId));

  /// 安装指定版本
  Future<void> installVersion(String name, String version, String libraryId) =>
      install(InstallPluginRequest(name: name, version: version, libraryId: libraryId));

  /// 启用插件
  Future<void> enable(String id) async => _httpClient.post('/api/plugins/$id/enable');

  /// 禁用插件
  Future<void> disable(String id) async => _httpClient.post('/api/plugins/$id/disable');

  /// 卸载插件
  Future<void> uninstall(String id) async => _httpClient.delete('/api/plugins/$id');

  /// 活跃插件
  Future<List<Plugin>> getActive() async => (await getAll()).where((p) => p.status == 'active').toList();

  /// 非活跃插件
  Future<List<Plugin>> getInactive() async => (await getAll()).where((p) => p.status == 'inactive').toList();

  /// 按素材库 ID 获取
  Future<List<Plugin>> getByLibraryId(String libraryId) async =>
      (await getAll()).where((p) => p.libraryId == libraryId).toList();

  /// 按分类获取
  Future<List<Plugin>> getByCategory(String category) async =>
      (await getAll()).where((p) => p.category == category).toList();

  /// 搜索插件
  Future<List<Plugin>> search(String query) async {
    final plugins = await getAll();
    final q = query.toLowerCase();
    return plugins.where((p) {
      return p.name.toLowerCase().contains(q) ||
          p.description.toLowerCase().contains(q) ||
          p.pluginName.toLowerCase().contains(q) ||
          p.author.toLowerCase().contains(q) ||
          p.tags.any((t) => t.toLowerCase().contains(q));
    }).toList();
  }
}
