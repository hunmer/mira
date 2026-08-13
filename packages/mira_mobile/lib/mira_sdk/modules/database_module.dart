import '../client/http_client.dart';
import '../models/database.dart';

/// 数据库模块
///
/// 服务端 /api/database/* 路由强制要求 libraryId 查询参数，
/// 因此本模块所有方法都需传入 libraryId。
class DatabaseModule {
  final MiraHttpClient _httpClient;

  DatabaseModule(this._httpClient);

  /// 获取所有表信息
  Future<List<DatabaseTable>> getTables(String libraryId) async {
    return _httpClient.get<List<DatabaseTable>>(
      '/api/database/tables',
      queryParams: {'libraryId': libraryId},
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => DatabaseTable.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// 获取表数据
  Future<List<Map<String, dynamic>>> getTableData(String libraryId, String tableName) async {
    return _httpClient.get<List<Map<String, dynamic>>>(
      '/api/database/tables/$tableName/data',
      queryParams: {'libraryId': libraryId},
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
    );
  }

  /// 获取表结构
  Future<List<TableColumn>> getTableSchema(String libraryId, String tableName) async {
    return _httpClient.get<List<TableColumn>>(
      '/api/database/tables/$tableName/schema',
      queryParams: {'libraryId': libraryId},
      fromJson: (data) => (data as List<dynamic>)
          .map((e) => TableColumn.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// 表是否存在
  Future<bool> tableExists(String libraryId, String tableName) async {
    try {
      final tables = await getTables(libraryId);
      return tables.any((t) => t.name == tableName);
    } catch (_) {
      return false;
    }
  }

  /// 表行数
  Future<int> getTableRowCount(String libraryId, String tableName) async {
    final tables = await getTables(libraryId);
    final t = tables.firstWhere((e) => e.name == tableName, orElse: () => const DatabaseTable(name: '', schema: '', rowCount: 0));
    return t.rowCount;
  }

  /// 主键列
  Future<List<TableColumn>> getPrimaryKeys(String libraryId, String tableName) async =>
      (await getTableSchema(libraryId, tableName)).where((c) => c.pk == 1).toList();

  /// 非空列
  Future<List<TableColumn>> getNotNullColumns(String libraryId, String tableName) async =>
      (await getTableSchema(libraryId, tableName)).where((c) => c.notnull == 1).toList();

  /// 表基本信息列表
  Future<List<({String name, int rowCount})>> getTablesInfo(String libraryId) async =>
      (await getTables(libraryId)).map((t) => (name: t.name, rowCount: t.rowCount)).toList();

  /// 搜索表名
  Future<List<DatabaseTable>> searchTables(String libraryId, String keyword) async {
    final k = keyword.toLowerCase();
    return (await getTables(libraryId)).where((t) => t.name.toLowerCase().contains(k)).toList();
  }

  /// 非空表
  Future<List<DatabaseTable>> getNonEmptyTables(String libraryId) async =>
      (await getTables(libraryId)).where((t) => t.rowCount > 0).toList();

  /// 空表
  Future<List<DatabaseTable>> getEmptyTables(String libraryId) async =>
      (await getTables(libraryId)).where((t) => t.rowCount == 0).toList();

  /// 按行数排序
  Future<List<DatabaseTable>> getTablesByRowCount(String libraryId, {bool desc = true}) async {
    final tables = await getTables(libraryId);
    tables.sort((a, b) => desc ? b.rowCount.compareTo(a.rowCount) : a.rowCount.compareTo(b.rowCount));
    return tables;
  }
}
