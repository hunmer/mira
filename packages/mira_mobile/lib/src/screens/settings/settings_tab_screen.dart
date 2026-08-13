import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../mira_sdk/mira_sdk.dart';
import '../../../router/app_router.dart';
import '../../providers/color_theme_provider.dart';
import '../../providers/library_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/server_provider.dart';
import '../../providers/session_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/glass/mira_ui.dart';

/// Settings tab content shown inside [MainShellScreen].
///
/// 显示当前登录用户与素材库，提供断开连接入口与服务器管理入口。
///
/// 嵌入 MainShell 时，[scrollController] / [largeTitleController] 由外层传入，
/// 用以驱动 iOS26 风格的大标题折叠：第一个 sliver 为 [GlassLargeTitle]。
class SettingsTabScreen extends ConsumerWidget {
  const SettingsTabScreen({
    super.key,
    this.scrollController,
    this.largeTitleText = 'settings.title',
    this.largeTitleController,
    this.largeTitleTrailing,
  });

  final ScrollController? scrollController;

  /// 大标题文本，需与导航栏小标题一致。
  final String largeTitleText;

  /// 协调大标题折叠动画的控制器。
  final GlassLargeTitleController? largeTitleController;

  /// 大标题行尾的 widget（如退出登录按钮），与大标题同行并随之淡出
  ///（Apple Music / Podcasts 模式，参考 liquid_glass apple_music_demo）。
  final Widget? largeTitleTrailing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final session = ref.watch(sessionProvider);
    final themeMode = ref.watch(themeModeProvider);
    final colorTheme = ref.watch(colorThemeProvider);
    final localeMode = ref.watch(localeModeProvider);
    final topPad = MediaQuery.paddingOf(context).top;
    final avatar = session.user?.avatar.trim() ?? '';
    final avatarUri = Uri.tryParse(avatar);
    final avatarUrl = avatar.isEmpty
        ? null
        : avatarUri?.hasScheme == true
        ? avatar
        : session.client?.getHttpClient().getUrl(avatar);
    final isOnline = session.isConnected && (session.user?.isActive ?? false);

    return CustomScrollView(
      controller: scrollController,
      slivers: [
        // 占位：状态栏 + 预留间距(24)，把大标题推到状态栏下方。
        if (largeTitleController != null)
          SliverToBoxAdapter(child: SizedBox(height: topPad + 24)),
        // iOS26 大标题（第一个 sliver）。
        if (largeTitleController != null)
          GlassLargeTitle(
            text: largeTitleText.tr(),
            controller: largeTitleController!,
            trailing: largeTitleTrailing,
            padding: const EdgeInsetsDirectional.fromSTEB(24, 0, 24, 8),
          ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // ── 当前账户（仅展示，不再跳转个人信息页） ──
              MiraCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                child: Row(
                  children: [
                    _UserAvatar(avatarUrl: avatarUrl, isOnline: isOnline),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.user?.username ??
                                'settings.notLoggedIn'.tr(),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            session.library != null
                                ? 'settings.currentLibrary'.tr(
                                    namedArgs: {
                                      'name': session.library!.name,
                                    },
                                  )
                                : 'settings.noLibrary'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: theme.colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── 素材库（水平快速切换） ──
              _buildLibrarySection(context, ref, session),
              const SizedBox(height: 16),

              // ── 偏好分组 ──
              _buildSection(
                header: 'settings.sectionPreference'.tr(),
                tiles: [
                  _SectionTile(
                    icon: Icons.palette_outlined,
                    iconColor: Colors.purple,
                    title: 'settings.theme'.tr(),
                    trailingLabel: themeModeLabelKey(themeMode).tr(),
                    onTap: () => _showThemePicker(context, ref, themeMode),
                  ),
                  _SectionTile(
                    icon: Icons.color_lens_outlined,
                    iconColor: Colors.pink,
                    title: 'settings.colorTheme'.tr(),
                    trailingLabel: colorThemeLabelKey(colorTheme).tr(),
                    onTap: () =>
                        _showColorThemePicker(context, ref, colorTheme),
                  ),
                  _SectionTile(
                    icon: Icons.language,
                    iconColor: Colors.blue,
                    title: 'settings.language'.tr(),
                    trailingLabel: _localeModeLabel(localeMode),
                    onTap: () => _showLanguagePicker(context, ref, localeMode),
                  ),
                  _SectionTile(
                    icon: Icons.download_outlined,
                    iconColor: Colors.green,
                    title: 'settings.download'.tr(),
                    onTap: () => AppRouter.navigateTo('/download_settings'),
                  ),
                  _SectionTile(
                    icon: Icons.auto_awesome_outlined,
                    iconColor: Colors.cyan,
                    title: 'settings.backgroundEffects'.tr(),
                    onTap: () => AppRouter.navigateTo('/background_settings'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── 其他分组 ──
              _buildSection(
                header: 'settings.sectionOther'.tr(),
                tiles: [
                  _SectionTile(
                    icon: Icons.backup_outlined,
                    iconColor: Colors.orange,
                    title: 'settings.backup'.tr(),
                    onTap: () => AppRouter.navigateTo('/backup_settings'),
                  ),
                  _SectionTile(
                    icon: Icons.info_outline,
                    iconColor: Colors.grey,
                    title: 'settings.about'.tr(),
                    onTap: () => AppRouter.navigateTo('/about_settings'),
                  ),
                ],
              ),
            ]),
          ),
        ),
      ],
    );
  }

  /// 语言模式的显示名（system/zh-CN/en-US → 本地化文案）。
  String _localeModeLabel(String mode) {
    switch (mode) {
      case 'zh-CN':
        return 'language.zh'.tr();
      case 'en-US':
        return 'language.en'.tr();
      case 'system':
      default:
        return 'language.system'.tr();
    }
  }

  /// 内嵌分组：section header + 单个 MiraCard 圆角容器包裹多行 tile，
  /// 行间用 MiraDivider（indent 对齐 leading 图标之后）分隔，参考 iOS 设置风格。
  Widget _buildSection({required String header, required List<Widget> tiles}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(label: header),
        const SizedBox(height: 8),
        MiraCard(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            children: [
              for (int i = 0; i < tiles.length; i++) ...[
                tiles[i],
                if (i < tiles.length - 1)
                  const MiraDivider(indent: 60, endIndent: 0),
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// 素材库横向快速切换：一行可横滑的玻璃卡片，点击即切换当前库。
  ///
  /// 取代原先"账户分组"中跳转库选择页的入口，让切换更直接。
  Widget _buildLibrarySection(
    BuildContext context,
    WidgetRef ref,
    SessionState session,
  ) {
    final theme = Theme.of(context);
    final libsAsync = ref.watch(librariesProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(label: 'settings.libraries'.tr()),
        const SizedBox(height: 8),
        SizedBox(
          height: 84,
          child: libsAsync.when(
            loading: () => const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: MiraCircularProgressIndicator(),
              ),
            ),
            error: (e, _) => Center(
              child: TextButton.icon(
                onPressed: () => ref.invalidate(librariesProvider),
                icon: const Icon(Icons.refresh, size: 18),
                label: Text('common.retry'.tr()),
              ),
            ),
            data: (libs) {
              if (libs.isEmpty) {
                return Center(
                  child: Text(
                    'library.empty'.tr(),
                    style: TextStyle(
                      fontSize: 13,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                );
              }
              return ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 2),
                itemCount: libs.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) {
                  final lib = libs[i];
                  final isCurrent = lib.id == session.library?.id;
                  return _LibraryQuickCard(
                    library: lib,
                    isCurrent: isCurrent,
                    onTap: () => _switchLibrary(ref, session, lib),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  /// 切换当前素材库并持久化所选库 id，下次启动可自动恢复。
  Future<void> _switchLibrary(
    WidgetRef ref,
    SessionState session,
    Library library,
  ) async {
    if (library.id == session.library?.id) return;
    ref.read(sessionProvider.notifier).selectLibrary(library);
    final serverId = session.connectedServerId;
    if (serverId == null) return;
    final servers = ref.read(serverListProvider);
    final server = servers.where((s) => s.id == serverId).firstOrNull;
    if (server == null) return;
    await ref
        .read(serverListProvider.notifier)
        .update(server.copyWith(lastLibraryId: library.id));
  }

  /// 主题模式三态选择：跟随系统 / 亮色 / 暗色。
  Future<void> _showThemePicker(
    BuildContext context,
    WidgetRef ref,
    ThemeMode current,
  ) {
    return showMiraBottomSheet<void>(
      context: context,
      builder: (ctx) {
        ThemeMode selected = current;
        return StatefulBuilder(
          builder: (ctx, setS) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(8, 16, 8, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'settings.theme'.tr(),
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final mode in ThemeMode.values)
                    MiraRadioTile<ThemeMode>(
                      value: mode,
                      groupValue: selected,
                      title: Text(themeModeLabelKey(mode).tr()),
                      onChanged: (v) {
                        if (v == null) return;
                        setS(() => selected = v);
                        ref.read(themeModeProvider.notifier).setMode(v);
                        Navigator.of(ctx).pop();
                      },
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  /// 颜色主题（玻璃配色）预设选择：跟随默认 / 经典蓝 / 紫罗兰 / 青绿 / 暖橙 / 中性灰。
  Future<void> _showColorThemePicker(
    BuildContext context,
    WidgetRef ref,
    ColorThemePreset current,
  ) {
    return showMiraBottomSheet<void>(
      context: context,
      builder: (ctx) {
        ColorThemePreset selected = current;
        return StatefulBuilder(
          builder: (ctx, setS) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(8, 16, 8, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'settings.colorTheme'.tr(),
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final preset in ColorThemePreset.values)
                    MiraRadioTile<ColorThemePreset>(
                      value: preset,
                      groupValue: selected,
                      title: Text(colorThemeLabelKey(preset).tr()),
                      onChanged: (v) {
                        if (v == null) return;
                        setS(() => selected = v);
                        ref.read(colorThemeProvider.notifier).setPreset(v);
                        Navigator.of(ctx).pop();
                      },
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  /// 语言选择：跟随系统 / 中文 / English。
  Future<void> _showLanguagePicker(
    BuildContext context,
    WidgetRef ref,
    String current,
  ) {
    return showMiraBottomSheet<void>(
      context: context,
      builder: (ctx) {
        String selected = current;
        return StatefulBuilder(
          builder: (ctx, setS) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(8, 16, 8, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'settings.language'.tr(),
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final mode in kLocaleModes)
                    MiraRadioTile<String>(
                      value: mode,
                      groupValue: selected,
                      title: Text(_localeModeLabel(mode)),
                      onChanged: (v) {
                        if (v == null) return;
                        setS(() => selected = v);
                        ref.read(localeModeProvider.notifier).setMode(v);
                        Navigator.of(ctx).pop();
                      },
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _UserAvatar extends StatelessWidget {
  const _UserAvatar({required this.avatarUrl, required this.isOnline});

  final String? avatarUrl;
  final bool isOnline;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: theme.colorScheme.primaryContainer,
          foregroundImage: avatarUrl == null ? null : NetworkImage(avatarUrl!),
          child: avatarUrl == null
              ? Icon(Icons.person, color: theme.colorScheme.primary)
              : null,
        ),
        Positioned(
          right: -1,
          bottom: -1,
          child: Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: isOnline ? Colors.green : theme.colorScheme.outline,
              shape: BoxShape.circle,
              border: Border.all(color: theme.colorScheme.surface, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final dimColor = Theme.of(
      context,
    ).colorScheme.onSurface.withValues(alpha: 0.5);
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

class _SectionTile extends StatelessWidget {
  const _SectionTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.onTap,
    this.trailingLabel,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final VoidCallback onTap;

  /// 可选：chevron 左侧展示的尾部文字（如主题当前值）。颜色随主题自适应。
  final String? trailingLabel;

  @override
  Widget build(BuildContext context) {
    final dimColor = Theme.of(
      context,
    ).colorScheme.onSurface.withValues(alpha: 0.5);
    return MiraListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      leading: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(title),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingLabel != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Text(
                trailingLabel!,
                style: TextStyle(fontSize: 13, color: dimColor),
              ),
            ),
          MiraListTile.chevron,
        ],
      ),
      onTap: onTap,
    );
  }
}

/// 横向素材库快速切换卡片：玻璃卡，[isCurrent] 时高亮并显示选中标记。
class _LibraryQuickCard extends StatelessWidget {
  const _LibraryQuickCard({
    required this.library,
    required this.isCurrent,
    required this.onTap,
  });

  final Library library;
  final bool isCurrent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 150,
      height: 84,
      child: MiraCard(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
        child: Stack(
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    library.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight:
                          isCurrent ? FontWeight.w700 : FontWeight.w600,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'library.fileCount'.tr(
                      namedArgs: {
                        'count': '${library.fileCount}',
                        'size': _formatSize(library.size),
                      },
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
            if (isCurrent)
              Positioned(
                top: 0,
                right: 0,
                child: Icon(
                  Icons.check_circle,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatSize(int bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    final i = (bytes.bitLength - 1) ~/ 10;
    final idx = i < units.length ? i : units.length - 1;
    final size = bytes / (1 << (10 * idx));
    return '${size.toStringAsFixed(idx == 0 ? 0 : 1)} ${units[idx]}';
  }
}
