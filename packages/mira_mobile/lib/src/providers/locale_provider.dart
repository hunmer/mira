import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 语言偏好：跟随系统 / 中文 / English。
///
/// 通过 [localeModeProvider] 读写，选择持久化到 SharedPreferences
/// （key: `app_locale`）。默认跟随系统。
const _kPrefKey = 'app_locale';

/// 可选的语言模式。
const kLocaleModes = ['system', 'zh-CN', 'en-US'];

/// 语言偏好状态管理。
///
/// 启动时调用 [init] 从磁盘载入上次选择；运行时 [setMode] 更新并持久化。
class LocaleModeNotifier extends StateNotifier<String> {
  LocaleModeNotifier() : super('system');

  /// 从 SharedPreferences 载入语言偏好。App 启动时调用一次。
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_kPrefKey);
    state = kLocaleModes.contains(saved) ? saved! : 'system';
  }

  /// 设置语言偏好并持久化。
  Future<void> setMode(String mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPrefKey, mode);
  }
}

/// 全局语言偏好 provider。
final localeModeProvider =
    StateNotifierProvider<LocaleModeNotifier, String>(
  (ref) => LocaleModeNotifier(),
);

/// 把语言模式解析成实际 Locale。`system` 时返回 null，交由平台决定。
Locale? localeFromMode(String mode) {
  switch (mode) {
    case 'zh-CN':
      return const Locale('zh', 'CN');
    case 'en-US':
      return const Locale('en', 'US');
    case 'system':
    default:
      return null;
  }
}
