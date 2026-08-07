## 目标
把 mira-client 里散落的「empty 占位 / 图片加载失败 / 加载中」硬编码图标（Material Icons 字体名），统一替换为 `packages/mira-client/assets/img_icons/` 下的 webp 图标。新增一个**图标注册模块** + 一个**通用占位组件**作为统一入口，消除硬编码。

## 范围决策（按推荐项执行）
- **覆盖范围**：仅主渲染进程 `src/renderer/`。独立窗口 `search-window.js` / `notification-window.js` / `floating-ball-window` 是独立打包的 Options-API 单文件应用，不接入（侵入大、收益小）。
- **加载状态**：只替换「图标类占位」（`image`/`broken_image`/`warning`/`folder_open` 等），**保留纯 CSS spinner**（`animate-spin` 旋转圈）不动，避免丢失旋转动画。`loading.webp` 用于原本是静态图标占位的加载场景。
- **文件类型兜底**：`MediaThumbnail.vue` / `MediaDetailComponent.vue` 单选用 `ext_icons/*.png`（文件类型图标）**保留不动**——它能告知用户「这是 PNG 但缩略图失败」，是有意设计；只有「多选错误」和「纯占位」处换成 webp。

## 新增文件

### 1. `src/renderer/utils/icons.ts` — 图标统一注册入口
集中 import 全部 9 个 webp（用 Vite 的静态资源 import，自动 hash 化 + base 内联小图），导出字典 + helper：
```ts
import empty_placeholder from '@/../assets/img_icons/empty_placeholder.webp'
import loading from '@/../assets/img_icons/loading.webp'
import img_load_failed from '@/../assets/img_icons/img_load_failed.webp'
import error from '@/../assets/img_icons/error.webp'
import no_result from '@/../assets/img_icons/no_result.webp'
import file_losed from '@/../assets/img_icons/file_losed.webp'
import not_found_404 from '@/../assets/img_icons/404.webp'
import busy from '@/../assets/img_icons/busy.webp'
import done from '@/../assets/img_icons/done.webp'

export type IconName =
  | 'empty' | 'loading' | 'load_failed' | 'error' | 'no_result'
  | 'file_lost' | 'not_found' | 'busy' | 'done'

export const ICONS: Record<IconName, string> = {
  empty: empty_placeholder, loading, load_failed: img_load_failed,
  error, no_result, file_lost: file_losed, not_found: not_found_404, busy, done,
}
export const resolveIcon = (name: IconName): string => ICONS[name] ?? ICONS.empty
```
- 路径用 `@/../assets/...` 绕过 `@`→`src` 别名指向 src 外的 `assets/`。
- 这是**唯一的硬编码入口**，其余组件只引用 `IconName` 字符串，杜绝重复路径。

### 2. `src/renderer/components/common/StatusImage.vue` — 通用占位组件
统一渲染图标 + 可选文字，复用于所有 empty/loading/error 场景：
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { resolveIcon, type IconName } from '@renderer/utils/icons'
const props = withDefaults(defineProps<{
  name: IconName
  size?: string            // 图标尺寸，默认 '6rem'
  text?: string            // 下方说明文字
  spin?: boolean           // 给 loading 图标加旋转动画弥补静态图
  imgClass?: string
}>(), { size: '6rem' })
const src = computed(() => resolveIcon(props.name))
</script>
<template>
  <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
    <img :src="src" alt="" :class="['object-contain', spin && 'animate-spin', imgClass]" :style="{ width: size, height: size }" />
    <span v-if="text" class="text-xs">{{ text }}</span>
  </div>
</template>
```

## 改造清单（src/renderer/，共 ~10 文件）

| 文件 | 当前 | 改为 |
|---|---|---|
| `common/LazyImageComponent.vue` L18-21, L30-31 | `material-icons image` / `warning` | `<StatusImage name="loading" size="2rem" :text="placeholderText" spin />` / `<StatusImage name="load_failed" size="2rem" :text="errorText" />`（保留重试按钮） |
| `business/MediaDetailComponent.vue` L19,L72,L80 | `material-icons image`(loading) / `image`(multi loading) / `broken_image`(multi error) | loading→`<StatusImage name="loading" size="1.5rem" spin text="加载中..."/>`；multi loading→`loading`；multi error→`load_failed`。**单选 error 的 `getExtIconUrl` 保留** |
| `business/MediaGridComponent.vue` L62-69 | `folder_open` + 暂无文件 | `<StatusImage name="empty" text="暂无文件"/>` + 拖拽提示 |
| `business/MediaListComponent.vue` L33-37 | `folder_open` + 暂无文件 | `<StatusImage name="empty" text="暂无文件"/>` |
| `business/ImageViewerComponent.vue` L33,L54-55 | `image`(无图占位) / `broken_image`(错误) | 占位→`<StatusImage name="empty"/>`；错误→`<StatusImage name="load_failed" text="图片加载失败"/>`。**保留 CSS spinner loading** |
| `common/VideoPreviewPopover.vue` L44-47 | `error_outline` + 视频加载失败 | `<StatusImage name="load_failed" text="视频加载失败"/>` |
| `search/EmptySearchState.vue` L3-5 | `getEmptyIcon()` 返回 search_off 等 | 统一用 `no_result`（或按 service 类型映射到 `no_result`/`empty`） |
| `tabs/dashboard/cards/AlbumCard.vue` L22-26 | `photo_library` + 暂无图片 | `<StatusImage name="empty" size="2rem" text="暂无图片"/>` |
| `views/HomeView/SidebarHistoryModule.vue` L182-187 | EmptyMedia 里 `inbox`/`history` | `<StatusImage name="empty" size="1.5rem"/>` |
| `business/MediaDetailComponent.vue` L4-9 | EmptyMedia 里 `info_outline` | `<StatusImage name="empty" size="1.5rem" text="选择文件以查看详情"/>` |

## 不改动
- `MediaThumbnail.vue` / `MediaDetailComponent.vue` 单选 error 的 `ext_icons` 兜底（文件类型信息有价值）
- `MediaItem.vue` / `search-window.js` / `AlbumCard.vue` 的 `@error` 隐藏/淡出策略（无图标，无硬编码路径）
- `GlobalLoading.vue` / `ServerStartupLoading.vue` / CSS spinner（非图标类加载）
- 独立窗口应用（scope 外）
- `preview/Audio|Video|DocumentPreview.vue`（纯 emit error 文字，无图标硬编码）

## 验证
1. `npx vue-tsc --noEmit -p packages/mira-client/tsconfig.json` 无类型错误
2. `cd packages/mira-client && npm run build` 通过（验证 Vite 能解析 `@/../assets/img_icons/*.webp`）
3. grep 复查：`grep -rn "material-icons" src/renderer` 在 empty/loading/error 语境下应无残留；`grep -rn "img_icons" src/renderer` 仅出现在 `utils/icons.ts`

## 风险
- **Vite 资源解析**：`@/../assets/...` 路径需验证。若 Vite 不接受，回退方案是在 `vite.config.ts` 新增别名 `'@icons': fileURLToPath(new URL('./assets/img_icons', import.meta.url))`，icons.ts 改用 `@icons/xxx.webp`。会在实现时第一时间验证。
- **webp 是否透明/带白底**：若图标带白底，放在 `bg-muted` 上可能不协调。`StatusImage` 用 `object-contain`，并在父级保持现有背景色；若视觉不符再调。
