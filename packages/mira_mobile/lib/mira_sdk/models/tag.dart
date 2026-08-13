/// 标签相关模型
library;

import 'common.dart';

/// 标签数据
class Tag {
  final int id;
  final String title;
  final int? parentId;
  final int? color;
  final String? icon;
  final String? description;
  final String? createdAt;
  final String? updatedAt;
  /// 标签关联的非回收文件数（getAllTags 返回）
  final int? fileCount;

  const Tag({
    required this.id,
    required this.title,
    this.parentId,
    this.color,
    this.icon,
    this.description,
    this.createdAt,
    this.updatedAt,
    this.fileCount,
  });

  factory Tag.fromJson(Map<String, dynamic> json) {
    return Tag(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      parentId: json['parent_id'] != null ? (json['parent_id'] as num).toInt() : null,
      color: json['color'] != null ? (json['color'] as num).toInt() : null,
      icon: json['icon'] as String?,
      description: json['description'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      fileCount: json['file_count'] != null ? (json['file_count'] as num).toInt() : null,
    );
  }
}

/// 标签查询参数
class TagQuery {
  final String? title;
  final int? parentId;
  final int? color;
  final int? limit;
  final int? offset;

  const TagQuery({this.title, this.parentId, this.color, this.limit, this.offset});

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (title != null) m['title'] = title;
    // parent_id 为 null（根）时也要显式传，便于查询根节点
    if (parentId != null) m['parent_id'] = parentId;
    if (color != null) m['color'] = color;
    if (limit != null) m['limit'] = limit;
    if (offset != null) m['offset'] = offset;
    return m;
  }
}

class CreateTagRequest {
  final String libraryId;
  final String title;
  final int? parentId;
  final int? color;
  final String? icon;
  final String? description;

  const CreateTagRequest({
    required this.libraryId,
    required this.title,
    this.parentId,
    this.color,
    this.icon,
    this.description,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{
      'libraryId': libraryId,
      'title': title,
    };
    if (parentId != null) m['parent_id'] = parentId;
    if (color != null) m['color'] = color;
    if (icon != null) m['icon'] = icon;
    if (description != null) m['description'] = description;
    return m;
  }
}

class UpdateTagRequest {
  final String libraryId;
  final int id;
  final String? title;
  final int? parentId;
  final int? color;
  final String? icon;
  final String? description;

  const UpdateTagRequest({
    required this.libraryId,
    required this.id,
    this.title,
    this.parentId,
    this.color,
    this.icon,
    this.description,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'libraryId': libraryId, 'id': id};
    if (title != null) m['title'] = title;
    if (parentId != null) m['parent_id'] = parentId;
    if (color != null) m['color'] = color;
    if (icon != null) m['icon'] = icon;
    if (description != null) m['description'] = description;
    return m;
  }
}

class DeleteTagRequest {
  final String libraryId;
  final int id;
  const DeleteTagRequest({required this.libraryId, required this.id});
  Map<String, dynamic> toJson() => {'libraryId': libraryId, 'id': id};
}

class QueryTagRequest {
  final String libraryId;
  final TagQuery? query;
  const QueryTagRequest({required this.libraryId, this.query});
  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'libraryId': libraryId};
    if (query != null) m['query'] = query!.toJson();
    return m;
  }
}

class SetFileTagsRequest {
  final String libraryId;
  final int fileId;
  final List<String> tags;
  const SetFileTagsRequest({required this.libraryId, required this.fileId, required this.tags});
  Map<String, dynamic> toJson() => {'libraryId': libraryId, 'fileId': fileId, 'tags': tags};
}

class GetFileTagsRequest {
  final String libraryId;
  final int fileId;
  const GetFileTagsRequest({required this.libraryId, required this.fileId});
}

/// 文件标签设置结果
class SetFileTagsResult {
  final int fileId;
  final List<String> tags;
  final bool result;
  const SetFileTagsResult({required this.fileId, required this.tags, required this.result});
  factory SetFileTagsResult.fromJson(Map<String, dynamic> json) => SetFileTagsResult(
        fileId: (json['fileId'] as num).toInt(),
        tags: (json['tags'] as List<dynamic>).map((e) => e.toString()).toList(),
        result: json['result'] as bool? ?? false,
      );
}

/// 文件标签查询结果
class FileTagsResult {
  final List<String> tags;
  const FileTagsResult({required this.tags});
  factory FileTagsResult.fromJson(Map<String, dynamic> json) => FileTagsResult(
        tags: ((json['tags'] ?? const []) as List<dynamic>).map((e) => e.toString()).toList(),
      );
}

// 兼容旧命名（与 TS 版风格统一）
typedef TagResponse = BaseResponse<Tag>;
typedef TagListResponse = BaseResponse<List<Tag>>;
