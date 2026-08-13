import 'package:easy_localization/easy_localization.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../router/app_router.dart';
import '../../providers/files_provider.dart';
import '../../providers/session_provider.dart';
import '../../providers/upload_provider.dart';
import '../../services/upload_service.dart';
import '../../utils/media_utils.dart';
import '../../widgets/glass/mira_ui.dart';

/// 上传页：file_picker 选文件 → [UploadService] 入队并发送 → 完成刷新画廊。
///
/// 任务列表存活于 [UploadService] 单例，离开页面再回来仍能看到历史 /
/// 进行中的任务。本页只负责 UI 与依赖（session client/libId）注入。
class UploadScreen extends ConsumerStatefulWidget {
  const UploadScreen({super.key});

  @override
  ConsumerState<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends ConsumerState<UploadScreen> {
  /// 驱动大标题折叠 + 内联小标题淡入；其 scrollController 由下面的
  /// CustomScrollView 复用（不要另建 ScrollController）。
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();

  @override
  void initState() {
    super.initState();
    // 上传成功 → 刷新画廊。用根 ProviderContainer 注入，即便本页销毁
    // （用户切走）容器仍有效，上传完成后画廊依旧能刷新。
    final container = ProviderScope.containerOf(context, listen: false);
    UploadService.instance.onFileUploaded = () {
      container.read(filesViewProvider.notifier).reload();
    };
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(allowMultiple: true);
    if (result == null || result.files.isEmpty) return;
    final picks = <({String path, String name, int size})>[];
    for (final pf in result.files) {
      final path = pf.path;
      if (path == null) continue;
      picks.add((path: path, name: pf.name, size: pf.size));
    }
    if (picks.isEmpty) return;
    final session = ref.read(sessionProvider);
    UploadService.instance.enqueue(
      picks,
      client: session.client,
      libId: session.library?.id,
    );
  }

  void _retryTask(UploadTask t) {
    final session = ref.read(sessionProvider);
    UploadService.instance.retryTask(
      t.id,
      client: session.client,
      libId: session.library?.id,
    );
  }

  void _retryAllFailed() {
    final session = ref.read(sessionProvider);
    UploadService.instance.retryAllFailed(
      client: session.client,
      libId: session.library?.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final title = 'upload.title'.tr();
    final topPad = MediaQuery.paddingOf(context).top;
    final tasks = ref.watch(uploadQueueProvider).valueOrNull ?? const <UploadTask>[];
    final hasFailed = tasks.any((t) => t.status == UploadStatus.failed);
    final hasFinished = tasks.any((t) => t.status != UploadStatus.uploading);
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        padding: GlassLayout.appBarPadding,
        leading: glassBackButton(context, onPressed: AppRouter.goBack),
        title: Text(title),
        largeTitleController: _titleController,
      ),
      body: Material(
        type: MaterialType.transparency,
        child: CustomScrollView(
          controller: _titleController.scrollController,
          slivers: [
            // 状态栏 + GlassAppBar 工具栏高度，把大标题推到返回按钮栏正下方。
            SliverToBoxAdapter(
              child: SizedBox(height: topPad + GlassLayout.largeTitleTopOffset),
            ),
            GlassLargeTitle(text: title, controller: _titleController),
            // 任务区标题 + 操作按钮
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('upload.tasks'.tr(),
                          style: theme.textTheme.titleMedium),
                    ),
                    if (hasFailed)
                      MiraIconButton(
                        size: 40,
                        tooltip: 'upload.retryAll'.tr(),
                        icon: Icon(Icons.refresh,
                            color: isDark ? Colors.white : Colors.black87),
                        onPressed: _retryAllFailed,
                      ),
                    if (hasFailed && hasFinished) const SizedBox(width: 8),
                    if (hasFinished)
                      MiraIconButton(
                        size: 40,
                        tooltip: 'upload.clearFinished'.tr(),
                        icon: Icon(Icons.delete_sweep_outlined,
                            color: isDark ? Colors.white : Colors.black87),
                        onPressed: UploadService.instance.clearFinished,
                      ),
                  ],
                ),
              ),
            ),
            if (tasks.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 96),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.cloud_upload_outlined,
                            size: 64,
                            color:
                                theme.colorScheme.primary.withValues(alpha: 0.5)),
                        const SizedBox(height: 12),
                        Text('upload.emptyHint'.tr(),
                            style: TextStyle(
                                color: isDark
                                    ? Colors.white54
                                    : Colors.black54)),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                sliver: SliverList.separated(
                  itemCount: tasks.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => _UploadTaskItem(
                    task: tasks[i],
                    onRetry: () => _retryTask(tasks[i]),
                  ),
                ),
              ),
          ],
        ),
      ),
      bottomBar: Padding(
        padding: const EdgeInsets.all(16.0),
        child: MiraButton.icon(
          onPressed: _pickAndUpload,
          icon: Icon(Icons.attach_file,
              color: isDark ? Colors.white : Colors.black87),
          label: 'upload.selectFiles'.tr(),
          isPrimary: true,
          expanded: true,
        ),
      ),
    );
  }
}

class _UploadTaskItem extends StatelessWidget {
  final UploadTask task;
  final VoidCallback onRetry;
  const _UploadTaskItem({required this.task, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final isErr = task.status == UploadStatus.failed;
    final isUploading = task.status == UploadStatus.uploading;
    final isRetrying = isUploading && task.retries > 0;
    // 副标题：失败显示错误；自动重试中显示重试进度；
    // 上传中显示百分比（进度未知时退化为“上传中…”）；完成显示文件大小。
    final subtitle = isErr
        ? task.error!
        : isRetrying
            ? 'upload.retrying'.tr(namedArgs: {
                'n': '${task.retries}',
                'max': '${UploadService.maxAutoRetries}'
              })
            : isUploading
                ? (task.progress > 0
                    ? 'upload.uploadingProgress'
                        .tr(namedArgs: {'p': '${(task.progress * 100).round()}'})
                    : 'upload.uploading'.tr())
                : MediaUtils.formatSize(task.size);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.insert_drive_file_outlined),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(task.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: isErr ? Colors.red.shade600 : Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              if (task.status == UploadStatus.done)
                Icon(Icons.check_circle, color: Colors.green.shade500)
              else if (isErr)
                MiraIconButton(
                  tooltip: 'common.retry'.tr(),
                  icon: Icon(Icons.refresh, color: Colors.red.shade500),
                  onPressed: onRetry,
                )
              else
                const MiraCircularProgressIndicator(size: 18, strokeWidth: 2),
            ],
          ),
          if (!isErr && task.status != UploadStatus.done) ...[
            const SizedBox(height: 8),
            MiraLinearProgressIndicator(
              value: task.progress <= 0 ? null : task.progress,
              backgroundColor: Theme.of(context).colorScheme.surface,
            ),
          ],
        ],
      ),
    );
  }
}
