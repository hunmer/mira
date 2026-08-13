import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

/// 玻璃风格 ListTile，封装 [GlassListTile]，替代 Material [ListTile]。
///
/// 自带透明 [Material] 祖先（GlassScaffold/GlassDialog 内部无 Material 祖先），
/// 使内部 InkWell ripple 正常工作。用 [MiraListTile.chevron] 作为 trailing。
class MiraListTile extends StatelessWidget {
  const MiraListTile({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onTap,
    this.onLongPress,
    this.contentPadding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  });

  final Widget title;
  final Widget? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final EdgeInsetsGeometry contentPadding;

  /// 右侧 iOS 风格的 chevron（disclosure）指示，常用作 trailing。
  static const Widget chevron = Icon(
    CupertinoIcons.chevron_right,
    size: 20,
    color: CupertinoColors.systemGrey,
  );

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GlassListTile(
        leading: leading,
        title: title,
        subtitle: subtitle,
        trailing: trailing ?? (onTap != null ? chevron : null),
        onTap: onTap,
        onLongPress: onLongPress,
        contentPadding: contentPadding,
      ),
    );
  }
}

/// 玻璃风格开关 tile，封装 [GlassListTile] + trailing [GlassSwitch]，
/// 替代 Material [SwitchListTile]。
class MiraSwitchTile extends StatelessWidget {
  const MiraSwitchTile({
    super.key,
    required this.value,
    required this.onChanged,
    required this.title,
    this.subtitle,
    this.leading,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final Widget title;
  final Widget? subtitle;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GlassListTile(
        leading: leading,
        title: title,
        subtitle: subtitle,
        trailing: GlassSwitch(
          value: value,
          onChanged: onChanged ?? (_) {},
        ),
        onTap: onChanged == null ? null : () => onChanged!(!value),
      ),
    );
  }
}

// ───────────────────── 自绘选择指示器（包内无 GlassCheckbox/GlassRadio） ─────────────────────

/// 勾选指示器，替代 Material [Checkbox]。默认 22pt 圆形勾选。
class MiraCheckboxIndicator extends StatelessWidget {
  const MiraCheckboxIndicator({
    super.key,
    required this.value,
    this.onChanged,
    this.size = 22,
  });

  final bool value;
  final ValueChanged<bool?>? onChanged;
  final double size;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onChanged == null ? null : () => onChanged!(!value),
      child: SizedBox(
        width: size + 8,
        height: size + 8,
        child: Align(
          child: value
              ? Icon(CupertinoIcons.checkmark_circle_fill, size: size, color: color)
              : Icon(CupertinoIcons.circle, size: size, color: CupertinoColors.systemGrey),
        ),
      ),
    );
  }
}

/// 单选圆点指示器，替代 Material [Radio]。选中实心，未选中空心。
class MiraRadioIndicator<T> extends StatelessWidget {
  const MiraRadioIndicator({
    super.key,
    required this.value,
    required this.groupValue,
    this.onChanged,
    this.size = 22,
  });

  final T value;
  final T? groupValue;
  final ValueChanged<T?>? onChanged;
  final double size;

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    final color = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onChanged == null ? null : () => onChanged!(value),
      child: SizedBox(
        width: size + 8,
        height: size + 8,
        child: Align(
          child: selected
              ? Icon(CupertinoIcons.largecircle_fill_circle, size: size, color: color)
              : Icon(CupertinoIcons.circle, size: size, color: CupertinoColors.systemGrey),
        ),
      ),
    );
  }
}

/// 玻璃风格勾选 tile，替代 Material [CheckboxListTile]。
///
/// 左侧 leading 自绘勾选指示器（包内无 GlassCheckbox）。
class MiraCheckboxTile extends StatelessWidget {
  const MiraCheckboxTile({
    super.key,
    required this.value,
    required this.onChanged,
    required this.title,
    this.subtitle,
    this.leading,
  });

  final bool value;
  final ValueChanged<bool?>? onChanged;
  final Widget title;
  final Widget? subtitle;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GlassListTile(
        leading: leading ?? MiraCheckboxIndicator(value: value, onChanged: onChanged),
        title: title,
        subtitle: subtitle,
        onTap: onChanged == null ? null : () => onChanged!(!value),
      ),
    );
  }
}

/// 玻璃风格单选 tile，替代 Material [RadioListTile]。
class MiraRadioTile<T> extends StatelessWidget {
  const MiraRadioTile({
    super.key,
    required this.value,
    required this.groupValue,
    required this.onChanged,
    required this.title,
    this.subtitle,
    this.leading,
  });

  final T value;
  final T? groupValue;
  final ValueChanged<T?>? onChanged;
  final Widget title;
  final Widget? subtitle;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GlassListTile(
        leading: leading ??
            MiraRadioIndicator<T>(
              value: value,
              groupValue: groupValue,
              onChanged: onChanged,
            ),
        title: title,
        subtitle: subtitle,
        onTap: onChanged == null ? null : () => onChanged!(value),
      ),
    );
  }
}
