import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 颜色主题（玻璃配色）预设方案。
///
/// 通过 [colorThemeProvider] 读写，选择持久化到 SharedPreferences
/// （key: `color_theme`）。默认 [appDefault]——不覆盖库默认外观。
enum ColorThemePreset {
  /// 跟随默认：不向 [LiquidGlassWidgets.wrap] 传 theme，沿用库内置外观。
  appDefault,

  /// 经典 iOS 蓝。
  iosBlue,

  /// 紫罗兰 / 梦幻紫。
  violet,

  /// 青绿 / 清新自然。
  teal,

  /// 中性灰 / 极简冷静。
  gray,

  /// 玫红 / 活力粉。
  rose,

  /// 翡翠绿 / 自然清新。
  emerald,

  /// 熔岩原色（明亮焦褐底 + 橙金 9 色）。对应 BokehTheme.og。
  lavaOg,

  /// 暖光晨色（奶油底 + 柔粉桃）。对应 BokehTheme.light1。
  lavaLight1,

  /// 鼠尾草暮光（亮奶油底 + 鼠尾草/陶土）。对应 BokehTheme.light2。
  lavaLight2,

  /// 暖土夕照（暖奶油底 + 鼠尾草/陶土/橄榄）。对应 BokehTheme.light3。
  lavaLight3,

  /// 烬橙深焰（深焦褐底 + 橙金发光）。对应 BokehTheme.dark1。
  lavaDark1,

  /// 炽夜烈焰（近黑底 + 强烈橙光）。对应 BokehTheme.dark2。
  lavaDark2,

  /// 墨青烬（黑底 + 青绿与橙光）。对应 BokehTheme.dark3。
  lavaDark3,
}

/// 颜色主题状态管理。
///
/// 启动时调用 [init] 从磁盘载入上次选择；运行时 [setPreset] 更新并持久化。
class ColorThemeNotifier extends StateNotifier<ColorThemePreset> {
  ColorThemeNotifier() : super(ColorThemePreset.appDefault);

  /// 从 SharedPreferences 载入颜色主题。App 启动时调用一次。
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    state = _parse(prefs.getString(_kPrefKey));
  }

  /// 设置颜色主题并持久化。
  Future<void> setPreset(ColorThemePreset preset) async {
    state = preset;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPrefKey, _serialize(preset));
  }

  static ColorThemePreset _parse(String? v) {
    switch (v) {
      case 'ios_blue':
        return ColorThemePreset.iosBlue;
      case 'violet':
        return ColorThemePreset.violet;
      case 'teal':
        return ColorThemePreset.teal;
      case 'gray':
        return ColorThemePreset.gray;
      case 'rose':
        return ColorThemePreset.rose;
      case 'emerald':
        return ColorThemePreset.emerald;
      case 'lava_og':
        return ColorThemePreset.lavaOg;
      case 'lava_light1':
        return ColorThemePreset.lavaLight1;
      case 'lava_light2':
        return ColorThemePreset.lavaLight2;
      case 'lava_light3':
        return ColorThemePreset.lavaLight3;
      case 'lava_dark1':
        return ColorThemePreset.lavaDark1;
      case 'lava_dark2':
        return ColorThemePreset.lavaDark2;
      case 'lava_dark3':
        return ColorThemePreset.lavaDark3;
      case 'app_default':
      default:
        return ColorThemePreset.appDefault;
    }
  }

  static String _serialize(ColorThemePreset p) {
    switch (p) {
      case ColorThemePreset.appDefault:
        return 'app_default';
      case ColorThemePreset.iosBlue:
        return 'ios_blue';
      case ColorThemePreset.violet:
        return 'violet';
      case ColorThemePreset.teal:
        return 'teal';
      case ColorThemePreset.gray:
        return 'gray';
      case ColorThemePreset.rose:
        return 'rose';
      case ColorThemePreset.emerald:
        return 'emerald';
      case ColorThemePreset.lavaOg:
        return 'lava_og';
      case ColorThemePreset.lavaLight1:
        return 'lava_light1';
      case ColorThemePreset.lavaLight2:
        return 'lava_light2';
      case ColorThemePreset.lavaLight3:
        return 'lava_light3';
      case ColorThemePreset.lavaDark1:
        return 'lava_dark1';
      case ColorThemePreset.lavaDark2:
        return 'lava_dark2';
      case ColorThemePreset.lavaDark3:
        return 'lava_dark3';
    }
  }
}

/// 全局颜色主题 provider。
final colorThemeProvider =
    StateNotifierProvider<ColorThemeNotifier, ColorThemePreset>(
  (ref) => ColorThemeNotifier(),
);

const _kPrefKey = 'color_theme';

/// 颜色主题对应的 i18n key（调用方在 widget 层 `.tr()` 显示）。
String colorThemeLabelKey(ColorThemePreset preset) {
  switch (preset) {
    case ColorThemePreset.appDefault:
      return 'colorTheme.appDefault';
    case ColorThemePreset.iosBlue:
      return 'colorTheme.iosBlue';
    case ColorThemePreset.violet:
      return 'colorTheme.violet';
    case ColorThemePreset.teal:
      return 'colorTheme.teal';
    case ColorThemePreset.gray:
      return 'colorTheme.gray';
    case ColorThemePreset.rose:
      return 'colorTheme.rose';
    case ColorThemePreset.emerald:
      return 'colorTheme.emerald';
    case ColorThemePreset.lavaOg:
      return 'colorTheme.lavaOg';
    case ColorThemePreset.lavaLight1:
      return 'colorTheme.lavaLight1';
    case ColorThemePreset.lavaLight2:
      return 'colorTheme.lavaLight2';
    case ColorThemePreset.lavaLight3:
      return 'colorTheme.lavaLight3';
    case ColorThemePreset.lavaDark1:
      return 'colorTheme.lavaDark1';
    case ColorThemePreset.lavaDark2:
      return 'colorTheme.lavaDark2';
    case ColorThemePreset.lavaDark3:
      return 'colorTheme.lavaDark3';
  }
}

/// 预设对应的 Material 主强调色（种子色）。
///
/// 取该预设 glowColors.primary 的满不透明原色，用于派生 [ColorScheme]，让
/// `primaryColor` / `primaryContainer` 等与玻璃配色保持一致。
/// [ColorThemePreset.appDefault] 返回原来的 `Colors.deepPurple`，与改动前完全一致。
Color seedColorFor(ColorThemePreset preset) {
  switch (preset) {
    case ColorThemePreset.appDefault:
      return Colors.deepPurple;
    case ColorThemePreset.iosBlue:
      return const Color(0xFF007AFF);
    case ColorThemePreset.violet:
      return const Color(0xFFAF52DE);
    case ColorThemePreset.teal:
      return const Color(0xFF00C7BE);
    case ColorThemePreset.gray:
      return const Color(0xFF8E8E93);
    case ColorThemePreset.rose:
      return const Color(0xFFFF375F);
    case ColorThemePreset.emerald:
      return const Color(0xFF34C759);
    case ColorThemePreset.lavaOg:
    case ColorThemePreset.lavaLight1:
    case ColorThemePreset.lavaDark1:
    case ColorThemePreset.lavaDark2:
      return const Color(0xFFFF8000); // 橙系
    case ColorThemePreset.lavaLight2:
    case ColorThemePreset.lavaLight3:
      return const Color(0xFF8FAB7A); // 鼠尾草/暖土
    case ColorThemePreset.lavaDark3:
      return const Color(0xFF40C8E0); // 墨青
  }
}

/// 预设的「展示主色」——该预设标志性、满不透明的强调色。
///
/// 与该预设 glowColors.primary 的原色一致，用于在暗色模式下显式覆盖
/// [ColorScheme] 的 `primary`。原因：M3 的 `ColorScheme.fromSeed` 在暗色下
/// 会把任何饱和种子色调亮到偏淡蓝紫（保证暗背景上的对比度），导致蓝/青/橙/
/// 灰等预设的暗色 `primary` 全部褪成相近的淡紫色。这里直接覆盖回满饱和原色，
/// 让暗色 `primary` 与玻璃发光色保持一致、彼此可区分。
///
/// 仅 [ColorThemePreset.appDefault] 返回 `null`：保持改动前 deepPurple 的
/// M3 派生行为不变。
Color? primaryColorFor(ColorThemePreset preset) {
  switch (preset) {
    case ColorThemePreset.appDefault:
      return null;
    case ColorThemePreset.iosBlue:
      return const Color(0xFF0A84FF); // 暗色变体原色（与该预设 dark glow primary 一致）
    case ColorThemePreset.violet:
      return const Color(0xFFBF5AF2);
    case ColorThemePreset.teal:
      return const Color(0xFF63E6E2);
    case ColorThemePreset.gray:
      return const Color(0xFF98989D);
    case ColorThemePreset.rose:
      return const Color(0xFFFF375F); // 暗色变体原色（与该预设 dark glow primary 一致）
    case ColorThemePreset.emerald:
      return const Color(0xFF30D158);
    case ColorThemePreset.lavaOg:
    case ColorThemePreset.lavaLight1:
    case ColorThemePreset.lavaDark1:
    case ColorThemePreset.lavaDark2:
      return const Color(0xFFFF9F0A); // 橙系暗色原色
    case ColorThemePreset.lavaLight2:
    case ColorThemePreset.lavaLight3:
      return const Color(0xFFA7C95A); // 鼠尾草亮色
    case ColorThemePreset.lavaDark3:
      return const Color(0xFF63E6E2); // 墨青暗色
  }
}

/// [BokehLavaGradient] 的配置：底色 + blob 调色板 + 不透明度。
///
/// 由 [bokehGradientSpecFor] 按预设（及明暗）给出，作为全站页面背景的配色来源。
/// 颜色取自该预设的强调色族，让动态 bokeh 与玻璃发光色保持一致。
class BokehGradientSpec {
  /// 填充在所有 blob 之后的底色（亮色近白、暗色为该色调的深色）。
  final Color baseColor;

  /// 循环铺到各 blob 上的颜色（建议 5–9 色，越多越丰富）。
  final List<Color> colors;

  /// blob 不透明度。<1 时重叠 blob 会互相混色，画面更柔和多变。
  final double blobOpacity;

  const BokehGradientSpec(this.baseColor, this.colors, this.blobOpacity);
}

/// 预设对应的 bokeh 背景配置（按明暗两态）。
///
/// 用于 [GlassScaffold] 的 `background`——所有页面都通过
/// [GlassBackground] → [BokehLavaGradient] 应用此配置。
/// 亮色：偏该色调的近白底色 + 淡彩 blob；暗色：该色调的深底 + 满饱和发光 blob。
BokehGradientSpec bokehGradientSpecFor(ColorThemePreset preset, bool isDark) {
  switch (preset) {
    case ColorThemePreset.appDefault:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF0A0A2E),
              [
                Color(0xFF5E5CE6), Color(0xFF7C4DFF), Color(0xFF9575CD),
                Color(0xFFB388FF), Color(0xFF6A1B9A), Color(0xFF4527A0),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFF3F0FA),
              [
                Color(0xFFE1D5F5), Color(0xFFD1BDE8), Color(0xFFB39DDB),
                Color(0xFF9575CD), Color(0xFFC5AEE8), Color(0xFFEFDFF8),
              ],
              0.55,
            );

    case ColorThemePreset.iosBlue:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF06122E),
              [
                Color(0xFF0A84FF), Color(0xFF007AFF), Color(0xFF5E5CE6),
                Color(0xFF2563EB), Color(0xFF1E40AF), Color(0xFF3B82F6),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFE8F0FE),
              [
                Color(0xFFD0E2FF), Color(0xFFB3D1FF), Color(0xFF8AB4FF),
                Color(0xFFA8C7FF), Color(0xFFDCE8FF), Color(0xFFC7DBFF),
              ],
              0.55,
            );

    case ColorThemePreset.violet:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF180A2E),
              [
                Color(0xFFBF5AF2), Color(0xFFAF52DE), Color(0xFF9333EA),
                Color(0xFF7E22CE), Color(0xFFC026D3), Color(0xFF6D28D9),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFF3E8FF),
              [
                Color(0xFFE9D5FF), Color(0xFFD8B4FE), Color(0xFFC084FC),
                Color(0xFFE0C2FF), Color(0xFFF0E0FF), Color(0xFFD1B0F0),
              ],
              0.55,
            );

    case ColorThemePreset.teal:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF04261F),
              [
                Color(0xFF63E6E2), Color(0xFF14B8A6), Color(0xFF0D9488),
                Color(0xFF2DD4BF), Color(0xFF06B6D4), Color(0xFF0891B2),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFE0F7F4),
              [
                Color(0xFFBFEDE6), Color(0xFF99F6E4), Color(0xFF5EEAD4),
                Color(0xFFCFF7F0), Color(0xFFA7EFE5), Color(0xFFD9F7F2),
              ],
              0.55,
            );

    case ColorThemePreset.gray:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF121214),
              [
                Color(0xFF98989D), Color(0xFF636366), Color(0xFF8E8E93),
                Color(0xFFAEAEB2), Color(0xFF5A5A5E), Color(0xFF7C7C80),
              ],
              0.75,
            )
          : const BokehGradientSpec(
              Color(0xFFF2F2F4),
              [
                Color(0xFFE5E5E7), Color(0xFFD1D1D6), Color(0xFFC0C0C5),
                Color(0xFFECECEF), Color(0xFFD8D8DC), Color(0xFFF0F0F2),
              ],
              0.50,
            );

    case ColorThemePreset.rose:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF2A0612),
              [
                Color(0xFFFF375F), Color(0xFFFF2D55), Color(0xFFEC4899),
                Color(0xFFF43F5E), Color(0xFFFF6B8A), Color(0xFFBE185D),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFFFE9EE),
              [
                Color(0xFFFFCFD8), Color(0xFFFFB3C1), Color(0xFFFF8FA3),
                Color(0xFFFFD9E0), Color(0xFFFFAEC0), Color(0xFFFFE0E8),
              ],
              0.55,
            );

    case ColorThemePreset.emerald:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF04220F),
              [
                Color(0xFF30D158), Color(0xFF34C759), Color(0xFF16A34A),
                Color(0xFF4ADE80), Color(0xFF22C55E), Color(0xFF15803D),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFE3F6E8),
              [
                Color(0xFFC7EFD2), Color(0xFFA7E8B8), Color(0xFF7DD395),
                Color(0xFFD2F2DA), Color(0xFFB8E8C5), Color(0xFFE5F8EC),
              ],
              0.55,
            );

    // ---- lava 系预设：保留各自色调身份（blob 调色板），并随系统明暗切换 ----
    // 亮色：明亮/柔和底色 + 柔彩 blob；暗色：深色底 + 同色调饱和发光 blob。
    case ColorThemePreset.lavaOg:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF2A0E02), // 深咖啡底
              [
                Color(0xFFFFE6B8), Color(0xFFFFD089), Color(0xFFFFB85C),
                Color(0xFFFF9A43), Color(0xFFFC7C2C), Color(0xFFF26019),
                Color(0xFFD94E10), Color(0xFFFFCBA0), Color(0xFF932D00),
              ],
              0.85,
            )
          : const BokehGradientSpec(
              Color(0xFFFFE3C2), // 暖奶油底
              [
                Color(0xFFFFD9A0), Color(0xFFFFC080), Color(0xFFFFAE6B),
                Color(0xFFFCB079), Color(0xFFF2A06B), Color(0xFFE0945C),
                Color(0xFFFFCBA0), Color(0xFFD99858), Color(0xFFC97842),
              ],
              0.60,
            );

    case ColorThemePreset.lavaLight1:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF2A1A0A), // 深褐底
              [
                Color(0xFFFFCBA0), Color(0xFFFFB37A), Color(0xFFFF9F5C),
                Color(0xFFFFD4A8), Color(0xFFE89060), Color(0xFFFF8A4D),
                Color(0xFFFFD9B0),
              ],
              0.70,
            )
          : const BokehGradientSpec(
              Color(0xFFFFF1E2), // 奶油底（原配色）
              [
                Color(0xFFFFE0C8), Color(0xFFFFD3B0), Color(0xFFFFC9A8),
                Color(0xFFFFE6D6), Color(0xFFFAD4B8), Color(0xFFFFBE99),
                Color(0xFFFFEAD2),
              ],
              0.60,
            );

    case ColorThemePreset.lavaLight2:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF13180E), // 深森林底
              [
                Color(0xFF9BBF8E), Color(0xFFC97A45), Color(0xFF5E8863),
                Color(0xFFB8A06A),
              ],
              0.80,
            )
          : const BokehGradientSpec(
              Color(0xFFFFF8EE), // 奶油底（原配色）
              [
                Color(0xFF9BBF8E), Color(0xFFAE5C34), Color(0xFFECF2E5),
                Color(0xFFFFF4D8),
              ],
              0.80,
            );

    case ColorThemePreset.lavaLight3:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF1E1808), // 深暖土底
              [
                Color(0xFF7BA67F), Color(0xFF3A3F2A), Color(0xFFC97A45),
                Color(0xFF9BBF8E), Color(0xFFE8D08A),
              ],
              0.70,
            )
          : const BokehGradientSpec(
              Color(0xFFF7E0B6), // 暖奶油底（原配色）
              [
                Color(0xFF5E8863), Color(0xFF1C1F16), Color(0xFFAE5C34),
                Color(0xFF9BBF8E), Color(0xFFFFF4D8),
              ],
              0.60,
            );

    case ColorThemePreset.lavaDark1:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF8F2C00), // 深焦褐底（原配色）
              [
                Color(0xFFFFE6B8), Color(0xFFFFD089), Color(0xFFFFB85C),
                Color(0xFFFF9A43), Color(0xFFFC7C2C), Color(0xFFF26019),
                Color(0xFFD94E10), Color(0xFFFFCBA0), Color(0xFF932D00),
              ],
              0.85,
            )
          : const BokehGradientSpec(
              Color(0xFFFFE8CC), // 奶油底
              [
                Color(0xFFFFCFA0), Color(0xFFFFB877), Color(0xFFFFA050),
                Color(0xFFF2A06B), Color(0xFFE0945C), Color(0xFFD97A3C),
                Color(0xFFFFCBA0), Color(0xFFC97842),
              ],
              0.60,
            );

    case ColorThemePreset.lavaDark2:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF160B04), // 近黑底（原配色）
              [
                Color(0xFFFF8A2A), Color(0xFFFF6A14), Color(0xFFFFB152),
                Color(0xFFFFC97A), Color(0xFFE2530E), Color(0xFF7A2600),
                Color(0xFFFFD089),
              ],
              0.90,
            )
          : const BokehGradientSpec(
              Color(0xFFFFF1E0), // 奶油底
              [
                Color(0xFFFFB877), Color(0xFFFFA050), Color(0xFFFFCB95),
                Color(0xFFE89250), Color(0xFFC97030), Color(0xFFFFD9A8),
              ],
              0.65,
            );

    case ColorThemePreset.lavaDark3:
      return isDark
          ? const BokehGradientSpec(
              Color(0xFF000000), // 纯黑底（原配色）
              [
                Color(0xFF09353C), Color(0xFF64AA74), Color(0xFF034753),
                Color(0xFFC15B2E), Color(0xFFB14415), Color(0xFFC15B2E),
                Color(0xFFB14415),
              ],
              0.72,
            )
          : const BokehGradientSpec(
              Color(0xFFE8F4F2), // 淡青底
              [
                Color(0xFF7FC4B8), Color(0xFF5EA890), Color(0xFF9BBF8E),
                Color(0xFFE0A06A), Color(0xFFC98A4A), Color(0xFF7FC4B8),
              ],
              0.60,
            );
  }
}

/// 把预设转成可供 [LiquidGlassWidgets.wrap] 注入的 [GlassThemeData]。
///
/// 返回 `null` 表示不覆盖（即 [ColorThemePreset.appDefault]），与未改动前
/// 的行为完全一致。其余预设分别给出 light / dark 两态的完整配置。
///
/// 注意：原始预设使用 `Color.withOpacity(alpha)`；本项目统一改用
/// `Color.withValues(alpha:)`（新 API，`withOpacity` 已被标记弃用），
/// 颜色与透明度数值均与原始方案一致。
GlassThemeData? glassThemeDataFor(ColorThemePreset preset) {
  switch (preset) {
    case ColorThemePreset.appDefault:
      return null;

    case ColorThemePreset.iosBlue:
      return GlassThemeData(
        light: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 28,
            blur: 8,
            glassColor: Color(0x33FFFFFF),
            lightIntensity: 1.2,
            saturation: 1.3,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF007AFF).withValues(alpha: 0.35),
            secondary: const Color(0xFF5856D6).withValues(alpha: 0.3),
            success: const Color(0xFF34C759).withValues(alpha: 0.3),
            warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
            danger: const Color(0xFFFF3B30).withValues(alpha: 0.3),
          ),
        ),
        dark: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 38,
            blur: 12,
            glassColor: Color(0x1AFFFFFF),
            lightIntensity: 1.8,
            saturation: 1.4,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF0A84FF).withValues(alpha: 0.45),
            secondary: const Color(0xFF5E5CE6).withValues(alpha: 0.4),
            success: const Color(0xFF30D158).withValues(alpha: 0.4),
            warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
            danger: const Color(0xFFFF453A).withValues(alpha: 0.4),
          ),
        ),
      );

    case ColorThemePreset.violet:
      return GlassThemeData(
        light: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 30,
            blur: 9,
            glassColor: Color(0x28F5F0FF),
            lightIntensity: 1.3,
            saturation: 1.4,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFFAF52DE).withValues(alpha: 0.35),
            secondary: const Color(0xFF5856D6).withValues(alpha: 0.3),
            success: const Color(0xFF34C759).withValues(alpha: 0.3),
            warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
            danger: const Color(0xFFFF2D55).withValues(alpha: 0.3),
          ),
        ),
        dark: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 42,
            blur: 14,
            glassColor: Color(0x1A2A1A40),
            lightIntensity: 2.0,
            saturation: 1.5,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFFBF5AF2).withValues(alpha: 0.5),
            secondary: const Color(0xFF5E5CE6).withValues(alpha: 0.45),
            success: const Color(0xFF30D158).withValues(alpha: 0.4),
            warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
            danger: const Color(0xFFFF375F).withValues(alpha: 0.45),
          ),
        ),
      );

    case ColorThemePreset.teal:
      return GlassThemeData(
        light: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 26,
            blur: 7,
            glassColor: Color(0x30E8F8F5),
            lightIntensity: 1.1,
            saturation: 1.25,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF00C7BE).withValues(alpha: 0.35),
            secondary: const Color(0xFF30B0C7).withValues(alpha: 0.3),
            success: const Color(0xFF34C759).withValues(alpha: 0.35),
            warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
            danger: const Color(0xFFFF3B30).withValues(alpha: 0.3),
          ),
        ),
        dark: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 36,
            blur: 11,
            glassColor: Color(0x1A0A2A28),
            lightIntensity: 1.7,
            saturation: 1.35,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF63E6E2).withValues(alpha: 0.45),
            secondary: const Color(0xFF40C8E0).withValues(alpha: 0.4),
            success: const Color(0xFF30D158).withValues(alpha: 0.45),
            warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
            danger: const Color(0xFFFF453A).withValues(alpha: 0.4),
          ),
        ),
      );

    case ColorThemePreset.lavaOg:
    case ColorThemePreset.lavaLight1:
    case ColorThemePreset.lavaDark1:
    case ColorThemePreset.lavaDark2:
      // 橙色熔岩系共用同一套暖橙玻璃配置（取自原 amber 预设）。
      return _orangeGlassTheme();

    case ColorThemePreset.lavaLight2:
    case ColorThemePreset.lavaLight3:
    case ColorThemePreset.lavaDark3:
      // 鼠尾草/暖土/墨青系共用大地色玻璃配置。
      return _earthGlassTheme();

    case ColorThemePreset.gray:
      return GlassThemeData(
        light: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 25,
            blur: 6,
            glassColor: Color(0x25F5F5F7),
            lightIntensity: 1.0,
            saturation: 1.1,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF8E8E93).withValues(alpha: 0.35),
            secondary: const Color(0xFFAEAEB2).withValues(alpha: 0.3),
            success: const Color(0xFF34C759).withValues(alpha: 0.3),
            warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
            danger: const Color(0xFFFF3B30).withValues(alpha: 0.3),
          ),
        ),
        dark: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 35,
            blur: 10,
            glassColor: Color(0x1A1C1C1E),
            lightIntensity: 1.5,
            saturation: 1.2,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF98989D).withValues(alpha: 0.4),
            secondary: const Color(0xFF636366).withValues(alpha: 0.35),
            success: const Color(0xFF30D158).withValues(alpha: 0.4),
            warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
            danger: const Color(0xFFFF453A).withValues(alpha: 0.4),
          ),
        ),
      );

    case ColorThemePreset.rose:
      return GlassThemeData(
        light: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 28,
            blur: 8,
            glassColor: Color(0x28FFE9EE),
            lightIntensity: 1.25,
            saturation: 1.4,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFFFF375F).withValues(alpha: 0.4),
            secondary: const Color(0xFFFF2D55).withValues(alpha: 0.3),
            success: const Color(0xFF34C759).withValues(alpha: 0.3),
            warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
            danger: const Color(0xFFFF3B30).withValues(alpha: 0.35),
          ),
        ),
        dark: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 40,
            blur: 13,
            glassColor: Color(0x1A2A0612),
            lightIntensity: 1.9,
            saturation: 1.45,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFFFF375F).withValues(alpha: 0.5),
            secondary: const Color(0xFFFF2D55).withValues(alpha: 0.45),
            success: const Color(0xFF30D158).withValues(alpha: 0.4),
            warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
            danger: const Color(0xFFFF453A).withValues(alpha: 0.45),
          ),
        ),
      );

    case ColorThemePreset.emerald:
      return GlassThemeData(
        light: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 27,
            blur: 7,
            glassColor: Color(0x28E3F6E8),
            lightIntensity: 1.2,
            saturation: 1.3,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF34C759).withValues(alpha: 0.4),
            secondary: const Color(0xFF30D158).withValues(alpha: 0.3),
            success: const Color(0xFF34C759).withValues(alpha: 0.35),
            warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
            danger: const Color(0xFFFF3B30).withValues(alpha: 0.3),
          ),
        ),
        dark: GlassThemeVariant(
          settings: const GlassThemeSettings(
            thickness: 38,
            blur: 12,
            glassColor: Color(0x1A04220F),
            lightIntensity: 1.8,
            saturation: 1.4,
          ),
          quality: GlassQuality.standard,
          glowColors: GlassGlowColors(
            primary: const Color(0xFF30D158).withValues(alpha: 0.5),
            secondary: const Color(0xFF34C759).withValues(alpha: 0.4),
            success: const Color(0xFF30D158).withValues(alpha: 0.45),
            warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
            danger: const Color(0xFFFF453A).withValues(alpha: 0.4),
          ),
        ),
      );
  }
}

/// 橙色熔岩系（lavaOg / lavaLight1 / lavaDark1 / lavaDark2）共用的玻璃配置。
///
/// 取自原 amber 预设：暖橙 glow + 偏暖玻璃面。
GlassThemeData _orangeGlassTheme() => GlassThemeData(
      light: GlassThemeVariant(
        settings: const GlassThemeSettings(
          thickness: 29,
          blur: 8,
          glassColor: Color(0x2AFFF5EB),
          lightIntensity: 1.25,
          saturation: 1.35,
        ),
        quality: GlassQuality.standard,
        glowColors: GlassGlowColors(
          primary: const Color(0xFFFF9500).withValues(alpha: 0.4),
          secondary: const Color(0xFFFF6B00).withValues(alpha: 0.3),
          success: const Color(0xFF34C759).withValues(alpha: 0.3),
          warning: const Color(0xFFFFCC00).withValues(alpha: 0.35),
          danger: const Color(0xFFFF3B30).withValues(alpha: 0.3),
        ),
      ),
      dark: GlassThemeVariant(
        settings: const GlassThemeSettings(
          thickness: 40,
          blur: 13,
          glassColor: Color(0x1A2A1A0A),
          lightIntensity: 1.9,
          saturation: 1.45,
        ),
        quality: GlassQuality.standard,
        glowColors: GlassGlowColors(
          primary: const Color(0xFFFF9F0A).withValues(alpha: 0.5),
          secondary: const Color(0xFFFF6B00).withValues(alpha: 0.45),
          success: const Color(0xFF30D158).withValues(alpha: 0.4),
          warning: const Color(0xFFFFD60A).withValues(alpha: 0.45),
          danger: const Color(0xFFFF453A).withValues(alpha: 0.4),
        ),
      ),
    );

/// 大地色系（lavaLight2 / lavaLight3 / lavaDark3）共用的玻璃配置。
///
/// 鼠尾草绿 / 暖土 / 墨青 glow，配合这些预设的自然色调背景。
GlassThemeData _earthGlassTheme() => GlassThemeData(
      light: GlassThemeVariant(
        settings: const GlassThemeSettings(
          thickness: 28,
          blur: 8,
          glassColor: Color(0x28EFF4E8),
          lightIntensity: 1.2,
          saturation: 1.3,
        ),
        quality: GlassQuality.standard,
        glowColors: GlassGlowColors(
          primary: const Color(0xFF8FAB7A).withValues(alpha: 0.38),
          secondary: const Color(0xFFAE5C34).withValues(alpha: 0.3),
          success: const Color(0xFF34C759).withValues(alpha: 0.3),
          warning: const Color(0xFFFF9500).withValues(alpha: 0.3),
          danger: const Color(0xFFFF3B30).withValues(alpha: 0.3),
        ),
      ),
      dark: GlassThemeVariant(
        settings: const GlassThemeSettings(
          thickness: 38,
          blur: 12,
          glassColor: Color(0x1A08221A),
          lightIntensity: 1.8,
          saturation: 1.4,
        ),
        quality: GlassQuality.standard,
        glowColors: GlassGlowColors(
          primary: const Color(0xFF63E6E2).withValues(alpha: 0.45),
          secondary: const Color(0xFFC15B2E).withValues(alpha: 0.4),
          success: const Color(0xFF30D158).withValues(alpha: 0.4),
          warning: const Color(0xFFFF9F0A).withValues(alpha: 0.4),
          danger: const Color(0xFFFF453A).withValues(alpha: 0.4),
        ),
      ),
    );
