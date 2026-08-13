import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'notification_service.dart';

/// 下载任务状态机。
enum DownloadStatus { pending, downloading, completed, failed, cancelled }

/// 下载配置（不可变快照，写时落盘）。
///
/// [saveDir] 为 null 表示使用默认目录（应用文档目录下的 `MiraDownloads`，
/// iOS 沙盒可被系统「文件」App 访问）。[maxConcurrent] 限制并发下载数，
/// 范围 [kMinConcurrent, kMaxConcurrent]。
@immutable
class DownloadConfig {
  const DownloadConfig({this.saveDir, this.maxConcurrent = kDefaultConcurrent});

  final String? saveDir;
  final int maxConcurrent;

  static const kMinConcurrent = 1;
  static const kMaxConcurrent = 8;
  static const kDefaultConcurrent = 3;

  DownloadConfig copyWith({Object? saveDir = _sentinel, int? maxConcurrent}) {
    return DownloadConfig(
      saveDir: identical(saveDir, _sentinel)
          ? this.saveDir
          : saveDir as String?,
      maxConcurrent: maxConcurrent ?? this.maxConcurrent,
    );
  }

  Map<String, dynamic> toJson() => {
    'saveDir': saveDir,
    'maxConcurrent': maxConcurrent,
  };

  factory DownloadConfig.fromJson(Map<String, dynamic> json) => DownloadConfig(
    saveDir: json['saveDir'] as String?,
    maxConcurrent:
        (json['maxConcurrent'] as num?)?.toInt() ?? kDefaultConcurrent,
  );
}

const _sentinel = Object();

/// 单个下载任务（不可变快照，写时 copyWith 并整体替换列表项）。
@immutable
class DownloadTask {
  const DownloadTask({
    required this.id,
    required this.file,
    required this.libraryId,
    required this.status,
    this.receivedBytes = 0,
    this.totalBytes = 0,
    this.error,
    this.savedPath,
    required this.createdAt,
  });

  /// 唯一 id：`libId:fileId`（同一文件去重用）。
  final String id;
  final FileData file;
  final String libraryId;
  final DownloadStatus status;

  final int receivedBytes;
  final int totalBytes;
  final String? error;
  final String? savedPath;
  final DateTime createdAt;

  /// 下载进度 0..1；totalBytes 未知（<=0）或未开始时为 null。
  double? get progress =>
      totalBytes > 0 ? (receivedBytes / totalBytes).clamp(0.0, 1.0) : null;

  /// 是否处于活动状态（占用一个并发槽）。
  bool get isActive =>
      status == DownloadStatus.downloading || status == DownloadStatus.pending;

  DownloadTask copyWith({
    DownloadStatus? status,
    int? receivedBytes,
    int? totalBytes,
    Object? error = _sentinel,
    Object? savedPath = _sentinel,
  }) {
    return DownloadTask(
      id: id,
      file: file,
      libraryId: libraryId,
      status: status ?? this.status,
      receivedBytes: receivedBytes ?? this.receivedBytes,
      totalBytes: totalBytes ?? this.totalBytes,
      error: identical(error, _sentinel) ? this.error : error as String?,
      savedPath: identical(savedPath, _sentinel)
          ? this.savedPath
          : savedPath as String?,
      createdAt: createdAt,
    );
  }
}

/// 下载服务（单例）。
///
/// 仿 [PhotoBackupService] 的单例 + ValueNotifier + 落盘配置模式。
/// 并发由 [_pump] 维护：每完成一个任务（含失败/取消）后回填一个 pending，
/// 保证任意时刻下载数不超过 [DownloadConfig.maxConcurrent]。
///
/// 下载依赖（client / libId）由 [enqueue] 调用方注入，service 不持有
/// MiraClient（避免连接/库切换后引用过期 client）。每个任务自建独立
/// [http.Client] 以支持取消（关闭即中断流）。
class DownloadService {
  DownloadService._();
  static final DownloadService instance = DownloadService._();

  static const _kConfig = 'download_config';

  DownloadConfig _config = const DownloadConfig();
  DownloadConfig get config => _config;

  final ValueNotifier<List<DownloadTask>> tasks =
      ValueNotifier<List<DownloadTask>>(const []);

  int _running = 0;

  /// 是否曾有过活动任务（用于判断「从有到无」→ 触发完成通知）。
  bool _hadActive = false;

  /// 进行中（pending + downloading）任务数，UI 角标用。
  int get activeCount => tasks.value.where((t) => t.isActive).length;

  /// 下载依赖注入表：taskId → (client, libId)。
  /// 任务完成或取消后清理，避免泄漏 client 引用（client 本身由 session 管理）。
  final Map<String, MiraClient> _clients = {};

  /// 每个任务独立的 http.Client，用于流式下载与取消。
  final Map<String, http.Client> _httpClients = {};

  /// 从 SharedPreferences 载入配置。App 启动时调用一次。
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kConfig);
    if (raw != null) {
      try {
        _config = DownloadConfig.fromJson(json.decode(raw));
      } catch (_) {
        // 忽略损坏的配置
      }
    }
  }

  /// 写入新配置并落盘。调大并发上限时立即尝试回填 pending 任务。
  Future<DownloadConfig> updateConfig(DownloadConfig next) async {
    final clamped = next.copyWith(
      maxConcurrent: next.maxConcurrent.clamp(
        DownloadConfig.kMinConcurrent,
        DownloadConfig.kMaxConcurrent,
      ),
    );
    _config = clamped;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kConfig, json.encode(clamped.toJson()));
    // 上限变大时立即补槽（变小不中断进行中任务）。
    _pump();
    return clamped;
  }

  /// 解析实际保存目录：自定义优先，否则取应用文档目录下的 MiraDownloads。
  /// 目录不存在时自动创建。
  Future<Directory> _resolveSaveDir() async {
    final custom = _config.saveDir;
    if (custom != null && custom.isNotEmpty) {
      final d = Directory(custom);
      if (!d.existsSync()) d.createSync(recursive: true);
      return d;
    }
    final doc = await getApplicationDocumentsDirectory();
    final d = Directory('${doc.path}${Platform.pathSeparator}MiraDownloads');
    if (!d.existsSync()) d.createSync(recursive: true);
    return d;
  }

  /// 加入下载队列。
  ///
  /// 已存在 pending/downloading 的同 id 任务会被跳过（去重）。
  /// 注入的 [client] 仅在该任务存活期间被引用，完成后清理。
  void enqueue(
    List<FileData> files, {
    required MiraClient client,
    required String libId,
  }) {
    if (files.isEmpty) return;
    final current = tasks.value;
    final activeIds = {
      for (final t in current)
        if (t.isActive) t.id,
    };
    final now = DateTime.now();
    final added = <DownloadTask>[];
    for (final f in files) {
      final id = '$libId:${f.id}';
      if (activeIds.contains(id)) continue; // 去重
      _clients[id] = client;
      added.add(
        DownloadTask(
          id: id,
          file: f,
          libraryId: libId,
          status: DownloadStatus.pending,
          createdAt: now,
        ),
      );
    }
    if (added.isEmpty) return;
    // 新任务插到队首，便于在 UI 顶部看到刚加入的下载。
    tasks.value = [...added.reversed, ...current];
    // 首次入队即启动前台进度通知（_pump 会异步开始下载）。
    _notifyProgress();
    _pump();
  }

  /// 取消单个任务（进行中或等待中）。
  void cancel(String taskId) {
    final t = _find(taskId);
    if (t == null) return;
    if (t.status == DownloadStatus.downloading) {
      // 关闭 http client 中断流；_run 的循环会捕获到异常并清理。
      _httpClients[taskId]?.close();
    }
    _updateTask(t.copyWith(status: DownloadStatus.cancelled));
    _clients.remove(taskId);
    _httpClients.remove(taskId);
    _pump();
  }

  /// 重试失败/取消的任务。
  void retry(String taskId) {
    final t = _find(taskId);
    if (t == null) return;
    if (t.status != DownloadStatus.failed &&
        t.status != DownloadStatus.cancelled) {
      return;
    }
    // 重试需要 client 仍可用；调用方应保证 session 连接中。
    _updateTask(
      t.copyWith(
        status: DownloadStatus.pending,
        receivedBytes: 0,
        totalBytes: 0,
        error: null,
        savedPath: null,
      ),
    );
    _pump();
  }

  /// 清除所有已完成/已取消/失败的任务（保留活动中的）。
  void clearFinished() {
    final before = List<DownloadTask>.from(tasks.value);
    final remaining = <DownloadTask>[];
    final activeIds = <String>{};
    for (final t in before) {
      if (t.isActive) {
        remaining.add(t);
        activeIds.add(t.id);
      }
    }
    // 清理非活动任务残留的 client 引用。
    for (final key in _clients.keys.toList()) {
      if (!activeIds.contains(key)) _clients.remove(key);
    }
    for (final key in _httpClients.keys.toList()) {
      if (!activeIds.contains(key)) _httpClients.remove(key);
    }
    tasks.value = remaining;
  }

  /// 注入 client（重试场景：session 重连后由调用方重新提供）。
  void injectClient(String taskId, MiraClient client) {
    if (_find(taskId) != null) _clients[taskId] = client;
  }

  DownloadTask? _find(String taskId) {
    for (final t in tasks.value) {
      if (t.id == taskId) return t;
    }
    return null;
  }

  void _updateTask(DownloadTask updated) {
    final next = <DownloadTask>[];
    var found = false;
    for (final t in tasks.value) {
      if (t.id == updated.id) {
        next.add(updated);
        found = true;
      } else {
        next.add(t);
      }
    }
    if (!found) next.add(updated);
    tasks.value = next;
  }

  /// 推送下载进度通知 / 完成通知。
  ///
  /// 队列进度 = 已完成数 / 总数（不含单文件字节进度）。
  /// 有活动任务时刷新前台进度通知；
  /// 从「有活动任务」变为「无活动任务」时发完成通知并停止前台服务。
  /// 任何调用点异常都吞掉，避免通知失败影响下载主流程。
  void _notifyProgress() {
    // 用 Future 微任务执行，避免在同步上下文里 await。
    Future(() async {
      try {
        final all = tasks.value;
        final active = all.where((t) => t.isActive).length;
        if (active > 0) {
          _hadActive = true;
          final done = all
              .where((t) => t.status == DownloadStatus.completed)
              .length;
          final total = all.length;
          // 队列进度：已完成数 / 总数。
          final overall = total > 0 ? done / total : null;
          // 当前下载中的文件名（取第一个 downloading）。
          final current = all
              .firstWhere(
                (t) => t.status == DownloadStatus.downloading,
                orElse: () => all.first,
              )
              .file
              .name;
          await NotificationService.instance.updateProgress(
            activeCount: active,
            done: done,
            total: total,
            overallProgress: overall,
            currentName: current,
          );
        } else if (_hadActive) {
          // 从有到无：本次批次完成。
          final done = all
              .where((t) => t.status == DownloadStatus.completed)
              .length;
          final failed = all
              .where((t) => t.status == DownloadStatus.failed)
              .length;
          final completedTask = all.cast<DownloadTask?>().firstWhere(
            (t) => t?.status == DownloadStatus.completed,
            orElse: () => null,
          );
          _hadActive = false;
          await NotificationService.instance.showDownloadComplete(
            completed: done,
            failed: failed,
            filePath: completedTask?.savedPath,
          );
        }
      } catch (e) {
        debugPrint('download_notify: $e');
      }
    });
  }

  /// 并发调度：在并发槽空闲且有待开始任务时启动下下载。
  ///
  /// 找到 pending 且有可用 client 的任务，置 downloading 并启动 [_run]。
  void _pump() {
    if (_running >= _config.maxConcurrent) return;
    for (final t in tasks.value) {
      if (_running >= _config.maxConcurrent) break;
      if (t.status != DownloadStatus.pending) continue;
      final client = _clients[t.id];
      if (client == null) {
        // 缺 client（session 已断）：标记失败，由用户重连后重试。
        _updateTask(
          t.copyWith(
            status: DownloadStatus.failed,
            error: 'common.notConnected'.tr(),
          ),
        );
        _notifyProgress();
        continue;
      }
      _running++;
      _run(t, client);
    }
  }

  Future<void> _run(DownloadTask task, MiraClient client) async {
    final hc = http.Client();
    _httpClients[task.id] = hc;

    // 标记下载中。
    _updateTask(task.copyWith(status: DownloadStatus.downloading));
    _notifyProgress();

    IOSink? sink;
    File? outFile;
    try {
      final url = client.getHttpClient().getUrl(
        '/api/files/file/${task.libraryId}/${task.file.id}',
      );
      final uri = Uri.parse(url);
      final request = http.Request('GET', uri);
      final streamed = await hc.send(request);
      if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
        throw Exception('Download failed: HTTP ${streamed.statusCode}');
      }
      final total = int.tryParse(streamed.headers['content-length'] ?? '') ?? 0;

      // 决定保存路径：目录 + 去重文件名。
      final dir = await _resolveSaveDir();
      final fileName = _dedupeFileName(dir, task.file.name);
      outFile = File('${dir.path}${Platform.pathSeparator}$fileName');
      sink = outFile.openWrite();

      var received = 0;
      // 流式读取：边写边累计字节，实时更新 UI 列表进度。
      // 通知不跟随字节进度，仅按队列进度（已完成数/总数）刷新。
      final sinkFinal = sink;
      await for (final chunk in streamed.stream) {
        sinkFinal.add(chunk);
        received += chunk.length;
        _updateTask(
          task.copyWith(
            status: DownloadStatus.downloading,
            receivedBytes: received,
            totalBytes: total,
          ),
        );
      }
      await sinkFinal.flush();
      await sinkFinal.close();
      sink = null;

      _updateTask(
        task.copyWith(
          status: DownloadStatus.completed,
          receivedBytes: received,
          totalBytes: total > 0 ? total : received,
          savedPath: outFile.path,
        ),
      );
      _notifyProgress();
    } catch (e) {
      // 异常时清理半成品文件（仅在本轮打开的）。
      try {
        if (sink != null) {
          await sink.close();
        }
        if (outFile != null && outFile.existsSync()) {
          outFile.deleteSync();
        }
      } catch (_) {}
      // http client 被取消时 close() 会抛 ClientException，识别为取消。
      final isCancel =
          _httpClients[task.id] == null ||
          e.toString().toLowerCase().contains('closed');
      _updateTask(
        task.copyWith(
          status: isCancel ? DownloadStatus.cancelled : DownloadStatus.failed,
          error: e.toString(),
        ),
      );
      _notifyProgress();
    } finally {
      _running--;
      _httpClients.remove(task.id);
      _clients.remove(task.id);
      _pump();
    }
  }

  /// 同名文件自动加 `(1)/(2)` 后缀，保留扩展名。
  String _dedupeFileName(Directory dir, String name) {
    final base = name;
    final target = File('${dir.path}${Platform.pathSeparator}$base');
    if (!target.existsSync()) return base;
    final dot = base.lastIndexOf('.');
    final stem = dot > 0 ? base.substring(0, dot) : base;
    final ext = dot > 0 ? base.substring(dot) : '';
    var i = 1;
    while (true) {
      final candidate = '$stem ($i)$ext';
      if (!File(
        '${dir.path}${Platform.pathSeparator}$candidate',
      ).existsSync()) {
        return candidate;
      }
      i++;
    }
  }
}
