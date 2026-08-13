import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import 'glass_settings.dart';

export 'package:liquid_glass_widgets/liquid_glass_widgets.dart'
    show
        GlassDialog,
        GlassDialogAction,
        GlassMenu,
        GlassMenuController,
        GlassMenuDivider,
        GlassMenuItem,
        GlassPopover,
        LiquidGlassSettings;

export 'dialog_confirm.dart';

/// 统一的遮罩色，比库默认更深的黑色，避免内容看不清。
const kMiraBarrierColor = Color(0xB3000000); // ~70% black

/// 亮色浮层在玻璃内容后铺一层浅色背板，避免深色文字落在暗色背景上。
/// 暗色模态浮层继续使用库默认外观。
LiquidGlassSettings? miraModalOverlaySettings(BuildContext context) {
  final theme = Theme.of(context);
  if (theme.brightness == Brightness.dark) return null;
  return LiquidGlassSettings(
    backerColor: theme.colorScheme.surface.withValues(alpha: 0.45),
  );
}

/// Popover 亮色模式使用浅色背板；暗色模式保留原有深色背板。
LiquidGlassSettings miraPopoverSettings(BuildContext context) {
  final theme = Theme.of(context);
  if (theme.brightness == Brightness.dark) {
    return MiraGlassSettings.popover;
  }
  return LiquidGlassSettings(
    backerColor: theme.colorScheme.surface.withValues(alpha: 0.7),
  );
}

/// 玻璃风格模态底部浮层，封装 [GlassSheet.show]，替代 Material
/// [showModalBottomSheet]。
///
/// [builder] 内容会被套一层透明 [Material] 祖先，使其中的 TextField /
/// CheckboxListTile / InkWell 等 Material 组件正常工作。
Future<T?> showMiraBottomSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isScrollControlled = true,
  bool isDismissible = true,
  bool enableDrag = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    useSafeArea: false,
    backgroundColor: Colors.transparent,
    elevation: 0,
    showDragHandle: false,
    isDismissible: isDismissible,
    enableDrag: enableDrag,
    isScrollControlled: isScrollControlled,
    barrierColor: kMiraBarrierColor,
    builder: (ctx) => GlassSheet(
      settings: miraModalOverlaySettings(context),
      isScrollable: isScrollControlled,
      child: Material(type: MaterialType.transparency, child: builder(ctx)),
    ),
  );
}

/// 玻璃风格居中对话框，封装 [showDialog]。
///
/// 关键点：在内容外层套一层 [AnimatedPadding]，读取 [MediaQuery] 的
/// `viewInsets.bottom`（软键盘高度）。[GlassDialog]（库代码，内部为 `Center`
/// 布局且不感知键盘）自身没有这层处理，直接从 [showDialog] 的 builder 返回
/// 会绕过 Material [Dialog] 默认的键盘避让——软键盘弹起时对话框被遮挡。
/// 这里补上与 Material [Dialog] 一致的避让：键盘弹起时居中的对话框整体上移，
/// 避免被遮挡。
///
/// [builder] 通常返回 [GlassDialog]；遮罩使用 [kMiraBarrierColor]。
Future<T?> showMiraDialog<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool barrierDismissible = true,
  Color barrierColor = kMiraBarrierColor,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierColor: barrierColor,
    builder: (context) {
      final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
      return AnimatedPadding(
        padding: EdgeInsets.only(bottom: bottomInset),
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        child: builder(context),
      );
    },
  );
}
