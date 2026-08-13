part of 'library_item_list_screen.dart';

/// 单个瀑布流卡片。
class _GalleryItemCard extends StatelessWidget {
  const _GalleryItemCard({
    super.key,
    required this.file,
    required this.ref,
    required this.onTap,
    this.selected = false,
    this.selectMode = false,
    this.onLongPress,
  });

  final FileData file;
  final WidgetRef ref;
  final VoidCallback onTap;
  final bool selected;
  final bool selectMode;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    final session = ref.read(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    final isImage = MediaUtils.isImage(file);
    final isVideo = MediaUtils.isVideo(file);
    final ext = MediaUtils.extensionOf(file).toUpperCase();

    final thumbUrl = (client != null && libId != null)
        ? MediaUtils.thumbUrl(client, libId, file.id)
        : '';

    // 图片/视频使用 metadata 或缩略图解析出的真实比例；未知文件固定 4:3。
    Widget imageContent = CachedNetworkImage(
      imageUrl: thumbUrl,
      fit: BoxFit.cover,
      width: double.infinity,
      placeholder: (_, _) => SizedBox.expand(
        child: Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: const Center(
            child: MiraCircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
      errorWidget: (_, _, _) => SizedBox.expand(
        child: Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Center(
            child: Icon(
              isImage || isVideo
                  ? Icons.broken_image_outlined
                  : Icons.insert_drive_file_outlined,
              size: isImage || isVideo ? null : 52,
              color: isImage || isVideo
                  ? Colors.grey
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );

    // 所有项包 Hero：tag 用 file.id，与 image_preview 的 PhotoView /
    // video_preview 的 _VideoPage 配对，实现「从缩略图位置放大到全屏」的
    // 共享元素过渡。边缘滑动返回手势期间也跟手飞行。
    imageContent = Hero(
      tag: file.id,
      transitionOnUserGestures: true,
      child: imageContent,
    );

    return MiraCard(
      onTap: onTap,
      onLongPress: onLongPress,
      padding: EdgeInsets.zero,
      child: Stack(
        children: [
          // 未知文件用固定比例兜底；图片/视频使用解析出的真实宽高。
          if (!isImage && !isVideo)
            AspectRatio(aspectRatio: 4 / 3, child: imageContent)
          else
            imageContent,
          // 选中态半透明蒙层 + 边框高亮
          if (selected)
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: 0.28),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.primary,
                      width: 2.5,
                    ),
                  ),
                ),
              ),
            ),
          // 选中指示器（右上角）
          if (selectMode)
            Positioned(
              top: 8,
              right: 8,
              child: _SelectionIndicator(selected: selected),
            ),
          // 扩展名标签 + 视频图标
          Positioned(
            top: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isVideo)
                    const Padding(
                      padding: EdgeInsets.only(right: 4),
                      child: Icon(
                        Icons.play_circle_fill,
                        color: Colors.white,
                        size: 14,
                      ),
                    ),
                  Text(
                    ext,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // 文件名
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.55),
                  ],
                ),
              ),
              child: Text(
                file.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A reusable widget for empty / error states with an optional retry action.
class _StatusIndicator extends StatelessWidget {
  const _StatusIndicator({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 12),
              MiraButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
