import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../models/server_config.dart';
import 'file_filter_provider.dart';

/// 会话状态机：
/// - [SessionStatus.disconnected] 未连接（初始）
/// - [SessionStatus.connecting] 连接中（login 中）
/// - [SessionStatus.connected] 已连接且已选库
class SessionStatus {
  static const disconnected = 'disconnected';
  static const connecting = 'connecting';
  static const connected = 'connected';
}

/// 全局会话状态：持有 MiraClient 单例、当前素材库、登录用户。
///
/// connect 时 new + login；disconnect 时 dispose client，避免泄漏。
@immutable
class SessionState {
  final String status;
  final MiraClient? client;
  final Library? library;
  final UserInfo? user;

  /// 当前连接的 ServerConfig.id（用于服务器列表高亮当前）
  final String? connectedServerId;
  final String? error;
  final int fileEventRevision;

  const SessionState({
    this.status = SessionStatus.disconnected,
    this.client,
    this.library,
    this.user,
    this.connectedServerId,
    this.error,
    this.fileEventRevision = 0,
  });

  bool get isConnected => status == SessionStatus.connected && client != null;
  bool get isConnecting => status == SessionStatus.connecting;

  SessionState copyWith({
    String? status,
    MiraClient? client,
    Library? library,
    UserInfo? user,
    String? connectedServerId,
    String? error,
    bool clearClient = false,
    bool clearLibrary = false,
    bool clearUser = false,
    bool clearServerId = false,
    bool clearError = false,
    int? fileEventRevision,
  }) {
    return SessionState(
      status: status ?? this.status,
      client: clearClient ? null : (client ?? this.client),
      library: clearLibrary ? null : (library ?? this.library),
      user: clearUser ? null : (user ?? this.user),
      connectedServerId: clearServerId
          ? null
          : (connectedServerId ?? this.connectedServerId),
      error: clearError ? null : (error ?? this.error),
      fileEventRevision: fileEventRevision ?? this.fileEventRevision,
    );
  }
}

/// 会话状态管理器。
///
/// 连接流程：new MiraClient → login → verify（拿到 user）。
/// 断开：logout（尽力）→ dispose → 重置状态。
class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._ref) : super(const SessionState());

  final Ref _ref;

  SessionState? _previousSession;
  bool _hasPendingServerSwitch = false;
  MiraWebSocketClient? _websocket;

  /// 连接服务器并登录。
  ///
  /// 成功后状态为 connected（但 library 尚未选中）。
  /// 调用方应在 [selectLibrary] 后才算完整进入。
  Future<void> connect(
    ServerConfig server, {
    String? username,
    String? password,
  }) async {
    state = SessionState(
      status: SessionStatus.connecting,
      connectedServerId: server.id,
    );
    final client = MiraClient(server.serverUrl, wsUrl: server.wsUrl);
    try {
      await client.login(
        username ?? server.username ?? '',
        password ?? server.password ?? '',
      );
      await client.auth().verify();
      final user = await client.user().getInfo();
      state = SessionState(
        status: SessionStatus.connected,
        client: client,
        user: user,
        connectedServerId: server.id,
      );
    } catch (e) {
      client.dispose();
      state = SessionState(
        status: SessionStatus.disconnected,
        error: e.toString(),
      );
      rethrow;
    }
  }

  /// 使用已有 token 直接接入（无需再次登录），用于已保存 token 的快速重连。
  Future<void> connectWithToken(ServerConfig server, String token) async {
    state = SessionState(
      status: SessionStatus.connecting,
      connectedServerId: server.id,
    );
    final client = MiraClient(server.serverUrl, wsUrl: server.wsUrl)
      ..setToken(token);
    try {
      await client.auth().verify();
      final user = await client.user().getInfo();
      state = SessionState(
        status: SessionStatus.connected,
        client: client,
        user: user,
        connectedServerId: server.id,
      );
    } catch (e) {
      client.dispose();
      state = SessionState(
        status: SessionStatus.disconnected,
        error: e.toString(),
      );
      rethrow;
    }
  }

  /// 统一连接入口：按服务器配置的认证方式自动选择 token / 账密。
  ///
  /// 成功后状态为 connected（但 library 尚未选中）。
  Future<void> connectToServer(ServerConfig server) async {
    _previousSession = state.isConnected && state.library != null
        ? state
        : null;
    _hasPendingServerSwitch = true;
    try {
      if (server.authMethod == 1 && (server.token?.isNotEmpty ?? false)) {
        await connectWithToken(server, server.token!);
      } else {
        await connect(
          server,
          username: server.username,
          password: server.password,
        );
      }
    } catch (_) {
      final previous = _previousSession;
      _clearPendingServerSwitch();
      if (previous != null) state = previous;
      rethrow;
    }
  }

  /// 恢复上次会话：登录 → 按保存的 lastLibraryId 自动选库。
  ///
  /// 返回 true 仅当"已连接 + 已选库"完整恢复；其余（无保存库、库已不存在/异常）
  /// 返回 false，调用方据此决定跳转库选择页还是服务器列表。
  /// 注意：失败时不会主动断开，已建立的连接保留，由调用方判断后续。
  Future<bool> restoreLastSession(ServerConfig server) async {
    try {
      await connectToServer(server);
    } catch (_) {
      return false;
    }
    final client = state.client;
    final savedLibId = server.lastLibraryId;
    if (client == null || savedLibId == null) return false;

    try {
      final libs = await client.libraries().getAll();
      final match = libs.where((l) => l.id == savedLibId).firstOrNull;
      if (match == null) return false;
      selectLibrary(match, clearFilters: false);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 选择当前素材库。
  void selectLibrary(Library library, {bool clearFilters = true}) {
    final previousLibraryId =
        _previousSession?.library?.id ?? state.library?.id;
    final previousClient = _previousSession?.client;
    if (_hasPendingServerSwitch && previousClient != state.client) {
      previousClient?.dispose();
    }
    _clearPendingServerSwitch();
    state = state.copyWith(library: library);
    _connectWebsocket();
    if (clearFilters && previousLibraryId != library.id) {
      _ref.read(fileFilterProvider.notifier).clear();
    }
  }

  void _connectWebsocket() {
    final client = state.client;
    final library = state.library;
    if (client == null || library == null) return;
    unawaited(_websocket?.disconnect());
    final ws = client.websocket(
      options: WebSocketOptions(
        libraryId: library.id,
        token: client.getHttpClient().token,
        clientId: 'mira-mobile',
      ),
    );
    _websocket = ws;
    ws.on('*', (message) {
      if (message.eventName.startsWith('file::')) {
        state = state.copyWith(fileEventRevision: state.fileEventRevision + 1);
      }
    });
    unawaited(ws.connect());
  }

  /// 放弃本次服务器切换：释放新连接并恢复进入服务器列表前的完整会话。
  Future<void> cancelPendingServerSwitch() async {
    if (!_hasPendingServerSwitch) return;

    final pendingClient = state.client;
    final previous = _previousSession;
    _clearPendingServerSwitch();
    if (pendingClient != null && pendingClient != previous?.client) {
      try {
        await pendingClient.logout();
      } catch (_) {
        // 回滚不能被登出失败阻断。
      }
      pendingClient.dispose();
    }
    state = previous ?? const SessionState();
  }

  void _clearPendingServerSwitch() {
    _previousSession = null;
    _hasPendingServerSwitch = false;
  }

  /// 断开连接：清理 client 与已选库，dispose 释放底层 http client。
  Future<void> disconnect() async {
    await _websocket?.disconnect();
    _websocket = null;
    final client = state.client;
    final previousClient = _previousSession?.client;
    _clearPendingServerSwitch();
    if (client != null) {
      try {
        await client.logout();
      } catch (_) {
        // 忽略登出失败（token 可能已失效）
      }
      client.dispose();
    }
    if (previousClient != null && previousClient != client) {
      previousClient.dispose();
    }
    state = const SessionState();
  }

  @override
  void dispose() {
    // 注意：不要在这里 dispose client，由 disconnect() 显式管理。
    // Widget tree dispose 时若仍连接，也清理掉避免泄漏。
    state.client?.dispose();
    _websocket?.dispose();
    if (_previousSession?.client != state.client) {
      _previousSession?.client?.dispose();
    }
    super.dispose();
  }
}

/// 全局会话 provider（autoDispose 关闭，确保跨页面共享同一会话）。
final sessionProvider = StateNotifierProvider<SessionNotifier, SessionState>((
  ref,
) {
  return SessionNotifier(ref);
});
