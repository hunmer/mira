import '../client/http_client.dart';
import '../models/folder.dart';

/// 文件夹模块：CRUD 与文件归属
///
/// 后端契约：
/// - create 返回新建文件夹的 id（数字）
/// - update/delete 返回成功标志
/// - 根文件夹的 parentId 为 null（不是 0）
class FolderModule {
  final MiraHttpClient _httpClient;

  FolderModule(this._httpClient);

  /// 获取所有文件夹
  Future<List<Folder>> getAll(String libraryId) async {
    return _httpClient.get<List<Folder>>(
      '/api/folders/all',
      queryParams: {'libraryId': libraryId},
      fromJson: (data) => (data as List<dynamic>).map((e) => Folder.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  /// 查询文件夹
  Future<List<Folder>> query(QueryFolderRequest request) async {
    return _httpClient.post<List<Folder>>(
      '/api/folders/query',
      body: request.toJson(),
      fromJson: (data) => (data as List<dynamic>).map((e) => Folder.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  /// 创建文件夹，返回新 id
  Future<int> create(CreateFolderRequest request) async {
    return _httpClient.post<int>('/api/folders/create', body: request.toJson(), fromJson: (data) => (data as num).toInt());
  }

  /// 更新文件夹
  Future<void> update(UpdateFolderRequest request) async {
    await _httpClient.put('/api/folders/update', body: request.toJson());
  }

  /// 删除文件夹
  Future<void> delete(DeleteFolderRequest request) async {
    await _httpClient.delete('/api/folders/delete', body: request.toJson());
  }

  /// 为文件设置文件夹
  Future<SetFileFolderResult> setFileFolder(SetFileFolderRequest request) async {
    return _httpClient.post<SetFileFolderResult>(
      '/api/folders/file/set',
      body: request.toJson(),
      fromJson: (data) => SetFileFolderResult.fromJson(data as Map<String, dynamic>),
    );
  }

  /// 获取文件归属文件夹
  Future<FileFolderResult> getFileFolder(GetFileFolderRequest request) async {
    return _httpClient.get<FileFolderResult>(
      '/api/folders/file/${request.fileId}',
      queryParams: {'libraryId': request.libraryId},
      fromJson: (data) => FileFolderResult.fromJson(data as Map<String, dynamic>),
    );
  }

  // ==================== 便捷方法 ====================

  /// 创建文件夹（便捷）
  Future<int> createFolder(String libraryId, String title, {int? parentId, int? color, String? description}) =>
      create(CreateFolderRequest(libraryId: libraryId, title: title, parentId: parentId, color: color, description: description));

  /// 更新文件夹（便捷）
  Future<void> updateFolder(String libraryId, int id, {String? title, int? parentId, int? color}) =>
      update(UpdateFolderRequest(libraryId: libraryId, id: id, title: title, parentId: parentId, color: color));

  /// 删除文件夹（便捷）
  Future<void> deleteFolder(String libraryId, int id, {bool? deleteFiles}) =>
      delete(DeleteFolderRequest(libraryId: libraryId, id: id, deleteFiles: deleteFiles));

  /// 移动文件到文件夹
  Future<SetFileFolderResult> moveFileToFolder(String libraryId, int fileId, int folderId) =>
      setFileFolder(SetFileFolderRequest(libraryId: libraryId, fileId: fileId, folder: folderId));

  /// 将文件移出文件夹
  Future<SetFileFolderResult> removeFileFromFolder(String libraryId, int fileId) =>
      setFileFolder(SetFileFolderRequest(libraryId: libraryId, fileId: fileId, folder: null));

  /// 获取文件归属文件夹信息
  Future<FileFolderResult> getFileFolderInfo(String libraryId, int fileId) =>
      getFileFolder(GetFileFolderRequest(libraryId: libraryId, fileId: fileId));

  /// 按标题查询
  Future<List<Folder>> findByTitle(String libraryId, String title) =>
      query(QueryFolderRequest(libraryId: libraryId, query: FolderQuery(title: title)));

  /// 按颜色查询
  Future<List<Folder>> findByColor(String libraryId, int color) =>
      query(QueryFolderRequest(libraryId: libraryId, query: FolderQuery(color: color)));

  /// 获取子文件夹
  Future<List<Folder>> getSubFolders(String libraryId, int parentId) =>
      query(QueryFolderRequest(libraryId: libraryId, query: FolderQuery(parentId: parentId)));
}
