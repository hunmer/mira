# 画廊瀑布流改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `GalleryGrid` 从固定两列 `SliverGrid` 改为 `flexbox_layout` 的 `SliverDynamicFlexbox` 行填充布局，按图片真实宽高自适应、宽图占满整行。

**Architecture:** 仅改 `library_item_list_screen.dart`（布局 sliver + 卡片自适应高度）与 `pubspec.yaml`（加 `flexbox_layout`、删 `infinite_scroll_pagination`）。利用 `SliverDynamicFlexbox` 内置的惰性图片测量（视口内自动测真实宽高、未测到用 `defaultAspectRatio` 兜底、滚动锚定校正防跳动），天然兼容现有手写分页。视频缩略图用固定 4:3 `AspectRatio` 包裹兜底。分页/刷新/大标题/预览跳转逻辑全部不动。

**Tech Stack:** Flutter (`^3.32.0` / Dart `^3.10.0`)、`flexbox_layout: ^3.1.0`、`cached_network_image`、`flutter_riverpod`。

## Global Constraints

- 包版本：`flexbox_layout: ^3.1.0`（需 Flutter `>=3.32.0` / Dart `>=3.8.0`，项目当前 Dart `^3.10.0` 满足）。
- 缩略图 URL 由 `MediaUtils.thumbUrl(client, libId, file.id)` 生成，token 已在 URL query string（`?token=xxx`），`NetworkImage` / 图片测量可直接用，无需额外 header。
- 视频判定用 `MediaUtils.isVideo(file)`（已存在）。
- 视频缩略图用固定比例 `4/3`。
- 行高参数 `targetRowHeight: 200`；间距 `mainAxisSpacing: 12` / `crossAxisSpacing: 12`。
- 兜底比例 `defaultAspectRatio: 1.0`。
- 不改 `files_provider.dart`、`FileData`、`MediaUtils`、预览页、分页/刷新逻辑。
- 移除 `infinite_scroll_pagination`：已确认 `lib/`、`test/` 零引用，移除无副作用。

---

### Task 1: 调整依赖（pubspec.yaml）

**Files:**
- Modify: `pubspec.yaml:50-52`（`flutter_staggered_grid_view` / `http` / `infinite_scroll_pagination` 三行所在区段）

**Interfaces:**
- Consumes: 无。
- Produces: pubspec 声明 `flexbox_layout`，移除 `infinite_scroll_pagination`，供后续任务的 import 可解析。

- [ ] **Step 1: 在 pubspec.yaml 新增 flexbox_layout、移除 infinite_scroll_pagination**

将这段：

```yaml
  # Local storage
  shared_preferences: ^2.3.3
  flutter_staggered_grid_view: ^0.7.0
  http: ^1.6.0
  infinite_scroll_pagination: ^5.1.1
  liquid_glass_widgets: ^0.29.2
```

改为（新增 `flexbox_layout`，删除 `infinite_scroll_pagination`，其余保持）：

```yaml
  # Local storage
  shared_preferences: ^2.3.3
  flutter_staggered_grid_view: ^0.7.0
  http: ^1.6.0
  flexbox_layout: ^3.1.0
  liquid_glass_widgets: ^0.29.2
```

- [ ] **Step 2: 拉取依赖并校验**

Run: `flutter pub get`
Expected: 成功输出 `Got dependencies!`，`flexbox_layout` 出现在解析结果，无报错。

- [ ] **Step 3: 确认移除依赖无残留引用**

Run: `grep -rn "infinite_scroll_pagination" lib/ test/`
Expected: 无输出（零引用）。

- [ ] **Step 4: 提交**

```bash
git add pubspec.yaml pubspec.lock
git commit -m "chore: 引入 flexbox_layout，移除未使用的 infinite_scroll_pagination"
```

---

### Task 2: 改造布局 sliver（SliverGrid → SliverDynamicFlexbox）

**Files:**
- Modify: `lib/src/screens/library_item_list_screen.dart:1-10`（import 段）
- Modify: `lib/src/screens/library_item_list_screen.dart:120-139`（`SliverPadding` 内的 `SliverGrid.builder` 段）

**Interfaces:**
- Consumes: Task 1 的 `flexbox_layout` 依赖；现有 `view.items`（`List<FileData>`）、`ref`、`_openItem`。
- Produces: 一个用 `SliverDynamicFlexbox` 渲染 `_GalleryItemCard` 的 sliver；`_GalleryItemCard` 仍是现签名（`file`/`ref`/`onTap`），Task 3 改其内部高度。

- [ ] **Step 1: 新增 flexbox_layout import**

在 `lib/src/screens/library_item_list_screen.dart` 顶部 import 段（第 1-10 行），在 `import 'package:flutter/material.dart';`（第 2 行）之后插入一行：

```dart
import 'package:flexbox_layout/flexbox_layout.dart';
```

即最终 import 段开头变为：

```dart
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flexbox_layout/flexbox_layout.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';
```

- [ ] **Step 2: 替换 SliverGrid.builder 为 SliverDynamicFlexbox**

将这段（`SliverPadding` 内）：

```dart
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)
                  .copyWith(bottom: 120),
              sliver: SliverGrid.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                ),
                itemCount: view.items.length,
                itemBuilder: (context, index) {
                  final file = view.items[index];
                  return _GalleryItemCard(
                    file: file,
                    ref: ref,
                    onTap: () => _openItem(file),
                  );
                },
              ),
            ),
```

替换为：

```dart
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)
                  .copyWith(bottom: 120),
              sliver: SliverDynamicFlexbox(
                flexboxDelegate: SliverDynamicFlexboxDelegate(
                  targetRowHeight: 200,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  defaultAspectRatio: 1.0,
                ),
                childDelegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final file = view.items[index];
                    return _GalleryItemCard(
                      file: file,
                      ref: ref,
                      onTap: () => _openItem(file),
                    );
                  },
                  childCount: view.items.length,
                ),
              ),
            ),
```

注意：`mainAxisSpacing` 为行间距（main axis = 滚动方向 = 纵向），`crossAxisSpacing` 为同一行内图与图的横向间距。padding（`horizontal: 12`、`bottom: 120`）保持不变。

- [ ] **Step 3: 静态分析**

Run: `flutter analyze lib/src/screens/library_item_list_screen.dart`
Expected: 无新增 error。（此时卡片内仍写死 `height: 180`，布局能编译，但高度尚未自适应——Task 3 修复。）

- [ ] **Step 4: 提交**

```bash
git add lib/src/screens/library_item_list_screen.dart
git commit -m "refactor: 画廊 sliver 由 SliverGrid 改为 SliverDynamicFlexbox"
```

---

### Task 3: 卡片高度自适应（图片 + 视频固定比例）

**Files:**
- Modify: `lib/src/screens/library_item_list_screen.dart:160-255`（`_GalleryItemCard.build`）

**Interfaces:**
- Consumes: `MediaUtils.isVideo(file)`、`MediaUtils.thumbUrl(...)`、`file.extension`、`file.name`、Theme。
- Produces: 卡片高度由外层 flexbox 测量决定，不再写死 `height: 180`；视频用 4:3 兜底。

- [ ] **Step 1: 改造 _GalleryItemCard.build —— 内容区自适应高度**

将整个 `_GalleryItemCard.build` 方法（从 `final session = ref.read(sessionProvider);` 到方法结束 `}`，即 `lib/src/screens/library_item_list_screen.dart:168-254`）替换为下面这段。

要点：图片去固定高度、靠父约束撑满；视频用 `AspectRatio(4/3)` 兜底；placeholder/error 不再写死高度改 `SizedBox.expand`；扩展名标签与文件名渐变层用 `Positioned` 相对定位到自适应容器。

```dart
  @override
  Widget build(BuildContext context) {
    final session = ref.read(sessionProvider);
    final client = session.client;
    final libId = session.library?.id;
    final isVideo = MediaUtils.isVideo(file);

    final thumbUrl = (client != null && libId != null)
        ? MediaUtils.thumbUrl(client, libId, file.id)
        : '';

    // 内容区：图片不设高度约束，交给外层 SliverDynamicFlexbox 测量真实宽高；
    // 视频缩略图无法解析静态尺寸，用固定 4:3 兜底，保证测量拿到稳定比例。
    final Widget imageContent = CachedNetworkImage(
      imageUrl: thumbUrl,
      fit: BoxFit.cover,
      width: double.infinity,
      placeholder: (_, _) => SizedBox.expand(
        child: Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        ),
      ),
      errorWidget: (_, _, _) => SizedBox.expand(
        child: Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: const Center(
            child: Icon(Icons.broken_image_outlined, color: Colors.grey),
          ),
        ),
      ),
    );

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          children: [
            // 视频用固定比例兜底；图片不包裹，直接让 flexbox 测量真实宽高。
            if (isVideo)
              AspectRatio(aspectRatio: 4 / 3, child: imageContent)
            else
              imageContent,
            // 扩展名标签 + 视频图标
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isVideo)
                      const Padding(
                        padding: EdgeInsets.only(right: 4),
                        child: Icon(Icons.play_circle_fill, color: Colors.white, size: 14),
                      ),
                    Text(
                      file.extension.toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
            // 文件名
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Colors.black.withValues(alpha: 0.55)],
                  ),
                ),
                child: Text(
                  file.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
```

- [ ] **Step 2: 全量静态分析**

Run: `flutter analyze`
Expected: 无新增 error / warning（与改造前同级或更好）。

- [ ] **Step 3: 提交**

```bash
git add lib/src/screens/library_item_list_screen.dart
git commit -m "feat: 画廊卡片按图片宽高自适应，视频用 4:3 兜底"
```

---

### Task 4: 手测验证（无自动化测试）

本任务无单元测试代码（布局渲染需真机/模拟器视觉验证）。执行如下构建与运行检查。

**Files:**
- 无文件改动。

- [ ] **Step 1: 构建校验（无编译错误）**

Run: `flutter build apk --debug` （iOS 开发者可改 `flutter build ios --debug --no-codesign`）
Expected: 构建成功，无 `flexbox_layout` / `SliverDynamicFlexbox` 相关编译错误。

- [ ] **Step 2: 真机/模拟器手测清单**

运行 app 并进入画廊页，逐项核对：

- 宽图（横屏照/全景，aspect ratio 接近或 > 2）单张占满整行（两列宽度）。
- 窄图（竖图）两两并排，各自高度按真实宽高比不同，呈参差视觉。
- 视频缩略图为 4:3 矩形，右上角显示播放图标 + 扩展名。
- 滚动流畅，无明显跳动；已缓存图秒出。
- 滚动接近底部触发加载下一页（现有触底逻辑）。
- 下拉刷新正常。
- 点击图片 → 跳大图预览页；点击视频 → 跳视频预览页。

Expected: 以上全部通过。

- [ ] **Step 3: 收尾提交（如有微调）**

若手测发现 spacing/targetRowHeight 需微调，在此调整并提交：

```bash
git add lib/src/screens/library_item_list_screen.dart
git commit -m "style: 调整瀑布流间距/行高"
```

若无需调整，本任务结束。
