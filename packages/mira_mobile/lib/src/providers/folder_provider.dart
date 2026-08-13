import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'session_provider.dart';

/// 文件夹全量列表 provider：调 folders().getAll()，客户端组树。
///
/// 注意：不用 folders().query()/getSubFolders()（parent_id 过滤不可靠，见 plan 约束4）。
final foldersProvider = FutureProvider<List<Folder>>((ref) async {
  // watch session 的 library 变化
  final libId = ref.watch(sessionProvider.select((s) => s.library?.id));
  final client = ref.watch(sessionProvider).client;
  if (libId == null || client == null) return const [];
  return client.folders().getAll(libId);
});
