# 画廊瀑布流改造设计（SliverDynamicFlexbox）

- 日期：2026-08-09
- 目标文件：`lib/src/screens/library_item_list_screen.dart`
- 关联依赖：`flexbox_layout`（新增）、`infinite_scroll_pagination`（移除）

## 1. 背景与问题

`library_item_list_screen.dart` 中的 `GalleryGrid` 当前使用 `SliverGrid.builder` +
`SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2)`，每张图固定 `height: 180`，
是等高两列网格，无法体现图片真实宽高比。

需求：改为按图片真实宽高自适应布局的瀑布流/行填充流式布局，并允许宽图占满整行（两列宽度）。
用户选定 `flexbox_layout` 包。

## 2. 关键约束（调研已确认）

1. **`FileData` 模型无宽高字段**：`id/name/size/extension/thumbPath/...`，不含 image width/height。
   → 宽高比必须在运行时解析，不可依赖服务端元数据。
2. **鉴权 token 在 URL query string**：`MiraHttpClient.getUrl` 把 token 拼成 `?token=xxx`，
   故 `NetworkImage(url)` / 包的尺寸测量可直接用缩略图 URL，无需额外 header。
3. **`SliverMasonryFlexbox` 不支持单图跨列**：包源码明确「Masonry items intentionally stay
   single-column」。无法满足「宽图占满两列」。
4. **`SliverDynamicFlexbox` 满足需求**：自动测量图片尺寸按行填充，宽图可单张占满整行。
   测量是惰性的：视口内图片在布局时自动测量并缓存，未测到用 `defaultAspectRatio` 兜底，
   测到后用滚动锚定校正避免跳动（README 原文确认）。与分页加载天然兼容，无需预解析全部图片。
5. **视频缩略图无静态宽高**：无法从缩略图 URL 解析尺寸 → 用固定比例包裹占位。
6. **当前文件未实际使用 `infinite_scroll_pagination`**：分页由 `NotificationListener` +
   `loadMore()` 手写实现。该依赖全局零引用，可安全移除。

## 3. 决策（用户已确认）

- 布局方案：**方案 A — `SliverDynamicFlexbox` 行填充**（满足「宽图占满两列」）。
- 图片尺寸来源：**运行时惰性测量**（包内置），非预解析全部。
- 视频缩略图：**固定 4:3 比例**。
- `infinite_scroll_pagination`：**从 pubspec 移除**。
- 行高参数：`targetRowHeight: 200`。

## 4. 改动范围

| 文件 | 改动 |
|------|------|
| `lib/src/screens/library_item_list_screen.dart` | 替换 SliverGrid 为 SliverDynamicFlexbox；卡片高度自适应；视频用固定比例 |
| `pubspec.yaml` | 新增 `flexbox_layout: ^3.1.0`；移除 `infinite_scroll_pagination: ^5.1.1` |

**不改动**：`files_provider.dart`、`FileData` 模型、`MediaUtils`、`image_preview_screen.dart`、
分页/刷新/触底加载逻辑、`GlassLargeTitle`、空错状态、预览跳转逻辑。

## 5. 详细设计

### 5.1 pubspec.yaml

```yaml
dependencies:
  # 新增（替换原 SliverGrid 的等高网格能力）
  flexbox_layout: ^3.1.0   # 需 Flutter >=3.32.0 / Dart >=3.8.0（当前 ^3.10.0 满足）
  # 删除：infinite_scroll_pagination: ^5.1.1
```

### 5.2 布局结构（替换 SliverGrid.builder 段）

保留 `CustomScrollView` + `GlassLargeTitle` + `SliverPadding` + `NotificationListener` +
`RefreshIndicator` 外层结构不变。仅把 sliver 列表里的 grid 段替换：

```dart
SliverDynamicFlexbox(
  flexboxDelegate: SliverDynamicFlexboxDelegate(
    targetRowHeight: 200,        // 目标行高，决定整体密度
    mainAxisSpacing: 12,         // 行间距（main axis = 滚动方向 = 纵向）
    crossAxisSpacing: 12,        // 同一行内图与图的横向间距
    defaultAspectRatio: 1.0,     // 未测到尺寸时的兜底比例
  ),
  childDelegate: SliverChildBuilderDelegate(
    (context, index) => _GalleryItemCard(
      file: view.items[index],
      ref: ref,
      onTap: () => _openItem(view.items[index]),
    ),
    childCount: view.items.length,
  ),
)
```

`SliverPadding` 的 padding（horizontal: 12、bottom: 120）保留不变。

### 5.3 _GalleryItemCard 自适应改造

当前卡片用 `CachedNetworkImage(... height: 180 ...)` 固定高度。改为高度由外层 flexbox 测量决定：

- **图片**：去掉固定 `height: 180`；`CachedNetworkImage` 用 `fit: BoxFit.cover`，
  外层不设高度约束，让 flexbox 测量真实宽高比后按 `targetRowHeight` 对齐。
- **视频**：用 `AspectRatio(aspectRatio: 4/3)` 包裹缩略图容器，保证 flexbox 拿到稳定尺寸
  （视频缩略图无法解析静态宽高）。视频判定复用 `MediaUtils.isVideo(file)`。
- **叠加层保留**：右上扩展名/播放图标标签、底部文件名渐变层，放入自适应高度的 `Stack`，
  用 `Positioned` 相对定位（语义不变，仅容器高度由 flexbox 决定）。
- **卡片外形保留**：`Card` + 12 圆角 + `clipBehavior: Clip.antiAlias` + `InkWell` 点击。

注意：`CachedNetworkImage` 的 placeholder/errorWidget 也不应再写死 `height: 180`，
改为撑满父容器（`SizedBox.expand` 或由父约束驱动），避免测量阶段出现 0 高度。

### 5.4 保留不动的逻辑

- `reload()` 首帧触发、`_onScroll` 触底（`pixels >= maxScrollExtent - 200` → `loadMore()`）、
  `_buildFooter`（加载中转圈 / 「没有更多了」）、`_StatusIndicator`（空/错）、`_openItem` 跳预览。
- `scrollController` / `largeTitleController` 外层传入逻辑不变。

## 6. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 惰性测量致首次布局闪动 | 包自带滚动锚定校正；已缓存图秒出。可接受。 |
| 视频固定 4:3 与图片混排视觉不齐 | 设计预期；4:3 接近常见横屏比例，整体可接受。 |
| 移除依赖影响其他文件 | 已全局 grep 确认 lib/test 零引用。 |
| Dart SDK 不满足 | 当前 `^3.10.0` 满足 `>=3.8.0`。 |

## 7. 验证

- `flutter pub get` 成功（flexbox_layout 解析、infinite_scroll_pagination 移除）。
- `flutter analyze` 无新增报错。
- 手测：进画廊 → 宽图独占整行、窄图并排；滚动流畅、触底加载下一页；下拉刷新；
  点图/视频跳对应预览页。
