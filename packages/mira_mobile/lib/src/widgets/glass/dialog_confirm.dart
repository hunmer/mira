import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';

import 'overlays.dart';

/// 二选一确认框，返回 `true` 表示用户点了确认按钮。
///
/// 内部用 [GlassDialog.show]，默认遮罩不可点击关闭（与确认框语义一致）。
/// 危险操作（删除/退出）把 [isDestructive] 置 true，确认按钮显示红色。
Future<bool?> showMiraConfirmDialog(
  BuildContext context, {
  String? title,
  String? message,
  String confirmText = 'common.confirm',
  String cancelText = 'common.cancel',
  bool isDestructive = false,
  bool isPrimary = false,
}) {
  // 注意：GlassDialog.show 内部调用 showCupertinoDialog 时没有传入
  // barrierColor（参数被忽略），Cupertino 默认遮罩只有 ~20% 黑，偏淡。
  // 因此这里绕过库的封装，直接构造 GlassDialog 并自行控制遮罩颜色。
  // title/message 支持直接传 i18n key 或已翻译文案（.tr() 找不到 key 时原样返回）。
  final actions = [
    GlassDialogAction(
      label: cancelText.tr(),
      onPressed: () => Navigator.of(context).pop(false),
    ),
    GlassDialogAction(
      label: confirmText.tr(),
      isPrimary: isPrimary || !isDestructive,
      isDestructive: isDestructive,
      onPressed: () => Navigator.of(context).pop(true),
    ),
  ];

  return showCupertinoDialog<bool>(
    context: context,
    barrierColor: kMiraBarrierColor,
    barrierDismissible: false,
    builder: (context) => GlassDialog(
      settings: miraModalOverlaySettings(context),
      title: title?.tr(),
      message: message?.tr(),
      actions: actions,
    ),
  );
}
