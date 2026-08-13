import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'photo_backup_collector.dart';

/// 相册自动备份配置（不可变快照，写时落盘）。
@immutable
class PhotoBackupConfig {
  const PhotoBackupConfig({
    this.enabled = false,
    this.targetFolderId,
    this.targetFolderName,
    this.selectedAlbumIds = const [],
    this.watchDir,
    this.backupImages = true,
    this.backupVideos = false,
    this.sizeMin,
    this.sizeMax,
    this.extensionWhitelist = const [],
    this.extensionBlacklist = const [],
  });

  /// 总开关。
  final bool enabled;

  /// 备份目标文件夹 id；null 表示上传到"未分类"。
  final int? targetFolderId;
  final String? targetFolderName;

  /// 选中的相册 id（移动端/macOS）；空表示"全部/最近项目"。
  final List<String> selectedAlbumIds;

  /// 监听的本地目录（Windows/Linux 文件系统方案）；空表示未设置。
  final String? watchDir;

  final bool backupImages;
  final bool backupVideos;

  /// 文件大小过滤（字节，含端；null 表示该侧不限）。
  final int? sizeMin;
  final int? sizeMax;

  /// 扩展名白名单 / 黑名单（小写、无点号；空表示不启用）。
  /// 黑名单优先：命中黑名单一律跳过。
  final List<String> extensionWhitelist;
  final List<String> extensionBlacklist;

  /// 是否配置了至少一种要备份的类型。
  bool get hasType => backupImages || backupVideos;

  PhotoBackupConfig copyWith({
    bool? enabled,
    Object? targetFolderId = _sentinel,
    Object? targetFolderName = _sentinel,
    List<String>? selectedAlbumIds,
    Object? watchDir = _sentinel,
    bool? backupImages,
    bool? backupVideos,
    Object? sizeMin = _sentinel,
    Object? sizeMax = _sentinel,
    List<String>? extensionWhitelist,
    List<String>? extensionBlacklist,
  }) {
    return PhotoBackupConfig(
      enabled: enabled ?? this.enabled,
      targetFolderId: identical(targetFolderId, _sentinel)
          ? this.targetFolderId
          : targetFolderId as int?,
      targetFolderName: identical(targetFolderName, _sentinel)
          ? this.targetFolderName
          : targetFolderName as String?,
      selectedAlbumIds: selectedAlbumIds ?? this.selectedAlbumIds,
      watchDir: identical(watchDir, _sentinel)
          ? this.watchDir
          : watchDir as String?,
      backupImages: backupImages ?? this.backupImages,
      backupVideos: backupVideos ?? this.backupVideos,
      sizeMin: identical(sizeMin, _sentinel)
          ? this.sizeMin
          : sizeMin as int?,
      sizeMax: identical(sizeMax, _sentinel)
          ? this.sizeMax
          : sizeMax as int?,
      extensionWhitelist: extensionWhitelist ?? this.extensionWhitelist,
      extensionBlacklist: extensionBlacklist ?? this.extensionBlacklist,
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'targetFolderId': targetFolderId,
        'targetFolderName': targetFolderName,
        'selectedAlbumIds': selectedAlbumIds,
        'watchDir': watchDir,
        'backupImages': backupImages,
        'backupVideos': backupVideos,
        'sizeMin': sizeMin,
        'sizeMax': sizeMax,
        'extensionWhitelist': extensionWhitelist,
        'extensionBlacklist': extensionBlacklist,
      };

  factory PhotoBackupConfig.fromJson(Map<String, dynamic> json) =>
      PhotoBackupConfig(
        enabled: json['enabled'] as bool? ?? false,
        targetFolderId: json['targetFolderId'] as int?,
        targetFolderName: json['targetFolderName'] as String?,
        selectedAlbumIds:
            (json['selectedAlbumIds'] as List<dynamic>? ?? const [])
                .map((e) => e.toString())
                .toList(),
        watchDir: json['watchDir'] as String?,
        backupImages: json['backupImages'] as bool? ?? true,
        backupVideos: json['backupVideos'] as bool? ?? false,
        sizeMin: (json['sizeMin'] as num?)?.toInt(),
        sizeMax: (json['sizeMax'] as num?)?.toInt(),
        extensionWhitelist:
            (json['extensionWhitelist'] as List<dynamic>? ?? const [])
                .map((e) => e.toString().toLowerCase())
                .toList(),
        extensionBlacklist:
            (json['extensionBlacklist'] as List<dynamic>? ?? const [])
                .map((e) => e.toString().toLowerCase())
                .toList(),
      );
}

const _sentinel = Object();

/// 同步状态。
@immutable
class PhotoBackupStatus {
  const PhotoBackupStatus({
    this.running = false,
    this.processed = 0,
    this.total = 0,
    this.failed = 0,
    this.currentName,
    this.message,
    this.error,
    this.lastSyncedAtMs,
  });

  final bool running;
  final int processed;
  final int total;
  /// 本次同步失败项数（用于完成消息的「N 项成功，M 项失败」展示）。
  final int failed;
  final String? currentName;
  final String? message;
  final String? error;
  final int? lastSyncedAtMs;

  /// 进度 0..1；total==0 时为 null（界面显示不确定进度）。
  double? get progress => total > 0 ? processed / total : null;

  PhotoBackupStatus copyWith({
    bool? running,
    int? processed,
    int? total,
    int? failed,
    Object? currentName = _sentinel,
    Object? message = _sentinel,
    Object? error = _sentinel,
    int? lastSyncedAtMs,
  }) {
    return PhotoBackupStatus(
      running: running ?? this.running,
      processed: processed ?? this.processed,
      total: total ?? this.total,
      failed: failed ?? this.failed,
      currentName: identical(currentName, _sentinel)
          ? this.currentName
          : currentName as String?,
      message: identical(message, _sentinel)
          ? this.message
          : message as String?,
      error: identical(error, _sentinel) ? this.error : error as String?,
      lastSyncedAtMs: lastSyncedAtMs ?? this.lastSyncedAtMs,
    );
  }
}

/// 上传依赖注入：同步时调用方提供上传函数，避免 service 持有 client。
typedef UploadSink = Future<UploadResponse> Function(File file);

/// 自动备份服务（单例）。
///
/// 通过 [BackupCollector] 抽象不同平台的资产来源：
/// - iOS / Android / macOS：photo_manager 相册。
/// - Windows / Linux：用户选定的本地目录递归扫描。
///
/// 去重策略：
/// - 增量：仅处理 createDt > lastSyncedDt 的资产；
/// - 兜底：上传成功后将资产 id 加入 [uploadedAssetIds]，跨次同步仍可去重。
class PhotoBackupService {
  PhotoBackupService._();
  static final PhotoBackupService instance = PhotoBackupService._();

  static const _kConfig = 'photo_backup_config';
  static const _kUploadedIds = 'photo_backup_uploaded_ids';
  static const _kLastSynced = 'photo_backup_last_synced_ms';

  PhotoBackupConfig _config = const PhotoBackupConfig();
  PhotoBackupConfig get config => _config;

  final Set<String> _uploaded = {};
  Set<String> get uploadedAssetIds => Set.unmodifiable(_uploaded);
  DateTime? _lastSyncedDt;

  final ValueNotifier<PhotoBackupStatus> status =
      ValueNotifier(const PhotoBackupStatus());

  bool _syncing = false;

  /// 从 SharedPreferences 载入配置与去重水位线。App 启动时调用一次。
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kConfig);
    if (raw != null) {
      try {
        _config = PhotoBackupConfig.fromJson(json.decode(raw));
      } catch (_) {
        // 忽略损坏的配置
      }
    }
    _uploaded
      ..clear()
      ..addAll(prefs.getStringList(_kUploadedIds) ?? const []);
    final ms = prefs.getInt(_kLastSynced);
    _lastSyncedDt = ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms);
  }

  /// 写入新配置并落盘。返回落盘后的配置。
  Future<PhotoBackupConfig> updateConfig(PhotoBackupConfig next) async {
    final scanScopeChanged = !_hasSameScanScope(_config, next);
    _config = next;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kConfig, json.encode(next.toJson()));
    if (scanScopeChanged) {
      _lastSyncedDt = null;
      await prefs.remove(_kLastSynced);
      debugPrint('photo_backup: scan scope changed, waterline reset');
    }
    return next;
  }

  bool _hasSameScanScope(PhotoBackupConfig a, PhotoBackupConfig b) =>
      listEquals(a.selectedAlbumIds, b.selectedAlbumIds) &&
      a.watchDir == b.watchDir &&
      a.backupImages == b.backupImages &&
      a.backupVideos == b.backupVideos &&
      a.sizeMin == b.sizeMin &&
      a.sizeMax == b.sizeMax &&
      listEquals(a.extensionWhitelist, b.extensionWhitelist) &&
      listEquals(a.extensionBlacklist, b.extensionBlacklist);

  /// 当前平台使用的收集器（按配置构造）。
  BackupCollector _buildCollector(PhotoBackupConfig cfg) {
    return createBackupCollector(
      selectedAlbumIds: cfg.selectedAlbumIds,
      watchDir: cfg.watchDir,
    );
  }

  /// 当前是否已授权（移动端/macOS 检查相册权限）。
  Future<bool> hasAccess() async {
    final collector = _buildCollector(_config);
    return collector.requestAccess();
  }

  /// 执行一次同步。
  ///
  /// [upload] 由调用方注入：通常是
  /// `(file) => client.files().uploadFile(file, libId, folderId: cfg.targetFolderId)`。
  /// 已在同步中、未选类型时直接返回。
  Future<void> syncNow({required UploadSink upload}) async {
    if (_syncing) {
      debugPrint('photo_backup: sync skipped, another sync is already running');
      return;
    }
    final cfg = _config;
    debugPrint(
      'photo_backup: sync start platform=${Platform.operatingSystem} '
      'enabled=${cfg.enabled} watchDir=${cfg.watchDir} '
      'images=${cfg.backupImages} videos=${cfg.backupVideos} '
      'sizeMin=${cfg.sizeMin} sizeMax=${cfg.sizeMax} '
      'whitelist=${cfg.extensionWhitelist} blacklist=${cfg.extensionBlacklist} '
      'uploaded=${_uploaded.length} lastSynced=${_lastSyncedDt?.toIso8601String()}',
    );
    if (!cfg.hasType) {
      debugPrint('photo_backup: sync stopped, no image/video type selected');
      status.value = const PhotoBackupStatus(message: 'backup.noContentSelected');
      return;
    }

    _syncing = true;
    status.value = status.value.copyWith(
      running: true,
      processed: 0,
      total: 0,
      message: 'backup.scanning',
      error: null,
    );

    try {
      final collector = _buildCollector(cfg);
      debugPrint(
        'photo_backup: collector=${collector.runtimeType} '
        'source=${collector.sourceLabel}',
      );
      if (!kBackupUsesPhotoManager && cfg.watchDir != null) {
        debugPrint(
          'photo_backup: watchDir exists=${await Directory(cfg.watchDir!).exists()}',
        );
      }
      final access = await collector.requestAccess();
      debugPrint('photo_backup: collector access=$access');
      if (!access) {
        status.value = status.value.copyWith(
          running: false,
          error: kBackupUsesPhotoManager ? 'backup.noAlbumAccess' : 'backup.noWatchDirShort',
        );
        return;
      }

      // 1. 收集 + 水位线/去重过滤。
      final all = await collector.collect(
        images: cfg.backupImages,
        videos: cfg.backupVideos,
        sizeMin: cfg.sizeMin,
        sizeMax: cfg.sizeMax,
        extensionWhitelist: cfg.extensionWhitelist.toSet(),
        extensionBlacklist: cfg.extensionBlacklist.toSet(),
      );
      debugPrint('photo_backup: collector returned ${all.length} candidate(s)');
      final pending = <BackupAsset>[];
      var skippedUploaded = 0;
      var skippedBeforeWaterline = 0;
      for (final a in all) {
        if (_uploaded.contains(a.id)) {
          skippedUploaded++;
          debugPrint(
            'photo_backup: skip uploaded id=${a.id} name=${a.displayName}',
          );
          continue; // 兜底去重
        }
        // 增量：跳过水位线之前的资产。
        if (_lastSyncedDt != null) {
          final dt = await a.createDateTime;
          if (!dt.isAfter(_lastSyncedDt!)) {
            skippedBeforeWaterline++;
            debugPrint(
              'photo_backup: skip before waterline id=${a.id} '
              'name=${a.displayName} createDt=${dt.toIso8601String()}',
            );
            continue;
          }
        }
        pending.add(a);
      }
      debugPrint(
        'photo_backup: pending=${pending.length} '
        'skippedUploaded=$skippedUploaded '
        'skippedBeforeWaterline=$skippedBeforeWaterline',
      );

      if (pending.isEmpty) {
        status.value = PhotoBackupStatus(
          running: false,
          message: 'backup.nothingNew',
          lastSyncedAtMs: _lastSyncedDt?.millisecondsSinceEpoch,
        );
        return;
      }

      status.value = status.value.copyWith(total: pending.length);

      // 2. 串行上传，单文件失败不中断整体。
      int processed = 0;
      int failed = 0;
      DateTime? maxCreateDt;
      for (final asset in pending) {
        status.value = status.value.copyWith(
          currentName: asset.displayName,
          processed: processed,
        );
        try {
          final file = await asset.originFile;
          if (file == null) {
            failed++;
            processed++;
            status.value = status.value.copyWith(processed: processed);
            continue;
          }
          final resp = await upload(file);
          final ok =
              resp.results.isNotEmpty && resp.results.every((r) => r.success);
          if (ok) {
            _uploaded.add(asset.id);
          } else {
            failed++;
          }
        } catch (e) {
          failed++;
          debugPrint('photo_backup: upload asset ${asset.id} failed: $e');
        }
        processed++;
        status.value = status.value.copyWith(processed: processed);
        final cdt = await asset.createDateTime;
        if (maxCreateDt == null || cdt.isAfter(maxCreateDt)) {
          maxCreateDt = cdt;
        }
      }

      // 3. 更新水位线并落盘去重集合。
      final waterline = maxCreateDt ?? DateTime.now();
      _lastSyncedDt = waterline;
      await _persistWaterline(waterline);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_kUploadedIds, _uploaded.toList());

      status.value = PhotoBackupStatus(
        running: false,
        processed: processed,
        total: pending.length,
        failed: failed,
        // 带计数的完成消息：存 key，由 UI 层（_buildStatus）补 namedArgs 翻译。
        message: failed > 0 ? 'backup.donePartial' : 'backup.doneAll',
        lastSyncedAtMs: waterline.millisecondsSinceEpoch,
      );
    } catch (e, stackTrace) {
      debugPrint('photo_backup: sync failed: $e');
      debugPrintStack(stackTrace: stackTrace);
      status.value =
          status.value.copyWith(running: false, error: e.toString());
    } finally {
      _syncing = false;
    }
  }

  Future<void> _persistWaterline(DateTime dt) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kLastSynced, dt.millisecondsSinceEpoch);
  }
}
