import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../mira_sdk/mira_sdk.dart';
import '../../providers/folder_provider.dart';
import '../../providers/session_provider.dart';
import '../../providers/tag_provider.dart';
import '../../widgets/glass/mira_ui.dart';
import 'folder_tag_select_dialog.dart';

/// 区分对文件夹还是标签进行操作。
enum FolderTagKind { folder, tag }

/// 「新建 / 编辑 文件夹或标签」对话框。
///
/// 字段：标题（必填）+ 颜色（可选，null=默认）+ 父节点（可选，null=顶层）。
/// 父节点通过 [showFolderTagSelectDialog] 选择（锁定种类、单选，树中可任选）；
/// 「父节点=顶层」用编辑框右侧的清除按钮表达。编辑模式下 select dialog 会展示
/// 完整树（含自身），若误选自身/后代形成循环由后端校验拦截。
///
/// 成功后 [ref.invalidate] 对应 provider 刷新列表。返回 true 表示已提交并刷新。
Future<bool> showFolderTagEditDialog(
  BuildContext context, {
  required FolderTagKind kind,
  required String action, // '新建' / '编辑'
  EditingNode? editing, // 编辑时传入；新建为 null
}) async {
  final result = await showMiraDialog<bool>(
    context: context,
    builder: (context) => _FolderTagEditDialog(
      kind: kind,
      action: action,
      editing: editing,
    ),
  );
  return result ?? false;
}

/// 编辑目标（文件夹/标签的原始字段）。
class EditingNode {
  const EditingNode({
    required this.id,
    required this.title,
    required this.parentId,
    required this.color,
  });
  final int id;
  final String title;
  final int? parentId;
  final int? color;
}

class _FolderTagEditDialog extends ConsumerStatefulWidget {
  const _FolderTagEditDialog({
    required this.kind,
    required this.action,
    required this.editing,
  });

  final FolderTagKind kind;
  final String action;
  final EditingNode? editing;

  @override
  ConsumerState<_FolderTagEditDialog> createState() => _FolderTagEditDialogState();
}

class _FolderTagEditDialogState extends ConsumerState<_FolderTagEditDialog> {
  late final TextEditingController _titleCtrl;
  // 颜色用 SDK 的 ARGB int；null 表示不设置/保持默认。
  int? _color;
  // 父节点 id；null=顶层。
  int? _parentId;
  // 父节点显示标题（来自 select dialog 的回填或 initState 解析）。
  String? _parentTitle;
  bool _submitting = false;

  // 预设色板（含「无」选项，对应 null）。
  static const List<int?> _palette = [
    null,
    0xFFF44336, // 红
    0xFFE91E63, // 粉
    0xFF9C27B0, // 紫
    0xFF3F51B5, // 靛
    0xFF2196F3, // 蓝
    0xFF009688, // 青绿
    0xFF4CAF50, // 绿
    0xFFFF9800, // 橙
    0xFF795548, // 棕
    0xFF607D8B, // 蓝灰
  ];

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.editing?.title ?? '');
    _color = widget.editing?.color;
    _parentId = widget.editing?.parentId;
    // 解析初始父节点标题（编辑模式）。
    _parentTitle = _resolveTitle(_parentId);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  /// 由 id 反查当前种类的列表，拿到标题（用于显示已选父节点）。
  String? _resolveTitle(int? id) {
    if (id == null) return null;
    final isFolder = widget.kind == FolderTagKind.folder;
    if (isFolder) {
      final folders = ref.read(foldersProvider).valueOrNull ?? const <Folder>[];
      for (final f in folders) {
        if (f.id == id) return f.title;
      }
    } else {
      final tags = ref.read(tagsProvider).valueOrNull ?? const <Tag>[];
      for (final t in tags) {
        if (t.id == id) return t.title;
      }
    }
    return null;
  }

  /// 弹出 select dialog（锁定种类、单选）选择父节点。
  /// 编辑模式下默认选中原父节点；用户可在树里自行换选。
  Future<void> _pickParent() async {
    final isFolder = widget.kind == FolderTagKind.folder;
    final result = await showFolderTagSelectDialog(
      context,
      multiSelect: false,
      lockIsTag: !isFolder,
      initialSelectedIds: _parentId == null ? const {} : {_parentId!},
      title: isFolder ? 'folders.selectParentFolder'.tr() : 'tags.selectParentTag'.tr(),
    );
    if (result == null) return;
    setState(() {
      _parentId = result.singleId;
      _parentTitle = result.singleTitle ?? _resolveTitle(result.singleId);
    });
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      showMiraToast(context, message: 'dialog.nameEmpty'.tr(), type: MiraToastType.warning);
      return;
    }
    setState(() => _submitting = true);

    final session = ref.read(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;

    if (client == null || libId == null) {
      if (mounted) setState(() => _submitting = false);
      showMiraToast(context, message: 'dialog.notConnected'.tr(), type: MiraToastType.error);
      return;
    }

    final isFolder = widget.kind == FolderTagKind.folder;
    try {
      if (widget.editing == null) {
        // 新建
        if (isFolder) {
          await client.folders().createFolder(
                libId,
                title,
                parentId: _parentId,
                color: _color,
              );
          ref.invalidate(foldersProvider);
        } else {
          await client.tags().createTag(
                libId,
                title,
                parentId: _parentId,
                color: _color,
              );
          ref.invalidate(tagsProvider);
        }
      } else {
        // 编辑
        if (isFolder) {
          await client.folders().updateFolder(
                libId,
                widget.editing!.id,
                title: title,
                parentId: _parentId,
                color: _color,
              );
          ref.invalidate(foldersProvider);
        } else {
          await client.tags().updateTag(
                libId,
                widget.editing!.id,
                title: title,
                parentId: _parentId,
                color: _color,
              );
          ref.invalidate(tagsProvider);
        }
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        showMiraToast(context, message: 'common.operationFailed'.tr(namedArgs: {'error': '$e'}), type: MiraToastType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isFolder = widget.kind == FolderTagKind.folder;
    final entityName = isFolder ? 'entity.folder'.tr() : 'entity.tag'.tr();
    final onSurface = Theme.of(context).colorScheme.onSurface;
    return GlassDialog(
      settings: miraModalOverlaySettings(context),
      maxWidth: 320,
      title: '${widget.action}$entityName',
      content: Material(
        type: MaterialType.transparency,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
            // 名称
            MiraTextField(
              controller: _titleCtrl,
              autofocus: widget.editing == null,
              labelText: isFolder ? 'folders.nameLabel'.tr() : 'tags.nameLabel'.tr(),
              hintText: isFolder ? 'folders.nameHint'.tr() : 'tags.nameHint'.tr(),
              textInputAction: TextInputAction.done,
            ),
            const SizedBox(height: 16),
            // 颜色
            Text('common.color'.tr(),
                style: TextStyle(fontSize: 13, color: onSurface.withValues(alpha: 0.6))),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _palette.map((c) {
                final selected = c == _color;
                final isNone = c == null;
                return GestureDetector(
                  onTap: () => setState(() => _color = c),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isNone ? null : Color(c),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selected
                            ? Theme.of(context).colorScheme.primary
                            : onSurface.withValues(alpha: 0.25),
                        width: selected ? 3 : 1,
                      ),
                    ),
                    child: isNone
                        ? Icon(Icons.block, size: 18, color: onSurface.withValues(alpha: 0.45))
                        : null,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            // 父节点：点击弹出 select dialog（锁定种类、单选）；右侧可清除。
            Text('common.parent'.tr(),
                style: TextStyle(fontSize: 13, color: onSurface.withValues(alpha: 0.6))),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: MiraListTile(
                    title: Text(
                      _parentTitle ?? 'entity.topLevel'.tr(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: _parentId == null
                            ? onSurface.withValues(alpha: 0.6)
                            : onSurface,
                      ),
                    ),
                    leading: Icon(
                      isFolder ? Icons.folder_outlined : Icons.label_outline,
                      size: 18,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    onTap: _pickParent,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
                if (_parentId != null)
                  MiraIconButton(
                    tooltip: 'entity.clearParent'.tr(),
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => setState(() {
                      _parentId = null;
                      _parentTitle = null;
                    }),
                  ),
              ],
            ),
            // 提交中：底部显示小号 loading（按钮内无法承载，改放 content 区）
            if (_submitting) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const MiraCircularProgressIndicator(size: 16, strokeWidth: 2),
                  const SizedBox(width: 8),
                  Text('common.submitting'.tr(),
                      style:
                          TextStyle(fontSize: 13, color: onSurface.withValues(alpha: 0.6))),
                ],
              ),
            ],
          ],
        ),
        ),
      ),
      actions: [
        GlassDialogAction(
          label: 'common.cancel'.tr(),
          onPressed: _submitting ? () {} : () => Navigator.of(context).pop(false),
        ),
        GlassDialogAction(
          label: 'common.confirm'.tr(),
          isPrimary: true,
          onPressed: _submitting ? () {} : _submit,
        ),
      ],
    );
  }
}

/// 删除文件夹/标签：确认框 + SDK delete + invalidate。
Future<void> deleteFolderOrTag(
  BuildContext context, {
  required WidgetRef ref,
  required FolderTagKind kind,
  required int id,
  required String title,
}) async {
  final entityName = kind == FolderTagKind.folder ? 'entity.folder'.tr() : 'entity.tag'.tr();
  final confirmed = await showMiraConfirmDialog(
    context,
    title: 'dialog.confirmDelete',
    // message 带占位符，需预翻译后传入（对话框内 .tr() 对无 key 的字符串原样返回）。
    message: 'dialog.deleteMessage'.tr(namedArgs: {'type': entityName, 'name': title}),
    isDestructive: true,
    confirmText: 'common.delete',
  );
  if (confirmed != true) return;

  final session = ref.read(sessionProvider);
  final client = session.client;
  final libId = session.library?.id;
    if (client == null || libId == null) {
    if (context.mounted) {
      showMiraToast(context, message: 'dialog.notConnected'.tr(), type: MiraToastType.error);
    }
    return;
  }

  try {
    if (kind == FolderTagKind.folder) {
      await client.folders().deleteFolder(libId, id);
      ref.invalidate(foldersProvider);
    } else {
      await client.tags().deleteTag(libId, id);
      ref.invalidate(tagsProvider);
    }
    if (context.mounted) {
      showMiraToast(
        context,
        message: 'dialog.deleted'.tr(namedArgs: {'type': entityName, 'name': title}),
        type: MiraToastType.success,
      );
    }
  } catch (e) {
    if (context.mounted) {
      showMiraToast(context, message: 'dialog.deleteFailed'.tr(namedArgs: {'error': '$e'}), type: MiraToastType.error);
    }
  }
}

// ───────────────────────── 便捷构造：由源对象建编辑对象 ─────────────────────────

EditingNode? editingFromFolder(Folder? f) =>
    f == null ? null : EditingNode(id: f.id, title: f.title, parentId: f.parentId, color: f.color);

EditingNode? editingFromTag(Tag? t) =>
    t == null ? null : EditingNode(id: t.id, title: t.title, parentId: t.parentId, color: t.color);
