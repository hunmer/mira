import '../client/http_client.dart';
import '../models/tag.dart';

/// 标签模块：CRUD 与文件标签关联
///
/// 后端契约：
/// - create 返回新建标签的 id（数字）
/// - update/delete 返回成功标志（由 HttpClient 剥壳后，调用方只关心不抛错）
class TagModule {
  final MiraHttpClient _httpClient;

  TagModule(this._httpClient);

  /// 获取所有标签
  Future<List<Tag>> getAll(String libraryId) async {
    return _httpClient.get<List<Tag>>(
      '/api/tags/all',
      queryParams: {'libraryId': libraryId},
      fromJson: (data) => (data as List<dynamic>).map((e) => Tag.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  /// 查询标签
  Future<List<Tag>> query(QueryTagRequest request) async {
    return _httpClient.post<List<Tag>>(
      '/api/tags/query',
      body: request.toJson(),
      fromJson: (data) => (data as List<dynamic>).map((e) => Tag.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  /// 创建标签，返回新 id
  Future<int> create(CreateTagRequest request) async {
    return _httpClient.post<int>('/api/tags/create', body: request.toJson(), fromJson: (data) => (data as num).toInt());
  }

  /// 更新标签
  Future<void> update(UpdateTagRequest request) async {
    await _httpClient.put('/api/tags/update', body: request.toJson());
  }

  /// 删除标签
  Future<void> delete(DeleteTagRequest request) async {
    await _httpClient.delete('/api/tags/delete', body: request.toJson());
  }

  /// 为文件设置标签
  Future<SetFileTagsResult> setFileTags(SetFileTagsRequest request) async {
    return _httpClient.post<SetFileTagsResult>(
      '/api/tags/file/set',
      body: request.toJson(),
      fromJson: (data) => SetFileTagsResult.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 获取文件标签
  Future<FileTagsResult> getFileTags(GetFileTagsRequest request) async {
    return _httpClient.get<FileTagsResult>(
      '/api/tags/file/${request.fileId}',
      queryParams: {'libraryId': request.libraryId},
      fromJson: (data) => FileTagsResult.fromJson(data as Map<String, dynamic>),
    );
  }

  // ==================== 便捷方法 ====================

  /// 创建标签（便捷）
  Future<int> createTag(String libraryId, String title, {int? parentId, int? color, String? description}) =>
      create(CreateTagRequest(libraryId: libraryId, title: title, parentId: parentId, color: color, description: description));

  /// 更新标签（便捷）
  Future<void> updateTag(String libraryId, int id, {String? title, int? parentId, int? color}) =>
      update(UpdateTagRequest(libraryId: libraryId, id: id, title: title, parentId: parentId, color: color));

  /// 删除标签（便捷）
  Future<void> deleteTag(String libraryId, int id) => delete(DeleteTagRequest(libraryId: libraryId, id: id));

  /// 为文件添加标签
  Future<SetFileTagsResult> addTagsToFile(String libraryId, int fileId, List<String> tags) =>
      setFileTags(SetFileTagsRequest(libraryId: libraryId, fileId: fileId, tags: tags));

  /// 获取文件标签
  Future<FileTagsResult> getFileTagList(String libraryId, int fileId) =>
      getFileTags(GetFileTagsRequest(libraryId: libraryId, fileId: fileId));

  /// 按标题查询
  Future<List<Tag>> findByTitle(String libraryId, String title) =>
      query(QueryTagRequest(libraryId: libraryId, query: TagQuery(title: title)));

  /// 按颜色查询
  Future<List<Tag>> findByColor(String libraryId, int color) =>
      query(QueryTagRequest(libraryId: libraryId, query: TagQuery(color: color)));

  /// 获取子标签
  Future<List<Tag>> getSubTags(String libraryId, int parentId) =>
      query(QueryTagRequest(libraryId: libraryId, query: TagQuery(parentId: parentId)));
}
