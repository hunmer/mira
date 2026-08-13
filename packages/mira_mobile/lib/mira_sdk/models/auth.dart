/// 认证相关模型
library;

import 'user.dart';

/// 登录请求
class LoginRequest {
  final String username;
  final String password;
  const LoginRequest({required this.username, required this.password});
  Map<String, dynamic> toJson() => {'username': username, 'password': password};
}

/// 登录响应（剥壳后，data 内层结构）
class LoginResponse {
  final String accessToken;
  /// 后端返回的 user 信息（可选，不同版本可能缺失）
  final Map<String, dynamic>? user;

  const LoginResponse({required this.accessToken, this.user});

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json['accessToken'] as String,
      user: json['user'] as Map<String, dynamic>?,
    );
  }
}

/// 注册请求
class RegisterRequest {
  final String username;
  final String password;
  const RegisterRequest({required this.username, required this.password});
  Map<String, dynamic> toJson() => {'username': username, 'password': password};
}

/// 注册响应
class RegisterResponse {
  final bool success;
  final String message;
  final Map<String, dynamic>? data;

  const RegisterResponse({required this.success, required this.message, this.data});

  factory RegisterResponse.fromJson(Map<String, dynamic> json) {
    return RegisterResponse(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: json['data'] as Map<String, dynamic>?,
    );
  }
}

/// 令牌验证响应（剥壳后）
class VerifyResponse {
  final UserInfo user;
  const VerifyResponse({required this.user});

  factory VerifyResponse.fromJson(Map<String, dynamic> json) {
    return VerifyResponse(user: UserInfo.fromJson(json['user'] as Map<String, dynamic>));
  }
}
