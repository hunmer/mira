import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http_parser/http_parser.dart';
import 'package:http/http.dart' as http;
import '../client/http_client.dart';
import '../models/file.dart';

/// 文件模块：查询、上传、下载、删除
///
/// 注意：getFiles 返回 [FilesPage]（含 result/limit/offset/total），
/// 而非裸数组；调用方需取 .result 获取文件列表。
class FileModule {
  final MiraHttpClient _httpClient;

  FileModule(this._httpClient);

  /// 获取文件列表（分页）
  Future<FilesPage> getFiles(GetFilesRequest request) async {
    return _httpClient.post<FilesPage>('/api/files/getFiles', body: request.toJson(), fromJson: (data) => FilesPage.fromJson(data as Map<String, dynamic>));
  }

  /// 获取单个文件信息
  Future<FileData> getFile(String libraryId, int fileId, {String? clientId}) async {
    return _httpClient.post<FileData>(
      '/api/files/getFile',
      body: {'libraryId': libraryId, 'fileId': fileId.toString(), if (clientId != null) 'clientId': clientId},
      fromJson: (data) => FileData.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 批量获取文件 metadata 及可用于画廊布局的宽高。
  Future<List<FileMetadataDimensions>> getMetadataByIds(String libraryId, List<int> fileIds, {String? clientId}) async {
    if (fileIds.isEmpty) return const [];
    if (fileIds.length > 1000) {
      throw ArgumentError.value(fileIds.length, 'fileIds', 'cannot contain more than 1000 items');
    }
    return _httpClient.post<List<FileMetadataDimensions>>(
      '/api/files/metadata',
      body: {'libraryId': libraryId, 'ids': fileIds.map((id) => id.toString()).toList(), 'clientId': ?clientId},
      fromJson: (data) => (data as List<dynamic>).map((item) => FileMetadataDimensions.fromJson(item as Map<String, dynamic>)).toList(),
    );
  }

  /// 获取可用于预览文件的插件查看器。
  Future<PreviewViewersResponse> getPreviewViewers(String libraryId, Object fileId, {String? clientId}) async {
    if (fileId is! String && fileId is! num) {
      throw ArgumentError.value(fileId, 'fileId', 'must be a String or number');
    }
    return _httpClient.post<PreviewViewersResponse>(
      '/api/files/getPreviewViewers',
      body: {'libraryId': libraryId, 'fileId': fileId.toString(), 'clientId': ?clientId},
      fromJson: (data) => PreviewViewersResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 获取所有文件
  Future<FilesPage> getAllFiles(String libraryId, {bool? isUrlFile}) => getFiles(GetFilesRequest(libraryId: libraryId, isUrlFile: isUrlFile));

  /// 按标签筛选
  Future<FilesPage> getFilesByTags(String libraryId, List<String> tags) => getFiles(
    GetFilesRequest(
      libraryId: libraryId,
      filters: FileFilters(tags: tags),
    ),
  );

  /// 按文件夹筛选（folderId 传 null 表示查"未分类"）
  Future<FilesPage> getFilesByFolder(String libraryId, int? folderId) {
    if (folderId == null) {
      return getFiles(GetFilesRequest(libraryId: libraryId, filters: const FileFilters(uncategorized: true)));
    }
    return getFiles(
      GetFilesRequest(
        libraryId: libraryId,
        filters: FileFilters(folderId: folderId),
      ),
    );
  }

  /// 按标题搜索
  Future<FilesPage> searchFilesByTitle(String libraryId, String title) => getFiles(
    GetFilesRequest(
      libraryId: libraryId,
      filters: FileFilters(title: title),
    ),
  );

  /// 按扩展名筛选
  Future<FilesPage> getFilesByExtension(String libraryId, String extension) => getFiles(
    GetFilesRequest(
      libraryId: libraryId,
      filters: FileFilters(extension: extension),
    ),
  );

  /// 分页获取
  Future<FilesPage> getFilesPaginated(String libraryId, {int page = 1, int pageSize = 20, FileFilters? filters}) {
    final offset = (page - 1) * pageSize;
    return getFiles(
      GetFilesRequest(
        libraryId: libraryId,
        filters: FileFilters(
          title: filters?.title,
          extension: filters?.extension,
          tags: filters?.tags,
          folderId: filters?.folderId,
          sizeMin: filters?.sizeMin,
          sizeMax: filters?.sizeMax,
          createdAfter: filters?.createdAfter,
          createdBefore: filters?.createdBefore,
          limit: pageSize,
          offset: offset,
        ),
      ),
    );
  }

  /// 下载文件
  Future<List<int>> download(String libraryId, String fileId) => _httpClient.download('/api/files/download/$libraryId/$fileId');

  /// 删除文件
  Future<void> delete(String libraryId, String fileId, {bool? moveToRecycleBin}) async {
    final query = moveToRecycleBin != null ? '?moveToRecycleBin=$moveToRecycleBin' : '';
    await _httpClient.delete('/api/files/$libraryId/$fileId$query');
  }

  /// 恢复文件（从回收站）
  Future<void> restoreFile(String libraryId, int fileId) async {
    await _httpClient.post('/api/files/recover', body: {'libraryId': libraryId, 'fileId': fileId.toString()});
  }

  /// 清空回收站
  Future<void> emptyTrash(String libraryId) async {
    await _httpClient.delete('/api/files/$libraryId/trash');
  }

  /// 重命名文件
  Future<FileData> renameFile(String libraryId, int fileId, String name) async {
    return _httpClient.post<FileData>(
      '/api/files/rename',
      body: {'libraryId': libraryId, 'fileId': fileId.toString(), 'name': name},
      fromJson: (data) => FileData.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 更新文件元数据
  Future<FileData> updateFile(String libraryId, int fileId, Map<String, dynamic> data) async {
    return _httpClient.post<FileData>('/api/files/update', body: {'libraryId': libraryId, 'fileId': fileId.toString(), 'data': data}, fromJson: (d) => FileData.fromJson(d as Map<String, dynamic>));
  }

  /// 获取附加文件列表
  Future<List<String>> getExtraFileList(String libraryId, int fileId) async {
    return _httpClient.get<List<String>>('/api/files/extra/$libraryId/$fileId', fromJson: (data) => (data as List<dynamic>).map((e) => e.toString()).toList());
  }

  /// 获取附加文件（字节）
  Future<List<int>> getExtraFile(String libraryId, int fileId, String fileName) => _httpClient.download('/api/files/extra/$libraryId/$fileId/${Uri.encodeComponent(fileName)}');

  /// 附加文件的鉴权 URL
  String getExtraFileUrl(String libraryId, int fileId, String fileName) => _httpClient.getUrl('/api/files/extra/$libraryId/$fileId/${Uri.encodeComponent(fileName)}');

  // ==================== 上传（基于 dart:io File） ====================

  /// 上传单个文件
  ///
  /// [onSendProgress]：发送进度回调 (已发送字节数, 总字节数)，可用于驱动进度条。
  Future<UploadResponse> uploadFile(File file, String libraryId, {List<String>? tags, int? folderId, void Function(int sent, int total)? onSendProgress}) async {
    return _upload([file], libraryId, tags: tags, folderId: folderId, onSendProgress: onSendProgress);
  }

  /// 上传多个文件
  Future<UploadResponse> uploadFiles(List<File> files, String libraryId, {List<String>? tags, int? folderId}) async {
    return _upload(files, libraryId, tags: tags, folderId: folderId);
  }

  Future<UploadResponse> _upload(List<File> files, String libraryId, {List<String>? tags, int? folderId, void Function(int sent, int total)? onSendProgress}) async {
    final uri = Uri.parse(_httpClient.getUrl('/api/files/upload'));
    final fileSummary = files.map((file) => '${file.path.split(Platform.pathSeparator).last} (${file.lengthSync()} bytes)').join(', ');
    debugPrint('[MiraSDK][upload] start libraryId=$libraryId files=[$fileSummary]');
    final request = _ProgressMultipartRequest('POST', uri)..onProgress = onSendProgress;
    // 移除 multipart 自动设置的 Content-Type，保留 Authorization
    final headers = <String, String>{};
    final t = _httpClient.token;
    if (t != null) headers['Authorization'] = 'Bearer $t';
    request.headers.addAll(headers);

    for (final file in files) {
      final filename = file.path.split(Platform.pathSeparator).last;
      request.files.add(await http.MultipartFile.fromPath('files', file.path, filename: filename, contentType: _guessMediaType(filename)));
    }
    request.fields['libraryId'] = libraryId;
    if (tags != null || folderId != null) {
      request.fields['payload'] = jsonEncode({
        'data': {if (tags != null) 'tags': tags, if (folderId != null) 'folder_id': folderId.toString()},
      });
    }

    final safeUri = uri.replace(queryParameters: {for (final entry in uri.queryParameters.entries) entry.key: entry.key == 'token' ? '<redacted>' : entry.value});
    debugPrint(
      '[MiraSDK][upload] request method=POST uri=$safeUri '
      'headers=${request.headers.keys.toList()} fields=${request.fields} '
      'files=${request.files.map((file) => {'field': file.field, 'filename': file.filename, 'length': file.length, 'contentType': file.contentType.toString()}).toList()} contentLength=${request.contentLength}',
    );

    try {
      final streamed = await _httpClient.rawClient.send(request).timeout(const Duration(seconds: 60));
      final response = await http.Response.fromStream(streamed);
      debugPrint(
        '[MiraSDK][upload] response status=${response.statusCode} '
        'headers=${response.headers} body=${response.body}',
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        debugPrint(
          '[MiraSDK][upload] HTTP failure status=${response.statusCode} '
          'libraryId=$libraryId body=${response.body}',
        );
        throw Exception('Upload failed: ${response.statusCode} ${response.body}');
      }
      final body = response.body.isNotEmpty ? jsonDecode(response.body) as Map<String, dynamic> : <String, dynamic>{};
      final inner = body.containsKey('data') ? (body['data'] as Map<String, dynamic>? ?? body) : body;
      final result = UploadResponse.fromJson(inner);
      final failed = result.results.where((item) => !item.success).toList();
      if (failed.isNotEmpty && failed.any((item) => !item.isDuplicate)) {
        debugPrint(
          '[MiraSDK][upload] API failure libraryId=$libraryId '
          'results=${failed.map((item) => item.raw).toList()}',
        );
      } else if (failed.isNotEmpty) {
        debugPrint(
          '[MiraSDK][upload] duplicate accepted libraryId=$libraryId '
          'results=${failed.map((item) => item.raw).toList()}',
        );
      } else {
        debugPrint('[MiraSDK][upload] success libraryId=$libraryId');
      }
      return result;
    } catch (error, stackTrace) {
      debugPrint(
        '[MiraSDK][upload] exception libraryId=$libraryId '
        'files=[$fileSummary] error=$error',
      );
      debugPrintStack(stackTrace: stackTrace);
      rethrow;
    }
  }

  MediaType _guessMediaType(String filename) {
    final ext = filename.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return MediaType('image', 'jpeg');
      case 'png':
        return MediaType('image', 'png');
      case 'gif':
        return MediaType('image', 'gif');
      case 'webp':
        return MediaType('image', 'webp');
      case 'mp4':
        return MediaType('video', 'mp4');
      case 'mp3':
        return MediaType('audio', 'mpeg');
      case 'pdf':
        return MediaType('application', 'pdf');
      default:
        return MediaType('application', 'octet-stream');
    }
  }
}

/// 带发送进度回调的 [http.MultipartRequest]。
///
/// 重写 [finalize]：用计数流包装原始字节流，按 chunk 累计已发送字节数，
/// 通过 [onProgress] 上报；总字节数取自 finalize 后的 [contentLength]。
/// [onProgress] 为 null 时直接返回原始流，不产生额外开销。
class _ProgressMultipartRequest extends http.MultipartRequest {
  _ProgressMultipartRequest(super.method, super.url);

  /// 发送进度回调：(已发送字节数, 总字节数)。
  void Function(int sent, int total)? onProgress;

  @override
  http.ByteStream finalize() {
    final stream = super.finalize();
    if (onProgress == null) return stream;
    final total = contentLength;
    var sent = 0;
    return http.ByteStream(
      stream.map((chunk) {
        sent += chunk.length;
        onProgress!(sent, total);
        return chunk;
      }),
    );
  }
}
