import 'package:easy_localization/easy_localization.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../router/app_router.dart';
import '../../providers/download_provider.dart';
import '../../services/download_service.dart';
import '../../widgets/glass/mira_ui.dart';
import '../download/download_queue_sheet.dart';

/// 下载设置页：保存路径 / 并行下载数 / 查看队列。
///
/// 复用设置页分组样式（section header + MiraCard 包裹多行 tile）。
/// 配置即时写回 [downloadConfigProvider]（service 落盘 + 调大并发时回填）。
class DownloadSettingsScreen extends ConsumerStatefulWidget {
  const DownloadSettingsScreen({super.key});

  @override
  ConsumerState<DownloadSettingsScreen> createState() =>
      _DownloadSettingsScreenState();
}

class _DownloadSettingsScreenState
    extends ConsumerState<DownloadSettingsScreen> {
  /// 驱动大标题折叠 + 内联小标题淡入；其 scrollController 由下面的
  /// CustomScrollView 复用（不要另建 ScrollController）。
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cfg = ref.watch(downloadConfigProvider);
    final title = 'download.settingsTitle'.tr();
    final topPad = MediaQuery.paddingOf(context).top;

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
            // 状态栏 + 预留间距，把大标题推到状态栏下方。
            // 状态栏 + GlassAppBar 工具栏高度，把大标题推到返回按钮栏正下方。
            SliverToBoxAdapter(
              child: SizedBox(height: topPad + GlassLayout.largeTitleTopOffset),
            ),
            GlassLargeTitle(text: title, controller: _titleController),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _SectionHeader(label: 'download.savePath'.tr()),
                  const SizedBox(height: 8),
                  MiraCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        MiraListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 10,
                          ),
                          leading: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.green.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.folder_outlined,
                              color: Colors.green,
                              size: 18,
                            ),
                          ),
                          title: Text('download.savePath'.tr()),
                          subtitle: Text(
                            cfg.saveDir == null
                                ? 'download.savePathDefault'.tr()
                                : cfg.saveDir!,
                            style: TextStyle(
                              fontSize: 12,
                              color: theme.colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: MiraListTile.chevron,
                          onTap: () => _pickSaveDir(context),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  _SectionHeader(label: 'download.maxConcurrent'.tr()),
                  const SizedBox(height: 8),
                  MiraCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        MiraListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 10,
                          ),
                          leading: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.blue.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.sync_alt,
                              color: Colors.blue,
                              size: 18,
                            ),
                          ),
                          title: Text('download.maxConcurrent'.tr()),
                          subtitle: Text(
                            '${cfg.maxConcurrent}',
                            style: TextStyle(
                              fontSize: 12,
                              color: theme.colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Row(
                            children: [
                              MiraIconButton(
                                icon: const Icon(Icons.remove_circle_outline),
                                size: 40,
                                onPressed:
                                    cfg.maxConcurrent >
                                        DownloadConfig.kMinConcurrent
                                    ? () =>
                                          _setConcurrent(cfg.maxConcurrent - 1)
                                    : null,
                              ),
                              Expanded(
                                child: MiraSlider(
                                  value: cfg.maxConcurrent.toDouble(),
                                  min: DownloadConfig.kMinConcurrent.toDouble(),
                                  max: DownloadConfig.kMaxConcurrent.toDouble(),
                                  divisions:
                                      DownloadConfig.kMaxConcurrent -
                                      DownloadConfig.kMinConcurrent,
                                  label: '${cfg.maxConcurrent}',
                                  onChanged: (v) => _setConcurrent(v.round()),
                                ),
                              ),
                              MiraIconButton(
                                icon: const Icon(Icons.add_circle_outline),
                                size: 40,
                                onPressed:
                                    cfg.maxConcurrent <
                                        DownloadConfig.kMaxConcurrent
                                    ? () =>
                                          _setConcurrent(cfg.maxConcurrent + 1)
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  _SectionHeader(label: 'download.queueTitle'.tr()),
                  const SizedBox(height: 8),
                  MiraCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: MiraListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 10,
                      ),
                      leading: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.orange.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.download_outlined,
                          color: Colors.orange,
                          size: 18,
                        ),
                      ),
                      title: Text('download.viewQueue'.tr()),
                      trailing: MiraListTile.chevron,
                      onTap: () => showDownloadQueueSheet(context),
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickSaveDir(BuildContext context) async {
    try {
      final dir = await FilePicker.platform.getDirectoryPath(
        dialogTitle: 'download.pickSavePath'.tr(),
      );
      if (dir == null) return;
      await ref
          .read(downloadConfigProvider.notifier)
          .update(ref.read(downloadConfigProvider).copyWith(saveDir: dir));
    } catch (_) {
      // 部分平台（如 iOS）不支持目录选择；提示使用默认路径。
      if (context.mounted) {
        showMiraToast(
          context,
          message: 'download.pickSavePathUnsupported'.tr(),
          type: MiraToastType.info,
        );
      }
    }
  }

  Future<void> _setConcurrent(int value) async {
    final clamped = value.clamp(
      DownloadConfig.kMinConcurrent,
      DownloadConfig.kMaxConcurrent,
    );
    await ref
        .read(downloadConfigProvider.notifier)
        .update(
          ref.read(downloadConfigProvider).copyWith(maxConcurrent: clamped),
        );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final dimColor = Theme.of(
      context,
    ).colorScheme.onSurface.withValues(alpha: 0.5);
    return Padding(
      padding: const EdgeInsets.only(left: 8, top: 4),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: dimColor,
        ),
      ),
    );
  }
}
