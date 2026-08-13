import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kFileFilterPrefKey = 'file_filter';

/// 特殊过滤分类（与文件夹/标签多选互斥使用）。
enum SpecialFilter { all, uncategorized, untagged }

/// 文件过滤器状态：支持文件夹多选 + 标签多选 + 特殊分类 + 标题/大小/类别。
///
/// 后端契约：FileFilters.folderId 是单个，tags 是数组。
/// 多文件夹选择时由 filesProvider 发多个请求合并；多标签可直接传入数组。
@immutable
class FileFilterState {
  /// 选中的文件夹 id 集合（多选）
  final Set<int> selectedFolderIds;

  /// 选中的标签 title 集合（多选，后端按 title 关联）
  final Set<String> selectedTags;

  /// 特殊分类（全部/未分类/未标签）
  final SpecialFilter special;

  /// 标题关键词（空串=不过滤）
  final String title;

  /// 类别：'video' | 'audio' | 'image'
  final String? category;

  /// 大小预设 id（'small'|'medium'|'large'|'huge'|'custom'），仅用于 UI 回显
  final String? sizePreset;

  /// 文件大小下限（字节，含）
  final int? sizeMin;

  /// 文件大小上限（字节，含）
  final int? sizeMax;

  /// 是否仅查看回收站（可与其他过滤叠加，不参与 special 的互斥）。
  final bool recycled;

  const FileFilterState({
    this.selectedFolderIds = const {},
    this.selectedTags = const {},
    this.special = SpecialFilter.all,
    this.title = '',
    this.category,
    this.sizePreset,
    this.sizeMin,
    this.sizeMax,
    this.recycled = false,
  });

  factory FileFilterState.fromJson(Map<String, dynamic> json) {
    final specialName = json['special'] as String?;
    return FileFilterState(
      selectedFolderIds:
          (json['selectedFolderIds'] as List<dynamic>? ?? const [])
              .whereType<num>()
              .map((id) => id.toInt())
              .toSet(),
      selectedTags: (json['selectedTags'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toSet(),
      special: SpecialFilter.values.firstWhere(
        (value) => value.name == specialName,
        orElse: () => SpecialFilter.all,
      ),
      title: json['title'] as String? ?? '',
      category: json['category'] as String?,
      sizePreset: json['sizePreset'] as String?,
      sizeMin: (json['sizeMin'] as num?)?.toInt(),
      sizeMax: (json['sizeMax'] as num?)?.toInt(),
      // 兼容旧版：recycled 曾是 SpecialFilter 枚举值，现已迁移为独立字段。
      recycled: specialName == 'recycled' ||
          (json['recycled'] as bool? ?? false),
    );
  }

  Map<String, dynamic> toJson() => {
    'selectedFolderIds': selectedFolderIds.toList(),
    'selectedTags': selectedTags.toList(),
    'special': special.name,
    'title': title,
    'category': category,
    'sizePreset': sizePreset,
    'sizeMin': sizeMin,
    'sizeMax': sizeMax,
    'recycled': recycled,
  };

  FileFilterState copyWith({
    Set<int>? selectedFolderIds,
    Set<String>? selectedTags,
    SpecialFilter? special,
    String? title,
    String? category,
    String? sizePreset,
    int? sizeMin,
    int? sizeMax,
    bool? recycled,
    // 用于显式把可空字段清回 null（copyWith 默认保留旧值）
    bool clearCategory = false,
    bool clearSize = false,
  }) {
    return FileFilterState(
      selectedFolderIds: selectedFolderIds ?? this.selectedFolderIds,
      selectedTags: selectedTags ?? this.selectedTags,
      special: special ?? this.special,
      title: title ?? this.title,
      category: clearCategory ? null : (category ?? this.category),
      sizePreset: clearSize ? null : (sizePreset ?? this.sizePreset),
      sizeMin: clearSize ? null : (sizeMin ?? this.sizeMin),
      sizeMax: clearSize ? null : (sizeMax ?? this.sizeMax),
      recycled: recycled ?? this.recycled,
    );
  }

  /// 是否处于激活过滤状态（影响 filesProvider 是否合并多请求）
  bool get isActive =>
      selectedFolderIds.isNotEmpty ||
      selectedTags.isNotEmpty ||
      special != SpecialFilter.all ||
      title.trim().isNotEmpty ||
      category != null ||
      sizeMin != null ||
      sizeMax != null ||
      recycled;

  /// 深比较所有字段（含两个 Set）。相等的状态变更不会触发 filesProvider.reload()。
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FileFilterState &&
          setEquals(selectedFolderIds, other.selectedFolderIds) &&
          setEquals(selectedTags, other.selectedTags) &&
          special == other.special &&
          title == other.title &&
          category == other.category &&
          sizePreset == other.sizePreset &&
          sizeMin == other.sizeMin &&
          sizeMax == other.sizeMax &&
          recycled == other.recycled;

  @override
  int get hashCode => Object.hash(
    Object.hashAllUnordered(selectedFolderIds),
    Object.hashAllUnordered(selectedTags),
    special,
    title,
    category,
    sizePreset,
    sizeMin,
    sizeMax,
    recycled,
  );
}

class FileFilterNotifier extends StateNotifier<FileFilterState> {
  FileFilterNotifier() : super(const FileFilterState());

  Future<void> _persistence = Future.value();

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_kFileFilterPrefKey);
    if (saved == null) return;
    try {
      state = FileFilterState.fromJson(
        jsonDecode(saved) as Map<String, dynamic>,
      );
    } on FormatException {
      await prefs.remove(_kFileFilterPrefKey);
    } on TypeError {
      await prefs.remove(_kFileFilterPrefKey);
    }
  }

  void _update(FileFilterState next) {
    if (next == state) return;
    state = next;
    _persistence = _persistence
        .then((_) async {
          final prefs = await SharedPreferences.getInstance();
          if (next.isActive) {
            await prefs.setString(
              _kFileFilterPrefKey,
              jsonEncode(next.toJson()),
            );
          } else {
            await prefs.remove(_kFileFilterPrefKey);
          }
        })
        .catchError((Object _) {});
    unawaited(_persistence);
  }

  void toggleFolder(int id) {
    final next = Set<int>.from(state.selectedFolderIds);
    if (!next.add(id)) next.remove(id);
    _update(
      state.copyWith(selectedFolderIds: next, special: SpecialFilter.all),
    );
  }

  void toggleTag(String title) {
    final next = Set<String>.from(state.selectedTags);
    if (!next.add(title)) next.remove(title);
    _update(state.copyWith(selectedTags: next, special: SpecialFilter.all));
  }

  /// 替换式多选（供弹窗确认回填整批选中）
  void setSelectedFolders(Set<int> ids) {
    _update(state.copyWith(selectedFolderIds: ids, special: SpecialFilter.all));
  }

  void setSelectedTags(Set<String> titles) {
    _update(state.copyWith(selectedTags: titles, special: SpecialFilter.all));
  }

  void setTitle(String title) {
    _update(state.copyWith(title: title, special: SpecialFilter.all));
  }

  void clearTitle() {
    _update(state.copyWith(title: ''));
  }

  void setCategory(String? category) {
    _update(
      state.copyWith(
        category: category,
        clearCategory: category == null,
        special: SpecialFilter.all,
      ),
    );
  }

  /// 设置大小预设（preset id 与字节边界）。传 null 即清除。
  void setSizePreset(String preset, {int? min, int? max}) {
    _update(
      state.copyWith(
        sizePreset: preset,
        sizeMin: min,
        sizeMax: max,
        special: SpecialFilter.all,
      ),
    );
  }

  /// 自定义大小范围（字节）。
  void setCustomSize({int? min, int? max}) {
    _update(
      state.copyWith(
        sizePreset: 'custom',
        sizeMin: min,
        sizeMax: max,
        special: SpecialFilter.all,
      ),
    );
  }

  void clearSize() {
    _update(state.copyWith(clearSize: true));
  }

  void setSpecial(SpecialFilter s) {
    // special 与文件夹/标签多选互斥，但保留 recycled（recycled 可与其他过滤叠加）。
    _update(FileFilterState(special: s, recycled: state.recycled));
  }

  /// 切换「仅看回收站」。只翻转 recycled，不清空文件夹/标签/标题等
  /// 其他过滤，故可与它们叠加使用。
  void toggleRecycled() {
    _update(state.copyWith(recycled: !state.recycled));
  }

  void clear() {
    _update(const FileFilterState());
  }
}

final fileFilterProvider =
    StateNotifierProvider<FileFilterNotifier, FileFilterState>((ref) {
      return FileFilterNotifier();
    });
