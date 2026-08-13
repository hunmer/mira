import 'package:cached_network_image/cached_network_image.dart';
import 'package:chewie/chewie.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../../router/app_router.dart';
import '../providers/session_provider.dart';
import '../utils/media_utils.dart';
import '../widgets/file_info_sheet.dart';
import '../widgets/glass/mira_ui.dart';

/// 视频预览页：video_player + chewie。
///
/// 源选择（复刻 mira-client getMediaPreviewSource）：
/// - mp4 → /api/files/file 直链（video_player 原生支持）
/// - 非 mp4 → /api/files/preview/.../index.m3u8（video_player 支持 HLS）
///
/// 左右翻页：PageView 切换视频子集中的上/下个。
class VideoPreviewScreen extends ConsumerStatefulWidget {
  const VideoPreviewScreen({
    super.key,
    this.files = const [],
    this.initialIndex = 0,
    this.onFileChanged,
  });

  final List<FileData> files;
  final int initialIndex;
  final ValueChanged<int>? onFileChanged;

  @override
  ConsumerState<VideoPreviewScreen> createState() => _VideoPreviewScreenState();
}

class _VideoPreviewScreenState extends ConsumerState<VideoPreviewScreen> {
  late final PageController _pageController;
  late int _index;

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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
              'videoPreview.noVideo'.tr(),
              style: TextStyle(color: isDark ? Colors.white70 : Colors.black54),
            ),
          ),
        ),
      );
    }
    final session = ref.watch(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;

    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      body: Material(
        type: MaterialType.transparency,
        child: SafeArea(
          child: Stack(
            children: [
              PageView.builder(
                controller: _pageController,
                itemCount: widget.files.length,
                onPageChanged: (i) {
                  setState(() => _index = i);
                  widget.onFileChanged?.call(widget.files[i].id);
                },
                itemBuilder: (context, index) {
                  final file = widget.files[index];
                  if (client == null || libId == null) {
                    return Center(
                      child: Text(
                        'common.notConnected'.tr(),
                        style: TextStyle(
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    );
                  }
                  return HeroMode(
                    enabled: index == _index,
                    child: _VideoPage(
                      url: MediaUtils.videoSourceUrl(client, libId, file),
                      heroTag: file.id,
                      thumbUrl: MediaUtils.thumbUrl(client, libId, file.id),
                      title: file.name,
                      subtitle:
                          '${MediaUtils.formatSize(file.size)} · ${file.extension.toUpperCase()}',
                      isHls: !MediaUtils.mp4Extensions.contains(
                        MediaUtils.extensionOf(file),
                      ),
                    ),
                  );
                },
              ),
              // 顶部栏：左右按钮对齐，计数保持居中
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SizedBox(
                  height: 56,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
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
                        MiraIconButton(
                          icon: const Icon(
                            Icons.info_outline,
                            color: Colors.white,
                          ),
                          tooltip: 'videoPreview.viewInfo'.tr(),
                          onPressed: () =>
                              showFileInfoSheet(context, widget.files[_index]),
                        ),
                      ],
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

/// 单页视频播放器：自管 video_player + chewie 生命周期。
class _VideoPage extends StatefulWidget {
  const _VideoPage({
    required this.url,
    required this.heroTag,
    required this.thumbUrl,
    required this.title,
    required this.subtitle,
    required this.isHls,
  });

  final String url;

  /// 与画廊缩略图配对的 Hero tag（file.id）。
  final Object heroTag;

  /// 缩略图 URL：Hero 飞行期间渲染它，掩盖视频首帧初始化的空白期。
  final String thumbUrl;
  final String title;
  final String subtitle;
  final bool isHls;

  @override
  State<_VideoPage> createState() => _VideoPageState();
}

class _VideoPageState extends State<_VideoPage> {
  late final VideoPlayerController _vpController;
  ChewieController? _chewie;
  bool _initializationStarted = false;
  bool _initialized = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _vpController = VideoPlayerController.networkUrl(Uri.parse(widget.url));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initializationStarted) return;
    _initializationStarted = true;
    _init(Theme.of(context).colorScheme.primary);
  }

  Future<void> _init(Color primary) async {
    try {
      await _vpController.initialize();
      _chewie = ChewieController(
        videoPlayerController: _vpController,
        autoPlay: true,
        looping: false,
        showControls: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: primary,
          handleColor: primary,
          backgroundColor: Colors.white24,
          bufferedColor: Colors.white38,
        ),
      );
      if (mounted) setState(() => _initialized = true);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  void dispose() {
    _chewie?.dispose();
    _vpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    late final Widget content;
    if (_error != null) {
      content = _Status(
        icon: Icons.error_outline,
        message: 'videoPreview.loadFailed'.tr(namedArgs: {'error': '$_error'}),
        hint: widget.isHls ? 'videoPreview.hlsHint'.tr() : '',
      );
    } else if (!_initialized || _chewie == null) {
      // 初始化期间用缩略图打底，避免黑色闪烁；视频首帧出来后无缝替换。
      content = Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(
            imageUrl: widget.thumbUrl,
            fit: BoxFit.contain,
            placeholder: (_, _) => const ColoredBox(color: Colors.black),
            errorWidget: (_, _, _) => const ColoredBox(color: Colors.black),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                MiraCircularProgressIndicator(),
                const SizedBox(height: 12),
                Text(
                  'common.loading'.tr(),
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
        ],
      );
    } else {
      content = Column(
        children: [
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: _vpController.value.aspectRatio,
                child: Chewie(controller: _chewie!),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
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
                        widget.subtitle,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.isHls)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'HLS',
                      style: TextStyle(
                        color: Colors.orange,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      );
    }
    // Hero 与画廊视频缩略图配对（heroTag = file.id）：进入时从缩略图位置
    // 放大到全屏，返回时缩回原位。flightShuttleBuilder 让飞行期间渲染缩略图
    //（已缓存），掩盖视频首帧初始化的空白期，过渡更平滑。
    return Hero(
      tag: widget.heroTag,
      transitionOnUserGestures: true,
      flightShuttleBuilder:
          (
            flightContext,
            animation,
            flightDirection,
            fromHeroContext,
            toHeroContext,
          ) {
            return CachedNetworkImage(
              imageUrl: widget.thumbUrl,
              fit: BoxFit.contain,
              placeholder: (_, _) => const ColoredBox(color: Colors.black),
              errorWidget: (_, _, _) => const ColoredBox(color: Colors.black),
            );
          },
      child: content,
    );
  }
}

class _Status extends StatelessWidget {
  const _Status({required this.icon, required this.message, this.hint = ''});
  final IconData icon;
  final String message;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: Colors.white54),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(color: Colors.white70),
            textAlign: TextAlign.center,
          ),
          if (hint.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                hint,
                style: const TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}
