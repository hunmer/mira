import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

/// 项目统一的 Liquid Glass 外观预设。
///
/// 业务组件通过这里选择玻璃参数，避免在页面中散落构造
/// [LiquidGlassSettings]，并保持不同类型表面的一致性。
class MiraGlassSettings {
  const MiraGlassSettings._();

  /// 滚动内容使用的轻量预设。
  static const standard = LiquidGlassSettings(
    blur: 4,
    thickness: 10,
    glassColor: Color.fromRGBO(255, 255, 255, 0.08),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0,
    saturation: 1.2,
    refractiveIndex: 1.2,
    chromaticAberration: 0.01,
    specularSharpness: GlassSpecularSharpness.medium,
  );

  /// 按钮和交互控件使用的预设。
  static const interactive = LiquidGlassSettings(
    blur: 10,
    thickness: 10,
    glassColor: Color.fromRGBO(255, 255, 255, 0.2),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0.3,
    saturation: 0.0,
    refractiveIndex: 0.7,
    chromaticAberration: 0.0,
  );

  /// 静态表面（导航栏、工具栏）使用的预设。
  static const surface = LiquidGlassSettings(
    blur: 10,
    thickness: 10,
    glassColor: Color.fromRGBO(255, 255, 255, 0.2),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0.3,
    saturation: 1.2,
    refractiveIndex: 1.15,
    chromaticAberration: 0.0,
  );

  /// 底部导航栏使用的重度模糊预设。
  static const bottomBar = LiquidGlassSettings(
    blur: 20,
    thickness: 20,
    glassColor: Color.fromRGBO(255, 255, 255, 0.15),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0.5,
    saturation: 1.2,
    refractiveIndex: 1.2,
    chromaticAberration: 0.0,
  );

  /// 覆盖层、卡片和按钮使用的预设。
  static const overlay = LiquidGlassSettings(
    blur: 10,
    thickness: 10,
    glassColor: Color.fromRGBO(255, 255, 255, 0.12),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0.4,
    saturation: 1.2,
    refractiveIndex: 0.7,
    chromaticAberration: 0.0,
  );

  /// 大型底部 sheet 和模态覆盖层使用的预设。
  static const sheet = LiquidGlassSettings(
    blur: 10,
    thickness: 10,
    glassColor: Color.fromRGBO(255, 255, 255, 0.12),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0.4,
    saturation: 1.2,
    refractiveIndex: 0.15,
    chromaticAberration: 0.0,
  );

  /// 输入框使用的低干扰预设。
  static const input = LiquidGlassSettings(
    blur: 20,
    thickness: 10,
    glassColor: Color.fromRGBO(255, 255, 255, 0.12),
    lightAngle: 0.75 * math.pi,
    lightIntensity: 0.7,
    ambientStrength: 0.4,
    saturation: 1.2,
    refractiveIndex: 0.7,
    chromaticAberration: 0.0,
  );

  /// 暗色模式 Popover 使用的深色背板预设。
  static const popover = LiquidGlassSettings(backerColor: Color(0x8C000000));
}
