import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../services/photo_backup_service.dart';
import 'session_provider.dart';

/// 备份配置 State：读自 [PhotoBackupService]，写时落盘并更新 UI。
class PhotoBackupConfigNotifier extends StateNotifier<PhotoBackupConfig> {
  PhotoBackupConfigNotifier() : super(PhotoBackupService.instance.config);

  Future<void> update(PhotoBackupConfig next) async {
    final saved = await PhotoBackupService.instance.updateConfig(next);
    if (mounted) state = saved;
  }
}

final photoBackupConfigProvider =
    StateNotifierProvider<PhotoBackupConfigNotifier, PhotoBackupConfig>(
  (ref) => PhotoBackupConfigNotifier(),
);

/// 把 service 的 ValueNotifier 桥接成 Riverpod 可监听的 State。
/// UI 用它显示同步进度/状态。
final photoBackupStatusProvider = StreamProvider<PhotoBackupStatus>((ref) {
  // 用 StreamProvider 桥接 ValueNotifier。
  final controller = StreamController<PhotoBackupStatus>.broadcast();
  final service = PhotoBackupService.instance;
  late void Function() listener;
  listener = () => controller.add(service.status.value);
  controller.add(service.status.value); // 立即推送当前值
  service.status.addListener(listener);
  ref.onDispose(() {
    service.status.removeListener(listener);
    controller.close();
  });
  return controller.stream;
});

/// 触发一次立即同步。
///
/// 直接从 service 注入上传依赖：调用方按需提供 client / 库 id / 目标文件夹。
/// 返回错误信息（如有），便于调用方 SnackBar 提示。
Future<String?> triggerBackupSync({
  required MiraClient? client,
  required String? libId,
  required int? folderId,
}) async {
  if (client == null || libId == null) {
    return 'backup.notConnectedShort';
  }
  await PhotoBackupService.instance.syncNow(
    upload: (file) => client.files().uploadFile(file, libId, folderId: folderId),
  );
  return PhotoBackupService.instance.status.value.error;
}

/// 便捷：在生命周期回调中按配置 + 连接态触发同步。
/// 未启用或未连接直接返回。
Future<void> maybeAutoSync(WidgetRef ref) async {
  final cfg = ref.read(photoBackupConfigProvider);
  if (!cfg.enabled) return;
  final session = ref.read(sessionProvider);
  if (!session.isConnected ||
      session.client == null ||
      session.library == null) {
    return;
  }
  await triggerBackupSync(
    client: session.client,
    libId: session.library!.id,
    folderId: cfg.targetFolderId,
  );
}
