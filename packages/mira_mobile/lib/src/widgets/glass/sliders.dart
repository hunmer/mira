import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

/// 玻璃风格滑条，封装 [GlassSlider]，替代 Material [Slider]。
class MiraSlider extends StatelessWidget {
  const MiraSlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.onChangeStart,
    this.onChangeEnd,
    this.min = 0.0,
    this.max = 1.0,
    this.divisions,
    this.label,
    this.activeColor,
    this.inactiveColor,
    this.thumbColor = CupertinoColors.white,
    this.trackHeight = 4.0,
    this.thumbRadius = 15.0,
    this.settings,
    this.useOwnLayer = false,
    this.quality,
    this.interactionBehavior = GlassInteractionBehavior.full,
    this.glowColor,
    this.glowRadius = 1.5,
    this.focusNode,
    this.autofocus = false,
  });

  final double value;
  final ValueChanged<double>? onChanged;
  final ValueChanged<double>? onChangeStart;
  final ValueChanged<double>? onChangeEnd;
  final double min;
  final double max;
  final int? divisions;
  final String? label;
  final Color? activeColor;
  final Color? inactiveColor;
  final Color thumbColor;
  final double trackHeight;
  final double thumbRadius;
  final LiquidGlassSettings? settings;
  final bool useOwnLayer;
  final GlassQuality? quality;
  final GlassInteractionBehavior interactionBehavior;
  final Color? glowColor;
  final double glowRadius;
  final FocusNode? focusNode;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return GlassSlider(
      value: value,
      onChanged: onChanged,
      onChangeStart: onChangeStart,
      onChangeEnd: onChangeEnd,
      min: min,
      max: max,
      divisions: divisions,
      label: label,
      activeColor: activeColor,
      inactiveColor: inactiveColor,
      thumbColor: thumbColor,
      trackHeight: trackHeight,
      thumbRadius: thumbRadius,
      settings: settings,
      useOwnLayer: useOwnLayer,
      quality: quality,
      interactionBehavior: interactionBehavior,
      glowColor: glowColor,
      glowRadius: glowRadius,
      focusNode: focusNode,
      autofocus: autofocus,
    );
  }
}
