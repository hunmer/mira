import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Bokeh 背景效果的可调参数。
///
/// 通过 [backgroundEffectProvider] 读写，各字段持久化到 SharedPreferences
/// （key 前缀 `bg_effect_`）。这些参数会喂给全站页面背景 [BokehLavaGradient]，
/// 让用户在「设置 → 背景效果」里实时调节动画观感与性能/电量权衡。
class BackgroundEffectConfig {
  /// 漂移速度（0 = 静止，1 = 包默认，0.4 = 缓慢沉稳）。
  final double speed;

  /// blob 数量（越多越丰富，越耗 GPU）。
  final int blobCount;

  /// 高斯模糊强度（短边比例；越大越「奶油」，越小越锐利）。
  final double blurStrength;

  /// 最大 blob 半径（短边比例）；最小半径据此派生，保持大小层次。
  final double maxBlobRadius;

  /// 目标帧率（24 省电 / 30 平衡 / 60 流畅）。
  final int targetFps;

  const BackgroundEffectConfig({
    required this.speed,
    required this.blobCount,
    required this.blurStrength,
    required this.maxBlobRadius,
    required this.targetFps,
  });

  /// 默认值（与改动前一致：缓慢沉稳 + 30fps）。
  static const BackgroundEffectConfig kDefaults = BackgroundEffectConfig(
    speed: 0.4,
    blobCount: 12,
    blurStrength: 0.05,
    maxBlobRadius: 1.0,
    targetFps: 30,
  );

  /// 取值范围常量，供设置页 slider 边界与钳制复用。
  static const double kMinSpeed = 0.0;
  static const double kMaxSpeed = 1.5;
  static const int kMinBlobCount = 4;
  static const int kMaxBlobCount = 20;
  static const double kMinBlurStrength = 0.01;
  static const double kMaxBlurStrength = 0.12;
  static const double kMinBlobRadius = 0.4;
  static const double kMaxBlobRadius = 1.2;
  static const List<int> kFpsChoices = [24, 30, 60];

  /// 由 [maxBlobRadius] 派生的最小 blob 半径（约为最大值的 0.45，至少 0.1）。
  double get minBlobRadius =>
      (maxBlobRadius * 0.45).clamp(0.1, maxBlobRadius * 0.9);

  BackgroundEffectConfig copyWith({
    double? speed,
    int? blobCount,
    double? blurStrength,
    double? maxBlobRadius,
    int? targetFps,
  }) {
    return BackgroundEffectConfig(
      speed: speed ?? this.speed,
      blobCount: blobCount ?? this.blobCount,
      blurStrength: blurStrength ?? this.blurStrength,
      maxBlobRadius: maxBlobRadius ?? this.maxBlobRadius,
      targetFps: targetFps ?? this.targetFps,
    );
  }

  BackgroundEffectConfig clamped() => BackgroundEffectConfig(
        speed: speed.clamp(kMinSpeed, kMaxSpeed),
        blobCount: blobCount.clamp(kMinBlobCount, kMaxBlobCount),
        blurStrength: blurStrength.clamp(kMinBlurStrength, kMaxBlurStrength),
        maxBlobRadius: maxBlobRadius.clamp(kMinBlobRadius, kMaxBlobRadius),
        targetFps: kFpsChoices.contains(targetFps) ? targetFps : kDefaults.targetFps,
      );
}

const _kSpeed = 'bg_effect_speed';
const _kBlobCount = 'bg_effect_blob_count';
const _kBlur = 'bg_effect_blur';
const _kRadius = 'bg_effect_radius';
const _kFps = 'bg_effect_fps';

/// 背景效果参数状态管理。
///
/// 启动时调用 [init] 从磁盘载入上次设置；运行时 [update] 更新并持久化，
/// [reset] 恢复默认。所有写入都会驱动全站 [GlassBackground] 重建。
class BackgroundEffectNotifier extends StateNotifier<BackgroundEffectConfig> {
  BackgroundEffectNotifier() : super(BackgroundEffectConfig.kDefaults);

  /// 从 SharedPreferences 载入背景效果参数。App 启动时调用一次。
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    state = BackgroundEffectConfig(
      speed: prefs.getDouble(_kSpeed) ?? BackgroundEffectConfig.kDefaults.speed,
      blobCount: prefs.getInt(_kBlobCount) ??
          BackgroundEffectConfig.kDefaults.blobCount,
      blurStrength: prefs.getDouble(_kBlur) ??
          BackgroundEffectConfig.kDefaults.blurStrength,
      maxBlobRadius: prefs.getDouble(_kRadius) ??
          BackgroundEffectConfig.kDefaults.maxBlobRadius,
      targetFps: prefs.getInt(_kFps) ??
          BackgroundEffectConfig.kDefaults.targetFps,
    ).clamped();
  }

  /// 更新参数并持久化（传入完整或部分覆盖后的 config）。
  Future<void> update(BackgroundEffectConfig cfg) async {
    apply(cfg);
    await persist();
  }

  /// 仅更新内存状态，**不落盘**。用于拖动滑块过程中的实时预览
  /// （让全站 [GlassBackground] 立即响应），避免每个拖动 tick 都写磁盘。
  /// 拖动结束后应调用 [persist] 持久化。
  void apply(BackgroundEffectConfig cfg) {
    state = cfg.clamped();
  }

  /// 把当前内存状态写入 SharedPreferences。
  Future<void> persist() async {
    final next = state;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_kSpeed, next.speed);
    await prefs.setInt(_kBlobCount, next.blobCount);
    await prefs.setDouble(_kBlur, next.blurStrength);
    await prefs.setDouble(_kRadius, next.maxBlobRadius);
    await prefs.setInt(_kFps, next.targetFps);
  }

  /// 恢复默认参数并持久化。
  Future<void> reset() => update(BackgroundEffectConfig.kDefaults);
}

/// 全局背景效果参数 provider。
final backgroundEffectProvider =
    StateNotifierProvider<BackgroundEffectNotifier, BackgroundEffectConfig>(
  (ref) => BackgroundEffectNotifier(),
);
