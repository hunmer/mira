import 'package:mira_mobile/mira_sdk/mira_sdk.dart';

/// 集成测试公共辅助
///
/// 通过环境变量配置目标服务器与凭据，默认连接本机运行中的 mira-app-server。
///   - MIRA_BASE_URL   服务器地址（默认 http://localhost:8081）
///   - MIRA_USERNAME   登录用户名（默认 admin）
///   - MIRA_PASSWORD   登录密码  （默认 admin123）
///   - MIRA_LIBRARY_ID 测试用素材库ID（默认 1779810479725）
class TestConfig {
  static final String baseUrl = const String.fromEnvironment('MIRA_BASE_URL', defaultValue: 'http://localhost:8081');
  static final String username = const String.fromEnvironment('MIRA_USERNAME', defaultValue: 'admin');
  static final String password = const String.fromEnvironment('MIRA_PASSWORD', defaultValue: 'admin123');
  static final String libraryId = const String.fromEnvironment('MIRA_LIBRARY_ID', defaultValue: '1779810479725');

  /// 测试数据前缀，便于按前缀查询并清理
  static const String testPrefix = '__sdk_test__';
}

/// 创建一个已登录的 MiraClient
Future<MiraClient> createLoggedInClient() async {
  final client = MiraClient(TestConfig.baseUrl);
  await client.login(TestConfig.username, TestConfig.password);
  return client;
}

/// 生成带时间戳+随机数的唯一临时名
String uniqueName([String base = 'item']) {
  final ts = DateTime.now().millisecondsSinceEpoch;
  final rand = DateTime.now().microsecond % 0x10000;
  return '${TestConfig.testPrefix}${base}_$ts$rand';
}

/// 检测服务器是否可达（不可用时调用方 skip 整组测试）
Future<bool> isServerReachable() async {
  final client = MiraClient(TestConfig.baseUrl);
  try {
    return await client.isConnected();
  } catch (_) {
    return false;
  } finally {
    client.dispose();
  }
}

/// 按 testPrefix 清理残留的 tag / folder（folder 需子先父后）
Future<void> cleanupByPrefix(MiraClient client, String kind) async {
  try {
    if (kind == 'tag') {
      final tags = await client.tags().getAll(TestConfig.libraryId);
      await Future.wait(tags
          .where((t) => t.title.startsWith(TestConfig.testPrefix))
          .map((t) => client.tags().deleteTag(TestConfig.libraryId, t.id)));
    } else {
      final folders = await client.folders().getAll(TestConfig.libraryId);
      final leftovers = folders.where((f) => f.title.startsWith(TestConfig.testPrefix)).toList();
      // 子先父后，避免孤儿残留
      leftovers.sort((a, b) {
        if (a.parentId == null && b.parentId != null) return 1;
        if (a.parentId != null && b.parentId == null) return -1;
        return 0;
      });
      for (final f in leftovers) {
        try {
          await client.folders().deleteFolder(TestConfig.libraryId, f.id);
        } catch (_) {}
      }
    }
  } catch (_) {
    // 清理是兜底，失败不影响测试结论
  }
}
