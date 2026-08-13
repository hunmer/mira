import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 主题模式：跟随系统 / 亮色 / 暗色。
///
/// 通过 [themeModeProvider] 读写，选择持久化到 SharedPreferences（key: `theme_mode`）。
/// 默认跟随系统。
const _kPrefKey = 'theme_mode';

/// 主题模式状态管理。
///
/// 启动时调用 [init] 从磁盘载入上次选择；运行时 [setMode] 更新并持久化。
class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.system);

  /// 从 SharedPreferences 载入主题模式。App 启动时调用一次。
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_kPrefKey);
    state = _parse(saved);
  }

  /// 设置主题模式并持久化。
  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPrefKey, _serialize(mode));
  }

  static ThemeMode _parse(String? v) {
    switch (v) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  static String _serialize(ThemeMode m) {
    switch (m) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}

/// 全局主题模式 provider。
final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (ref) => ThemeModeNotifier(),
);

/// 主题模式对应的 i18n key（调用方在 widget 层 `.tr()` 显示）。
String themeModeLabelKey(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'themeMode.light';
    case ThemeMode.dark:
      return 'themeMode.dark';
    case ThemeMode.system:
      return 'themeMode.system';
  }
}
