/// 通用响应与配置模型（对应 TS 版 types.ts 的基础类型）
library;

/// HTTP 客户端配置
class ClientConfig {
  final String baseUrl;
  final Duration timeout;
  final Map<String, String>? headers;
  /// 访问令牌；由 HttpClient 在每次请求时注入 Authorization 头
  String? token;
  /// 可选的外部取 token 回调（优先级高于 [token]）
  final String Function()? getToken;

  ClientConfig({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 60),
    this.headers,
    this.token,
    this.getToken,
  });
}

/// 基础响应（剥壳前的外层结构 {code?, success?, message?, data, timestamp?}）
class BaseResponse<T> {
  final int? code;
  final bool? success;
  final String message;
  final T data;
  final String? timestamp;

  const BaseResponse({
    required this.message,
    required this.data,
    this.code,
    this.success,
    this.timestamp,
  });
}

/// 错误响应（HttpClient 抛出 / 失败时使用）
class ErrorResponse implements Exception {
  final String error;
  final String message;
  final String timestamp;
  final String? stack;

  ErrorResponse({
    required this.error,
    required this.message,
    required this.timestamp,
    this.stack,
  });

  @override
  String toString() => 'MiraApiError($error): $message';
}

/// Mira SDK 异常，封装 [ErrorResponse]
class MiraApiException implements Exception {
  final ErrorResponse errorResponse;
  MiraApiException(this.errorResponse);

  String get error => errorResponse.error;
  String get message => errorResponse.message;

  @override
  String toString() => errorResponse.toString();
}
