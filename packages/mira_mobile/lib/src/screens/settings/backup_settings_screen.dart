import 'package:easy_localization/easy_localization.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:photo_manager/photo_manager.dart';

import '../../../router/app_router.dart';
import '../../providers/photo_backup_provider.dart';
import '../../providers/session_provider.dart';
import '../../services/photo_backup_collector.dart';
import '../../services/photo_backup_service.dart';
import '../../widgets/glass/mira_ui.dart';
import '../tree_view/folder_tag_select_dialog.dart';
import 'album_picker_screen.dart';

/// 相册自动备份设置页。
///
/// 平台差异：
/// - iOS / Android / macOS：用 photo_manager 读相册，「来源」选具体相册。
/// - Windows / Linux：用本地目录扫描，「来源」选一个监听文件夹。
///
/// App 回到前台时若已启用且已连接，按来源扫描新增图片/视频上传到目标文件夹。
class BackupSettingsScreen extends ConsumerStatefulWidget {
  const BackupSettingsScreen({super.key});

  @override
  ConsumerState<BackupSettingsScreen> createState() =>
      _BackupSettingsScreenState();
}

class _BackupSettingsScreenState extends ConsumerState<BackupSettingsScreen> {
  /// 仅 photo_manager 平台使用：相册访问权限状态（null=未检查）。
  bool? _hasAlbumAccess;

  /// 仅 photo_manager 平台使用：可选相册列表。
  List<AssetPathEntity> _albums = const [];

  /// 驱动大标题折叠 + 内联小标题淡入；其 scrollController 由下面的
  /// CustomScrollView 复用（不要另建 ScrollController）。
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();

  @override
  void initState() {
    super.initState();
    if (kBackupUsesPhotoManager) {
      // 进入页面时检查相册权限并加载相册列表。
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _checkAlbumPermission(),
      );
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _checkAlbumPermission() async {
    final ps = await PhotoManager.requestPermissionExtend();
    final ok = ps.hasAccess;
    List<AssetPathEntity> albums = const [];
    if (ok) {
      try {
        albums = await PhotoManager.getAssetPathList(type: RequestType.common);
      } catch (_) {
        albums = const [];
      }
    }
    if (mounted) setState(() => _albums = albums);
    if (mounted) setState(() => _hasAlbumAccess = ok);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final connected = session.isConnected && session.library != null;
    final cfg = ref.watch(photoBackupConfigProvider);
    final title = 'backup.title'.tr();
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
            SliverList(
              delegate: SliverChildListDelegate([
                if (!connected)
                  _Banner(
                    icon: Icons.cloud_off_outlined,
                    text: 'backup.notConnected'.tr(),
                    color: Colors.orange,
                  ),
                // 权限提示仅 photo_manager 平台需要。
                if (kBackupUsesPhotoManager && _hasAlbumAccess == false)
                  _Banner(
                    icon: Icons.lock_outline,
                    text: 'backup.noPermission'.tr(),
                    color: Colors.red,
                    actionText: 'backup.authorize'.tr(),
                    onAction: () => PhotoManager.openSetting(),
                  ),
                _buildEnableTile(),
                _SectionLabel('backup.target'.tr()),
                _FolderTile(enabled: cfg.enabled),
                _SectionLabel('backup.source'.tr()),
                if (kBackupUsesPhotoManager)
                  _AlbumTile(albums: _albums, loading: _hasAlbumAccess == null)
                else
                  _WatchDirTile(enabled: cfg.enabled),
                _SectionLabel('backup.content'.tr()),
                _buildContentTile(),
                const SizedBox(height: 16),
                _buildSyncButton(),
                _buildStatus(),
                const SizedBox(height: 32),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnableTile() {
    final cfg = ref.watch(photoBackupConfigProvider);
    return MiraSwitchTile(
      leading: Icon(Icons.backup_outlined, color: Colors.orange),
      title: Text('backup.enable'.tr()),
      subtitle: Text(
        kBackupUsesPhotoManager
            ? 'backup.enableHintPM'.tr()
            : 'backup.enableHintDir'.tr(),
      ),
      value: cfg.enabled,
      onChanged: (v) => ref
          .read(photoBackupConfigProvider.notifier)
          .update(cfg.copyWith(enabled: v)),
    );
  }

  Widget _buildContentTile() {
    final cfg = ref.watch(photoBackupConfigProvider);
    final hint = _filterHint(cfg);
    return MiraListTile(
      leading: Icon(Icons.tune, color: Colors.blueGrey),
      title: Text(_contentSummary(cfg)),
      subtitle: hint == null
          ? null
          : Text(
              hint,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
      trailing: MiraListTile.chevron,
      onTap: () => showMiraDialog(
        context: context,
        builder: (_) => _BackupContentDialog(initial: cfg),
      ),
    );
  }

  /// 备份内容入口的标题摘要：已选类型（图片/视频），都没选则提示未选。
  String _contentSummary(PhotoBackupConfig cfg) {
    final types = <String>[
      if (cfg.backupImages) 'backup.images'.tr(),
      if (cfg.backupVideos) 'backup.videos'.tr(),
    ];
    return types.isEmpty
        ? 'backup.noContentSelected'.tr()
        : types.join(' · ');
  }

  /// 备份内容入口的副标题摘要：已激活的过滤项计数；无过滤返回 null。
  String? _filterHint(PhotoBackupConfig cfg) {
    final n = [
      cfg.sizeMin != null || cfg.sizeMax != null,
      cfg.extensionWhitelist.isNotEmpty,
      cfg.extensionBlacklist.isNotEmpty,
    ].where((b) => b).length;
    return n == 0 ? null : 'backup.filtersCount'.tr(namedArgs: {'count': '$n'});
  }

  Widget _buildSyncButton() {
    final status = ref.watch(photoBackupStatusProvider);
    final running = status.value?.running ?? false;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // prominent 玻璃在亮色渐变上偏浅，文字需随亮度切换保证对比度。
    final fg = isDark ? Colors.white : Colors.black87;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: MiraButton.loading(
        isPrimary: true,
        expanded: true,
        loading: running,
        onPressed: running
            ? null
            : () async {
                final session = ref.read(sessionProvider);
                final err = await triggerBackupSync(
                  client: session.client,
                  libId: session.library?.id,
                  folderId: ref.read(photoBackupConfigProvider).targetFolderId,
                );
                if (!mounted) return;
                // err 是 i18n key（连接错误等）；否则取完成态消息，
                // 其中的计数变量需在 _resolveBackupMessage 内补齐，否则 {count} 等会原样显示。
                final st = PhotoBackupService.instance.status.value;
                final msg = err != null ? err.tr() : _resolveBackupMessage(st);
                if (msg != null) {
                  showMiraToast(context, message: msg);
                }
              },
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_upload_outlined, color: fg),
            const SizedBox(width: 6),
            Text(
              running ? 'backup.syncing'.tr() : 'backup.syncNow'.tr(),
              style: TextStyle(color: fg),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatus() {
    final status = ref.watch(photoBackupStatusProvider);
    final st = status.value;
    if (st == null) return const SizedBox.shrink();

    String? text;
    if (st.running) {
      text = st.total > 0
          ? 'backup.syncingProgress'.tr(
              namedArgs: {
                'processed': '${st.processed}',
                'total': '${st.total}',
                'name': (st.currentName ?? '').tr(),
              },
            )
          : (st.message?.tr() ?? 'backup.syncing'.tr());
    } else if (st.error != null) {
      text = 'backup.error'.tr(namedArgs: {'error': st.error!.tr()});
    } else if (st.message != null) {
      // 完成消息带计数：doneAll / donePartial 的 namedArgs 在 _resolveBackupMessage 内补齐。
      text = _resolveBackupMessage(st);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (st.running && st.progress != null) ...[
            MiraLinearProgressIndicator(value: st.progress),
            const SizedBox(height: 8),
          ],
          if (text != null)
            Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          if (st.lastSyncedAtMs != null) ...[
            const SizedBox(height: 4),
            Text(
              'backup.lastSync'.tr(
                namedArgs: {'time': _formatTime(st.lastSyncedAtMs!)},
              ),
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(int ms) {
    final dt = DateTime.fromMillisecondsSinceEpoch(ms);
    String two(int n) => n.toString().padLeft(2, '0');
    return '${dt.year}-${two(dt.month)}-${two(dt.day)} ${two(dt.hour)}:${two(dt.minute)}';
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 16, 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
        ),
      ),
    );
  }
}

/// 顶部提示横幅（权限/连接态）。
class _Banner extends StatelessWidget {
  const _Banner({
    required this.icon,
    required this.text,
    required this.color,
    this.actionText,
    this.onAction,
  });

  final IconData icon;
  final String text;
  final Color color;
  final String? actionText;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: TextStyle(fontSize: 13, color: color)),
          ),
          if (actionText != null && onAction != null)
            MiraButton(onPressed: onAction, child: Text(actionText!)),
        ],
      ),
    );
  }
}

/// 选择目标文件夹（上传到哪个素材库文件夹）。
class _FolderTile extends ConsumerWidget {
  const _FolderTile({required this.enabled});
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cfg = ref.watch(photoBackupConfigProvider);
    return MiraListTile(
      leading: Icon(
        Icons.folder_outlined,
        color: enabled ? Colors.indigo : Colors.grey,
      ),
      title: Text('backup.saveToFolder'.tr()),
      subtitle: Text(
        cfg.targetFolderName ?? 'backup.noTarget'.tr(),
        style: TextStyle(
          fontSize: 12,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      ),
      trailing: MiraListTile.chevron,
      onTap: enabled
          ? () async {
              final result = await showFolderTagSelectDialog(
                context,
                multiSelect: false,
                initialShowTags: false,
                title: 'tree.backupTo',
              );
              final id = result?.singleId;
              await ref
                  .read(photoBackupConfigProvider.notifier)
                  .update(
                    cfg.copyWith(
                      targetFolderId: id,
                      targetFolderName: result?.singleTitle,
                    ),
                  );
            }
          : null,
    );
  }
}

/// Windows / Linux：选择一个本地监听目录。
class _WatchDirTile extends ConsumerWidget {
  const _WatchDirTile({required this.enabled});
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cfg = ref.watch(photoBackupConfigProvider);
    return MiraListTile(
      leading: Icon(
        Icons.computer_outlined,
        color: enabled ? Colors.teal : Colors.grey,
      ),
      title: Text('backup.watchDir'.tr()),
      subtitle: Text(
        cfg.watchDir ?? 'backup.noWatchDir'.tr(),
        style: TextStyle(
          fontSize: 12,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: MiraListTile.chevron,
      onTap: enabled
          ? () async {
              final dir = await FilePicker.platform.getDirectoryPath(
                dialogTitle: 'backup.pickWatchDir'.tr(),
              );
              if (dir == null) return;
              await ref
                  .read(photoBackupConfigProvider.notifier)
                  .update(cfg.copyWith(watchDir: dir));
            }
          : null,
    );
  }
}

/// iOS/Android/macOS：选择来源相册（多选；空=全部）。
class _AlbumTile extends ConsumerWidget {
  const _AlbumTile({required this.albums, required this.loading});
  final List<AssetPathEntity> albums;
  final bool loading;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cfg = ref.watch(photoBackupConfigProvider);
    final selected = cfg.selectedAlbumIds.toSet();
    final summary = selected.isEmpty
        ? 'backup.allAlbums'.tr()
        : 'backup.selectedCount'.tr(namedArgs: {'count': '${selected.length}'});
    return MiraListTile(
      leading: Icon(
        Icons.photo_library_outlined,
        color: !loading ? Colors.teal : Colors.grey,
      ),
      title: Text('backup.albumSource'.tr()),
      subtitle: Text(
        summary,
        style: TextStyle(
          fontSize: 12,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      ),
      trailing: MiraListTile.chevron,
      onTap: loading ? null : () => _showAlbumPicker(context, ref, selected),
    );
  }

  Future<void> _showAlbumPicker(
    BuildContext context,
    WidgetRef ref,
    Set<String> selected,
  ) async {
    if (albums.isEmpty) {
      showMiraToast(context, message: 'backup.noAlbums'.tr());
      return;
    }
    // 打开相册浏览页（带封面缩略图）；返回 null 表示取消。
    final result = await AlbumPickerScreen.show(
      context,
      albums: albums,
      initialSelected: selected,
    );
    if (result == null) return;
    final cfg = ref.read(photoBackupConfigProvider);
    await ref
        .read(photoBackupConfigProvider.notifier)
        .update(cfg.copyWith(selectedAlbumIds: result.toList()));
  }
}

const int _mb = 1024 * 1024;

/// 规整扩展名输入：按逗号/分号/空白分隔，去前导点，转小写，去重去空。
List<String> _normalizeExtensions(String input) {
  return input
      .split(RegExp(r'[,;\s]+'))
      .map((e) => e.trim().toLowerCase().replaceAll(RegExp(r'^\.+'), ''))
      .where((e) => e.isNotEmpty)
      .toSet()
      .toList();
}

/// 翻译备份完成态 message key；doneAll / donePartial 需补计数 namedArgs，
/// 否则 `{count}` / `{success}` / `{failed}` 会原样显示。message 为空返回 null。
String? _resolveBackupMessage(PhotoBackupStatus st) {
  final msg = st.message;
  if (msg == null) return null;
  switch (msg) {
    case 'backup.doneAll':
      return 'backup.doneAll'.tr(namedArgs: {'count': '${st.processed}'});
    case 'backup.donePartial':
      return 'backup.donePartial'.tr(
        namedArgs: {
          'success': '${st.processed - st.failed}',
          'failed': '${st.failed}',
        },
      );
    default:
      return msg.tr();
  }
}

/// 备份内容统一编辑表单（Glass）。
///
/// 把「图片/视频类型 + 文件大小范围 + 扩展名白/黑名单」合并进一个 GlassDialog，
/// 替代此前多个独立 Material [AlertDialog]。类型用开关而非勾选框；
/// 确认时直接写入 [photoBackupConfigProvider]。
class _BackupContentDialog extends ConsumerStatefulWidget {
  const _BackupContentDialog({required this.initial});

  final PhotoBackupConfig initial;

  @override
  ConsumerState<_BackupContentDialog> createState() =>
      _BackupContentDialogState();
}

class _BackupContentDialogState extends ConsumerState<_BackupContentDialog> {
  late bool _images = widget.initial.backupImages;
  late bool _videos = widget.initial.backupVideos;

  /// 当前命中的大小预设 id（用于 chip 高亮）；手动改输入则置空。
  String? _preset;

  late final TextEditingController _minCtrl = TextEditingController(
    text: widget.initial.sizeMin == null
        ? ''
        : (widget.initial.sizeMin! ~/ _mb).toString(),
  );
  late final TextEditingController _maxCtrl = TextEditingController(
    text: widget.initial.sizeMax == null
        ? ''
        : (widget.initial.sizeMax! ~/ _mb).toString(),
  );
  late final TextEditingController _whitelistCtrl = TextEditingController(
    text: widget.initial.extensionWhitelist.join(', '),
  );
  late final TextEditingController _blacklistCtrl = TextEditingController(
    text: widget.initial.extensionBlacklist.join(', '),
  );

  @override
  void initState() {
    super.initState();
    _preset = _detectPreset();
  }

  @override
  void dispose() {
    _minCtrl.dispose();
    _maxCtrl.dispose();
    _whitelistCtrl.dispose();
    _blacklistCtrl.dispose();
    super.dispose();
  }

  /// 根据初始字节范围推断命中的预设（精确匹配 MB 边界才高亮）。
  String? _detectPreset() {
    int? mb(int? b) => b == null ? null : b ~/ _mb;
    final lo = mb(widget.initial.sizeMin), hi = mb(widget.initial.sizeMax);
    if (lo == null && hi == 1) return 'small';
    if (lo == 1 && hi == 10) return 'medium';
    if (lo == 10 && hi == 100) return 'large';
    if (lo == 100 && hi == null) return 'huge';
    return null;
  }

  void _applyPreset(String id, int? minMB, int? maxMB) {
    setState(() {
      _preset = id;
      _minCtrl.text = minMB?.toString() ?? '';
      _maxCtrl.text = maxMB?.toString() ?? '';
    });
  }

  void _onConfirm() {
    final minVal = int.tryParse(_minCtrl.text.trim());
    final maxVal = int.tryParse(_maxCtrl.text.trim());
    final next = widget.initial.copyWith(
      backupImages: _images,
      backupVideos: _videos,
      sizeMin: minVal == null ? null : minVal * _mb,
      sizeMax: maxVal == null ? null : maxVal * _mb,
      extensionWhitelist: _normalizeExtensions(_whitelistCtrl.text),
      extensionBlacklist: _normalizeExtensions(_blacklistCtrl.text),
    );
    ref.read(photoBackupConfigProvider.notifier).update(next);
    Navigator.of(context).pop();
  }

  Widget _formLabel(String key) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 6, left: 4),
        child: Text(
          key.tr(),
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
      );

  Widget _presetChip({
    required String id,
    required String labelKey,
    int? minMB,
    int? maxMB,
  }) =>
      MiraChip(
        label: labelKey.tr(),
        selected: _preset == id,
        onTap: () => _applyPreset(id, minMB, maxMB),
      );

  @override
  Widget build(BuildContext context) {
    final hintStyle = TextStyle(
      fontSize: 12,
      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
    );
    return GlassDialog(
      settings: miraModalOverlaySettings(context),
      maxWidth: 380,
      title: 'backup.content'.tr(),
      content: Material(
        type: MaterialType.transparency,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.55,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // 类型（开关，非勾选框）
                MiraSwitchTile(
                  leading: Icon(Icons.photo_outlined, color: Colors.blue),
                  title: Text('backup.images'.tr()),
                  value: _images,
                  onChanged: (v) => setState(() => _images = v),
                ),
                MiraSwitchTile(
                  leading: Icon(Icons.videocam_outlined, color: Colors.red),
                  title: Text('backup.videos'.tr()),
                  subtitle: Text('backup.videosHint'.tr()),
                  value: _videos,
                  onChanged: (v) => setState(() => _videos = v),
                ),
                // 文件大小
                _formLabel('backup.size'),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _presetChip(
                        id: 'small',
                        labelKey: 'backup.sizeSmall',
                        maxMB: 1,
                      ),
                      _presetChip(
                        id: 'medium',
                        labelKey: 'backup.sizeMedium',
                        minMB: 1,
                        maxMB: 10,
                      ),
                      _presetChip(
                        id: 'large',
                        labelKey: 'backup.sizeLarge',
                        minMB: 10,
                        maxMB: 100,
                      ),
                      _presetChip(
                        id: 'huge',
                        labelKey: 'backup.sizeHuge',
                        minMB: 100,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: MiraTextField(
                          controller: _minCtrl,
                          keyboardType: TextInputType.number,
                          hintText: 'backup.sizeMin'.tr(),
                          onChanged: (_) => setState(() => _preset = null),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Text('–'),
                      ),
                      Expanded(
                        child: MiraTextField(
                          controller: _maxCtrl,
                          keyboardType: TextInputType.number,
                          hintText: 'backup.sizeMax'.tr(),
                          onChanged: (_) => setState(() => _preset = null),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 4),
                  child: Text('backup.sizeCustomHint'.tr(), style: hintStyle),
                ),
                // 扩展名白名单
                _formLabel('backup.extensionWhitelist'),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: MiraTextField(
                    controller: _whitelistCtrl,
                    hintText: 'backup.extensionInputLabel'.tr(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 4),
                  child: Text('backup.extensionHint'.tr(), style: hintStyle),
                ),
                // 扩展名黑名单
                _formLabel('backup.extensionBlacklist'),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: MiraTextField(
                    controller: _blacklistCtrl,
                    hintText: 'backup.extensionInputLabel'.tr(),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
      actions: [
        GlassDialogAction(
          label: 'common.cancel'.tr(),
          onPressed: () => Navigator.of(context).pop(),
        ),
        GlassDialogAction(
          label: 'common.confirm'.tr(),
          isPrimary: true,
          onPressed: _onConfirm,
        ),
      ],
    );
  }
}
