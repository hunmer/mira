import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import '../../router/app_router.dart';

/// A common header shared across the main tabs.
///
/// It renders a [GlassAppBar] with a title and a trailing entry to the
/// file detail screen ([AppRouter.itemDetailRoute]). Optional [actions]
/// are appended after the info button (e.g. the gallery's upload entry).
class MiraHeader extends StatelessWidget implements PreferredSizeWidget {
  const MiraHeader({
    super.key,
    required this.title,
    this.actions = const [],
  });

  /// Title shown centered in the glass app bar.
  final String title;

  /// Extra action widgets shown to the right of the info entry.
  final List<Widget> actions;

  @override
  Size get preferredSize =>
      const Size.fromHeight(44.0); // matches GlassAppBar.toolbarHeight

  @override
  Widget build(BuildContext context) {
    return GlassAppBar(
      title: Text(title),
      actions: [
        GlassIconButton(
          icon: const Icon(Icons.info_outline),
          semanticLabel: 'imagePreview.viewInfo'.tr(),
          onPressed: () => AppRouter.navigateTo('/item_detail'),
        ),
        ...actions,
      ],
    );
  }
}
