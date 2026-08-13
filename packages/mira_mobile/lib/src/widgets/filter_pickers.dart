import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../providers/files_provider.dart';
import 'glass/mira_ui.dart';

/// 文件过滤用 popover 内容集合（参考桌面端 FilterBar.vue）。
///
/// 这些 widget 作为 [GlassPopover] 的 content 使用，由调用方用
/// `GlassPopover(triggerBuilder: ..., contentBuilder: (ctx, close) => XxxContent(...))`
/// 包裹。widget 自行管理临时编辑态，**确认/清除按钮已移除**，改由
/// [_PopoverHeader] 右上角的 x 按钮关闭，选项即时生效：
/// - 标题：x 按钮关闭时提交当前输入；清空输入即清除条件。
/// - 大小：点击预设即时生效并关闭；自定义输入即时生效；顶部「不限」清除。
/// - 类别：点击即时生效并关闭；顶部「不限」清除。
///
/// 文件夹/标签树形多选直接复用 [showFolderTagSelectDialog]，不在本文件内。

const int _mb = 1024 * 1024;

/// 大小预设项。
class SizePresetOption {
  const SizePresetOption({
    required this.id,
    required this.label,
    this.min,
    this.max,
  });

  /// 与 [FileFilterState.sizePreset] 一致的 id
  final String id;
  final String label;

  /// 字节边界（null=不限）
  final int? min;
  final int? max;
}

const List<SizePresetOption> kSizePresets = [
  SizePresetOption(id: 'small', label: 'filter.sizeSmall', max: 1 * _mb),
  SizePresetOption(
    id: 'medium',
    label: 'filter.sizeMedium',
    min: 1 * _mb,
    max: 10 * _mb,
  ),
  SizePresetOption(
    id: 'large',
    label: 'filter.sizeLarge',
    min: 10 * _mb,
    max: 100 * _mb,
  ),
  SizePresetOption(id: 'huge', label: 'filter.sizeHuge', min: 100 * _mb),
];

/// 大小过滤确认结果（字节口径，与 SDK FileFilters.sizeMin/sizeMax 一致）。
class SizeFilterResult {
  const SizeFilterResult({this.preset, this.min, this.max});

  /// 'small'|...|'huge'|'custom'，null=清除
  final String? preset;
  final int? min;
  final int? max;
  bool get active => preset != null;
}

/// 类别选项。
class CategoryOption {
  const CategoryOption({
    required this.value,
    required this.label,
    required this.icon,
  });
  final String value;
  final String label;
  final IconData icon;
}

const List<CategoryOption> kCategoryOptions = [
  CategoryOption(
    value: 'video',
    label: 'filter.categoryVideo',
    icon: Icons.videocam_outlined,
  ),
  CategoryOption(
    value: 'audio',
    label: 'filter.categoryAudio',
    icon: Icons.audiotrack_outlined,
  ),
  CategoryOption(
    value: 'image',
    label: 'filter.categoryImage',
    icon: Icons.image_outlined,
  ),
];

// ───────────────────────────── 标题 ─────────────────────────────

/// 标题筛选 popover 内容。
///
/// 编辑态实时同步：关闭 popover 时把当前输入提交。输入被清空即清除条件。

/// 排序字段选项。
class SortOption {
  const SortOption({
    required this.field,
    required this.label,
    required this.icon,
  });

  final FileSortField field;
  final String label;
  final IconData icon;
}

const List<SortOption> kSortOptions = [
  SortOption(
    field: FileSortField.importedAt,
    label: 'filter.sortImportedAt',
    icon: Icons.schedule,
  ),
  SortOption(field: FileSortField.id, label: 'filter.sortId', icon: Icons.tag),
  SortOption(
    field: FileSortField.name,
    label: 'filter.sortName',
    icon: Icons.sort_by_alpha,
  ),
  SortOption(
    field: FileSortField.size,
    label: 'filter.sortSize',
    icon: Icons.storage_outlined,
  ),
  SortOption(
    field: FileSortField.stars,
    label: 'filter.sortStars',
    icon: Icons.star_outline,
  ),
  SortOption(
    field: FileSortField.folder,
    label: 'filter.sortFolder',
    icon: Icons.folder_outlined,
  ),
  SortOption(
    field: FileSortField.tags,
    label: 'filter.sortTags',
    icon: Icons.label_outline,
  ),
  SortOption(
    field: FileSortField.customFields,
    label: 'filter.sortCustomFields',
    icon: Icons.settings_outlined,
  ),
];

String sortFieldLabel(FileSortField field) =>
    kSortOptions.firstWhere((option) => option.field == field).label;

class TitleFilterPopoverContent extends StatefulWidget {
  const TitleFilterPopoverContent({
    super.key,
    required this.initial,
    required this.onConfirm,
    required this.close,
  });

  final String initial;
  final ValueChanged<String> onConfirm;

  /// 关闭 popover 的回调（由 GlassPopover 的 contentBuilder 注入）。
  /// 触发时会先把当前输入提交，再关闭。
  final VoidCallback close;

  @override
  State<TitleFilterPopoverContent> createState() =>
      _TitleFilterPopoverContentState();
}

class _TitleFilterPopoverContentState extends State<TitleFilterPopoverContent> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initial,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _close() {
    widget.onConfirm(_controller.text.trim());
    widget.close();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PopoverHeader(title: 'filter.titleFilter'.tr(), onClose: _close),
          const SizedBox(height: 12),
          MiraTextField(
            controller: _controller,
            autofocus: true,
            hintText: 'filter.titleHint'.tr(),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────────── 大小 ─────────────────────────────

/// 文件大小筛选 popover 内容。
///
/// 预设点击即时生效并关闭；自定义输入实时生效；顶部「不限」清除。
class SizeFilterPopoverContent extends StatefulWidget {
  const SizeFilterPopoverContent({
    super.key,
    required this.initial,
    required this.onConfirm,
    required this.close,
  });

  final SizeFilterResult initial;
  final ValueChanged<SizeFilterResult> onConfirm;
  final VoidCallback close;

  @override
  State<SizeFilterPopoverContent> createState() =>
      _SizeFilterPopoverContentState();
}

class _SizeFilterPopoverContentState extends State<SizeFilterPopoverContent> {
  late String? _preset = widget.initial.preset;
  // 自定义范围（MB 单位，便于输入；确认时再转字节）
  late final TextEditingController _minCtrl = TextEditingController(
    text: widget.initial.preset == 'custom' && widget.initial.min != null
        ? (widget.initial.min! ~/ _mb).toString()
        : '',
  );
  late final TextEditingController _maxCtrl = TextEditingController(
    text: widget.initial.preset == 'custom' && widget.initial.max != null
        ? (widget.initial.max! ~/ _mb).toString()
        : '',
  );

  @override
  void dispose() {
    _minCtrl.dispose();
    _maxCtrl.dispose();
    super.dispose();
  }

  void _emitCustom() {
    final minVal = int.tryParse(_minCtrl.text.trim());
    final maxVal = int.tryParse(_maxCtrl.text.trim());
    widget.onConfirm(
      SizeFilterResult(
        preset: 'custom',
        min: minVal == null ? null : minVal * _mb,
        max: maxVal == null ? null : maxVal * _mb,
      ),
    );
  }

  void _selectPreset(String? id) {
    if (id == null) return;
    setState(() {
      _preset = id;
      if (id != 'custom') {
        // 选预设时清空自定义输入
        _minCtrl.clear();
        _maxCtrl.clear();
      }
    });
    if (id == 'custom') return; // 自定义需填写后由 dispose 提交
    final p = kSizePresets.firstWhere((e) => e.id == id);
    widget.onConfirm(SizeFilterResult(preset: p.id, min: p.min, max: p.max));
    widget.close();
  }

  void _clear() {
    widget.onConfirm(const SizeFilterResult());
    widget.close();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PopoverHeader(
            title: 'filter.sizeFilter'.tr(),
            onClose: widget.close,
          ),
          const SizedBox(height: 8),
          // 「不限」清除项
          MiraRadioTile<String?>(
            value: '__none__',
            groupValue: _preset ?? '__none__',
            title: Text(
              'common.unlimited'.tr(),
              style: TextStyle(color: Theme.of(context).hintColor),
            ),
            onChanged: (_) => _clear(),
          ),
          // 预设
          for (final p in kSizePresets)
            MiraRadioTile<String?>(
              value: p.id,
              groupValue: _preset,
              title: Text(p.label.tr()),
              onChanged: _selectPreset,
            ),
          // 自定义
          MiraRadioTile<String?>(
            value: 'custom',
            groupValue: _preset,
            title: Text('filter.customRange'.tr()),
            onChanged: _selectPreset,
          ),
          if (_preset == 'custom') ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: MiraTextField(
                    controller: _minCtrl,
                    keyboardType: TextInputType.number,
                    labelText: 'filter.minValue'.tr(),
                    onChanged: (_) => _emitCustom(),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('—'),
                ),
                Expanded(
                  child: MiraTextField(
                    controller: _maxCtrl,
                    keyboardType: TextInputType.number,
                    labelText: 'filter.maxValue'.tr(),
                    onChanged: (_) => _emitCustom(),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ───────────────────────────── 类别 ─────────────────────────────

/// 媒体类别筛选 popover 内容。点击即时生效并关闭。
class CategoryFilterPopoverContent extends StatefulWidget {
  const CategoryFilterPopoverContent({
    super.key,
    required this.initial,
    required this.onConfirm,
    required this.close,
  });

  final String? initial;
  final ValueChanged<String?> onConfirm;
  final VoidCallback close;

  @override
  State<CategoryFilterPopoverContent> createState() =>
      _CategoryFilterPopoverContentState();
}

class _CategoryFilterPopoverContentState
    extends State<CategoryFilterPopoverContent> {
  late String? _value = widget.initial;

  void _select(String? v) {
    setState(() => _value = v);
    widget.onConfirm(v);
    widget.close();
  }

  void _clear() {
    widget.onConfirm(null);
    widget.close();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _PopoverHeader(
            title: 'filter.categoryFilter'.tr(),
            onClose: widget.close,
          ),
          const SizedBox(height: 8),
          // 「不限」清除项
          MiraRadioTile<String?>(
            value: '__none__',
            groupValue: _value ?? '__none__',
            title: Text(
              'common.unlimited'.tr(),
              style: TextStyle(color: Theme.of(context).hintColor),
            ),
            onChanged: (_) => _clear(),
          ),
          for (final c in kCategoryOptions)
            MiraRadioTile<String?>(
              value: c.value,
              groupValue: _value,
              title: Row(
                children: [
                  Icon(c.icon, size: 20, color: Theme.of(context).hintColor),
                  const SizedBox(width: 8),
                  Text(c.label.tr()),
                ],
              ),
              onChanged: _select,
            ),
        ],
      ),
    );
  }
}

// ───────────────────────────── header ─────────────────────────────

/// popover 顶部标题栏：左侧标题，右侧 x 关闭按钮。

/// 排序 popover 内容。
class SortPopoverContent extends StatefulWidget {
  const SortPopoverContent({
    super.key,
    required this.initial,
    required this.onChanged,
    required this.close,
  });

  final FileSortState initial;
  final ValueChanged<FileSortState> onChanged;
  final VoidCallback close;

  @override
  State<SortPopoverContent> createState() => _SortPopoverContentState();
}

class _SortPopoverContentState extends State<SortPopoverContent> {
  late FileSortState _sort = widget.initial;

  @override
  void didUpdateWidget(covariant SortPopoverContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initial != oldWidget.initial) _sort = widget.initial;
  }

  void _setSort(FileSortState next) {
    setState(() => _sort = next);
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final hintColor = Theme.of(context).hintColor;
    final maxHeight = (MediaQuery.sizeOf(context).height - 160)
        .clamp(280.0, 560.0)
        .toDouble();
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _PopoverHeader(
              title: 'filter.sortTitle'.tr(),
              onClose: widget.close,
            ),
            const SizedBox(height: 8),
            Text(
              'filter.sortField'.tr(),
              style: TextStyle(fontSize: 12, color: hintColor),
            ),
            const SizedBox(height: 4),
            for (final option in kSortOptions)
              MiraRadioTile<FileSortField>(
                value: option.field,
                groupValue: _sort.field,
                title: Row(
                  children: [
                    Icon(option.icon, size: 20, color: hintColor),
                    const SizedBox(width: 8),
                    Text(option.label.tr()),
                  ],
                ),
                onChanged: (field) {
                  if (field != null) {
                    _setSort(FileSortState(field: field, order: _sort.order));
                  }
                },
              ),
            const MiraDivider(height: 16),
            Text(
              'filter.sortOrder'.tr(),
              style: TextStyle(fontSize: 12, color: hintColor),
            ),
            const SizedBox(height: 4),
            MiraRadioTile<FileSortOrder>(
              value: FileSortOrder.descending,
              groupValue: _sort.order,
              title: Row(
                children: [
                  Icon(Icons.arrow_downward, size: 20, color: hintColor),
                  const SizedBox(width: 8),
                  Text('filter.sortDescending'.tr()),
                ],
              ),
              onChanged: (order) {
                if (order != null) {
                  _setSort(FileSortState(field: _sort.field, order: order));
                }
              },
            ),
            MiraRadioTile<FileSortOrder>(
              value: FileSortOrder.ascending,
              groupValue: _sort.order,
              title: Row(
                children: [
                  Icon(Icons.arrow_upward, size: 20, color: hintColor),
                  const SizedBox(width: 8),
                  Text('filter.sortAscending'.tr()),
                ],
              ),
              onChanged: (order) {
                if (order != null) {
                  _setSort(FileSortState(field: _sort.field, order: order));
                }
              },
            ),
            const MiraDivider(height: 16),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton.icon(
                onPressed: () => _setSort(const FileSortState()),
                icon: const Icon(Icons.restart_alt, size: 18),
                label: Text('filter.sortReset'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// popover 顶部标题栏：左侧标题，右侧 x 关闭按钮。
class _PopoverHeader extends StatelessWidget {
  const _PopoverHeader({required this.title, required this.onClose});

  final String title;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.onSurface,
            ),
          ),
        ),
        // 透明背景的小关闭按钮，避免破坏玻璃质感。
        GlassButton.custom(
          onTap: onClose,
          width: 28,
          height: 28,
          style: GlassButtonStyle.transparent,
          shape: const LiquidRoundedSuperellipse(borderRadius: 14),
          child: Icon(Icons.close, size: 16, color: theme.hintColor),
        ),
      ],
    );
  }
}
