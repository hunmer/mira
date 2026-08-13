import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

/// 玻璃风格 chip，封装 [GlassChip]，替代 Material [Chip] / [ActionChip]。
///
/// - [onTap] = 行动 chip（点击触发动作）。
/// - [onDeleted] = 可删除 chip（显示 × 按钮）。
/// - [selected] + [selectedColor] = 选择态（≈ FilterChip）。
class MiraChip extends StatelessWidget {
  const MiraChip({
    super.key,
    required this.label,
    this.icon,
    this.onTap,
    this.onDeleted,
    this.selected = false,
    this.selectedColor,
    this.iconColor,
    this.labelStyle,
  });

  final String label;
  final Widget? icon;
  final VoidCallback? onTap;
  final VoidCallback? onDeleted;
  final bool selected;
  final Color? selectedColor;
  final Color? iconColor;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GlassChip(
        label: label,
        icon: icon,
        onTap: onTap,
        onDeleted: onDeleted,
        selected: selected,
        selectedColor: selectedColor,
        iconColor: iconColor,
        labelStyle: labelStyle,
      ),
    );
  }
}
