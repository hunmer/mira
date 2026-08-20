# 测试与质量

> 更新：2026-08-20

## 测试命令

```bash
# 分析
flutter analyze

# 全部测试（SDK 集成 + 模型 + 应用层单测）
flutter test

# 只跑 SDK 集成测试
flutter test test/mira_sdk_api/
```

## 测试结构

| 目录 | 对应源码 | 状态 |
|------|----------|------|
| `test/mira_sdk_api/`（5 文件） | SDK `lib/mira_sdk/`（http） | `auth_system_library_test.dart`、`tag_folder_file_user_test.dart`、`database_device_test.dart`、`file_metadata_model_test.dart`、`test_helper.dart` |
| `test/mira_sdk/models/` | SDK 模型 | `file_test.dart` |
| `test/src/providers/` | 应用 Provider | `file_filter_provider_test.dart` |
| `test/src/services/` | 应用 Service | `photo_backup_service_test.dart` |
| `test/src/utils/` | 工具 | `media_utils_test.dart` |

## 覆盖情况

- SDK 的资源域（auth/library/file/folder/tag/user/database/device）在 `test/mira_sdk_api/` 有覆盖。
- 应用层已有少量单测：`file_filter_provider` / `photo_backup_service` / `media_utils`。
- **screens 层（24 个 UI 文件）仍无 widget 测试**；无 `integration_test/`。

## 质量工具

| 工具 | 配置 | 备注 |
|------|------|------|
| `flutter analyze` | `analysis_options.yaml` ← `flutter_lints/flutter.yaml` | 无额外规则 |
| mock | `mockito ^5.6.1`（放在 dependencies） | 测试用 |

## CI

> 当前**无 CI workflow**（原 `.github/workflows/sdk_test.yml` 已删除：它只服务已被移除的旧打包 SDK，
> 与本项目脱节）。如需 CI，建议新建一个针对根项目的 workflow：`flutter pub get` → `flutter analyze`
> → `flutter test`。

## 质量风险

1. **UI 层零测试**：24 个 screen 文件无任何 widget 测试，重构风险高（Provider/Service/Utils 已有起步单测）。
2. **无 CI**：没有任何自动化门禁。
3. **`ItemDetailScreen` 仍是静态展示页**（标签/文件夹编辑等 TODO 未完成）。
4. `mockito` 在 `dependencies`（非 dev）—— 历史遗留，建议迁回 dev_dependencies。
