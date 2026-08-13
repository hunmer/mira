import '../../mira_sdk/mira_sdk.dart';

/// 媒体分类与 URL 拼接工具。
///
/// 约束（见 plan）：
/// - 缩略图/图片/视频 URL 必须经 client.getHttpClient().getUrl(path) 拼接（带 token）。
/// - 非缩略图扩展名 → HLS 转码。
class MediaUtils {
  MediaUtils._();

  /// 图片扩展名集合
  static const imageExtensions = {
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'bmp',
    'svg',
    'heic',
    'heif',
    'avif',
    'tiff',
  };

  /// mp4 可被 video_player 原生播放的扩展名
  static const mp4Extensions = {'mp4', 'm4v'};

  /// 需走 HLS 转码的视频扩展名（非 mp4）
  static const hlsVideoExtensions = {
    'mov',
    'avi',
    'mkv',
    'flv',
    'wmv',
    'webm',
    'mpg',
    'mpeg',
    '3gp',
    'ts',
  };

  static const videoExtensions = {...mp4Extensions, ...hlsVideoExtensions};

  /// 优先使用后端扩展名；为空时从文件名/路径提取。
  static String extensionOf(FileData f) {
    final extension = f.extension.trim().replaceFirst(RegExp(r'^\.+'), '');
    if (extension.isNotEmpty) return extension.toLowerCase();

    for (final value in [f.name, f.path, f.filePath]) {
      final fileName = value.split(RegExp(r'[/\\]')).last;
      final dot = fileName.lastIndexOf('.');
      if (dot >= 0 && dot < fileName.length - 1) {
        return fileName.substring(dot + 1).toLowerCase();
      }
    }
    return '';
  }

  /// 是否为图片
  static bool isImage(FileData f) => imageExtensions.contains(extensionOf(f));

  /// 是否为视频
  static bool isVideo(FileData f) => videoExtensions.contains(extensionOf(f));

  /// 缩略图 URL（带 token）
  static String thumbUrl(MiraClient client, String libId, int fileId) =>
      client.getHttpClient().getUrl('/api/files/thumb/$libId/$fileId');

  /// 原图/视频源文件 URL（带 token，mp4 直放）
  static String fileUrl(MiraClient client, String libId, int fileId) =>
      client.getHttpClient().getUrl('/api/files/file/$libId/$fileId');

  /// 解析插件 viewer 地址；仅为当前服务同源地址附加 query token。
  static String previewViewerUrl(MiraClient client, String iframeUrl) {
    final value = iframeUrl.trim();
    if (value.isEmpty) return '';

    final httpClient = client.getHttpClient();
    final baseUri = Uri.parse(httpClient.getUrl('/'));
    final resolved = baseUri.resolve(value);
    final sameOrigin =
        resolved.scheme == baseUri.scheme &&
        resolved.host == baseUri.host &&
        resolved.port == baseUri.port;
    final token = httpClient.token;
    if (!sameOrigin || token == null || token.isEmpty) return resolved.toString();

    return resolved
        .replace(
          queryParameters: {...resolved.queryParameters, 'token': token},
        )
        .toString();
  }

  /// 视频预览源选择（复刻 mira-client getMediaPreviewSource）：
  /// - mp4 → 直链 /api/files/file
  /// - 非 mp4 → HLS /api/files/preview/.../index.m3u8
  static String videoSourceUrl(MiraClient client, String libId, FileData f) {
    final ext = extensionOf(f);
    if (mp4Extensions.contains(ext)) {
      return fileUrl(client, libId, f.id);
    }
    return client.getHttpClient().getUrl(
      '/api/files/preview/$libId/${f.id}/index.m3u8',
    );
  }

  /// 人类可读的文件大小
  static String formatSize(int bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    final i = (bytes.bitLength - 1) ~/ 10;
    final idx = i < units.length ? i : units.length - 1;
    final size = bytes / (1 << (10 * idx));
    return '${size.toStringAsFixed(idx == 0 ? 0 : 1)} ${units[idx]}';
  }

  /// Unix 秒 → 可读日期
  static String formatDate(int unixSeconds) {
    if (unixSeconds <= 0) return '';
    final dt = DateTime.fromMillisecondsSinceEpoch(unixSeconds * 1000);
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}
