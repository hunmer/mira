import 'package:flutter_test/flutter_test.dart';
import 'package:mira_mobile/mira_sdk/mira_sdk.dart';
import 'test_helper.dart';

void main() {
  group('DatabaseModule（带 libraryId）', () {
    late MiraClient client;
    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('getTables 含 files/folders/tags 三张表', () async {
      final tables = await client.database().getTables(TestConfig.libraryId);
      expect(tables, isNotEmpty);
      final names = tables.map((t) => t.name).toSet();
      expect(names, containsAll(<String>['files', 'folders', 'tags']));
    });

    test('tableExists 存在返回 true，不存在返回 false', () async {
      expect(await client.database().tableExists(TestConfig.libraryId, 'files'), isTrue);
      expect(await client.database().tableExists(TestConfig.libraryId, '__no_such_table__'), isFalse);
    });

    test('getTableRowCount files 大于 0', () async {
      final count = await client.database().getTableRowCount(TestConfig.libraryId, 'files');
      expect(count, greaterThan(0));
    });

    test('getTableSchema files 含 id 列', () async {
      final schema = await client.database().getTableSchema(TestConfig.libraryId, 'files');
      expect(schema, isNotEmpty);
      expect(schema.any((c) => c.name == 'id'), isTrue);
    });

    test('getPrimaryKeys 识别主键', () async {
      final pks = await client.database().getPrimaryKeys(TestConfig.libraryId, 'files');
      expect(pks, isNotEmpty);
      expect(pks.every((c) => c.pk == 1), isTrue);
    });

    test('searchTables 按关键词过滤', () async {
      final hits = await client.database().searchTables(TestConfig.libraryId, 'file');
      expect(hits, isNotEmpty);
      expect(hits.every((t) => t.name.toLowerCase().contains('file')), isTrue);
    });

    test('getNonEmptyTables / getEmptyTables 互斥', () async {
      final nonEmpty = await client.database().getNonEmptyTables(TestConfig.libraryId);
      final empty = await client.database().getEmptyTables(TestConfig.libraryId);
      final all = await client.database().getTables(TestConfig.libraryId);
      expect(nonEmpty.length + empty.length, all.length);
    });

    test('getTablesByRowCount desc 排序正确', () async {
      final sorted = await client.database().getTablesByRowCount(TestConfig.libraryId, desc: true);
      for (var i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].rowCount, greaterThanOrEqualTo(sorted[i].rowCount));
      }
    });
  });

  group('DeviceModule', () {
    late MiraClient client;
    setUpAll(() async {
      client = await createLoggedInClient();
    });
    tearDownAll(() => client.dispose());

    test('getAll 返回 DevicesResponse（无设备时 data 为空 map）', () async {
      final resp = await client.devices().getAll();
      expect(resp.success, isTrue);
      // data 始终是 map（可能为空）
      expect(resp.data, isNotNull);
    });

    test('getStats 返回统计数据', () async {
      final stats = await client.devices().getStats();
      expect(stats.success, isTrue);
      expect(stats.data.totalConnections, isA<int>());
    });

    test('getConnectedDevices 返回列表（可能为空）', () async {
      final devices = await client.devices().getConnectedDevices();
      expect(devices, isA<List>());
    });
  });
}
