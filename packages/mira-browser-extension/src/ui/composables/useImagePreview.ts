/**
 * 图片悬浮预览(hovercard)单例。
 *
 * 列表/瀑布流缩略图 @mouseenter 时 show(url, 鼠标坐标),@mousemove 更新坐标,
 * @mouseleave 时 hide。<ImageHovercard> 消费 state 渲染跟随鼠标的浮动预览卡。
 *
 * 模式同 useDialog:模块级单例 ref,host 在 App.vue 挂载一次。
 */
import { ref } from 'vue';

export interface ImagePreviewState {
  url: string;
  x: number;
  y: number;
}

/** 当前预览;为 null 表示无预览。ImageHovercard 据此渲染。 */
const preview = ref<ImagePreviewState | null>(null);

export function useImagePreview() {
  function show(url: string, x: number, y: number) {
    preview.value = { url, x, y };
  }

  function hide() {
    preview.value = null;
  }

  return {
    /** 当前预览 state(供 ImageHovercard 读) */
    state: preview,
    show,
    hide,
  };
}
