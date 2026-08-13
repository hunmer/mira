import 'dart:io';

import 'package:photo_manager/photo_manager.dart';

/// 统一的待备份资产抽象。
///
/// 不同平台用不同方式得到资产：
/// - iOS / Android / macOS：[photo_manager] 的 AssetEntity（相册）。
/// - Windows / Linux：文件系统扫描（用户选定一个目录递归遍历）。
///
/// 抽象出三个能力：稳定去重 id、原始文件、创建时间，供 service 统一处理。
abstract class BackupAsset {
  /// 平台内稳定 id，用于去重（相册资产 id / 文件绝对路径）。
  String get id;

  /// 可读的显示名（用于进度文案）。
  String get displayName;

  /// 原始文件；获取失败返回 null。
  Future<File?> get originFile;

  /// 创建时间，用于增量水位线过滤。
  Future<DateTime> get createDateTime;
}

/// 资产收集器抽象。
///
/// [sourceLabel]：本次来源的人类可读描述（如 "相册"、"D:\\Pictures"），
/// 供 UI 在没有待处理资产时提示。
abstract class BackupCollector {
  /// 是否需要授权；移动端/macOS 返回 true，桌面文件系统返回 false。
  Future<bool> requestAccess();

  /// 收集待扫描的全部资产（按类型过滤）。
  ///
  /// [images] / [videos] 控制返回图片还是视频。
  /// [sizeMin] / [sizeMax]：文件大小范围（字节，含端；null=该侧不限）。
  /// [extensionWhitelist]：仅保留这些扩展名（小写无点号）；空=不启用。
  /// [extensionBlacklist]：排除这些扩展名（黑名单优先于白名单）。
  Future<List<BackupAsset>> collect({
    required bool images,
    required bool videos,
    int? sizeMin,
    int? sizeMax,
    Set<String> extensionWhitelist = const {},
    Set<String> extensionBlacklist = const {},
  });

  /// 人类可读的来源标签。
  String get sourceLabel;
}

/// 当前平台使用的收集器工厂。
///
/// iOS/Android/macOS → photo_manager 相册收集器（[selectedAlbumIds] 控制来源）；
/// Windows/Linux → 目录文件系统收集器（需用户选定一个监听目录）。
BackupCollector createBackupCollector({
  List<String> selectedAlbumIds = const [],
  String? watchDir,
}) {
  if (kBackupUsesPhotoManager) {
    return PhotoManagerCollector(selectedAlbumIds: selectedAlbumIds);
  }
  // Windows / Linux：基于文件系统的收集器。
  return FilesystemCollector(watchDir: watchDir);
}

/// 平台判断：是否使用 photo_manager（相册 API）。
/// 桌面端（Windows/Linux/Web）走文件系统方案。
bool get kBackupUsesPhotoManager =>
    Platform.isAndroid || Platform.isIOS || Platform.isMacOS;

// ──────────────────────────────────────────────────────────────
// photo_manager 实现：iOS / Android / macOS
// ──────────────────────────────────────────────────────────────

/// 包装 [AssetEntity] 为统一 [BackupAsset]。
class _PhotoManagerAsset extends BackupAsset {
  _PhotoManagerAsset(this.entity);
  final AssetEntity entity;

  @override
  String get id => entity.id;

  @override
  String get displayName => entity.title ?? 'backup.mediaFile';

  @override
  Future<File?> get originFile => entity.originFile;

  @override
  Future<DateTime> get createDateTime async => entity.createDateTime;
}

/// 相册收集器（photo_manager）。
///
/// 收集指定相册（[selectedAlbumIds] 空=全部/最近项目）内、符合类型过滤的资产。
/// service 内部会再做水位线 + 去重过滤，这里只负责"类型 + 相册来源"。
class PhotoManagerCollector implements BackupCollector {
  PhotoManagerCollector({this.selectedAlbumIds = const []});

  final List<String> selectedAlbumIds;

  @override
  String get sourceLabel => 'backup.album';

  @override
  Future<bool> requestAccess() async {
    final ps = await PhotoManager.requestPermissionExtend();
    return ps.hasAccess;
  }

  @override
  Future<List<BackupAsset>> collect({
    required bool images,
    required bool videos,
    int? sizeMin,
    int? sizeMax,
    Set<String> extensionWhitelist = const {},
    Set<String> extensionBlacklist = const {},
  }) async {
    int v = 0;
    if (images) v |= 1;
    if (videos) v |= 1 << 1;
    final type = RequestType(v);

    // 确定扫描的相册：空 → "最近项目/全部"。
    List<AssetPathEntity> paths;
    if (selectedAlbumIds.isEmpty) {
      paths = await PhotoManager.getAssetPathList(onlyAll: true, type: type);
      if (paths.isEmpty) {
        paths = await PhotoManager.getAssetPathList(type: type);
      }
    } else {
      final all = await PhotoManager.getAssetPathList(type: type);
      paths = all.where((p) => selectedAlbumIds.contains(p.id)).toList();
    }

    final out = <BackupAsset>[];
    for (final path in paths) {
      int page = 0;
      const size = 100;
      while (true) {
        final pageAssets =
            await path.getAssetListPaged(page: page, size: size);
        if (pageAssets.isEmpty) break;
        for (final a in pageAssets) {
          if (!((images && a.type == AssetType.image) ||
              (videos && a.type == AssetType.video))) {
            continue;
          }
          // 扩展名过滤（黑名单优先于白名单）
          final ext = _ext(a.title ?? '');
          if (extensionBlacklist.contains(ext)) continue;
          if (extensionWhitelist.isNotEmpty &&
              !extensionWhitelist.contains(ext)) {
            continue;
          }
          // 大小过滤：仅在配置了范围时才读取 fileSize（逐项平台调用，避免无谓开销）
          if (sizeMin != null || sizeMax != null) {
            final bytes = await a.fileSize;
            if (sizeMin != null && bytes < sizeMin) continue;
            if (sizeMax != null && bytes > sizeMax) continue;
          }
          out.add(_PhotoManagerAsset(a));
        }
        if (pageAssets.length < size) break;
        page++;
      }
    }
    return out;
  }
}

// ──────────────────────────────────────────────────────────────
// 文件系统实现：Windows / Linux（用户选定一个监听目录）
// ──────────────────────────────────────────────────────────────

const _kImageExtensions = {
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'tiff', 'tif',
  'avif',
};
const _kVideoExtensions = {
  'mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm', 'mpg', 'mpeg', '3gp', 'ts',
  'm4v',
};

String _ext(String path) {
  final dot = path.lastIndexOf('.');
  if (dot < 0 || dot == path.length - 1) return '';
  return path.substring(dot + 1).toLowerCase();
}

/// 包装文件系统中的一个文件为 [BackupAsset]。
class _FilesystemAsset extends BackupAsset {
  _FilesystemAsset(this.file, this._createDt);
  final File file;
  final DateTime _createDt;

  @override
  String get id => file.absolute.path; // 绝对路径作为稳定去重 id

  @override
  String get displayName => file.path.split(Platform.pathSeparator).last;

  @override
  Future<File?> get originFile async => file;

  @override
  Future<DateTime> get createDateTime async => _createDt;
}

/// 文件系统收集器（Windows / Linux）。
///
/// 递归扫描 [watchDir] 下所有图片/视频文件。
/// watchDir 为空时返回空列表（需用户先选定监听目录）。
class FilesystemCollector implements BackupCollector {
  FilesystemCollector({this.watchDir});

  final String? watchDir;

  @override
  String get sourceLabel => watchDir ?? 'backup.localDir';

  @override
  Future<bool> requestAccess() async => watchDir != null; // 文件系统无需授权

  @override
  Future<List<BackupAsset>> collect({
    required bool images,
    required bool videos,
    int? sizeMin,
    int? sizeMax,
    Set<String> extensionWhitelist = const {},
    Set<String> extensionBlacklist = const {},
  }) async {
    if (watchDir == null) return const [];
    final dir = Directory(watchDir!);
    if (!await dir.exists()) return const [];

    final out = <BackupAsset>[];
    // 递归遍历；按扩展名 + 类型 + 白/黑名单 + 大小过滤。
    await for (final entity in dir.list(recursive: true, followLinks: false)) {
      if (entity is! File) continue;
      final ext = _ext(entity.path);
      final isImage = images && _kImageExtensions.contains(ext);
      final isVideo = videos && _kVideoExtensions.contains(ext);
      if (!isImage && !isVideo) continue;
      // 扩展名白/黑名单（黑名单优先于白名单）
      if (extensionBlacklist.contains(ext)) continue;
      if (extensionWhitelist.isNotEmpty &&
          !extensionWhitelist.contains(ext)) {
        continue;
      }

      // 创建时间：优先 lastModified（跨平台稳定），回退到 stat。
      DateTime dt;
      try {
        dt = await entity.lastModified();
      } catch (_) {
        dt = DateTime.now();
      }
      // 大小过滤：读取失败则跳过过滤（不因无法 stat 而丢弃文件）。
      if (sizeMin != null || sizeMax != null) {
        int bytes;
        try {
          bytes = await entity.length();
        } catch (_) {
          bytes = -1;
        }
        if (bytes >= 0) {
          if (sizeMin != null && bytes < sizeMin) continue;
          if (sizeMax != null && bytes > sizeMax) continue;
        }
      }
      out.add(_FilesystemAsset(entity, dt));
    }
    return out;
  }
}

