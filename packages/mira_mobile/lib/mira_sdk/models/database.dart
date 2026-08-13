/// 数据库相关模型
library;

class DatabaseTable {
  final String name;
  final String schema;
  final int rowCount;

  const DatabaseTable({required this.name, required this.schema, required this.rowCount});

  factory DatabaseTable.fromJson(Map<String, dynamic> json) {
    return DatabaseTable(
      name: json['name'] as String? ?? '',
      schema: json['schema'] as String? ?? '',
      rowCount: (json['rowCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class TableColumn {
  final String name;
  final String type;
  final int notnull;
  final int pk;
  final String? dfltValue;

  const TableColumn({
    required this.name,
    required this.type,
    required this.notnull,
    required this.pk,
    this.dfltValue,
  });

  factory TableColumn.fromJson(Map<String, dynamic> json) {
    return TableColumn(
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? '',
      notnull: (json['notnull'] as num?)?.toInt() ?? 0,
      pk: (json['pk'] as num?)?.toInt() ?? 0,
      dfltValue: json['dflt_value'] as String?,
    );
  }
}
