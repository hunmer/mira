import '../client/http_client.dart';
import '../models/auth.dart';

/// 认证模块：处理登录、登出、令牌验证
class AuthModule {
  final MiraHttpClient _httpClient;

  AuthModule(this._httpClient);

  /// 用户登录，成功后自动设置 token
  Future<LoginResponse> login(String username, String password) async {
    final response = await _httpClient.post<LoginResponse>(
      '/api/auth/login',
      body: {'username': username, 'password': password},
      fromJson: (data) => LoginResponse.fromJson(data as Map<String, dynamic>),
    );
    _httpClient.setToken(response.accessToken);
    return response;
  }

  /// 用户注册
  Future<RegisterResponse> register(String username, String password) async {
    return _httpClient.post<RegisterResponse>(
      '/api/auth/register',
      body: {'username': username, 'password': password},
      fromJson: (data) => RegisterResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 用户登出，清除本地 token
  Future<void> logout() async {
    await _httpClient.post('/api/auth/logout');
    _httpClient.clearToken();
  }

  /// 验证令牌是否有效
  Future<VerifyResponse> verify() async {
    return _httpClient.get<VerifyResponse>(
      '/api/auth/verify',
      fromJson: (data) => VerifyResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 获取当前用户的权限码列表
  Future<List<String>> getCodes() async {
    return _httpClient.get<List<String>>(
      '/api/auth/codes',
      fromJson: (data) => (data as List<dynamic>).map((e) => e.toString()).toList(),
    );
  }

  /// 手动设置令牌
  AuthModule setToken(String token) {
    _httpClient.setToken(token);
    return this;
  }

  /// 清除令牌
  AuthModule clearToken() {
    _httpClient.clearToken();
    return this;
  }

  /// 是否已认证（有 token）
  bool isAuthenticated() => _httpClient.token != null;
}
