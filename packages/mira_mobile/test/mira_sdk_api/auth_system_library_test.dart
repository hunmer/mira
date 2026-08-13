import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
import 'test_helper.dart';

void main() {
  group('AuthModule / MiraClient', () {
    late MiraClient client;

    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('login 返回 accessToken 并自动写入 token', () async {
      final fresh = MiraClient(TestConfig.baseUrl);
      addTearDown(fresh.dispose);
      expect(fresh.auth().isAuthenticated(), isFalse);
      final res = await fresh.auth().login(TestConfig.username, TestConfig.password);
      expect(res.accessToken, isNotEmpty);
      expect(fresh.auth().isAuthenticated(), isTrue);
    });

    test('login 链式调用（client.login）返回自身', () async {
      final fresh = MiraClient(TestConfig.baseUrl);
      addTearDown(fresh.dispose);
      final ret = await fresh.login(TestConfig.username, TestConfig.password);
      expect(identical(ret, fresh), isTrue);
    });

    test('错误密码应抛异常', () async {
      final fresh = MiraClient(TestConfig.baseUrl);
      addTearDown(fresh.dispose);
      expect(
        () => fresh.auth().login(TestConfig.username, 'definitely-wrong-pwd'),
        throwsA(isA<Object>()),
      );
    });

    test('verify 返回当前登录用户', () async {
      final v = await client.auth().verify();
      expect(v.user.username, TestConfig.username);
    });

    test('getCodes 返回字符串数组', () async {
      final codes = await client.auth().getCodes();
      expect(codes, isA<List<String>>());
    });
  });

  group('SystemModule', () {
    late MiraClient client;
    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('getHealth 状态 ok 且含 version', () async {
      final h = await client.system().getHealth();
      expect(h.status, 'ok');
      expect(h.version, isNotEmpty);
      expect(h.uptime, greaterThan(0));
    });

    test('getSimpleHealth 状态 ok', () async {
      final h = await client.system().getSimpleHealth();
      expect(h.status, 'ok');
    });

    test('isServerAvailable 为 true', () async {
      expect(await client.system().isServerAvailable(), isTrue);
    });

    test('isConnected 为 true', () async {
      expect(await client.isConnected(), isTrue);
    });

    test('getVersion 与 getHealth().version 一致', () async {
      final v1 = await client.system().getVersion();
      final v2 = (await client.system().getHealth()).version;
      expect(v1, v2);
    });
  });

  group('LibraryModule', () {
    late MiraClient client;
    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('getAll 返回含目标库的数组', () async {
      final libs = await client.libraries().getAll();
      expect(libs, isNotEmpty);
      expect(libs.any((l) => l.id == TestConfig.libraryId), isTrue);
    });

    test('getById 精确获取目标库', () async {
      final lib = await client.libraries().getById(TestConfig.libraryId);
      expect(lib.id, TestConfig.libraryId);
      expect(lib.status, 'active');
    });

    test('getById 不存在的 id 抛错', () async {
      expect(() => client.libraries().getById('definitely-not-exist'), throwsA(isA<Object>()));
    });

    test('getActive 只含 active 库', () async {
      final active = await client.libraries().getActive();
      expect(active, isNotEmpty);
      expect(active.every((l) => l.status == 'active'), isTrue);
    });
  });

  group('PluginModule', () {
    late MiraClient client;
    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('getAll 返回插件数组且 status 合法', () async {
      final plugins = await client.plugins().getAll();
      expect(plugins, isNotEmpty);
      expect(plugins.every((p) => const {'active', 'inactive'}.contains(p.status)), isTrue);
    });

    test('getActive 与 getInactive 互斥并集等于全部', () async {
      final all = await client.plugins().getAll();
      final active = await client.plugins().getActive();
      final inactive = await client.plugins().getInactive();
      expect(active.length + inactive.length, all.length);
    });

    test('getByLibrary 返回按库分组结构', () async {
      final groups = await client.plugins().getByLibrary();
      expect(groups, isNotEmpty);
      expect(groups.every((g) => g.plugins is List), isTrue);
    });

    test('search 命中已知插件名', () async {
      final all = await client.plugins().getAll();
      final sample = all.first.name;
      final results = await client.plugins().search(sample);
      expect(results.any((p) => p.name == sample), isTrue);
    });
  });
}
