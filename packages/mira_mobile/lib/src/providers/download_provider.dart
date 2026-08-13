import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../services/download_service.dart';
import 'session_provider.dart';

/// 下载配置 State：读自 [DownloadService]，写时落盘并更新 UI。
class DownloadConfigNotifier extends StateNotifier<DownloadConfig> {
  DownloadConfigNotifier() : super(DownloadService.instance.config);

  Future<void> update(DownloadConfig next) async {
    final saved = await DownloadService.instance.updateConfig(next);
    if (mounted) state = saved;
  }
}

final downloadConfigProvider =
    StateNotifierProvider<DownloadConfigNotifier, DownloadConfig>(
  (ref) => DownloadConfigNotifier(),
);

/// 把 service 的 ValueNotifier 桥接成 Riverpod 可监听的 State。
/// UI 用它展示下载队列（任务列表 + 进度）。
final downloadQueueProvider = StreamProvider<List<DownloadTask>>((ref) {
  final controller = StreamController<List<DownloadTask>>.broadcast();
  final service = DownloadService.instance;
  late void Function() listener;
  listener = () => controller.add(List.unmodifiable(service.tasks.value));
  controller.add(List.unmodifiable(service.tasks.value)); // 立即推送当前值
  service.tasks.addListener(listener);
  ref.onDispose(() {
    service.tasks.removeListener(listener);
    controller.close();
  });
  return controller.stream;
});

/// 进行中任务数（pending + downloading），用于画廊头部角标。
final downloadActiveCountProvider = StreamProvider<int>((ref) {
  final controller = StreamController<int>.broadcast();
  final service = DownloadService.instance;
  late void Function() listener;
  listener = () => controller.add(service.activeCount);
  controller.add(service.activeCount);
  service.tasks.addListener(listener);
  ref.onDispose(() {
    service.tasks.removeListener(listener);
    controller.close();
  });
  return controller.stream;
});

/// 便捷：把一组文件加入下载队列。
///
/// 从当前 session 注入 client 与库 id。返回是否成功入队（未连接时 false）。
bool enqueueDownloads(WidgetRef ref, List<FileData> files) {
  final session = ref.read(sessionProvider);
  final client = session.client;
  final libId = session.library?.id;
  if (client == null || libId == null) return false;
  DownloadService.instance.enqueue(files, client: client, libId: libId);
  return true;
}

/// 画廊当前选中文件 id 集合（transient，切走/退出时 clear）。
final selectionProvider = StateNotifierProvider<SelectionNotifier, Set<int>>(
  (ref) => SelectionNotifier(),
);

class SelectionNotifier extends StateNotifier<Set<int>> {
  SelectionNotifier() : super(const {});

  void toggle(int id) {
    final next = Set<int>.from(state);
    if (!next.add(id)) next.remove(id);
    state = next;
  }

  void add(int id) {
    if (state.contains(id)) return;
    state = {...state, id};
  }

  void selectAll(Iterable<int> ids) => state = Set<int>.from(ids);

  void clear() => state = const {};
}
