/**
 * 全屏大图查看器单例。
 *
 * 瀑布流右上角「查看大图」图标点击时 open(url),<ImageViewer> 消费 state
 * 渲染全屏遮罩 + contain 大图,鼠标移动后自动关闭(沉浸式,见 ImageViewer)。
 *
 * 模式同 useDialog:模块级单例 ref,host 在 App.vue 挂载一次。
 */
import { ref } from 'vue';

/** 当前查看的图片;为 null 表示查看器关闭。 */
const viewer = ref<{ url: string } | null>(null);

export function useImageViewer() {
  function open(url: string) {
    viewer.value = { url };
  }

  function close() {
    viewer.value = null;
  }

  return {
    /** 当前查看器 state(供 ImageViewer 读) */
    state: viewer,
    open,
    close,
  };
}
