import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/common.dart';

/// Mira HTTP 客户端
///
/// 与 TS 版 HttpClient 行为对齐：
/// - 自动注入 Authorization Bearer token
/// - 统一错误处理，失败抛 [MiraApiException]
/// - 自动剥壳：响应若含 `data` 字段则提取内层 data，否则返回原响应体
///   （兼容后端 4 种包裹风格：{code,message,data} / {success,message,data} /
///    无包裹直接数组/对象 / 错误态裸 {error}）
class MiraHttpClient {
  final ClientConfig config;
  final http.Client _client;

  MiraHttpClient(this.config) : _client = http.Client();

  /// 设置认证令牌
  void setToken(String token) => config.token = token;

  /// 清除认证令牌
  void clearToken() => config.token = null;

  /// 当前令牌
  String? get token => config.getToken?.call() ?? config.token;

  /// 构建请求头
  Map<String, String> _buildHeaders([Map<String, String>? extra]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      ...?config.headers,
      ...?extra,
    };
    final t = token;
    if (t != null) headers['Authorization'] = 'Bearer $t';
    return headers;
  }

  /// 构建完整 URL
  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final base = Uri.parse(config.baseUrl);
    final fullPath = path.startsWith('/') ? path : '/$path';
    return Uri(
      scheme: base.scheme,
      host: base.host,
      port: base.port == 0 ? null : base.port,
      path: '${base.path.endsWith('/') ? base.path.substring(0, base.path.length - 1) : base.path}$fullPath',
      queryParameters: queryParams?.map((k, v) => MapEntry(k, v?.toString())),
    );
  }

  /// GET 请求，返回剥壳后的内层数据
  Future<T> get<T>(String path, {Map<String, dynamic>? queryParams, T Function(dynamic)? fromJson}) async {
    final response = await _client
        .get(_buildUri(path, queryParams), headers: _buildHeaders())
        .timeout(config.timeout);
    return _extract<T>(_decode(response), fromJson);
  }

  /// POST 请求
  Future<T> post<T>(String path, {Map<String, dynamic>? body, T Function(dynamic)? fromJson}) async {
    final response = await _client
        .post(_buildUri(path), headers: _buildHeaders(), body: body != null ? jsonEncode(body) : null)
        .timeout(config.timeout);
    return _extract<T>(_decode(response), fromJson);
  }

  /// PUT 请求
  Future<T> put<T>(String path, {Map<String, dynamic>? body, T Function(dynamic)? fromJson}) async {
    final response = await _client
        .put(_buildUri(path), headers: _buildHeaders(), body: body != null ? jsonEncode(body) : null)
        .timeout(config.timeout);
    return _extract<T>(_decode(response), fromJson);
  }

  /// DELETE 请求（支持 body，后端 tags/folders delete 通过 body 传参）
  Future<T> delete<T>(String path, {Map<String, dynamic>? body, T Function(dynamic)? fromJson}) async {
    final request = http.Request('DELETE', _buildUri(path));
    request.headers.addAll(_buildHeaders());
    if (body != null) request.body = jsonEncode(body);
    final streamed = await _client.send(request).timeout(config.timeout);
    final response = await http.Response.fromStream(streamed);
    return _extract<T>(_decode(response), fromJson);
  }

  /// 下载文件，返回原始字节
  Future<List<int>> download(String path) async {
    final response = await _client.get(_buildUri(path), headers: _buildHeaders()).timeout(config.timeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw MiraApiException(ErrorResponse(
        error: 'HTTP_ERROR',
        message: 'Download failed: ${response.statusCode}',
        timestamp: DateTime.now().toIso8601String(),
      ));
    }
    return response.bodyBytes;
  }

  /// 构造带鉴权的 URL（供 img/iframe 等直接访问）
  String getUrl(String path) {
    final uri = _buildUri(path);
    final t = token;
    if (t == null) return uri.toString();
    return uri.replace(queryParameters: {...uri.queryParameters, 'token': t}).toString();
  }

  /// 解析响应体为动态对象，并做基础状态码校验
  dynamic _decode(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'HTTP ${response.statusCode}';
      String error = 'HTTP_ERROR';
      try {
        final body = response.body.isNotEmpty ? jsonDecode(response.body) : null;
        if (body is Map<String, dynamic>) {
          message = (body['message'] ?? body['error'] ?? message).toString();
          error = (body['error'] ?? error).toString();
        }
      } catch (_) {}
      throw MiraApiException(ErrorResponse(
        error: error,
        message: message,
        timestamp: DateTime.now().toIso8601String(),
      ));
    }

    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }

  /// 剥壳：若响应体是含 `data` 字段的对象，提取 data；否则原样返回。
  /// 同时通过 [fromJson] 转换为目标类型。
  T _extract<T>(dynamic body, T Function(dynamic)? fromJson) {
    dynamic data = body;
    if (body is Map<String, dynamic> && body.containsKey('data')) {
      // 注意：登录响应内层就是 {accessToken, user}，需先看是否是错误/成功包裹。
      // 后端写操作返回 {code,message,data: true/2/...}，data 即结果。
      data = body['data'];
    }
    if (fromJson != null) return fromJson(data);
    return data as T;
  }

  /// 获取原始 http.Client（高级用法，如带 body 的 DELETE 已内置）
  http.Client get rawClient => _client;

  /// 关闭客户端
  void dispose() => _client.close();
}
