# 索引变更记录

> 只保留最近 5 条（倒序）。此文件记录**索引本身的生成/更新**，不记产品 Changelog。

### 2026-08-09 — 删除旧 SDK 并同步文档

- 删除废弃的旧打包 SDK 及其测试与失配 CI：
  - `lib/src/packages/mira_sdk/`（基于 dio，App 零引用，50 文件）
  - `test/packages/mira_sdk/`（旧 SDK 测试，23 文件）
  - `test/mira_sdk/`（整目录为失效测试：引用活跃 SDK 已不存在的符号 MiraOptions/Room/RoomMember/Platform/PlatformActivity/UserStatus 及 managers/*，15 文件）
  - `.github/workflows/sdk_test.yml`（所有 job 的 working-directory 都指向旧 SDK，与项目脱节）
- 保留 `test/mira_sdk_api/`（活跃 SDK 的规范测试，4 文件）与所有应用源码。
- 同步更新 `CLAUDE.md` 及 `claude/{overview,conventions,module-responsibilities,entrypoints,public-interfaces,dependencies-and-config,data-model,testing-and-quality,file-map,faq}.md`：移除"两套 SDK/废弃/CI 失配"等表述，更新扫描范围与覆盖率。
- 删除依据核查：`grep "packages/mira_sdk" lib/` 无业务引用；`test/mira_sdk/*` 全部引用已删符号；全部文件 git 跟踪可恢复。

### 2026-08-09 — 初始化

- 由 `/ccjk:init-project`（无摘要入参，从仓库自推断）首次生成。
- 创建根 `CLAUDE.md`（轻量索引）+ `claude/` 下 11 个详情文件：
  overview / conventions / module-responsibilities / entrypoints / public-interfaces /
  dependencies-and-config / data-model / testing-and-quality / file-map / faq / changelog。
- 覆盖：`lib/main.dart`、`lib/router/*`、`lib/mira_sdk/*`（client+models+modules 全扫）、
  `lib/src/{providers,screens,services,models,utils,widgets}` 全扫、`pubspec.yaml`、
  `analysis_options.yaml`、`.github/workflows/sdk_test.yml`、`docs/*`。
- 关键结论：单 Flutter 包；活跃 SDK = `lib/mira_sdk/`(http)；`lib/src/packages/mira_sdk/`(dio) 废弃；
  CI 失配；UI/Provider 层无测试；`ItemDetailScreen` 占位未完成。
- 未扫：平台目录（android/ios/macos/windows/linux/web，均为脚手架默认）、旧打包 SDK 内部源码
  （仅读其 pubspec 与文档定位，未逐文件展开）。

### 建议下一步深挖

- `lib/src/packages/mira_sdk/src/`：若计划清理旧 SDK，需先核对其导出符号与是否有外部引用。
- `android/`、`ios/`：如需发布/签名配置再深扫。
- 为活跃 SDK 的 UI/Provider 层补 widget/unit 测试（当前零覆盖）。
