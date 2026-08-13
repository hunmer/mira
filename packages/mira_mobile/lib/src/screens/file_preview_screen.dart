import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_all/webview_all.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../../router/app_router.dart';
import '../providers/session_provider.dart';
import '../utils/media_utils.dart';
import '../widgets/file_info_sheet.dart';
import '../widgets/glass/mira_ui.dart';

/// 未知文件预览：优先加载插件 viewer，否则展示基础文件信息。
class FilePreviewScreen extends ConsumerStatefulWidget {
  const FilePreviewScreen({super.key, required this.file});

  final FileData? file;

  @override
  ConsumerState<FilePreviewScreen> createState() => _FilePreviewScreenState();
}

class _FilePreviewScreenState extends ConsumerState<FilePreviewScreen> {
  WebViewController? _controller;
  bool _loading = true;
  bool _webViewLoading = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _loadViewer();
  }

  Future<void> _loadViewer() async {
    final file = widget.file;
    final session = ref.read(sessionProvider);
    final client = session.client;
    final libraryId = session.library?.id;
    if (file == null || client == null || libraryId == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      final response = await client.files().getPreviewViewers(libraryId, file.id);
      final viewers = response.viewers.where((viewer) => viewer.iframeUrl.trim().isNotEmpty).toList()
        ..sort((a, b) => b.priority.compareTo(a.priority));
      if (viewers.isEmpty) {
        if (mounted) setState(() => _loading = false);
        return;
      }

      final url = MediaUtils.previewViewerUrl(client, viewers.first.iframeUrl);
      final controller = WebViewController();
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _webViewLoading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _webViewLoading = false);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame != false && mounted) {
              setState(() => _error = error);
            }
          },
        ),
      );
      await controller.loadRequest(Uri.parse(url));
      if (mounted) {
        setState(() {
          _controller = controller;
          _loading = false;
          _webViewLoading = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _loading = false;
          _webViewLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final file = widget.file;

    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        padding: GlassLayout.appBarPadding,
        leading: MiraIconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: isDark ? Colors.white : Colors.black87),
          onPressed: AppRouter.goBack,
        ),
        title: Text(file?.name ?? 'filePreview.title'.tr(), overflow: TextOverflow.ellipsis),
        actions: [
          if (file != null)
            MiraIconButton(
              icon: Icon(Icons.info_outline, color: isDark ? Colors.white : Colors.black87),
              tooltip: 'filePreview.viewInfo'.tr(),
              onPressed: () => showFileInfoSheet(context, file),
            ),
        ],
      ),
      body: Material(
        type: MaterialType.transparency,
        child: SafeArea(top: false, child: _buildBody(context, file)),
      ),
    );
  }

  Widget _buildBody(BuildContext context, FileData? file) {
    if (file == null) {
      return Center(child: Text('filePreview.noFile'.tr()));
    }
    if (_loading) {
      return const Center(child: MiraCircularProgressIndicator());
    }
    if (_controller == null || _error != null) {
      return _DefaultFilePreview(file: file, loadFailed: _error != null);
    }

    return Stack(
      children: [
        Positioned.fill(child: WebViewWidget(controller: _controller!)),
        if (_webViewLoading)
          const Positioned.fill(
            child: IgnorePointer(child: Center(child: MiraCircularProgressIndicator())),
          ),
      ],
    );
  }
}

class _DefaultFilePreview extends StatelessWidget {
  const _DefaultFilePreview({required this.file, required this.loadFailed});

  final FileData file;
  final bool loadFailed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final extension = MediaUtils.extensionOf(file);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.insert_drive_file_outlined, size: 76, color: colorScheme.primary),
              const SizedBox(height: 20),
              Text(file.name, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                loadFailed ? 'filePreview.loadFailed'.tr() : 'filePreview.defaultHint'.tr(),
                textAlign: TextAlign.center,
                style: TextStyle(color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              _InfoRow(label: 'fileInfo.type'.tr(), value: extension.isEmpty ? '-' : extension.toUpperCase()),
              _InfoRow(label: 'fileInfo.size'.tr(), value: MediaUtils.formatSize(file.size)),
              _InfoRow(label: 'fileInfo.createdAt'.tr(), value: MediaUtils.formatDate(file.createdAt)),
              if (file.path.isNotEmpty) _InfoRow(label: 'fileInfo.path'.tr(), value: file.path),
              _InfoRow(label: 'fileInfo.id'.tr(), value: '#${file.id}'),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
          Expanded(child: Text(value.isEmpty ? '-' : value)),
        ],
      ),
    );
  }
}
