import 'package:bokeh_lava_gradient/bokeh_lava_gradient.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/background_effect_provider.dart';
import '../../providers/color_theme_provider.dart';

/// glass 页面通用的动态 bokeh 背景。
///
/// 作为 [GlassScaffold.background] 传入时，会被捕获为 GPU 纹理，让玻璃组件
/// （按钮/卡片/tab bar）吸收背景颜色，呈现 iOS 26 式的层次感。
///
/// 自身读取所需状态——调用方只需 `background: const GlassBackground()`：
/// - 明暗：取自 [Theme.of]（与强制 light/dark 主题一致）；
/// - 配色预设：`colorThemeProvider`（修复了以往部分页面漏传 preset 而忽略
///   用户配色的隐患）；
/// - 动画/性能参数：`backgroundEffectProvider`（设置页「背景效果」实时调节）。
///
/// [BokehLavaGradient] 是常驻动画（内部 Ticker），包内已做目标帧率限速 +
/// 不可见/后台暂停优化；默认缓慢沉稳（speed 0.4）。
class GlassBackground extends ConsumerWidget {
  const GlassBackground({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preset = ref.watch(colorThemeProvider);
    final effect = ref.watch(backgroundEffectProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final spec = bokehGradientSpecFor(preset, isDark);

    return BokehLavaGradient(
      baseColor: spec.baseColor,
      colors: spec.colors,
      blobOpacity: spec.blobOpacity,
      blobCount: effect.blobCount,
      speed: effect.speed,
      blurStrength: effect.blurStrength,
      minBlobRadius: effect.minBlobRadius,
      maxBlobRadius: effect.maxBlobRadius,
      targetFps: effect.targetFps,
    );
  }
}
