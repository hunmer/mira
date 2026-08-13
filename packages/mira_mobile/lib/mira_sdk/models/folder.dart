/// 文件夹相关模型
library;

import 'common.dart';

/// 文件夹数据（根节点 parentId 为 null）
class Folder {
  final int id;
  final String title;
  final int? parentId;
  final String? path;
  final int? color;
  final String? icon;
  final String? description;
  final String? createdAt;
  final String? updatedAt;
  final int? fileCount;

  const Folder({
    required this.id,
    required this.title,
    this.parentId,
    this.path,
    this.color,
    this.icon,
    this.description,
    this.createdAt,
    this.updatedAt,
    this.fileCount,
  });

  factory Folder.fromJson(Map<String, dynamic> json) {
    return Folder(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      parentId: json['parent_id'] != null ? (json['parent_id'] as num).toInt() : null,
      path: json['path'] as String?,
      color: json['color'] != null ? (json['color'] as num).toInt() : null,
      icon: json['icon'] as String?,
      description: json['description'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      fileCount: json['file_count'] != null ? (json['file_count'] as num).toInt() : null,
    );
  }
}

class FolderQuery {
  final String? title;
  final int? parentId;
  final int? color;
  final int? limit;
  final int? offset;

  const FolderQuery({this.title, this.parentId, this.color, this.limit, this.offset});

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (title != null) m['title'] = title;
    if (parentId != null) m['parent_id'] = parentId;
    if (color != null) m['color'] = color;
    if (limit != null) m['limit'] = limit;
    if (offset != null) m['offset'] = offset;
    return m;
  }
}

class CreateFolderRequest {
  final String libraryId;
  final String title;
  final int? parentId;
  final int? color;
  final String? icon;
  final String? description;

  const CreateFolderRequest({
    required this.libraryId,
    required this.title,
    this.parentId,
    this.color,
    this.icon,
    this.description,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'libraryId': libraryId, 'title': title};
    if (parentId != null) m['parent_id'] = parentId;
    if (color != null) m['color'] = color;
    if (icon != null) m['icon'] = icon;
    if (description != null) m['description'] = description;
    return m;
  }
}

class UpdateFolderRequest {
  final String libraryId;
  final int id;
  final String? title;
  final int? parentId;
  final int? color;
  final String? icon;
  final String? description;

  const UpdateFolderRequest({
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

class DeleteFolderRequest {
  final String libraryId;
  final int id;
  final bool? deleteFiles;
  const DeleteFolderRequest({required this.libraryId, required this.id, this.deleteFiles});
  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'libraryId': libraryId, 'id': id};
    if (deleteFiles != null) m['deleteFiles'] = deleteFiles;
    return m;
  }
}

class QueryFolderRequest {
  final String libraryId;
  final FolderQuery? query;
  const QueryFolderRequest({required this.libraryId, this.query});
  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'libraryId': libraryId};
    if (query != null) m['query'] = query!.toJson();
    return m;
  }
}

class SetFileFolderRequest {
  final String libraryId;
  final int fileId;
  final int? folder; // null 表示移出文件夹
  const SetFileFolderRequest({required this.libraryId, required this.fileId, required this.folder});
  Map<String, dynamic> toJson() => {'libraryId': libraryId, 'fileId': fileId, 'folder': folder};
}

class GetFileFolderRequest {
  final String libraryId;
  final int fileId;
  const GetFileFolderRequest({required this.libraryId, required this.fileId});
}

/// 文件夹设置结果
class SetFileFolderResult {
  final int fileId;
  final int? folder;
  final bool result;
  const SetFileFolderResult({required this.fileId, required this.folder, required this.result});
  factory SetFileFolderResult.fromJson(Map<String, dynamic> json) => SetFileFolderResult(
        fileId: (json['fileId'] as num).toInt(),
        folder: json['folder'] != null ? (json['folder'] as num).toInt() : null,
        result: json['result'] as bool? ?? false,
      );
}

/// 文件归属文件夹查询结果
class FileFolderResult {
  final int? folder;
  const FileFolderResult({required this.folder});
  factory FileFolderResult.fromJson(Map<String, dynamic> json) => FileFolderResult(
        folder: json['folder'] != null ? (json['folder'] as num).toInt() : null,
      );
}

typedef FolderResponse = BaseResponse<Folder>;
typedef FolderListResponse = BaseResponse<List<Folder>>;
