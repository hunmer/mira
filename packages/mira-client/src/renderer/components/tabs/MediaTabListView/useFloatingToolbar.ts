import { computed, nextTick, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'

/**
 * 浮动操作栏：FLIP 宽度过渡 + 显示/隐藏缩放
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
export function useFloatingToolbar(deps: {
  selectedItems: ComputedRef<string[]>
  totalPages: ComputedRef<number>
}) {
  const { selectedItems, totalPages } = deps

  const toolbarRef = ref<HTMLElement | null>(null)
  // 浮动栏可见条件：有选中项 或 存在分页
  const showFloatingToolbar = computed(() => selectedItems.value.length > 0 || totalPages.value > 1)
  // 记录宽度变化前的值，用于 FLIP 反转
  let prevToolbarWidth = 0

  watch(showFloatingToolbar, (visible) => {
    // 浮动栏即将显示：清除历史宽度，避免首次进入时出现错误的 scaleX
    if (visible) prevToolbarWidth = 0
  })

  // 监听内部内容变化（选中态 / 分页），在 DOM 更新前后用 FLIP 实现丝滑宽度过渡
  watch([() => selectedItems.value.length, totalPages], () => {
    const el = toolbarRef.value
    // First：记录变化前的宽度
    if (el && el.offsetWidth > 0) {
      prevToolbarWidth = el.offsetWidth
    }
    // Last：DOM 更新后，对比新旧宽度做反转过渡
    nextTick(() => {
      const el = toolbarRef.value
      if (!el || !prevToolbarWidth || prevToolbarWidth === el.offsetWidth) return
      const ratio = prevToolbarWidth / el.offsetWidth
      // Invert：瞬间应用反转 scale（无过渡）
      el.style.transition = 'none'
      el.style.transform = `scaleX(${ratio})`
      // 强制浏览器刷新，使上面的"无过渡"状态生效
      void el.offsetWidth
      // Play：过渡回 1
      el.style.transition = 'transform 240ms cubic-bezier(0.4, 0, 0.2, 1)'
      el.style.transform = 'scaleX(1)'
      prevToolbarWidth = el.offsetWidth
    })
  })

  return {
    toolbarRef,
    showFloatingToolbar
  }
}
