import 'dart:typed_data';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

import '../../../router/app_router.dart';
import '../../widgets/glass/mira_ui.dart';

/// 本地相册浏览/多选页（photo_manager + liquid_glass_widgets）。
///
/// 替代 [BackupSettingsScreen] 里旧的纯文字勾选弹窗：以 2 列宫格展示设备
/// 相册，每张卡片带封面缩略图 + 资产数量，点按切换选中，右上角玻璃徽标反馈。
///
/// - 入参 [albums]：调用方已加载好权限和相册列表后传入，这里不再重复鉴权。
/// - 入参 [initialSelected]：进入时已选中的相册 id；空集合表示「全部」。
/// - 返回：用户点「完成」→ 返回当前选中 id 集合（空=全部）；返回键取消 → null。
///
/// 选中语义与 [PhotoBackupConfig.selectedAlbumIds] 一致：空 = 备份全部相册，
/// 因此首格「全部相册」在 [local] 为空时处于选中态。
class AlbumPickerScreen extends StatefulWidget {
  const AlbumPickerScreen({
    super.key,
    required this.albums,
    required this.initialSelected,
  });

  final List<AssetPathEntity> albums;
  final Set<String> initialSelected;

  /// 以 push 方式打开，返回用户最终选中的相册 id 集合（null = 取消）。
  static Future<Set<String>?> show(
    BuildContext context, {
    required List<AssetPathEntity> albums,
    required Set<String> initialSelected,
  }) {
    return Navigator.of(context).push<Set<String>>(
      MaterialPageRoute(
        builder: (_) => AlbumPickerScreen(
          albums: albums,
          initialSelected: initialSelected,
        ),
      ),
    );
  }

  @override
  State<AlbumPickerScreen> createState() => _AlbumPickerScreenState();
}

class _AlbumPickerScreenState extends State<AlbumPickerScreen> {
  /// 本地选中态副本，确认（_confirm）后才 pop 返回。
  late final Set<String> _local = {...widget.initialSelected};

  /// 驱动大标题折叠 + 内联小标题淡入；其 scrollController 由下面的
  /// CustomScrollView 复用（不要另建 ScrollController）。
  final GlassLargeTitleController _titleController = GlassLargeTitleController();

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  void _toggle(String id) {
    setState(() {
      if (!_local.add(id)) _local.remove(id);
    });
  }

  /// 选「全部相册」：清空具体选中（空集合 = 全部）。
  void _selectAll() {
    if (_local.isEmpty) return;
    setState(_local.clear);
  }

  void _confirm() => Navigator.of(context).pop(Set<String>.of(_local));

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final title = 'backup.selectAlbums'.tr();
    final topPad = MediaQuery.paddingOf(context).top;
    final actionColor = isDark ? Colors.white : Colors.black87;

    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        padding: GlassLayout.appBarPadding,
        leading: glassBackButton(context, onPressed: AppRouter.goBack),
        title: Text(title),
        largeTitleController: _titleController,
        actions: [
          // iOS 风格「完成」文字按钮：不选 = 全部，也可确认返回。
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _confirm,
              child: Center(
                child: Text(
                  _local.isEmpty
                      ? 'backup.albumDone'.tr()
                      : '${'backup.albumDone'.tr()} · ${_local.length}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: actionColor,
                  ),
                ),
              ),
            ),
          ),
        ],
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
            if (widget.albums.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      'backup.noAlbums'.tr(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.6),
                      ),
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                sliver: SliverGrid(
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.0,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      // 第 0 格固定为「全部相册」。
                      if (i == 0) {
                        return _AllAlbumsCard(
                          selected: _local.isEmpty,
                          onTap: _selectAll,
                        );
                      }
                      final path = widget.albums[i - 1];
                      return _AlbumCard(
                        key: ValueKey(path.id),
                        path: path,
                        selected: _local.contains(path.id),
                        onTap: () => _toggle(path.id),
                      );
                    },
                    childCount: widget.albums.length + 1,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 右上角玻璃风格勾选徽标（选中/未选中两态）。
///
/// 复用项目既有选择指示器外观：圆形 + 白边，选中填充 primary 并打勾。
class _SelectionBadge extends StatelessWidget {
  const _SelectionBadge({required this.selected});
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? primary : Colors.black.withValues(alpha: 0.4),
        border: Border.all(color: Colors.white, width: 2),
      ),
      alignment: Alignment.center,
      child: selected
          ? const Icon(Icons.check, size: 16, color: Colors.white)
          : null,
    );
  }
}

/// 选中态整卡高亮：半透明 primary 蒙层 + primary 描边（与画廊卡片一致）。
class _SelectionOverlay extends StatelessWidget {
  const _SelectionOverlay();
  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: primary.withValues(alpha: 0.28),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: primary, width: 2.5),
        ),
      ),
    );
  }
}

/// 相册底部信息（名称 + 数量）渐变蒙层。
class _AlbumCaption extends StatelessWidget {
  const _AlbumCaption({required this.name, this.count});
  final String name;
  final int? count;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(16),
        ),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [Colors.black87, Colors.transparent],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 18, 10, 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (count != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'backup.albumItems'.tr(namedArgs: {'count': '$count'}),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 首格「全部相册」：无封面，用玻璃感渐变 + 图标代替；选中态 = 本地未选具体相册。
class _AllAlbumsCard extends StatelessWidget {
  const _AllAlbumsCard({required this.selected, required this.onTap});
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return MiraCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 渐变占位：模拟「合集」封面，区别于具体相册的真实照片。
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  theme.colorScheme.primary.withValues(alpha: 0.35),
                  theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Icon(Icons.photo_library, size: 40, color: Colors.white),
            ),
          ),
          _AlbumCaption(name: 'backup.allAlbums'.tr()),
          if (selected) const Positioned.fill(child: _SelectionOverlay()),
          Positioned(top: 8, right: 8, child: _SelectionBadge(selected: selected)),
        ],
      ),
    );
  }
}

/// 单个相册卡片：懒加载封面缩略图与资产数量。
///
/// 封面取相册最新一张资产的缩略图（photo_manager 默认按时间倒序），
/// 数量用 [AssetPathEntity.assetCountAsync]。加载中/失败用玻璃占位兜底。
class _AlbumCard extends StatefulWidget {
  const _AlbumCard({
    super.key,
    required this.path,
    required this.selected,
    required this.onTap,
  });

  final AssetPathEntity path;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_AlbumCard> createState() => _AlbumCardState();
}

class _AlbumCardState extends State<_AlbumCard> {
  Uint8List? _cover;
  int? _count;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    Uint8List? cover;
    int? count;
    try {
      final assets = await widget.path.getAssetListPaged(page: 0, size: 1);
      if (assets.isNotEmpty) {
        cover = await assets.first.thumbnailDataWithSize(
          const ThumbnailSize.square(256),
        );
      }
    } catch (_) {
      // 封面读取失败 → 走占位
    }
    try {
      count = await widget.path.assetCountAsync;
    } catch (_) {
      // 数量读取失败 → 不显示数量
    }
    if (mounted) {
      setState(() {
        _cover = cover;
        _count = count;
        _loading = false;
      });
    }
  }

  Widget _buildCover() {
    if (_cover != null) {
      return Image.memory(
        _cover!,
        fit: BoxFit.cover,
        gaplessPlayback: true,
      );
    }
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Center(
        child: _loading
            ? const MiraCircularProgressIndicator(strokeWidth: 2.5)
            : Icon(
                Icons.photo_outlined,
                size: 40,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MiraCard(
      padding: EdgeInsets.zero,
      onTap: widget.onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: _buildCover(),
          ),
          _AlbumCaption(name: widget.path.name, count: _count),
          if (widget.selected)
            const Positioned.fill(child: _SelectionOverlay()),
          Positioned(
            top: 8,
            right: 8,
            child: _SelectionBadge(selected: widget.selected),
          ),
        ],
      ),
    );
  }
}
