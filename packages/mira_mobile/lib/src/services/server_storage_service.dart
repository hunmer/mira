import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/server_config.dart';

/// 服务器配置存储服务
/// 使用 SharedPreferences 存储服务器配置列表（支持所有平台）
class ServerStorageService {
  static const String _storageKey = 'mira_servers';
  static ServerStorageService? _instance;

  List<ServerConfig> _servers = [];
  bool _initialized = false;
  SharedPreferences? _prefs;

  ServerStorageService._();

  /// 获取单例实例
  static ServerStorageService get instance {
    _instance ??= ServerStorageService._();
    return _instance!;
  }

  /// 获取服务器列表
  List<ServerConfig> get servers => List.unmodifiable(_servers);

  /// 获取当前选中的服务器
  ServerConfig? get currentServer {
    try {
      return _servers.firstWhere((s) => s.isCurrent);
    } catch (e) {
      return _servers.isNotEmpty ? _servers.first : null;
    }
  }

  /// 初始化服务
  Future<void> init() async {
    if (_initialized) return;
    _prefs = await SharedPreferences.getInstance();
    await _loadServers();
    _initialized = true;
  }

  /// 从存储加载服务器列表
  Future<void> _loadServers() async {
    try {
      final String? jsonString = _prefs?.getString(_storageKey);
      if (jsonString != null && jsonString.isNotEmpty) {
        final List<dynamic> jsonList = json.decode(jsonString);
        _servers = jsonList
            .map((item) => ServerConfig.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        _servers = [];
      }
    } catch (e) {
      debugPrint('Error loading servers: $e');
      _servers = [];
    }
  }

  /// 保存服务器列表到存储
  Future<void> _saveServers() async {
    try {
      final jsonList = _servers.map((s) => s.toJson()).toList();
      await _prefs?.setString(_storageKey, json.encode(jsonList));
    } catch (e) {
      debugPrint('Error saving servers: $e');
      rethrow;
    }
  }

  /// 添加服务器
  Future<void> addServer(ServerConfig server) async {
    // 如果是第一个服务器，设为当前服务器
    final newServer = _servers.isEmpty
        ? server.copyWith(isCurrent: true)
        : server;

    _servers.add(newServer);
    await _saveServers();
  }

  /// 更新服务器
  Future<void> updateServer(ServerConfig server) async {
    final index = _servers.indexWhere((s) => s.id == server.id);
    if (index != -1) {
      _servers[index] = server;
      await _saveServers();
    }
  }

  /// 删除服务器
  Future<void> deleteServer(String id) async {
    final serverIndex = _servers.indexWhere((s) => s.id == id);
    if (serverIndex == -1) return;

    final wasCurrent = _servers[serverIndex].isCurrent;
    _servers.removeAt(serverIndex);

    // 如果删除的是当前服务器，将第一个服务器设为当前
    if (wasCurrent && _servers.isNotEmpty) {
      _servers[0] = _servers[0].copyWith(isCurrent: true);
    }

    await _saveServers();
  }

  /// 设置当前服务器
  Future<void> setCurrentServer(String id) async {
    _servers = _servers.map((s) {
      return s.copyWith(isCurrent: s.id == id);
    }).toList();
    await _saveServers();
  }

  /// 根据 ID 获取服务器
  ServerConfig? getServerById(String id) {
    try {
      return _servers.firstWhere((s) => s.id == id);
    } catch (e) {
      return null;
    }
  }

  /// 检查服务器 ID 是否已存在
  bool serverIdExists(String id) {
    return _servers.any((s) => s.id == id);
  }

  /// 刷新服务器列表
  Future<void> refresh() async {
    await _loadServers();
  }
}
