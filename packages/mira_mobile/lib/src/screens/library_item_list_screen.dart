import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flexbox_layout/flexbox_layout.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../../router/app_router.dart';
import '../providers/download_provider.dart';
import '../providers/file_filter_provider.dart';
import '../providers/files_provider.dart';
import '../providers/session_provider.dart';
import '../providers/tag_provider.dart';
import '../services/notification_service.dart';
import '../utils/media_utils.dart';
import '../widgets/filter_pickers.dart';
import '../widgets/glass/mira_ui.dart';
import 'tree_view/folder_tag_select_dialog.dart';

part 'library_item_list_filter_widgets.dart';
part 'library_item_list_gallery_widgets.dart';
part 'library_item_list_selection_widgets.dart';

/// A masonry gallery backed by [filesViewProvider] (real data) with infinite scroll.
///
/// 缩略图用 cached_network_image（带 token 的 URL 由 MediaUtils.thumbUrl 生成）。
/// 点击图片/视频 → 跳对应预览页，传递当前文件列表 + 索引。
///
/// 嵌入 MainShell 时，[scrollController] / [largeTitleController] 由外层传入，
/// 用以驱动 iOS26 风格的大标题折叠：大标题作为 [CustomScrollView] 的第一个
/// sliver（[GlassLargeTitle]），向上滚动时折叠成导航栏内联小标题。
class GalleryGrid extends ConsumerStatefulWidget {
  const GalleryGrid({
    super.key,
    this.scrollController,
    this.largeTitleText = 'gallery.title',
    this.largeTitleController,
    this.largeTitleTrailing,
  });

  /// 外层传入的滚动控制器（通常来自 GlassLargeTitleController）。
  /// 为 null 时内部自建一个（独立页面场景）。
  final ScrollController? scrollController;

  /// 大标题文本，需与导航栏小标题保持一致。
  final String largeTitleText;

  /// 协调大标题折叠动画的控制器；为 null 时不显示折叠联动（独立页面场景）。
  final GlassLargeTitleController? largeTitleController;

  /// 大标题行尾的 widget（如上传按钮），与大标题同行并随之淡出
  ///（Apple Music / Podcasts 模式，参考 liquid_glass apple_music_demo）。
  final Widget? largeTitleTrailing;

  @override
  ConsumerState<GalleryGrid> createState() => _GalleryGridState();
}

class _GalleryGridState extends ConsumerState<GalleryGrid>
    with DimensionResolverMixin {
  late final ScrollController _ownController;

  ScrollController get _scrollController =>
      widget.scrollController ?? _ownController;

  /// 多选模式：true 时点击卡片切换选中而非打开预览。
  bool _selectMode = false;

  /// 当前选中的文件 id 集合（多选模式用）。
  final Set<int> _selected = {};
  bool get _isSelectMode => _selectMode;
  bool _isSelected(int id) => _selected.contains(id);

  void _enterSelectMode(int fileId) {
    setState(() {
      _selectMode = true;
      _selected.add(fileId);
    });
  }

  void _exitSelectMode() {
    setState(() {
      _selectMode = false;
      _selected.clear();
    });
  }

  void _toggleSelected(int fileId) {
    setState(() {
      if (!_selected.add(fileId)) _selected.remove(fileId);
    });
  }

  void _toggleSelectAll(List<FileData> items) {
    setState(() {
      if (_selected.length == items.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(items.map((f) => f.id));
      }
    });
  }

  /// 当前是否处于「回收站」视图：决定操作条与删除语义。
  bool get _inRecycleBin => ref.read(fileFilterProvider).recycled;

  @override
  void initState() {
    super.initState();
    _ownController = ScrollController();
    // 首次进入触发首页加载
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(filesViewProvider.notifier).reload();
    });
  }

  /// 解析视口内尚未解析过的图片缩略图真实宽高比。
  ///
  /// 必要性：SliverDynamicFlexbox 在无 aspectRatioGetter 时，会用
  /// getMaxIntrinsicWidth(double.infinity) 测量每个 child 来推算宽高比；
  /// Card/Stack/CachedNetworkImage 不耐受无限宽 intrinsic 查询会抛
  /// 'width.isFinite' 断言。提供 getter 后 sliver 不再做 intrinsic 测量
  ///（sliver_dynamic_flexbox.dart:693-704 短路），直接用本方法的结果。
  /// 已解析过的 id 会跳过（DimensionResolver 内部也有缓存）。
  final Set<int> _resolvedIds = {};
  final Set<int> _dimensionRequests = {};
  final Map<int, GlobalKey> _itemKeys = {};
  String? _dimensionLibraryId;
  bool _firstPageVisible = false;

  void _revealFirstPageAfterLayout(List<FileData> items) {
    if (_firstPageVisible ||
        items.isEmpty ||
        items.any((file) => !isAspectRatioResolved(file.id))) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_firstPageVisible) {
        setState(() => _firstPageVisible = true);
      }
    });
  }

  @override
  void onDimensionError(Object key, Object error) {
    setItemDimension(key, const ItemDimension(width: 1, height: 1));
  }

  void _ensureRatiosResolved(List<FileData> items) {
    final session = ref.read(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    if (client == null || libId == null) return;
    if (_dimensionLibraryId != libId) {
      _dimensionLibraryId = libId;
      _resolvedIds.clear();
      _dimensionRequests.clear();
    }

    final pending = <FileData>[];
    for (final file in items) {
      // 图片/视频优先使用 metadata 宽高；其他媒体保持稳定的 4:3 兜底。
      if (!MediaUtils.isImage(file) && !MediaUtils.isVideo(file)) {
        if (!_resolvedIds.contains(file.id)) {
          setItemDimension(file.id, const ItemDimension(width: 4, height: 3));
          _resolvedIds.add(file.id);
        }
        continue;
      }
      if (!_resolvedIds.contains(file.id) &&
          _dimensionRequests.add(file.id) &&
          !pending.contains(file)) {
        pending.add(file);
      }
    }
    if (pending.isNotEmpty) _resolveMetadataDimensions(client, libId, pending);
  }

  Future<void> _resolveMetadataDimensions(
    MiraClient client,
    String libId,
    List<FileData> files,
  ) async {
    void fallback() {
      if (!mounted || !_isCurrentDimensionSession(client, libId)) return;
      for (final file in files) {
        if (_resolvedIds.add(file.id)) {
          final url = MediaUtils.thumbUrl(client, libId, file.id);
          resolveImageDimension(NetworkImage(url), key: file.id);
        }
      }
    }

    try {
      final dimensions = await client.files().getMetadataByIds(
        libId,
        files.map((file) => file.id).toList(),
      );
      if (!mounted || !_isCurrentDimensionSession(client, libId)) return;
      final byId = {for (final item in dimensions) item.id: item};
      for (final file in files) {
        final item = byId[file.id];
        final width = item?.width;
        final height = item?.height;
        if (width != null && height != null && width > 0 && height > 0) {
          setItemDimension(
            file.id,
            ItemDimension(width: width, height: height),
          );
          _resolvedIds.add(file.id);
        } else if (_resolvedIds.add(file.id)) {
          final url = MediaUtils.thumbUrl(client, libId, file.id);
          resolveImageDimension(NetworkImage(url), key: file.id);
        }
      }
    } catch (_) {
      fallback();
    }
  }

  bool _isCurrentDimensionSession(MiraClient client, String libId) {
    final session = ref.read(sessionProvider);
    return identical(session.client, client) && session.library?.id == libId;
  }

  @override
  void dispose() {
    _ownController.dispose();
    super.dispose();
  }

  void _scrollToFile(int fileId) {
    final itemContext = _itemKeys[fileId]?.currentContext;
    if (itemContext == null) return;
    Scrollable.ensureVisible(itemContext, alignment: 0.5);
  }

  void _openItem(FileData file) {
    if (!MediaUtils.isImage(file) && !MediaUtils.isVideo(file)) {
      AppRouter.navigateTo('/file_preview', arguments: file);
      return;
    }
    final view = ref.read(filesViewProvider);
    final files = view.items;
    final index = files.indexWhere((f) => f.id == file.id);
    final isVideo = MediaUtils.isVideo(file);
    AppRouter.navigateTo(
      isVideo ? '/video_preview' : '/image_preview',
      arguments: PreviewArgs(
        files: files,
        initialIndex: index < 0 ? 0 : index,
        onFileChanged: _scrollToFile,
      ),
    );
  }

  bool _onScroll(ScrollNotification n) {
    if (n is ScrollEndNotification &&
        n.metrics.pixels >= n.metrics.maxScrollExtent - 200) {
      final view = ref.read(filesViewProvider);
      if (!view.loading && view.hasMore) {
        ref.read(filesViewProvider.notifier).loadMore();
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final view = ref.watch(filesViewProvider);

    // 首次加载错误（无数据）：仍保留过滤器条，让用户能切换条件重试。
    if (view.error != null && view.items.isEmpty) {
      return _wrapClearFab(
        CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            ..._buildLargeTitleSlivers(context),
            _buildFilterHeader(),
            SliverFillRemaining(
              hasScrollBody: false,
              child: _StatusIndicator(
                icon: Icons.error_outline,
                message: 'gallery.loadFailed'.tr(
                  namedArgs: {'error': '${view.error}'},
                ),
                actionLabel: 'common.retry'.tr(),
                onAction: () => ref.read(filesViewProvider.notifier).reload(),
              ),
            ),
          ],
        ),
      );
    }

    // 空且非加载中：保留过滤器条。
    if (view.items.isEmpty && !view.loading) {
      return _wrapClearFab(
        CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            ..._buildLargeTitleSlivers(context),
            _buildFilterHeader(),
            SliverFillRemaining(
              hasScrollBody: false,
              child: _StatusIndicator(
                icon: Icons.photo_library_outlined,
                message: 'gallery.empty'.tr(),
              ),
            ),
          ],
        ),
      );
    }

    // 解析新增图片的宽高比（供 aspectRatioGetter 使用），跳过已解析的。
    _ensureRatiosResolved(view.items);
    _revealFirstPageAfterLayout(view.items);
    final ratioKey = Object.hashAll(
      view.items.map((file) => getAspectRatio(file.id)),
    );

    return _wrapClearFab(
      Stack(
        children: [
          NotificationListener<ScrollNotification>(
            onNotification: _onScroll,
            child: RefreshIndicator(
              onRefresh: () => ref.read(filesViewProvider.notifier).reload(),
              child: CustomScrollView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  ..._buildLargeTitleSlivers(context),
                  _buildFilterHeader(),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ).copyWith(bottom: 120),
                    sliver: SliverAnimatedOpacity(
                      opacity: _firstPageVisible ? 1 : 0,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeIn,
                      sliver: SliverDynamicFlexbox(
                        // 比例变化后重建，避免首屏保持默认比例直到用户滚动。
                        key: ValueKey(ratioKey),
                        flexboxDelegate: SliverDynamicFlexboxDelegate(
                          targetRowHeight: 200,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          defaultAspectRatio: 1.0,
                          // 提供 getter 后 sliver 不再用无限宽 intrinsic 测量 child，
                          // 避免 Card/Stack/CachedNetworkImage 触发 'width.isFinite' 断言。
                          aspectRatioGetter: (index) =>
                              getAspectRatio(view.items[index].id),
                        ),
                        childDelegate: SliverChildBuilderDelegate((
                          context,
                          index,
                        ) {
                          final file = view.items[index];
                          return _GalleryItemCard(
                            key: _itemKeys.putIfAbsent(file.id, GlobalKey.new),
                            file: file,
                            ref: ref,
                            selected: _isSelectMode && _isSelected(file.id),
                            selectMode: _isSelectMode,
                            onTap: () {
                              if (_isSelectMode) {
                                _toggleSelected(file.id);
                              } else {
                                _openItem(file);
                              }
                            },
                            onLongPress: () {
                              if (!_isSelectMode) {
                                _enterSelectMode(file.id);
                              } else {
                                _toggleSelected(file.id);
                              }
                            },
                          );
                        }, childCount: view.items.length),
                      ),
                    ),
                  ),
                  // 底部加载/结束指示器。
                  SliverToBoxAdapter(child: _buildFooter(view)),
                ],
              ),
            ),
          ),
          // 多选模式下的底部操作条。
          if (_isSelectMode)
            Positioned(
              left: 12,
              right: 12,
              bottom: MediaQuery.viewPaddingOf(context).bottom + 110,
              child: _SelectionActionBar(
                selectedCount: _selected.length,
                total: view.items.length,
                allSelected:
                    _selected.length == view.items.length &&
                    view.items.isNotEmpty,
                onSelectAll: () => _toggleSelectAll(view.items),
                onDownload: () {
                  _onBatchDownload(view.items);
                },
                // 回收站视图：把"下载"按钮替换为"恢复"。
                onRestore: _inRecycleBin
                    ? () => _onBatchRestore(view.items)
                    : null,
                onDelete: () => _onBatchDelete(view.items),
                onClose: _exitSelectMode,
              ),
            ),
        ],
      ),
    );
  }

  /// 批量下载：申请通知权限 → 加入下载队列 → toast 提示 → 退出多选。
  Future<void> _onBatchDownload(List<FileData> items) async {
    final selected = items.where((f) => _selected.contains(f.id)).toList();
    if (selected.isEmpty) {
      showMiraToast(
        context,
        message: 'select.selectNone'.tr(),
        type: MiraToastType.info,
      );
      return;
    }
    // 申请通知权限（Android 13+ / iOS），失败不阻断下载。
    await NotificationService.instance.requestPermissions();
    if (!mounted) return;
    final ok = enqueueDownloads(ref, selected);
    if (!ok) {
      showMiraToast(
        context,
        message: 'download.notConnected'.tr(),
        type: MiraToastType.warning,
      );
      return;
    }
    showMiraToast(
      context,
      message: 'download.queuedHint'.tr(),
      type: MiraToastType.success,
    );
    _exitSelectMode();
  }

  /// 批量删除：确认 → 串行 delete → reload + toast。
  ///
  /// 回收站视图下为「永久删除」（moveToRecycleBin:false，不可恢复，更强确认）；
  /// 普通视图下为「移入回收站」（moveToRecycleBin:true，可恢复）。
  Future<void> _onBatchDelete(List<FileData> items) async {
    final selected = items.where((f) => _selected.contains(f.id)).toList();
    if (selected.isEmpty) {
      showMiraToast(
        context,
        message: 'select.selectNone'.tr(),
        type: MiraToastType.info,
      );
      return;
    }
    final permanent = ref.read(fileFilterProvider).recycled;
    final confirmed = await showMiraConfirmDialog(
      context,
      title: permanent
          ? 'select.confirmPermanentDeleteTitle'
          : 'select.confirmDeleteTitle',
      message:
          (permanent
                  ? 'select.confirmPermanentDeleteMessage'
                  : 'select.confirmDeleteMessage')
              .tr(namedArgs: {'count': '${selected.length}'}),
      confirmText: 'common.delete',
      isDestructive: true,
    );
    if (confirmed != true) return;

    final session = ref.read(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    if (client == null || libId == null) {
      if (!mounted) return;
      showMiraToast(
        context,
        message: 'download.notConnected'.tr(),
        type: MiraToastType.warning,
      );
      return;
    }

    int ok = 0, fail = 0;
    for (final f in selected) {
      try {
        await client.files().delete(
          libId,
          '${f.id}',
          moveToRecycleBin: !permanent,
        );
        ok++;
      } catch (_) {
        fail++;
      }
    }
    if (!mounted) return;
    showMiraToast(
      context,
      message:
          (permanent ? 'select.permanentDeleteResult' : 'select.deleteResult')
              .tr(namedArgs: {'ok': '$ok', 'fail': '$fail'}),
      type: fail > 0 ? MiraToastType.warning : MiraToastType.success,
    );
    _exitSelectMode();
    // 刷新画廊（删除/移到回收站后从列表移除）。
    ref.read(filesViewProvider.notifier).reload();
  }

  /// 批量恢复：仅回收站视图可用。串行 restoreFile → reload + toast。
  Future<void> _onBatchRestore(List<FileData> items) async {
    final selected = items.where((f) => _selected.contains(f.id)).toList();
    if (selected.isEmpty) {
      showMiraToast(
        context,
        message: 'select.selectNone'.tr(),
        type: MiraToastType.info,
      );
      return;
    }
    final session = ref.read(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    if (client == null || libId == null) {
      if (!mounted) return;
      showMiraToast(
        context,
        message: 'download.notConnected'.tr(),
        type: MiraToastType.warning,
      );
      return;
    }

    int ok = 0, fail = 0;
    for (final f in selected) {
      try {
        await client.files().restoreFile(libId, f.id);
        ok++;
      } catch (_) {
        fail++;
      }
    }
    if (!mounted) return;
    showMiraToast(
      context,
      message: 'select.restoreResult'.tr(
        namedArgs: {'ok': '$ok', 'fail': '$fail'},
      ),
      type: fail > 0 ? MiraToastType.warning : MiraToastType.success,
    );
    _exitSelectMode();
    // 刷新画廊（恢复后从回收站列表移除）。
    ref.read(filesViewProvider.notifier).reload();
  }

  Widget _buildFooter(FilesViewState view) {
    if (view.loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: MiraCircularProgressIndicator(),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Text(
          'gallery.noMore'.tr(),
          style: const TextStyle(color: Colors.grey),
        ),
      ),
    );
  }

  /// iOS26 大标题 sliver（第一个 sliver）。
  ///
  /// GlassScaffold 的 body 为 extendBody，从屏幕顶端 y=0 开始渲染，
  /// GlassLargeTitle 默认顶部 padding 为 0，会贴到状态栏区域。
  /// 这里先加一个高度为「状态栏 + 预留间距(24)」的占位 sliver，把大标题
  /// 推到状态栏下方。大标题展开时导航栏透明、内联标题隐藏，故不必占满
  /// 整个 44pt 导航栏高度，留 24pt 即可（视觉更紧凑，贴合 apple_music 风格）。
  List<Widget> _buildLargeTitleSlivers(BuildContext context) {
    if (widget.largeTitleController != null) {
      final topPad = MediaQuery.paddingOf(context).top;
      return [
        SliverToBoxAdapter(child: SizedBox(height: topPad + 24)),
        GlassLargeTitle(
          text: widget.largeTitleText.tr(),
          controller: widget.largeTitleController!,
          trailing: widget.largeTitleTrailing,
          padding: const EdgeInsetsDirectional.fromSTEB(24, 0, 24, 8),
        ),
      ];
    }
    return const [SliverToBoxAdapter(child: SizedBox(height: 8))];
  }

  /// 画廊顶部固定的过滤器条（SliverPersistentHeader 吸顶）。
  ///
  /// 数据源 [fileFilterProvider]：点击 GlassButton 写入 special，
  /// [FilesViewNotifier] 会监听并 reload()，画廊自动刷新。
  Widget _buildFilterHeader() {
    return SliverPersistentHeader(
      pinned: true,
      delegate: _FilterHeaderDelegate(child: _buildFilterChips()),
    );
  }

  /// 过滤激活（且非多选模式）时，在右下角叠加「清空过滤器」浮动按钮。
  Widget _wrapClearFab(Widget child) {
    final filter = ref.watch(fileFilterProvider);
    if (!filter.isActive || _isSelectMode) return child;
    return Stack(
      children: [
        child,
        Positioned(
          right: 16,
          bottom: MediaQuery.viewPaddingOf(context).bottom + 120,
          child: _ClearFilterFab(
            onTap: ref.read(fileFilterProvider.notifier).clear,
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChips() {
    final filter = ref.watch(fileFilterProvider);
    final notifier = ref.read(fileFilterProvider.notifier);
    final sort = ref.watch(fileSortProvider);
    final sortNotifier = ref.read(fileSortProvider.notifier);

    // 各叠加过滤的激活计数（>0 即选中态 + 角标）
    final folderCount = filter.selectedFolderIds.length;
    final tagCount = filter.selectedTags.length;
    final titleCount = filter.title.trim().isNotEmpty ? 1 : 0;
    final sizeCount = filter.sizePreset != null ? 1 : 0;
    final categoryCount = filter.category != null ? 1 : 0;

    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          // 特殊分类（互斥顶层模式）
          _chip(filter, SpecialFilter.all, 'filter.all'.tr(), Icons.apps),
          _chip(
            filter,
            SpecialFilter.uncategorized,
            'filter.uncategorized'.tr(),
            Icons.folder_off_outlined,
          ),
          _chip(
            filter,
            SpecialFilter.untagged,
            'filter.untagged'.tr(),
            Icons.label_off_outlined,
          ),
          _divider(),
          // 叠加过滤
          _filterEntry(
            icon: Icons.folder_outlined,
            label: 'filter.folders'.tr(),
            activeCount: folderCount,
            onTap: () => _openFolderPicker(filter.selectedFolderIds),
          ),
          _filterEntry(
            icon: Icons.label_outline,
            label: 'filter.tags'.tr(),
            activeCount: tagCount,
            onTap: () => _openTagPicker(filter.selectedTags),
          ),
          // 回收站：可与其他过滤叠加（不参与 special 互斥），点击即切换。
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _FilterChipButton(
              label: 'filter.recycled'.tr(),
              icon: Icons.delete_outline,
              selected: filter.recycled,
              onTap: notifier.toggleRecycled,
            ),
          ),
          // 标题/大小/类别用 GlassPopover（从 trigger 按钮形变弹出）
          _filterPopoverEntry(
            icon: Icons.title,
            label: 'filter.title'.tr(),
            activeCount: titleCount,
            popoverWidth: 260,
            contentBuilder: (close) => TitleFilterPopoverContent(
              initial: filter.title,
              onConfirm: notifier.setTitle,
              close: close,
            ),
          ),
          _filterPopoverEntry(
            icon: Icons.storage_outlined,
            label: 'filter.size'.tr(),
            activeCount: sizeCount,
            popoverWidth: 300,
            contentBuilder: (close) => SizeFilterPopoverContent(
              initial: SizeFilterResult(
                preset: filter.sizePreset,
                min: filter.sizeMin,
                max: filter.sizeMax,
              ),
              onConfirm: (r) {
                if (!r.active) {
                  notifier.clearSize();
                } else if (r.preset == 'custom') {
                  notifier.setCustomSize(min: r.min, max: r.max);
                } else {
                  notifier.setSizePreset(r.preset!, min: r.min, max: r.max);
                }
              },
              close: close,
            ),
          ),
          _filterPopoverEntry(
            icon: Icons.category_outlined,
            label: 'filter.category'.tr(),
            activeCount: categoryCount,
            popoverWidth: 200,
            contentBuilder: (close) => CategoryFilterPopoverContent(
              initial: filter.category,
              onConfirm: notifier.setCategory,
              close: close,
            ),
          ),
          _divider(),
          _filterPopoverEntry(
            icon: Icons.sort,
            label:
                '${sortFieldLabel(sort.field).tr()} ${sort.order == FileSortOrder.ascending ? '↑' : '↓'}',
            activeCount: 0,
            selected: !sort.isDefault,
            popoverWidth: 300,
            contentBuilder: (close) => SortPopoverContent(
              initial: sort,
              onChanged: sortNotifier.setSort,
              close: close,
            ),
          ),
        ],
      ),
    );
  }

  /// 文件夹多选弹窗：复用 [showFolderTagSelectDialog]，确认后整批回填。
  Future<void> _openFolderPicker(Set<int> selected) async {
    final notifier = ref.read(fileFilterProvider.notifier);
    final result = await showFolderTagSelectDialog(
      context,
      multiSelect: true,
      lockIsTag: false,
      title: 'filter.folderFilter',
      initialSelectedIds: selected,
    );
    if (result != null) {
      notifier.setSelectedFolders(result.ids.toSet());
    }
  }

  /// 标签多选弹窗：状态里存的是 title，需先解析成 id 作为初始选中。
  Future<void> _openTagPicker(Set<String> selectedTitles) async {
    final notifier = ref.read(fileFilterProvider.notifier);
    final tags = ref.read(tagsProvider).valueOrNull ?? const <Tag>[];
    final initialIds = <int>{
      for (final t in tags)
        if (selectedTitles.contains(t.title)) t.id,
    };
    final result = await showFolderTagSelectDialog(
      context,
      multiSelect: true,
      lockIsTag: true,
      title: 'filter.tagFilter',
      initialSelectedIds: initialIds,
    );
    if (result != null) {
      notifier.setSelectedTags(result.titles.toSet());
    }
  }

  /// 叠加过滤入口：activeCount>0 时高亮并显示数字角标。
  Widget _filterEntry({
    required IconData icon,
    required String label,
    required int activeCount,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: _FilterChipButton(
        label: label,
        icon: icon,
        selected: activeCount > 0,
        badge: activeCount,
        onTap: onTap,
      ),
    );
  }

  /// 同 [_filterEntry]，但点击后以 [GlassPopover] 形式从按钮形变弹出内容，
  /// 而非打开底部 sheet。用于标题/大小/类别这类轻量筛选。
  Widget _filterPopoverEntry({
    required IconData icon,
    required String label,
    required int activeCount,
    bool? selected,
    required double popoverWidth,
    required Widget Function(VoidCallback close) contentBuilder,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      // GlassPopover 用 triggerBuilder 拿到 toggle，复用 chip 外观。
      child: GlassPopover(
        popoverWidth: popoverWidth,
        settings: miraPopoverSettings(context),
        triggerBuilder: (context, toggle) => _FilterChipButton(
          label: label,
          icon: icon,
          selected: selected ?? activeCount > 0,
          badge: activeCount,
          onTap: toggle,
        ),
        contentBuilder: (context, close) => contentBuilder(close),
      ),
    );
  }

  Widget _divider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
      child: MiraDivider(height: 1, thickness: 1, axis: Axis.vertical),
    );
  }

  // 选中条件：仅当 special 命中且未叠加文件夹/标签多选。
  Widget _chip(
    FileFilterState filter,
    SpecialFilter s,
    String label,
    IconData icon,
  ) {
    final selected =
        filter.special == s &&
        filter.selectedFolderIds.isEmpty &&
        filter.selectedTags.isEmpty;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: _FilterChipButton(
        label: label,
        icon: icon,
        selected: selected,
        onTap: () => ref.read(fileFilterProvider.notifier).setSpecial(s),
      ),
    );
  }
}
