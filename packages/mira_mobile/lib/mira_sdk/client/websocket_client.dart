import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

/// WebSocket 连接选项
class WebSocketOptions {
  final String? clientId;
  final String? libraryId;
  final String? token;
  final bool reconnect;
  final Duration reconnectInterval;
  final int maxReconnectAttempts;

  const WebSocketOptions({
    this.clientId,
    this.libraryId,
    this.token,
    this.reconnect = true,
    this.reconnectInterval = const Duration(seconds: 3),
    this.maxReconnectAttempts = 5,
  });
}

/// WebSocket 消息
class WebSocketMessage {
  final String eventName;
  final Map<String, dynamic> data;

  const WebSocketMessage({required this.eventName, required this.data});

  factory WebSocketMessage.fromJson(Map<String, dynamic> json) =>
      WebSocketMessage(
        eventName: json['eventName'] as String? ?? '',
        data: (json['data'] as Map<String, dynamic>?) ?? const {},
      );
}

typedef WebSocketEventCallback = void Function(WebSocketMessage msg);

/// Mira WebSocket 客户端
///
/// 通过 query 参数携带 token/libraryId/clientId 进行鉴权与房间订阅，
/// 收到消息后按 eventName 分发给监听者。
class MiraWebSocketClient {
  final int port;
  final String host;
  final String? url;
  final WebSocketOptions options;

  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  bool _disposed = false;
  int _reconnectCount = 0;

  final Map<String, List<WebSocketEventCallback>> _listeners = {};

  MiraWebSocketClient({
    required this.port,
    required this.host,
    this.url,
    this.options = const WebSocketOptions(),
  });

  /// 监听指定事件
  void on(String eventName, WebSocketEventCallback cb) {
    _listeners.putIfAbsent(eventName, () => []).add(cb);
  }

  /// 取消监听
  void off(String eventName, WebSocketEventCallback cb) {
    _listeners[eventName]?.remove(cb);
  }

  /// 连接
  Future<void> connect() async {
    if (_disposed) return;
    final params = <String, String>{};
    if (options.token != null) params['token'] = options.token!;
    if (options.libraryId != null) params['libraryId'] = options.libraryId!;
    if (options.clientId != null) params['clientId'] = options.clientId!;

    final base = Uri.parse(
      url ??
          '${host.startsWith('https') ? 'wss' : 'ws'}://${host.replaceFirst(RegExp(r'^https?://'), '')}:$port',
    );
    final uri = base.replace(
      queryParameters: {...base.queryParameters, ...params},
    );

    _channel = WebSocketChannel.connect(uri);
    _sub = _channel!.stream.listen(
      (msg) {
        if (msg is String && msg.isNotEmpty) {
          try {
            final json = jsonDecode(msg) as Map<String, dynamic>;
            final message = WebSocketMessage.fromJson(json);
            for (final cb in [
              ...?_listeners[message.eventName],
              ...?_listeners['*'],
            ]) {
              cb(message);
            }
          } catch (_) {
            // 忽略无法解析的消息
          }
        }
      },
      onDone: () {
        _reconnectCount++;
        if (options.reconnect &&
            !_disposed &&
            (options.maxReconnectAttempts <= 0 ||
                _reconnectCount <= options.maxReconnectAttempts)) {
          Future.delayed(options.reconnectInterval, connect);
        }
      },
      onError: (_) {
        // 错误由 onDone 的重试逻辑处理
      },
    );
  }

  /// 发送消息
  void send(Map<String, dynamic> data) {
    _channel?.sink.add(jsonEncode(data));
  }

  /// 断开连接
  Future<void> disconnect() async {
    await _sub?.cancel();
    await _channel?.sink.close();
    _sub = null;
    _channel = null;
  }

  /// 释放资源
  void dispose() {
    _disposed = true;
    disconnect();
  }
}
