import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../providers/download_provider.dart';
import '../../providers/session_provider.dart';
import '../../services/download_service.dart';
import '../../utils/media_utils.dart';
import '../../widgets/glass/mira_ui.dart';

/// 下载队列底部浮层。
///
/// 监听 [downloadQueueProvider]，逐行展示任务状态与进度。
/// 失败项可重试，进行中/等待中项可取消；提供「清除已完成」。
/// 重试需要 session 仍连接（重新注入 client）。
Future<void> showDownloadQueueSheet(BuildContext context) {
  return showMiraBottomSheet<void>(
    context: context,
    builder: (ctx) => const _DownloadQueueSheet(),
  );
}

class _DownloadQueueSheet extends ConsumerWidget {
  const _DownloadQueueSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncTasks = ref.watch(downloadQueueProvider);
    final theme = Theme.of(context);
    final tasks = asyncTasks.valueOrNull ?? const <DownloadTask>[];

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题行 + 清除已完成
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text(
                  'download.queueTitle'.tr(),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (tasks.any((t) => !t.isActive))
                  MiraButton(
                    onPressed: () =>
                        DownloadService.instance.clearFinished(),
                    child: Text(
                      'download.clearCompleted'.tr(),
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Flexible(
            // 限制高度，队列过长时内部滚动。
            child: tasks.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.download_done_outlined,
                              size: 40, color: theme.hintColor),
                          const SizedBox(height: 10),
                          Text(
                            'download.empty'.tr(),
                            style: TextStyle(color: theme.hintColor),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    itemCount: tasks.length,
                    separatorBuilder: (_, _) =>
                        const MiraDivider(height: 1, indent: 64),
                    itemBuilder: (context, i) =>
                        _DownloadTaskRow(task: tasks[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _DownloadTaskRow extends ConsumerWidget {
  const _DownloadTaskRow({required this.task});
  final DownloadTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final session = ref.watch(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    final thumbUrl = (client != null && libId != null)
        ? MediaUtils.thumbUrl(client, libId, task.file.id)
        : '';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          // 缩略图
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 40,
              height: 40,
              child: thumbUrl.isEmpty
                  ? Container(
                      color: theme.colorScheme.surfaceContainerHighest,
                      child: Icon(Icons.insert_drive_file_outlined,
                          size: 20, color: theme.hintColor),
                    )
                  : CachedNetworkImage(
                      imageUrl: thumbUrl,
                      fit: BoxFit.cover,
                      placeholder: (_, _) => Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                      ),
                      errorWidget: (_, _, _) => Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                        child: Icon(Icons.broken_image_outlined,
                            size: 18, color: theme.hintColor),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          // 文件名 + 进度/状态
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  task.file.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                _StatusLine(task: task),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // 操作按钮：取消 / 重试
          _TrailingAction(task: task),
        ],
      ),
    );
  }
}

/// 状态文案 + 进度条。下载中显示进度条，失败显示错误。
class _StatusLine extends StatelessWidget {
  const _StatusLine({required this.task});
  final DownloadTask task;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    switch (task.status) {
      case DownloadStatus.pending:
        return Text('download.statusPending'.tr(),
            style: TextStyle(fontSize: 12, color: theme.hintColor));
      case DownloadStatus.downloading:
        final pct = task.progress == null
            ? ''
            : 'download.statusDownloading'
                .tr(namedArgs: {'pct': '${(task.progress! * 100).round()}'});
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (task.progress == null)
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: MiraLinearProgressIndicator(),
              )
            else
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: MiraLinearProgressIndicator(value: task.progress),
              ),
            Text(
              task.progress == null
                  ? 'download.statusDownloading'
                      .tr(namedArgs: {'pct': ''})
                  : pct,
              style: TextStyle(fontSize: 11, color: theme.hintColor),
            ),
          ],
        );
      case DownloadStatus.completed:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, size: 14, color: Colors.green.shade600),
            const SizedBox(width: 4),
            Text('download.statusCompleted'.tr(),
                style: TextStyle(
                    fontSize: 12, color: Colors.green.shade600)),
          ],
        );
      case DownloadStatus.failed:
        return Text(
          '${'download.statusFailed'.tr()}${task.error == null ? '' : '：${task.error}'}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 12, color: theme.colorScheme.error),
        );
      case DownloadStatus.cancelled:
        return Text('download.statusCancelled'.tr(),
            style: TextStyle(fontSize: 12, color: theme.hintColor));
    }
  }
}

class _TrailingAction extends ConsumerWidget {
  const _TrailingAction({required this.task});
  final DownloadTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final client = session.client;
    switch (task.status) {
      case DownloadStatus.pending:
      case DownloadStatus.downloading:
        return MiraIconButton(
          icon: const Icon(Icons.close, size: 20),
          size: 36,
          onPressed: () => DownloadService.instance.cancel(task.id),
        );
      case DownloadStatus.failed:
      case DownloadStatus.cancelled:
        // 重试需要 client：若 session 已断则禁用，提示未连接。
        return MiraIconButton(
          icon: Icon(Icons.refresh,
              size: 20, color: client == null ? null : themePrimary(context)),
          size: 36,
          onPressed: client == null
              ? null
              : () {
                  DownloadService.instance
                      .injectClient(task.id, client);
                  DownloadService.instance.retry(task.id);
                },
        );
      case DownloadStatus.completed:
        // 分享已下载文件（调用系统分享面板）。
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            MiraIconButton(
              icon: Icon(Icons.ios_share_outlined,
                  size: 20, color: themePrimary(context)),
              size: 36,
              onPressed: task.savedPath == null
                  ? null
                  : () async {
                      try {
                        await SharePlus.instance.share(
                          ShareParams(
                            files: [XFile(task.savedPath!)],
                            text: task.file.name,
                          ),
                        );
                      } catch (e) {
                        if (context.mounted) {
                          showMiraToast(
                            context,
                            message: 'download.shareFailed'
                                .tr(namedArgs: {'error': '$e'}),
                            type: MiraToastType.error,
                          );
                        }
                      }
                    },
            ),
          ],
        );
    }
  }

  Color themePrimary(BuildContext context) =>
      Theme.of(context).colorScheme.primary;
}
