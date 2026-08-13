import 'dart:async';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';

import '../../mira_sdk/mira_sdk.dart';

/// 上传任务状态机。
enum UploadStatus { uploading, done, failed }

/// 单个上传任务（不可变快照，写时 copyWith 并整体替换列表项）。
///
/// 仿 [DownloadTask]：以不可变值类型表示任务，便于 [ValueNotifier] 整表刷新。
/// [path] 指向本地文件，跨页面存活期间可重复读取（重试）。
@immutable
class UploadTask {
  const UploadTask({required this.id, required this.path, required this.name, required this.size, required this.status, required this.createdAt, this.progress = 0, this.retries = 0, this.error});

  /// 唯一 id（自增序号）。
  final String id;
  final String path;
  final String name;
  final int size;
  final UploadStatus status;
  final double progress; // 0..1
  final int retries; // 已自动重试次数
  final String? error;
  final DateTime createdAt;

  /// 是否正在上传（占用一次发送）。
  bool get isActive => status == UploadStatus.uploading;

  UploadTask copyWith({UploadStatus? status, double? progress, int? retries, Object? error = _sentinel}) => UploadTask(
    id: id,
    path: path,
    name: name,
    size: size,
    createdAt: createdAt,
    status: status ?? this.status,
    progress: progress ?? this.progress,
    retries: retries ?? this.retries,
    error: identical(error, _sentinel) ? this.error : error as String?,
  );
}

const _sentinel = Object();

/// 上传服务（单例）。
///
/// 仿 [DownloadService] 的单例 + ValueNotifier 模式：任务列表存活于服务，
/// 不随上传页面销毁而丢失——离开页面再回来仍能看到历史 / 进行中的任务。
///
/// 上传依赖（client / libId）由调用方（页面）注入；service 不持有
/// MiraClient 的强引用周期——任务终结后清理，重试时由调用方重新注入，
/// 避免「连接/库切换后引用过期 client」。
///
/// 与下载不同：上传无并发上限，所有入队任务并发发送（与原页面行为一致）。
class UploadService {
  UploadService._();
  static final UploadService instance = UploadService._();

  /// 单个任务最大自动重试次数（不含首次上传）。
  static const int maxAutoRetries = 3;

  final ValueNotifier<List<UploadTask>> tasks = ValueNotifier<List<UploadTask>>(const []);

  /// 任务依赖：id → client / libId。任务终结后清理；重试时重新注入。
  final Map<String, MiraClient> _clients = {};
  final Map<String, String> _libIds = {};

  int _seq = 0;

  /// 上传成功后的回调（通常用于刷新画廊）。由调用方设置，服务不感知具体 provider。
  VoidCallback? onFileUploaded;

  /// 加入上传队列并立即开始上传。
  ///
  /// [client] / [libId] 为 null（未连接）时，任务以 failed 状态入列，
  /// 用户重连后可手动重试（重试时重新注入 client）。
  void enqueue(List<({String path, String name, int size})> picks, {required MiraClient? client, required String? libId}) {
    if (picks.isEmpty) return;
    final connected = client != null && libId != null;
    final now = DateTime.now();
    final added = <UploadTask>[];
    for (final p in picks) {
      final id = 'up_${_seq++}';
      if (connected) {
        _clients[id] = client;
        _libIds[id] = libId;
      }
      added.add(
        UploadTask(
          id: id,
          path: p.path,
          name: p.name,
          size: p.size,
          status: connected ? UploadStatus.uploading : UploadStatus.failed,
          error: connected ? null : 'upload.notConnected'.tr(),
          progress: connected ? 0 : 1.0,
          createdAt: now,
        ),
      );
    }
    // 新任务插到队首，便于在 UI 顶部看到刚加入的上传。
    tasks.value = [...added.reversed, ...tasks.value];
    if (connected) {
      for (final t in added) {
        _doUpload(t);
      }
    }
  }

  /// 重试单个失败任务（重置重试计数，重新注入 client）。
  void retryTask(String id, {required MiraClient? client, required String? libId}) {
    final cur = _find(id);
    if (cur == null || cur.isActive) return;
    if (client != null && libId != null) {
      _clients[id] = client;
      _libIds[id] = libId;
    }
    _doUpload(cur.copyWith(status: UploadStatus.uploading, retries: 0, progress: 0, error: null));
  }

  /// 一键重试所有失败任务。
  void retryAllFailed({required MiraClient? client, required String? libId}) {
    for (final t in tasks.value.toList()) {
      if (t.status == UploadStatus.failed) {
        retryTask(t.id, client: client, libId: libId);
      }
    }
  }

  /// 清除所有已完成 / 失败的任务（保留进行中的）。
  void clearFinished() {
    final remaining = <UploadTask>[];
    final activeIds = <String>{};
    for (final t in tasks.value) {
      if (t.isActive) {
        remaining.add(t);
        activeIds.add(t.id);
      }
    }
    // 清理非活动任务残留的 client 引用。
    _clients.removeWhere((k, _) => !activeIds.contains(k));
    _libIds.removeWhere((k, _) => !activeIds.contains(k));
    tasks.value = remaining;
  }

  Future<void> _doUpload(UploadTask initial) async {
    _updateTask(initial.copyWith(status: UploadStatus.uploading, progress: 0, error: null));
    try {
      final client = _clients[initial.id];
      final libId = _libIds[initial.id];
      if (client == null || libId == null) {
        throw Exception('upload.notConnected'.tr());
      }
      final resp = await client.files().uploadFile(
        File(initial.path),
        libId,
        onSendProgress: (sent, total) {
          // 总字节数已知才显示确定进度。不要按百分比节流：小文件或大块
          // 发送时若丢弃变化，界面会长期停在 99% 附近。
          if (total <= 0) return;
          final p = (sent / total).clamp(0.0, 1.0);
          final cur = _find(initial.id);
          if (cur == null || p <= cur.progress) return;
          _updateTask(cur.copyWith(progress: p));
        },
      );
      final ok = resp.results.isNotEmpty && resp.results.every((r) => r.isAccepted);
      if (!ok) {
        final errs = resp.results.where((r) => !r.success).map((r) => '${r.file}: ${r.error ?? r.result ?? r.raw}').join('; ');
        throw Exception(errs.isEmpty ? 'upload.failed'.tr() : errs);
      }
      if (resp.results.any((r) => r.isDuplicate)) {
        debugPrint(
          '[UploadService] upload accepted as duplicate id=${initial.id} '
          'file=${initial.name}',
        );
      }
      final cur = _find(initial.id);
      if (cur == null) return;
      _updateTask(cur.copyWith(status: UploadStatus.done, progress: 1.0, retries: 0, error: null));
      _cleanup(initial.id);
      onFileUploaded?.call();
    } catch (e, stackTrace) {
      debugPrint(
        '[UploadService] upload failed id=${initial.id} '
        'file=${initial.name} size=${initial.size} error=$e',
      );
      debugPrintStack(stackTrace: stackTrace);
      await _handleFailure(initial, e);
    }
  }

  /// 失败处理：未达重试上限则退避后重试，否则标记为 failed。
  Future<void> _handleFailure(UploadTask t, Object e) async {
    final cur = _find(t.id);
    if (cur == null) return;
    if (cur.retries < maxAutoRetries) {
      final nextRetry = cur.retries + 1;
      debugPrint(
        '[UploadService] retry scheduled id=${t.id} file=${t.name} '
        'attempt=$nextRetry/$maxAutoRetries error=$e',
      );
      _updateTask(cur.copyWith(retries: nextRetry));
      await Future.delayed(Duration(seconds: 1 + nextRetry));
      // 退避期间任务可能被清空。
      final latest = _find(t.id);
      if (latest == null) return;
      await _doUpload(latest);
    } else {
      debugPrint(
        '[UploadService] upload permanently failed id=${t.id} file=${t.name} '
        'attempts=${cur.retries + 1} error=$e',
      );
      _updateTask(cur.copyWith(status: UploadStatus.failed, error: e.toString(), progress: 1.0));
      _cleanup(t.id);
    }
  }

  UploadTask? _find(String id) {
    for (final t in tasks.value) {
      if (t.id == id) return t;
    }
    return null;
  }

  void _updateTask(UploadTask updated) {
    final next = <UploadTask>[];
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

  void _cleanup(String id) {
    _clients.remove(id);
    _libIds.remove(id);
  }
}
