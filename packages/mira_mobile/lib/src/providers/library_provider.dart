import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'session_provider.dart';

/// 素材库列表 provider：依赖已连接的 session。
///
/// watch sessionProvider，session 变化（连接/断开）时自动重新拉取。
final librariesProvider = FutureProvider<List<Library>>((ref) async {
  // watch session 状态变化
  ref.watch(sessionProvider);
  final session = ref.read(sessionProvider);
  final client = session.client;
  if (client == null || !session.isConnected && !session.isConnecting) {
    return const [];
  }
  if (!session.isConnected) {
    // connecting 中，暂无数据
    return const [];
  }
  return client.libraries().getAll();
});
