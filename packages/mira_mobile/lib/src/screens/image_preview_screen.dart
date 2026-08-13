import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:photo_view/photo_view.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../../router/app_router.dart';
import '../providers/session_provider.dart';
import '../utils/media_utils.dart';
import '../widgets/file_info_sheet.dart';
import '../widgets/glass/mira_ui.dart';

/// 大图预览页：photo_view 双指缩放/平移；PageView 左右翻页切换上/下张。
///
/// 入参：[files] 当前画廊的图片子集（仅图片），[initialIndex] 点击的索引。
class ImagePreviewScreen extends ConsumerStatefulWidget {
  const ImagePreviewScreen({
    super.key,
    this.files = const [],
    this.initialIndex = 0,
    this.onFileChanged,
  });

  final List<FileData> files;
  final int initialIndex;
  final ValueChanged<int>? onFileChanged;

  @override
  ConsumerState<ImagePreviewScreen> createState() => _ImagePreviewScreenState();
}

class _ImagePreviewScreenState extends ConsumerState<ImagePreviewScreen> {
  late final PageController _pageController;
  late int _index;
  final Map<int, bool> _horizontalFlips = {};
  final Map<int, int> _quarterTurns = {};
  final Map<int, bool> _zoomedImages = {};
  final Map<int, PhotoViewScaleStateController> _scaleStateControllers = {};

  bool get _isCurrentImageZoomed => _zoomedImages[_index] ?? false;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(
      0,
      widget.files.length - 1 < 0 ? 0 : widget.files.length - 1,
    );
    _pageController = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _pageController.dispose();
    for (final controller in _scaleStateControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  PhotoViewScaleStateController _scaleStateControllerFor(int index) {
    return _scaleStateControllers.putIfAbsent(
      index,
      PhotoViewScaleStateController.new,
    );
  }

  void _updateZoomedState(int index, PhotoViewScaleState state) {
    final zoomed =
        state == PhotoViewScaleState.zoomedIn ||
        state == PhotoViewScaleState.covering ||
        state == PhotoViewScaleState.originalSize;
    if (!mounted || _zoomedImages[index] == zoomed) return;
    setState(() => _zoomedImages[index] = zoomed);
  }

  void _toggleHorizontalFlip() {
    setState(() {
      _horizontalFlips[_index] = !(_horizontalFlips[_index] ?? false);
    });
  }

  void _rotateClockwise() {
    setState(() {
      _quarterTurns[_index] = ((_quarterTurns[_index] ?? 0) + 1) % 4;
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (widget.files.isEmpty) {
      return GlassScaffold(
        extendBody: true,
        statusBarStyle: GlassStatusBarStyle.auto,
        background: const GlassBackground(),
        appBar: GlassAppBar(
          padding: GlassLayout.appBarPadding,
          leading: MiraIconButton(
            icon: Icon(
              Icons.arrow_back_ios_new,
              color: isDark ? Colors.white : Colors.black87,
            ),
            onPressed: AppRouter.goBack,
          ),
        ),
        body: Material(
          type: MaterialType.transparency,
          child: Center(
            child: Text(
              'imagePreview.noImage'.tr(),
              style: TextStyle(color: isDark ? Colors.white70 : Colors.black54),
            ),
          ),
        ),
      );
    }

    return PopScope(
      canPop: !_isCurrentImageZoomed,
      child: GlassScaffold(
        extendBody: true,
        statusBarStyle: GlassStatusBarStyle.auto,
        background: const GlassBackground(),
        body: Material(
          type: MaterialType.transparency,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 左右翻页
              PageView.builder(
                controller: _pageController,
                physics: _isCurrentImageZoomed
                    ? const NeverScrollableScrollPhysics()
                    : null,
                itemCount: widget.files.length,
                onPageChanged: (i) {
                  setState(() => _index = i);
                  widget.onFileChanged?.call(widget.files[i].id);
                },
                itemBuilder: (context, index) {
                  final file = widget.files[index];
                  final url = (client != null && libId != null)
                      ? MediaUtils.fileUrl(client, libId, file.id)
                      : '';
                  if (url.isEmpty) {
                    return Center(
                      child: Text(
                        'common.notConnected'.tr(),
                        style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    );
                  }
                  // Hero tag 与画廊缩略图配对（file.id）：进入时从缩略图位置放大
                  // 到全屏，返回时缩回原位。transitionOnUserGestures 让边缘滑动
                  // 返回手势期间 Hero 也跟手飞行。
                  final thumbUrl = (client != null && libId != null)
                      ? MediaUtils.thumbUrl(client, libId, file.id)
                      : '';
                  // flightShuttleBuilder：Hero 飞行期间始终渲染缩略图（已缓存），
                  // 避免大图未解码完成时的占位/闪烁，过渡更平滑。
                  Widget shuttleBuilder(
                    BuildContext flightContext,
                    Animation<double> animation,
                    HeroFlightDirection flightDirection,
                    BuildContext fromHeroContext,
                    BuildContext toHeroContext,
                  ) {
                    return CachedNetworkImage(
                      imageUrl: thumbUrl,
                      fit: BoxFit.contain,
                      placeholder: (_, _) => ColoredBox(
                        color: isDark ? Colors.black : Colors.white,
                      ),
                    );
                  }

                  // 复用画廊卡片已验证可用的 cached_network_image 链路，
                  // 避免裸 NetworkImage 在大图解码/内存压力下静默失败。
                  final flipped = _horizontalFlips[index] ?? false;
                  final turns = _quarterTurns[index] ?? 0;
                  final scaleStateController = _scaleStateControllerFor(index);
                  return HeroMode(
                    enabled: index == _index,
                    child: Hero(
                      tag: file.id,
                      transitionOnUserGestures: true,
                      flightShuttleBuilder: shuttleBuilder,
                      child: Transform.rotate(
                      angle: turns * 3.141592653589793 / 2,
                      child: Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.diagonal3Values(
                          flipped ? -1 : 1,
                          1,
                          1,
                        ),
                        child: PhotoView(
                          imageProvider: CachedNetworkImageProvider(url),
                          backgroundDecoration: const BoxDecoration(
                            color: Colors.transparent,
                          ),
                          scaleStateController: scaleStateController,
                          scaleStateChangedCallback: (state) =>
                              _updateZoomedState(index, state),
                          onScaleEnd: (_, _, _) => _updateZoomedState(
                            index,
                            scaleStateController.scaleState,
                          ),
                          loadingBuilder: (_, _) => const Center(
                            child: MiraCircularProgressIndicator(),
                          ),
                          errorBuilder: (_, error, _) => Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.broken_image,
                                  color: (isDark ? Colors.white : Colors.black)
                                      .withValues(alpha: 0.4),
                                  size: 64,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'imagePreview.loadFailed'.tr(
                                    namedArgs: {'error': '$error'},
                                  ),
                                  style: TextStyle(
                                    color:
                                        (isDark ? Colors.white : Colors.black)
                                            .withValues(alpha: 0.4),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          minScale: PhotoViewComputedScale.contained,
                          maxScale: PhotoViewComputedScale.covered * 4,
                        ),
                      ),
                      ),
                    ),
                  );
                },
              ),

              if (!_isCurrentImageZoomed)
                // 顶部栏（保留半透明暗色浮层，确保白色文字清晰）
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: ClipRect(
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.3),
                        child: SafeArea(
                          bottom: false,
                          child: SizedBox(
                            height: 56,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: Row(
                                children: [
                                  MiraIconButton(
                                    icon: const Icon(
                                      Icons.arrow_back_ios_new,
                                      color: Colors.white,
                                    ),
                                    onPressed: AppRouter.goBack,
                                  ),
                                  const Spacer(),
                                  Text(
                                    '${_index + 1} / ${widget.files.length}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const Spacer(),
                                  // 查看信息
                                  MiraIconButton(
                                    icon: const Icon(
                                      Icons.info_outline,
                                      color: Colors.white,
                                    ),
                                    tooltip: 'imagePreview.viewInfo'.tr(),
                                    onPressed: () => showFileInfoSheet(
                                      context,
                                      widget.files[_index],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

              if (!_isCurrentImageZoomed)
                // 底部信息（保留半透明暗色浮层，确保白色文字清晰）
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: SafeArea(
                    top: false,
                    child: ClipRect(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                        child: Container(
                          color: Colors.black.withValues(alpha: 0.4),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                widget.files[_index].name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${MediaUtils.formatSize(widget.files[_index].size)} · ${MediaUtils.formatDate(widget.files[_index].createdAt)}',
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

              if (!_isCurrentImageZoomed)
                // 图片变换控件：悬浮在底部信息栏上方，避免遮挡文件信息。
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 120,
                  child: Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.42),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              MiraIconButton(
                                icon: Icon(
                                  Icons.flip,
                                  color: (_horizontalFlips[_index] ?? false)
                                      ? Colors.white
                                      : Colors.white70,
                                ),
                                tooltip: '水平翻转',
                                onPressed: _toggleHorizontalFlip,
                              ),
                              const SizedBox(width: 8),
                              MiraIconButton(
                                icon: const Icon(
                                  Icons.rotate_90_degrees_cw,
                                  color: Colors.white70,
                                ),
                                tooltip: '顺时针旋转 90 度',
                                onPressed: _rotateClockwise,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
