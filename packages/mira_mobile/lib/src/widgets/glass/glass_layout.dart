import 'package:flutter/material.dart';

import 'mira_ui.dart' show MiraIconButton;

/// glass 页面通用的布局度量常量。
///
/// 集中管理，避免各页面散落魔法数字；调整时只改一处。
class GlassLayout {
  GlassLayout._();

  /// GlassAppBar 的内容内边距。
  ///
  /// [GlassAppBar] 已在内部处理安全区，这里额外留出顶部 8 和水平 24，
  /// 让 44px 的玻璃返回按钮避开屏幕边缘，并与大标题的默认左边距对齐。
  static const appBarPadding = EdgeInsets.fromLTRB(24, 8, 24, 0);

  /// GlassLargeTitle 上方除状态栏外的 spacer 高度。
  ///
  /// 包含 GlassAppBar 顶部间距(8) + 工具栏高度(44) + 标题间距(16)。
  /// 带返回按钮的 push 页用此值，大标题与返回按钮保持清晰分隔；
  /// 主界面 tab（无返回按钮）仍用各自较紧的值。
  static const largeTitleTopOffset = 68.0;
}

/// 各 push 页通用的 GlassAppBar 返回按钮：箭头图标，颜色随亮度自适应。
///
/// 配合 [GlassLayout.appBarPadding] 使用，统一返回按钮的外观。
/// [onPressed] 通常传 `AppRouter.goBack`（由调用方提供，避免此处反向依赖路由层）。
MiraIconButton glassBackButton(
  BuildContext context, {
  VoidCallback? onPressed,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  return MiraIconButton(
    icon: Icon(
      Icons.arrow_back_ios_new,
      color: isDark ? Colors.white : Colors.black87,
    ),
    onPressed: onPressed,
  );
}
