import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../router/app_router.dart';
import '../../providers/background_effect_provider.dart';
import '../../widgets/glass/mira_ui.dart';

/// 背景效果设置页：调节全站 Bokeh 背景的动画/性能参数。
///
/// 结构照搬 [DownloadSettingsScreen]（大标题 + 分组卡片）。本页自身背景即
/// [GlassBackground]，它监听 [backgroundEffectProvider]，所以调节会**实时预览**：
/// - 模糊强度 / 光斑数量 / 帧率：直接写 provider，背景立即响应（模糊与帧率
///   不会重建 blob 场，光斑数量为离散值故每次吸附只重建一次，均无闪烁）。
/// - 动画速度 / 光斑大小：这两个参数会让 [BokehLavaGradient] 重建 blob 场
///   （重新随机位置），逐 tick 更新会闪烁。因此拖动中只更新本地值（滑块跟手、
///   数值实时变），松手时（[MiraSlider.onChangeEnd]）才写 provider——只重建一次。
class BackgroundSettingsScreen extends ConsumerStatefulWidget {
  const BackgroundSettingsScreen({super.key});

  @override
  ConsumerState<BackgroundSettingsScreen> createState() =>
      _BackgroundSettingsScreenState();
}

class _BackgroundSettingsScreenState
    extends ConsumerState<BackgroundSettingsScreen> {
  final GlassLargeTitleController _titleController = GlassLargeTitleController();

  /// 速度 / 光斑大小的本地拖动值。仅在拖动中偏离 provider；松手提交后由
  /// build 重新同步回 provider 值（见 [_reconcile]）。模糊/数量/帧率无需本地态。
  double _speed = BackgroundEffectConfig.kDefaults.speed;
  double _radius = BackgroundEffectConfig.kDefaults.maxBlobRadius;
  bool _dragging = false;

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  BackgroundEffectNotifier get _notifier =>
      ref.read(backgroundEffectProvider.notifier);

  /// 未拖动时让本地值跟随 provider（首次进入、恢复默认、外部变更后同步）。
  void _reconcile(BackgroundEffectConfig cfg) {
    if (!_dragging) {
      _speed = cfg.speed;
      _radius = cfg.maxBlobRadius;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cfg = ref.watch(backgroundEffectProvider);
    _reconcile(cfg);
    final title = 'route.backgroundSettings'.tr();
    final topPad = MediaQuery.paddingOf(context).top;
    final dimColor = theme.colorScheme.onSurface.withValues(alpha: 0.6);

    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        padding: GlassLayout.appBarPadding,
        leading: glassBackButton(context, onPressed: AppRouter.goBack),
        title: Text(title),
        largeTitleController: _titleController,
      ),
      body: Material(
        type: MaterialType.transparency,
        child: CustomScrollView(
          controller: _titleController.scrollController,
          slivers: [
            SliverToBoxAdapter(
              child: SizedBox(height: topPad + GlassLayout.largeTitleTopOffset),
            ),
            GlassLargeTitle(text: title, controller: _titleController),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ---- 动画 ----
                  _SectionHeader(label: 'background.animation'.tr()),
                  const SizedBox(height: 8),

                  // 动画速度（0 = 静止；拖动中本地态，松手提交）
                  _SliderRow(
                    icon: Icons.speed,
                    iconColor: Colors.deepOrange,
                    title: 'background.speed'.tr(),
                    valueText: _speed.toStringAsFixed(2),
                    subtitle: 'background.speedHint'.tr(),
                    child: MiraSlider(
                      value: _speed,
                      min: BackgroundEffectConfig.kMinSpeed,
                      max: BackgroundEffectConfig.kMaxSpeed,
                      activeColor: theme.colorScheme.primary,
                      onChanged: (v) => setState(() {
                        _dragging = true;
                        _speed = v;
                      }),
                      onChangeEnd: (v) {
                        _notifier.update(cfg.copyWith(speed: v));
                        setState(() => _dragging = false);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ---- 外观 ----
                  _SectionHeader(label: 'background.appearance'.tr()),
                  const SizedBox(height: 8),

                  // 光斑数量（离散；吸附时只重建一次，可实时预览）
                  _SliderRow(
                    icon: Icons.bubble_chart_outlined,
                    iconColor: Colors.purple,
                    title: 'background.blobCount'.tr(),
                    valueText: '${cfg.blobCount}',
                    subtitle: 'background.blobCountHint'.tr(),
                    child: Row(
                      children: [
                        MiraIconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          size: 40,
                          onPressed: cfg.blobCount >
                                  BackgroundEffectConfig.kMinBlobCount
                              ? () => _notifier.update(
                                  cfg.copyWith(blobCount: cfg.blobCount - 1))
                              : null,
                        ),
                        Expanded(
                          child: MiraSlider(
                            value: cfg.blobCount.toDouble(),
                            min: BackgroundEffectConfig.kMinBlobCount
                                .toDouble(),
                            max: BackgroundEffectConfig.kMaxBlobCount
                                .toDouble(),
                            divisions: BackgroundEffectConfig.kMaxBlobCount -
                                BackgroundEffectConfig.kMinBlobCount,
                            label: '${cfg.blobCount}',
                            activeColor: theme.colorScheme.primary,
                            onChanged: (v) => _notifier.update(
                                cfg.copyWith(blobCount: v.round())),
                          ),
                        ),
                        MiraIconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          size: 40,
                          onPressed: cfg.blobCount <
                                  BackgroundEffectConfig.kMaxBlobCount
                              ? () => _notifier.update(
                                  cfg.copyWith(blobCount: cfg.blobCount + 1))
                              : null,
                        ),
                      ],
                    ),
                  ),

                  // 模糊强度（不重建 blob 场，可实时预览）
                  _SliderRow(
                    icon: Icons.blur_on,
                    iconColor: Colors.teal,
                    title: 'background.blurStrength'.tr(),
                    valueText: cfg.blurStrength.toStringAsFixed(3),
                    subtitle: 'background.blurHint'.tr(),
                    child: MiraSlider(
                      value: cfg.blurStrength,
                      min: BackgroundEffectConfig.kMinBlurStrength,
                      max: BackgroundEffectConfig.kMaxBlurStrength,
                      activeColor: theme.colorScheme.primary,
                      onChanged: (v) =>
                          _notifier.apply(cfg.copyWith(blurStrength: v)),
                      onChangeEnd: (_) => _notifier.persist(),
                    ),
                  ),

                  // 光斑大小（拖动中本地态，松手提交）
                  _SliderRow(
                    icon: Icons.scatter_plot_outlined,
                    iconColor: Colors.indigo,
                    title: 'background.blobSize'.tr(),
                    valueText: _radius.toStringAsFixed(2),
                    subtitle: 'background.blobSizeHint'.tr(),
                    child: MiraSlider(
                      value: _radius,
                      min: BackgroundEffectConfig.kMinBlobRadius,
                      max: BackgroundEffectConfig.kMaxBlobRadius,
                      activeColor: theme.colorScheme.primary,
                      onChanged: (v) => setState(() {
                        _dragging = true;
                        _radius = v;
                      }),
                      onChangeEnd: (v) {
                        _notifier.update(cfg.copyWith(maxBlobRadius: v));
                        setState(() => _dragging = false);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ---- 性能 ----
                  _SectionHeader(label: 'background.performance'.tr()),
                  const SizedBox(height: 8),
                  MiraCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        MiraListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 10,
                          ),
                          leading:
                              _leadingIcon(Icons.bolt_outlined, Colors.green),
                          title: Text('background.frameRate'.tr()),
                          subtitle: Text(
                            'background.frameRateHint'.tr(),
                            style: TextStyle(fontSize: 12, color: dimColor),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                          child: Column(
                            children: [
                              for (final fps in BackgroundEffectConfig.kFpsChoices)
                                MiraRadioTile<int>(
                                  value: fps,
                                  groupValue: cfg.targetFps,
                                  title: Text(_fpsLabelKey(fps).tr()),
                                  subtitle: Text(
                                    'background.fps${fps}Hint'.tr(),
                                    style:
                                        TextStyle(fontSize: 12, color: dimColor),
                                  ),
                                  onChanged: (v) {
                                    if (v == null) return;
                                    _notifier
                                        .update(cfg.copyWith(targetFps: v));
                                  },
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ---- 恢复默认 ----
                  MiraCard(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: MiraListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 10,
                      ),
                      leading: _leadingIcon(Icons.refresh, Colors.blueGrey),
                      title: Text('background.reset'.tr()),
                      trailing: MiraListTile.chevron,
                      onTap: () async {
                        await _notifier.reset();
                        if (context.mounted) {
                          showMiraToast(
                            context,
                            message: 'background.resetDone'.tr(),
                            type: MiraToastType.success,
                          );
                        }
                      },
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _leadingIcon(IconData icon, Color color) => Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: color, size: 18),
      );

  /// 帧率选项对应的 i18n key（省电24 / 平衡30 / 流畅60）。
  static String _fpsLabelKey(int fps) {
    switch (fps) {
      case 24:
        return 'background.fps24';
      case 60:
        return 'background.fps60';
      case 30:
      default:
        return 'background.fps30';
    }
  }
}

/// 标题 + 当前值 + 滑块的通用行（包在 [MiraCard] 里）。
class _SliderRow extends StatelessWidget {
  const _SliderRow({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.valueText,
    required this.subtitle,
    required this.child,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String valueText;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dimColor = theme.colorScheme.onSurface.withValues(alpha: 0.6);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: MiraCard(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          children: [
            MiraListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              leading: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              title: Row(
                children: [
                  Expanded(child: Text(title)),
                  Text(
                    valueText,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
              subtitle: Text(
                subtitle,
                style: TextStyle(fontSize: 12, color: dimColor),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final dimColor =
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5);
    return Padding(
      padding: const EdgeInsets.only(left: 8, top: 4),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: dimColor,
        ),
      ),
    );
  }
}
