import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/server_config.dart';
import '../services/server_storage_service.dart';

/// 服务器列表 provider。
///
/// 复用单例 [ServerStorageService] 做真实持久化。
/// 暴露刷新与 CRUD 便捷方法；调用 refresh() 后 UI 自动重建。
class ServerListNotifier extends StateNotifier<List<ServerConfig>> {
  final ServerStorageService _storage = ServerStorageService.instance;

  ServerListNotifier() : super(const []) {
    _load();
  }

  Future<void> _load() async {
    await _storage.init();
    state = _storage.servers;
  }

  Future<void> refresh() => _load();

  Future<void> add(ServerConfig server) async {
    await _storage.addServer(server);
    await _load();
  }

  Future<void> update(ServerConfig server) async {
    await _storage.updateServer(server);
    await _load();
  }

  Future<void> remove(String id) async {
    await _storage.deleteServer(id);
    await _load();
  }

  Future<void> setCurrent(String id) async {
    await _storage.setCurrentServer(id);
    await _load();
  }
}

final serverListProvider =
    StateNotifierProvider<ServerListNotifier, List<ServerConfig>>((ref) {
  return ServerListNotifier();
});
