import '../client/http_client.dart';
import '../models/user.dart';

/// 用户模块：获取和更新当前登录用户信息
class UserModule {
  final MiraHttpClient _httpClient;

  UserModule(this._httpClient);

  /// 获取当前登录用户详情
  Future<UserInfo> getInfo() async {
    return _httpClient.get<UserInfo>(
      '/api/user/info',
      fromJson: (data) => UserInfo.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 更新当前登录用户信息
  Future<void> updateInfo(UpdateUserRequest data) async {
    await _httpClient.put('/api/user/info', body: data.toJson());
  }

  /// 更新真实姓名
  Future<void> updateRealName(String realName) => updateInfo(UpdateUserRequest(realName: realName));

  /// 更新头像
  Future<void> updateAvatar(String avatar) => updateInfo(UpdateUserRequest(avatar: avatar));

  /// 批量更新资料
  Future<void> updateProfile({String? realName, String? avatar}) =>
      updateInfo(UpdateUserRequest(realName: realName, avatar: avatar));
}
