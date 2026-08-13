import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/upload_service.dart';

/// 把 [UploadService] 单例的 ValueNotifier 桥接成 Riverpod 可监听的 State。
/// UI 用它展示上传队列（任务列表 + 进度）。服务为单例，任务列表存活于
/// 服务，不随上传页面销毁而丢失——跨页面 / 重新进入仍能看到历史。
final uploadQueueProvider = StreamProvider<List<UploadTask>>((ref) {
  final controller = StreamController<List<UploadTask>>.broadcast();
  final service = UploadService.instance;
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

/// 进行中上传任务数，用于主导航右上角角标。
final uploadActiveCountProvider = StreamProvider<int>((ref) {
  final controller = StreamController<int>.broadcast();
  final service = UploadService.instance;
  void emit() =>
      controller.add(service.tasks.value.where((task) => task.isActive).length);
  service.tasks.addListener(emit);
  emit();
  ref.onDispose(() {
    service.tasks.removeListener(emit);
    controller.close();
  });
  return controller.stream;
});
