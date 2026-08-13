import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../widgets/glass/mira_ui.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final bool isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        leading: MiraIconButton(
          icon: Icon(Icons.arrow_back_ios_new,
              color: isDarkMode ? Colors.white : Colors.black87),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('settings.title'.tr()),
      ),
      body: Material(
        type: MaterialType.transparency,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            _buildSettingsGroup(
              context,
              [
                _buildSettingsItem(
                  icon: Icons.tune_outlined,
                  iconColor: Colors.blue,
                  title: 'settings.sectionPreference'.tr(),
                  onTap: () {},
                ),
                _buildSettingsItem(
                  icon: Icons.palette_outlined,
                  iconColor: Colors.purple,
                  title: 'settings.theme'.tr(),
                  onTap: () {},
                ),
                _buildSettingsItem(
                  icon: Icons.download_outlined,
                  iconColor: Colors.green,
                  title: 'settings.download'.tr(),
                  onTap: () {},
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildSettingsGroup(
              context,
              [
                _buildSettingsItem(
                  icon: Icons.backup_outlined,
                  iconColor: Colors.orange,
                  title: 'settings.backup'.tr(),
                  onTap: () {},
                ),
                _buildSettingsItem(
                  icon: Icons.info_outline,
                  iconColor: Colors.grey,
                  title: 'settings.about'.tr(),
                  onTap: () {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsGroup(BuildContext context, List<Widget> children) {
    return MiraCard(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        itemBuilder: (context, index) => children[index],
        separatorBuilder: (context, index) => const MiraDivider(
          height: 1,
          indent: 56,
          endIndent: 16,
        ),
        itemCount: children.length,
      ),
    );
  }

  Widget _buildSettingsItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required VoidCallback onTap,
  }) {
    return MiraListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      leading: Icon(icon, color: iconColor),
      title: Text(title),
      trailing: MiraListTile.chevron,
      onTap: onTap,
    );
  }
}