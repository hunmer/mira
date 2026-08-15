import type { DirectiveBinding } from 'vue'

/*
  v-digit-pop：count 数字逐位弹出动画。
  - 挂载时添加 .is-animating 触发首次播放。
  - count 变化时移除 .is-animating → 强制 reflow → 重新添加，实现重播。
*/
export const vDigitPop = {
  mounted(el: HTMLElement, binding: DirectiveBinding<number>) {
    ;(el as any)._lastDigitVal = binding.value
    el.classList.add('is-animating')
  },
  updated(el: HTMLElement, binding: DirectiveBinding<number>) {
    if (binding.value !== (el as any)._lastDigitVal) {
      ;(el as any)._lastDigitVal = binding.value
      el.classList.remove('is-animating')
      void el.offsetWidth // 强制 reflow，重启动画
      el.classList.add('is-animating')
    }
  },
}
