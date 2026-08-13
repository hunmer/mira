import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'session_provider.dart';

/// 标签全量列表 provider：调 tags().getAll()，客户端组树。
final tagsProvider = FutureProvider<List<Tag>>((ref) async {
  final libId = ref.watch(sessionProvider.select((s) => s.library?.id));
  final client = ref.watch(sessionProvider).client;
  if (libId == null || client == null) return const [];
  return client.tags().getAll(libId);
});
