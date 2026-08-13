import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../utils/media_utils.dart';
import 'glass/mira_ui.dart';

/// 文件信息底部面板：展示 [FileData] 的真实字段。
///
/// 用于图片/视频预览页右上角「查看信息」入口。数据来自预览页已持有的
/// FileData，无需额外请求。
Future<void> showFileInfoSheet(BuildContext context, FileData file) {
  return showMiraBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) => _FileInfoSheet(file: file),
  );
}

class _FileInfoSheet extends StatelessWidget {
  const _FileInfoSheet({required this.file});
  final FileData file;

  @override
  Widget build(BuildContext context) {
    final tags = file.parsedTags();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 文件名
            Text(
              file.name,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const MiraDivider(height: 24),
            _row('fileInfo.type'.tr(), file.extension.isEmpty ? '—' : file.extension.toUpperCase()),
            _row('fileInfo.size'.tr(), MediaUtils.formatSize(file.size)),
            _row('fileInfo.folder'.tr(), file.folderName.isEmpty ? 'fileInfo.uncategorized'.tr() : file.folderName),
            _row('fileInfo.uploader'.tr(), file.uploader == 0 ? '—' : '#${file.uploader}'),
            _row('fileInfo.createdAt'.tr(), _fmt(file.createdAt)),
            _row('fileInfo.importedAt'.tr(), _fmt(file.importedAt)),
            _row('fileInfo.status'.tr(), file.recycled == 1 ? 'fileInfo.recycled'.tr() : 'fileInfo.normal'.tr()),
            if (file.path.isNotEmpty) _row('fileInfo.path'.tr(), file.path),
            // 标签
            if (tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('fileInfo.tags'.tr(), style: const TextStyle(fontSize: 13, color: Colors.black54)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: tags.map((t) {
                  final label = t is String ? t : (t['title'] ?? t.toString());
                  return MiraChip(
                    label: '$label',
                  );
                }).toList(),
              ),
            ],
            const SizedBox(height: 4),
            // 原始 id
            _row('fileInfo.id'.tr(), '#${file.id}'),
          ],
        ),
      ),
    );
  }

  Widget _row(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            child: Text(title, style: const TextStyle(color: Colors.black54, fontSize: 14)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 14))),
        ],
      ),
    );
  }

  String _fmt(int unixSeconds) {
    if (unixSeconds <= 0) return '—';
    return MediaUtils.formatDate(unixSeconds);
  }
}
