/// 用户相关模型
library;

/// 当前登录用户信息（/api/user/info 剥壳后的 data）
class UserInfo {
  final int id;
  final String username;
  final String role;
  final String realName;
  final List<String> roles;
  final String avatar;
  final String desc;
  final String homePath;
  final bool isActive;

  const UserInfo({
    required this.id,
    required this.username,
    required this.role,
    required this.realName,
    required this.roles,
    required this.avatar,
    required this.desc,
    required this.homePath,
    required this.isActive,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: (json['id'] as num).toInt(),
      username: json['username'] as String? ?? '',
      role: json['role'] as String? ?? '',
      realName: json['realName'] as String? ?? '',
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e as String).toList() ?? const [],
      avatar: json['avatar'] as String? ?? '',
      desc: json['desc'] as String? ?? '',
      homePath: json['homePath'] as String? ?? '',
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

/// 更新用户信息请求
class UpdateUserRequest {
  final String? realName;
  final String? avatar;
  const UpdateUserRequest({this.realName, this.avatar});

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (realName != null) m['realName'] = realName;
    if (avatar != null) m['avatar'] = avatar;
    return m;
  }
}
