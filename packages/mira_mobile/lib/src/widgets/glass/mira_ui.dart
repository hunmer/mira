/// 项目级玻璃 UI 组件库（barrel）。
///
/// 业务代码统一从这里 import：
/// ```dart
/// import '../../widgets/glass/mira_ui.dart';
/// ```
///
/// 这里间接依赖 `liquid_glass_widgets`，业务层不应直接 import 该包。
/// 命名约定：项目封装组件统一 `Mira*` 前缀（与 [MiraHeader] 一致）。
library;

// 按类别
export 'buttons.dart';
export 'chips.dart';
export 'feedback.dart';
export 'glass_settings.dart';
export 'inputs.dart';
export 'overlays.dart';
export 'surfaces.dart';
export 'sliders.dart';
export 'tiles.dart';

// 现有项目封装（继续对外暴露）
export '../mira_header.dart';

// glass 页面通用渐变背景（配合 GlassScaffold.background 使用）
export 'glass_background.dart';

// glass 页面通用布局常量 + 返回按钮 helper
export 'glass_layout.dart';
