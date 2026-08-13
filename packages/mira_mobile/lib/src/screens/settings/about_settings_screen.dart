import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../router/app_router.dart';
import '../../widgets/glass/mira_ui.dart';

/// 关于页：展示应用图标、名称、版本、开发信息与项目地址。
///
/// 版式参考桌面端 `AboutDialog.vue`：居中头部 + 信息卡片 + 版权页脚，
/// 适配移动端设置页风格（GlassScaffold + 折叠大标题 + MiraCard 分组）。
/// 版本号通过 [PackageInfo.fromPlatform] 异步读取，项目地址用
/// [url_launcher] 在系统浏览器打开。
class AboutSettingsScreen extends ConsumerStatefulWidget {
  const AboutSettingsScreen({super.key});

  @override
  ConsumerState<AboutSettingsScreen> createState() =>
      _AboutSettingsScreenState();
}

class _AboutSettingsScreenState extends ConsumerState<AboutSettingsScreen> {
  /// 驱动大标题折叠 + 内联小标题淡入；其 scrollController 由下面的
  /// CustomScrollView 复用（不要另建 ScrollController）。
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();

  /// 应用信息（异步载入，载入前为 null）。
  PackageInfo? _info;

  /// 项目开源地址（与桌面端一致）。
  static const String _projectUrl = 'https://github.com/hunmer/mira';

  @override
  void initState() {
    super.initState();
    _loadInfo();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _loadInfo() async {
    final info = await PackageInfo.fromPlatform();
    if (!mounted) return;
    setState(() => _info = info);
  }

  /// 在系统浏览器中打开项目地址；无法打开时弹 toast 提示。
  Future<void> _openProjectUrl() async {
    final uri = Uri.parse(_projectUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (mounted) {
      showMiraToast(
        context,
        message: 'about.openLinkFailed'.tr(),
        type: MiraToastType.info,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = 'settings.about'.tr();
    final topPad = MediaQuery.paddingOf(context).top;
    final appName = (_info?.appName.isEmpty ?? true) ? 'Mira' : _info!.appName;
    final version = _info?.version;

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
            // 状态栏 + GlassAppBar 工具栏高度，把大标题推到返回按钮栏正下方。
            SliverToBoxAdapter(
              child: SizedBox(height: topPad + GlassLayout.largeTitleTopOffset),
            ),
            GlassLargeTitle(text: title, controller: _titleController),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ── 头部：图标 / 名称 / 副标题 / 版本 ──
                  _buildHeader(context, theme, appName, version),
                  const SizedBox(height: 24),

                  // ── 信息卡片：开发者 / 技术栈 / 项目地址 ──
                  _buildInfoCard(context, theme),
                  const SizedBox(height: 24),

                  // ── 页脚：版权 ──
                  Center(
                    child: Text(
                      'about.copyright'.tr(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.5,
                        ),
                      ),
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

  /// 居中头部：圆角带阴影的 logo + 应用名 + 副标题 + 版本药丸。
  Widget _buildHeader(
    BuildContext context,
    ThemeData theme,
    String appName,
    String? version,
  ) {
    return Center(
      child: Column(
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withValues(alpha: 0.35),
                  blurRadius: 28,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                'assets/images/mira-logo.png',
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            appName,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'about.subtitle'.tr(),
            style: TextStyle(
              fontSize: 13,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 12),
          // 版本药丸：tag 图标 + vX.X.X（载入中显示 —）。
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.tag,
                  size: 14,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                ),
                const SizedBox(width: 6),
                Text(
                  version == null ? '—' : 'v$version',
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 信息卡片：复用设置页分组样式（MiraCard + MiraListTile + MiraDivider）。
  Widget _buildInfoCard(BuildContext context, ThemeData theme) {
    final rows = <Widget>[];
    final entries = <_InfoEntry>[
      _InfoEntry(
        icon: Icons.person_outline,
        iconColor: Colors.blue,
        label: 'about.developer'.tr(),
        value: 'Mira Team',
      ),
      _InfoEntry(
        icon: Icons.code,
        iconColor: Colors.teal,
        label: 'about.techStack'.tr(),
        value: 'Flutter',
      ),
    ];
    for (final e in entries) {
      rows.add(_InfoTile(entry: e));
      rows.add(const MiraDivider(indent: 60, endIndent: 0));
    }
    // 项目地址行：可点，尾部 GitHub + open_in_new（主色）。
    rows.add(
      MiraListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 10,
        ),
        leading: _leadingIcon(
          Icons.link,
          theme.colorScheme.primary,
        ),
        title: Text('about.projectUrl'.tr()),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'GitHub',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.open_in_new,
              size: 16,
              color: theme.colorScheme.primary,
            ),
          ],
        ),
        onTap: _openProjectUrl,
      ),
    );

    return MiraCard(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(children: rows),
    );
  }

  /// leading 图标容器（复用设置页 tile 的圆角方块样式）。
  Widget _leadingIcon(IconData icon, Color color) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 18),
    );
  }
}

/// 信息行数据：图标 + 标签 + 尾值。
class _InfoEntry {
  const _InfoEntry({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
}

/// 标准信息行：leading 图标 + 标题（标签）+ 尾部值（弱化色）。
class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.entry});
  final _InfoEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return MiraListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      leading: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: entry.iconColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(entry.icon, color: entry.iconColor, size: 18),
      ),
      title: Text(entry.label),
      trailing: Text(
        entry.value,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: theme.colorScheme.onSurface.withValues(alpha: 0.75),
        ),
      ),
    );
  }
}
