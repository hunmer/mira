# 测试与质量

> 更新：2026-08-09

## 测试命令

```bash
# 分析
flutter analyze

# SDK 测试
flutter test test/mira_sdk_api/
```

## 测试结构

| 目录 | 对应源码 | 状态 |
|------|----------|------|
| `test/mira_sdk_api/` | SDK `lib/mira_sdk/`（http） | 对应当前 App：`auth_system_library_test.dart`、`tag_folder_file_user_test.dart`、`database_device_test.dart`、`test_helper.dart` |

## 覆盖情况

- SDK 的资源域（auth/library/file/folder/tag/user/database/device）在 `test/mira_sdk_api/` 有覆盖。
- **UI / Provider 层无测试**（screens、providers、router 均无 widget/unit 测试）。
- 无 `integration_test/`。

## 质量工具

| 工具 | 配置 | 备注 |
|------|------|------|
| `flutter analyze` | `analysis_options.yaml` ← `flutter_lints/flutter.yaml` | 无额外规则 |
| mock | `mockito ^5.6.1`（放在 dependencies） | SDK 测试用 |

## CI

> 当前**无 CI workflow**（原 `.github/workflows/sdk_test.yml` 已删除：它只服务已被移除的旧打包 SDK，
> 与本项目脱节）。如需 CI，建议新建一个针对根项目的 workflow：`flutter pub get` → `flutter analyze`
> → `flutter test test/mira_sdk_api/`。

## 质量风险

1. **UI/状态层零测试**：Riverpod providers、13 个 screen 无任何测试，重构风险高。
2. **无 CI**：没有任何自动化门禁。
3. **`ItemDetailScreen` 仍是静态占位**（硬编码假数据、TODO），功能未完成。
4. `mockito` 在 `dependencies`（非 dev）—— 历史遗留，建议迁回 dev_dependencies。
