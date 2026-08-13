import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'file_filter_provider.dart';
import 'session_provider.dart';

/// 瀑布流分页大小
const int kFilesPageSize = 30;

enum FileSortField {
  importedAt('imported_at'),
  id('id'),
  name('name'),
  size('size'),
  stars('stars'),
  folder('folder_id'),
  tags('tags'),
  customFields('custom_fields');

  const FileSortField(this.value);
  final String value;
}

enum FileSortOrder {
  ascending('asc'),
  descending('desc');

  const FileSortOrder(this.value);
  final String value;
}

@immutable
class FileSortState {
  const FileSortState({
    this.field = FileSortField.importedAt,
    this.order = FileSortOrder.descending,
  });

  final FileSortField field;
  final FileSortOrder order;

  bool get isDefault =>
      field == FileSortField.importedAt && order == FileSortOrder.descending;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FileSortState && field == other.field && order == other.order;

  @override
  int get hashCode => Object.hash(field, order);
}

class FileSortNotifier extends StateNotifier<FileSortState> {
  FileSortNotifier() : super(const FileSortState());

  void setSort(FileSortState next) {
    if (next != state) state = next;
  }

  void reset() => setSort(const FileSortState());
}

final fileSortProvider = StateNotifierProvider<FileSortNotifier, FileSortState>(
  (ref) {
    return FileSortNotifier();
  },
);

/// 文件列表视图状态
@immutable
class FilesViewState {
  final List<FileData> items;
  final int total;
  final int loadedOffset;
  final bool loading;
  final bool hasMore;
  final Object? error;

  const FilesViewState({
    this.items = const [],
    this.total = 0,
    this.loadedOffset = 0,
    this.loading = false,
    this.hasMore = true,
    this.error,
  });

  FilesViewState copyWith({
    List<FileData>? items,
    int? total,
    int? loadedOffset,
    bool? loading,
    bool? hasMore,
    Object? error,
    bool clearError = false,
  }) {
    return FilesViewState(
      items: items ?? this.items,
      total: total ?? this.total,
      loadedOffset: loadedOffset ?? this.loadedOffset,
      loading: loading ?? this.loading,
      hasMore: hasMore ?? this.hasMore,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// 文件列表 AsyncNotifier。
///
/// watch：
/// - session（连接/选库变化 → 重置）
/// - fileFilter（文件夹/标签/特殊分类变化 → 重置）
///
/// 分页：offset 累加，limit=30。
/// 多文件夹：后端 folderId 单数，故发多个请求在客户端合并并按 total 取较大值。
class FilesViewNotifier extends StateNotifier<FilesViewState> {
  FilesViewNotifier(this._ref) : super(const FilesViewState()) {
    // 监听过滤与会话变化，自动重新加载首页
    _ref.listen(fileFilterProvider, (_, _) => reload());
    _ref.listen(fileSortProvider, (_, _) => reload());
    _ref.listen(
      sessionProvider.select((s) => s.library?.id),
      (_, _) => reload(),
    );
    _ref.listen(
      sessionProvider.select((s) => s.fileEventRevision),
      (_, _) => reload(),
    );
  }

  final Ref _ref;
  int _reloadGeneration = 0;

  Library? get _library => _ref.read(sessionProvider).library;
  MiraClient? get _client => _ref.read(sessionProvider).client;
  FileFilterState get _filter => _ref.read(fileFilterProvider);
  FileSortState get _sort => _ref.read(fileSortProvider);

  /// 重新加载首页（过滤/会话变化时调用）
  Future<void> reload() async {
    final generation = ++_reloadGeneration;
    if (_library == null || _client == null) {
      state = const FilesViewState();
      return;
    }
    state = const FilesViewState(loading: true);
    await _fetch(offset: 0, generation: generation);
  }

  /// 触底加载下一页
  Future<void> loadMore() async {
    if (state.loading || !state.hasMore) return;
    if (_library == null || _client == null) return;
    await _fetch(offset: state.loadedOffset, generation: _reloadGeneration);
  }

  Future<void> _fetch({required int offset, required int generation}) async {
    final lib = _library!;
    final client = _client!;
    final filter = _filter;
    final sort = _sort;

    // 起始/增量加载时仅置 loading，不清空已有 items（避免滚动跳动）
    if (offset == 0) {
      state = state.copyWith(loading: true, clearError: true);
    } else {
      state = state.copyWith(loading: true, clearError: true);
    }

    try {
      final pages = await _requestByFilter(
        client,
        lib.id,
        filter,
        sort,
        offset,
      );
      final newItems = <FileData>[];
      int maxTotal = 0;
      for (final p in pages) {
        newItems.addAll(p.result);
        if (p.total > maxTotal) maxTotal = p.total;
      }

      final merged = offset == 0 ? newItems : [...state.items, ...newItems];
      // 多请求合并去重（按文件 id）
      final deduped = _dedupById(merged);
      final nextOffset = offset + newItems.length;
      final hasMore =
          newItems.length >= _expectedPageSize(filter) &&
          deduped.length < maxTotal;

      if (generation != _reloadGeneration) return;
      state = FilesViewState(
        items: deduped,
        total: maxTotal,
        loadedOffset: nextOffset,
        loading: false,
        hasMore: hasMore,
      );
    } catch (e) {
      if (generation != _reloadGeneration) return;
      state = state.copyWith(loading: false, error: e);
    }
  }

  /// 根据过滤状态发起一个或多个请求。
  ///
  /// - 多文件夹：每选中的文件夹发一个请求，客户端合并。
  /// - 单/无文件夹：单请求。
  List<Future<FilesPage>> _buildRequests(
    MiraClient client,
    String libId,
    FileFilterState filter,
    FileSortState sort,
    int offset,
  ) {
    final files = client.files();
    final tags = filter.selectedTags.isEmpty
        ? null
        : filter.selectedTags.toList();
    final title = filter.title.trim().isEmpty ? null : filter.title.trim();
    // recycled: 0=正常（显式排除回收站，避免后端默认返回回收站素材），
    //           1=仅回收站（可与其他过滤叠加）
    final recycled = filter.recycled ? 1 : 0;

    // 特殊分类优先
    if (filter.special == SpecialFilter.uncategorized) {
      return [
        files.getFiles(
          GetFilesRequest(
            libraryId: libId,
            filters: FileFilters(
              uncategorized: true,
              tags: tags,
              title: title,
              category: filter.category,
              recycled: recycled,
              sizeMin: filter.sizeMin,
              sizeMax: filter.sizeMax,
              limit: kFilesPageSize,
              offset: offset,
              sort: sort.field.value,
              order: sort.order.value,
            ),
          ),
        ),
      ];
    }
    if (filter.special == SpecialFilter.untagged) {
      return [
        files.getFiles(
          GetFilesRequest(
            libraryId: libId,
            filters: FileFilters(
              untagged: true,
              tags: null,
              title: title,
              category: filter.category,
              recycled: recycled,
              sizeMin: filter.sizeMin,
              sizeMax: filter.sizeMax,
              limit: kFilesPageSize,
              offset: offset,
              sort: sort.field.value,
              order: sort.order.value,
            ),
          ),
        ),
      ];
    }

    if (filter.selectedFolderIds.isEmpty) {
      return [
        files.getFiles(
          GetFilesRequest(
            libraryId: libId,
            filters: FileFilters(
              tags: tags,
              title: title,
              category: filter.category,
              recycled: recycled,
              sizeMin: filter.sizeMin,
              sizeMax: filter.sizeMax,
              limit: kFilesPageSize,
              offset: offset,
              sort: sort.field.value,
              order: sort.order.value,
            ),
          ),
        ),
      ];
    }

    // 多文件夹：每个文件夹一个请求
    return filter.selectedFolderIds.map((fid) {
      return files.getFiles(
        GetFilesRequest(
          libraryId: libId,
          filters: FileFilters(
            folderId: fid,
            tags: tags,
            title: title,
            category: filter.category,
            recycled: recycled,
            sizeMin: filter.sizeMin,
            sizeMax: filter.sizeMax,
            limit: kFilesPageSize,
            offset: offset,
            sort: sort.field.value,
            order: sort.order.value,
          ),
        ),
      );
    }).toList();
  }

  Future<List<FilesPage>> _requestByFilter(
    MiraClient client,
    String libId,
    FileFilterState filter,
    FileSortState sort,
    int offset,
  ) {
    return Future.wait(_buildRequests(client, libId, filter, sort, offset));
  }

  /// 预期单页条数：多文件夹时 = pageSize * 文件夹数（合并后）
  int _expectedPageSize(FileFilterState filter) {
    final n = filter.selectedFolderIds.isEmpty
        ? 1
        : filter.selectedFolderIds.length;
    return kFilesPageSize * n;
  }

  List<FileData> _dedupById(List<FileData> src) {
    final seen = <int>{};
    final out = <FileData>[];
    for (final f in src) {
      if (seen.add(f.id)) out.add(f);
    }
    return out;
  }
}

final filesViewProvider =
    StateNotifierProvider<FilesViewNotifier, FilesViewState>((ref) {
      return FilesViewNotifier(ref);
    });
