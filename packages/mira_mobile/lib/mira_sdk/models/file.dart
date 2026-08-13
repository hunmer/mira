/// 文件相关模型
library;

import 'dart:convert';

/// 文件查询过滤参数
///
/// 后端 getFiles 读取的 key 约定（见 mira-app-core FileOperations.ts）：
/// - `folder`：数字=按文件夹过滤；null=未分类（folder_id IS NULL OR =0）
/// - `tags`：数组=按标签过滤；null=未标签
/// - `category`：image | video | audio（后端按扩展名集合映射）
/// - `recycled`：0=正常（默认），1=回收站
class FileFilters {
  final String? title;
  final String? extension;
  final List<String>? tags;

  /// 文件夹 id；为 null 且 [uncategorized] 为 true 时表示查"未分类"
  final int? folderId;

  /// 是否显式查询"未分类"文件（发 folder: null）
  final bool uncategorized;

  /// 是否显式查询"未标签"文件（发 tags: null）
  final bool untagged;

  /// 分类过滤：image | video | audio
  final String? category;

  /// 0=正常（默认），1=回收站
  final int? recycled;
  final int? sizeMin;
  final int? sizeMax;
  final String? createdAfter;
  final String? createdBefore;
  final int? limit;
  final int? offset;
  final String? sort;
  final String? order;

  const FileFilters({
    this.title,
    this.extension,
    this.tags,
    this.folderId,
    this.uncategorized = false,
    this.untagged = false,
    this.category,
    this.recycled,
    this.sizeMin,
    this.sizeMax,
    this.createdAfter,
    this.createdBefore,
    this.limit,
    this.offset,
    this.sort,
    this.order,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (title != null) m['title'] = title;
    if (extension != null) m['extension'] = extension;
    // tags: untagged 优先（发 null 表示未标签）；否则发数组
    if (untagged) {
      m['tags'] = null;
    } else if (tags != null) {
      m['tags'] = tags;
    }
    // folder: 注意后端 key 是 folder（不是 folder_id）
    // uncategorized 优先（发 null 表示未分类）；否则发具体 id
    if (uncategorized) {
      m['folder'] = null;
    } else if (folderId != null) {
      m['folder'] = folderId;
    }
    if (category != null) m['category'] = category;
    if (recycled != null) m['recycled'] = recycled;
    if (sizeMin != null) m['size_min'] = sizeMin;
    if (sizeMax != null) m['size_max'] = sizeMax;
    if (createdAfter != null) m['created_after'] = createdAfter;
    if (createdBefore != null) m['created_before'] = createdBefore;
    if (limit != null) m['limit'] = limit;
    if (offset != null) m['offset'] = offset;
    if (sort != null) m['sort'] = sort;
    if (order != null) m['order'] = order;
    return m;
  }
}

class GetFilesRequest {
  final String libraryId;
  final FileFilters? filters;
  final bool? isUrlFile;
  final String? clientId;

  const GetFilesRequest({required this.libraryId, this.filters, this.isUrlFile, this.clientId});

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'libraryId': libraryId};
    if (filters != null) m['filters'] = filters!.toJson();
    if (isUrlFile != null) m['isUrlFile'] = isUrlFile;
    if (clientId != null) m['clientId'] = clientId;
    return m;
  }
}

/// 文件数据（后端真实字段；tags 为 JSON 字符串）
class FileData {
  final int id;
  final String name;
  final String path;
  final int size;
  final String extension;
  final int folderId;
  final String folderName;
  final String filePath;
  final String thumbPath;
  final int recycled;
  final String tags; // JSON 字符串，如 "[]"
  final int uploader;
  final int createdAt;
  final int importedAt;

  const FileData({
    required this.id,
    required this.name,
    required this.path,
    required this.size,
    required this.extension,
    required this.folderId,
    required this.folderName,
    required this.filePath,
    required this.thumbPath,
    required this.recycled,
    required this.tags,
    required this.uploader,
    required this.createdAt,
    required this.importedAt,
  });

  factory FileData.fromJson(Map<String, dynamic> json) {
    return FileData(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      path: json['path'] as String? ?? '',
      size: (json['size'] as num?)?.toInt() ?? 0,
      extension: json['extension'] as String? ?? '',
      folderId: json['folder_id'] != null ? (json['folder_id'] as num).toInt() : 0,
      folderName: json['folder_name'] as String? ?? '',
      filePath: json['file_path'] as String? ?? '',
      thumbPath: json['thumb_path'] as String? ?? '',
      recycled: (json['recycled'] as num?)?.toInt() ?? 0,
      tags: json['tags']?.toString() ?? '[]',
      uploader: (json['uploader'] as num?)?.toInt() ?? 0,
      createdAt: (json['created_at'] as num?)?.toInt() ?? 0,
      importedAt: (json['imported_at'] as num?)?.toInt() ?? 0,
    );
  }

  /// 解析 tags JSON 字符串为列表（后端 tags 字段是 JSON 字符串，如 "[]"）
  List<dynamic> parsedTags() {
    if (tags.isEmpty) return const [];
    try {
      final decoded = jsonDecode(tags);
      return decoded is List ? decoded : const [];
    } catch (_) {
      return const [];
    }
  }
}

/// 批量 metadata 查询结果，宽高缺失时由调用方使用媒体缩略图兜底。
class FileMetadataDimensions {
  final int id;
  final Map<String, dynamic>? metadata;
  final double? width;
  final double? height;

  const FileMetadataDimensions({required this.id, this.metadata, this.width, this.height});

  factory FileMetadataDimensions.fromJson(Map<String, dynamic> json) {
    double? dimension(dynamic value) => value is num ? value.toDouble() : double.tryParse('$value');
    final width = dimension(json['width']);
    final height = dimension(json['height']);
    final rawId = json['id'];
    return FileMetadataDimensions(
      id: rawId is num ? rawId.toInt() : int.tryParse('$rawId') ?? 0,
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata'] as Map) : null,
      width: width,
      height: height,
    );
  }
}

/// /api/files/getFiles 响应（剥壳后；含分页元信息）
class FilesPage {
  final List<FileData> result;
  final int limit;
  final int offset;
  final int total;

  const FilesPage({required this.result, required this.limit, required this.offset, required this.total});

  factory FilesPage.fromJson(Map<String, dynamic> json) {
    return FilesPage(
      result: ((json['result'] ?? const []) as List<dynamic>).map((e) => FileData.fromJson(e as Map<String, dynamic>)).toList(),
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }
}

/// 可用于预览文件的插件查看器。
class PreviewViewer {
  final String viewerId;
  final String pluginId;
  final String pluginName;
  final String serverPluginName;
  final String title;
  final String iframeUrl;
  final int priority;
  final String? icon;

  const PreviewViewer({
    required this.viewerId,
    required this.pluginId,
    required this.pluginName,
    required this.serverPluginName,
    required this.title,
    required this.iframeUrl,
    required this.priority,
    this.icon,
  });

  factory PreviewViewer.fromJson(Map<String, dynamic> json) => PreviewViewer(
    viewerId: json['viewerId'] as String? ?? '',
    pluginId: json['pluginId'] as String? ?? '',
    pluginName: json['pluginName'] as String? ?? '',
    serverPluginName: json['serverPluginName'] as String? ?? '',
    title: json['title'] as String? ?? '',
    iframeUrl: json['iframeUrl'] as String? ?? '',
    priority: (json['priority'] as num?)?.toInt() ?? 0,
    icon: json['icon'] as String?,
  );
}

/// /api/files/getPreviewViewers 响应。
class PreviewViewersResponse {
  final String libraryId;
  final String fileId;
  final List<PreviewViewer> viewers;

  const PreviewViewersResponse({required this.libraryId, required this.fileId, required this.viewers});

  factory PreviewViewersResponse.fromJson(Map<String, dynamic> json) => PreviewViewersResponse(
    libraryId: json['libraryId']?.toString() ?? '',
    fileId: json['fileId']?.toString() ?? '',
    viewers: ((json['viewers'] ?? const []) as List<dynamic>).map((item) => PreviewViewer.fromJson(item as Map<String, dynamic>)).toList(),
  );
}

class UploadResult {
  final bool success;
  final String file;
  final String? error;
  final Object? result;
  final Map<String, dynamic> raw;

  /// 服务端将重复文件作为已处理结果返回（success=false、operation=duplicate）。
  bool get isDuplicate => raw['operation'] == 'duplicate' || (result is Map<String, dynamic> && (result as Map<String, dynamic>)['duplicate'] == true);

  /// 上传请求已被服务端处理，可视为幂等成功。
  bool get isAccepted => success || isDuplicate;

  const UploadResult({required this.success, required this.file, this.error, this.result, this.raw = const <String, dynamic>{}});

  factory UploadResult.fromJson(Map<String, dynamic> json) {
    return UploadResult(
      success: json['success'] as bool? ?? false,
      file: json['file']?.toString() ?? '',
      error: json['error']?.toString(),
      result: json['result'],
      raw: Map<String, dynamic>.unmodifiable(json),
    );
  }
}

class UploadResponse {
  final List<UploadResult> results;

  const UploadResponse({required this.results});

  factory UploadResponse.fromJson(Map<String, dynamic> json) =>
      UploadResponse(results: ((json['results'] ?? const []) as List<dynamic>).map((e) => UploadResult.fromJson(e as Map<String, dynamic>)).toList());
}
