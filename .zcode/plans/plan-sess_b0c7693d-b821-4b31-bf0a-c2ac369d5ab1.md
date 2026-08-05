## 实现方案

### 目标
在 `MediaGridItem.vue` 缩略图右下角加一个「放大镜」小图标（仅 hover 卡片时显示）。悬浮该图标时弹出 hovercard，里面渲染一个**新抽离**的 `MediaPreviewContent` 组件，按 mime 类型分发图片/视频/音频预览（而不是简单的 `<img>`/`<video>`）。

### 范围（已与用户确认）
- **交互**：悬浮放大镜 → hovercard 弹出预览；点击放大镜 `stopPropagation`，不触发选择/打开/进入全屏。与现有 hover 内联视频预览并存、互不干扰。
- **抽离范围**：新建 `MediaPreviewContent` 组件，**仅**在网格 hovercard 中使用。不改动 `preview/ImagePreview.vue` / `preview/VideoPreview.vue` 全屏页。

---

### Step 1：新增 reka-ui HoverCard UI 封装（3 个文件）

项目用 reka-ui，但 `src/components/ui/` 下**没有 hover-card**（已确认）。按现有 `popover/`、`tooltip/` 的封装范式新建：

**`src/components/ui/hover-card/HoverCard.vue`**
```vue
<script setup lang="ts">
import type { HoverCardRootEmits, HoverCardRootProps } from "reka-ui"
import { HoverCardRoot, useForwardPropsEmits } from "reka-ui"
const props = defineProps<HoverCardRootProps>()
const emits = defineEmits<HoverCardRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <HoverCardRoot v-bind="forwarded"><slot /></HoverCardRoot>
</template>
```

**`src/components/ui/hover-card/HoverCardTrigger.vue`** — 透传 `HoverCardTriggerProps`，`as-child` 默认行为同 PopoverTrigger。

**`src/components/ui/hover-card/HoverCardContent.vue`** — 复刻 `PopoverContent.vue` 结构，用 `HoverCardPortal` + `HoverCardContent`，默认 `align="start"`, `sideOffset={8}`，保留 open/close 动画 class。

**`src/components/ui/hover-card/index.ts`** — 导出三者（+ 从 reka-ui 透传 `HoverCardArrow`，对齐 popover 导出 `PopoverAnchor` 的做法）。

### Step 2：新建统一的 `MediaPreviewContent` 组件

**`src/renderer/components/common/MediaPreviewContent.vue`**

接收一个 `FileInfo` prop，按 mime 分发：
- `image/*` → 渲染 `MediaThumbnail`（已存在，支持懒加载、fallback、`thumbnail-updated` 事件），但用一个 `object-contain` 的 class（hovercard 是预览，不是缩略图裁切，要完整展示）；src 用 `getCacheBustedPreviewImageSource(item)` 拿原图（而非缩略图），保证预览清晰。
- `video/*` → 渲染 `VideoPreview`（`common/VideoPreview.vue`，Plyr 驱动），`muted` 默认 true、`loop`/`autoplay` 由 Plyr 配置控制；src 用 `getMediaFileUrl(item)`。挂载时调用暴露的 `play()`。
- `audio/*` → 渲染一个简单的 `​<audio controls>`（项目内音频卡片 `MediaCardComponent.vue` 即用原生 audio，沿用此模式，不引入 Plyr 复杂度）。
- 其它/未知 → 文件类型图标 + 文件名占位（复用 `MediaThumbnail` 的 fallback slot / `getFileTypeIcon`）。

容器用固定宽高（如 `w-[480px] h-[320px]`，视频/图片 `object-contain`），黑底圆角，使图片/视频预览视觉一致。

**关键**：这就是从「简单的 `<img>`/`<video>`」抽离出来的组件——内部复用项目已有的 `MediaThumbnail` 和 `VideoPreview`（Plyr），保留懒加载/事件总线/平滑 seek 等既有能力。

### Step 3：改造 `MediaGridItem.vue`

1. 在缩略图容器内、文件名条之外，新增右下角放大镜图标按钮（**仅 `!isVideoPlaying` 时显示**，避免与内联视频预览重叠）：
```html
<HoverCard :open-delay="200" :close-delay="150">
  <HoverCardTrigger as-child>
    <button
      v-show="!isVideoPlaying"
      class="absolute bottom-12 right-2 z-10 w-7 h-7 rounded-full
             bg-black/55 text-white flex items-center justify-center
             opacity-0 group-hover:opacity-100 transition-opacity
             hover:bg-black/75"
      @click.stop @pointerdown.stop
      title="预览"
    >
      <span class="material-icons text-base">search</span>
    </button>
  </HoverCardTrigger>
  <HoverCardContent side="top" align="end" :side-offset="8"
                    class="p-1 border-0 bg-transparent shadow-none">
    <MediaPreviewContent :item="item" />
  </HoverCardContent>
</HoverCard>
```
位置说明：`bottom-12 right-2`（约 48px）使其落在文件名条（`bottom-0`，约 36px 高）**之上**，与右上角 `top-2 right-2` 的类型徽标错开。`group-hover:opacity-100` 依赖根 div 的 `group` class（已确认存在，`MediaGridItem.vue:6`）。

2. `@click.stop` 阻止冒泡到卡片的 `handleClick`（选择）；`@pointerdown.stop` 阻止冒泡到 `handlePointerDown`（拖拽）。无需改 emits。

3. `<script setup>` 新增 import：
```ts
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import MediaPreviewContent from '@renderer/components/common/MediaPreviewContent.vue'
```

### 不改动
- `MediaGridComponent.vue`（父）—— hovercard 完全自包含在 item 内，无需透传 slot/props。
- `preview/ImagePreview.vue`、`preview/VideoPreview.vue` 全屏页 —— 用户明确选择不动。
- `useMediaItem.ts`、`useVideoHover.ts` —— 行为不变。

---

### 涉及文件清单
- **新增** `src/components/ui/hover-card/HoverCard.vue`
- **新增** `src/components/ui/hover-card/HoverCardTrigger.vue`
- **新增** `src/components/ui/hover-card/HoverCardContent.vue`
- **新增** `src/components/ui/hover-card/index.ts`
- **新增** `src/renderer/components/common/MediaPreviewContent.vue`
- **修改** `src/renderer/components/business/MediaGridComponent/MediaGridItem.vue`

### 风险 / 验证
- reka-ui 已含 HoverCard 原语（已确认 `node_modules/reka-ui/dist/HoverCard/` 存在），无新依赖。
- hovercard 通过 `HoverCardPortal` 渲染到 body，不受卡片 `overflow-hidden` 影响。
- 视频 hovercard 打开时也会开始播放——可接受（用户主动悬浮预览图标）；卡片 hover 内联预览逻辑不受影响（互不干扰，已确认交互）。
- 验证：`pnpm --filter mira-client typecheck` + 手动 hover 图片/视频/音频/未知文件四类网格项，确认放大镜显隐、hovercard 弹出与预览渲染正确，且点击放大镜不触发选中。