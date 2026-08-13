import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

/// Toast 类型，映射到 [GlassToast] 的语义色。
enum MiraToastType { success, error, info, warning, neutral }

/// 圆形进度指示器，封装 [GlassProgressIndicator.circular]。
///
/// [value] 为 null 时显示不确定（旋转）动画；0–1 时显示确定进度环。
/// 用于全屏 loading、按钮内 spinner、列表加载态等。
class MiraCircularProgressIndicator extends StatelessWidget {
  const MiraCircularProgressIndicator({
    super.key,
    this.value,
    this.size = 20,
    this.strokeWidth = 2.5,
    this.color,
  });

  /// null = 不确定（旋转）；0–1 = 确定进度。
  final double? value;
  final double size;
  final double strokeWidth;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return GlassProgressIndicator.circular(
      value: value,
      size: size,
      strokeWidth: strokeWidth,
      color: color,
    );
  }
}

/// 线性进度条，封装 [GlassProgressIndicator.linear]。
///
/// [value] 为 null 时显示不确定动画；0–1 时显示确定进度。
class MiraLinearProgressIndicator extends StatelessWidget {
  const MiraLinearProgressIndicator({
    super.key,
    this.value,
    this.height = 4,
    this.color,
    this.backgroundColor,
  });

  /// null = 不确定；0–1 = 确定进度。
  final double? value;
  final double height;
  final Color? color;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    return GlassProgressIndicator.linear(
      value: value,
      height: height,
      color: color,
      backgroundColor: backgroundColor,
    );
  }
}

/// 玻璃风格加载占位，封装 [GlassContainer] + [MiraCircularProgressIndicator]。
///
/// 相比单独的 [MiraCircularProgressIndicator]，这里把旋转指示器装进一块
/// 玻璃容器，视觉上更接近系统级 loading 卡片，适合用作：
/// - 全屏 / 区域加载占位（WebView、列表、预览页加载态）
/// - 内容区 skeleton 之前的即时 loading
///
/// [message] 提供时显示在指示器下方；[ignorePointer] 为 true（默认）时
/// 吞掉命中测试，可安全覆盖在可交互内容之上。业务层只与本类交互，
/// 不直接引用 `liquid_glass_widgets`。
class MiraLoader extends StatelessWidget {
  const MiraLoader({
    super.key,
    this.message,
    this.size = 28,
    this.strokeWidth = 2.5,
    this.color,
    this.ignorePointer = true,
    this.padding = const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
  });

  /// 指示器下方的可选文案（如「加载中…」）。
  final String? message;

  /// 旋转指示器直径。
  final double size;

  /// 旋转指示器描边宽度。
  final double strokeWidth;

  /// 旋转指示器颜色，默认跟随玻璃主题。
  final Color? color;

  /// 是否吞掉命中测试。
  ///
  /// 默认 true：作为加载占位覆盖在内容之上时，避免误触下层控件。
  /// 内联场景（如直接替换内容区）可置为 false。
  final bool ignorePointer;

  /// 玻璃容器的内边距。
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final content = GlassContainer(
      // 加载占位可能出现在任意位置（不一定在 LiquidGlassLayer 内），
      // 用独立图层确保玻璃效果始终生效。
      useOwnLayer: true,
      padding: padding,
      shape: const LiquidRoundedSuperellipse(borderRadius: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          MiraCircularProgressIndicator(
            size: size,
            strokeWidth: strokeWidth,
            color: color,
          ),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 13,
              ),
            ),
          ],
        ],
      ),
    );

    final centered = Center(child: content);
    return ignorePointer ? IgnorePointer(child: centered) : centered;
  }
}

/// 显示一条玻璃风格 toast，替代 `ScaffoldMessenger.showSnackBar`。
///
/// 从底部滑入、自动消失（贴近 SnackBar 行为）。可用 [type] 表达
/// 成功/错误/警告等语义色。返回一个「移除」回调，调用可提前关闭 toast。
VoidCallback showMiraToast(
  BuildContext context, {
  required String message,
  MiraToastType type = MiraToastType.info,
  Widget? icon,
  Duration duration = const Duration(seconds: 3),
}) {
  return GlassToast.show(
    context,
    message: message,
    type: switch (type) {
      MiraToastType.success => GlassToastType.success,
      MiraToastType.error => GlassToastType.error,
      MiraToastType.info => GlassToastType.info,
      MiraToastType.warning => GlassToastType.warning,
      MiraToastType.neutral => GlassToastType.neutral,
    },
    icon: icon,
    duration: duration,
  );
}
