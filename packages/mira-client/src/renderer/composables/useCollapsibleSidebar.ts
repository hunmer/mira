import { ref, computed, watch, type Ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

/**
 * 可折叠侧栏布局工具：桌面端 resizable + collapsible + 分割描边点击切换，
 * 移动端（<768px）自动隐藏并改用 Sheet 抽屉展示。
 *
 * 供 ImagePreview / VideoPreview 等预览视图复用，与 HomeView 的侧栏行为保持一致。
 *
 * @param defaultSize 侧栏默认宽度占比（resizable 百分比）
 */
export function useCollapsibleSidebar(defaultSize = 20) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  // 侧栏可见性：桌面端驱动 inline 面板，移动端驱动抽屉开关
  const showSidebar = ref(true)
  // resizable 面板实例引用（调用 resize / collapse）
  const panelRef = ref<any>(null) as Ref<any>
  // resizable 折叠态（拖拽至 min 之下触发）
  const isCollapsed = ref(false)

  // 按钮 / handle 点击切换 → 驱动面板切换到 默认宽度 / 0
  watch(showSidebar, (show) => {
    panelRef.value?.resize(show ? defaultSize : 0)
  }, { flush: 'post' })

  // 拖拽折叠 → 回写 showSidebar，保持切换按钮高亮一致
  watch(isCollapsed, (collapsed) => {
    if (collapsed && showSidebar.value) showSidebar.value = false
    else if (!collapsed && !showSidebar.value) showSidebar.value = true
  })

  // 进入移动端自动隐藏（inline 面板不渲染，抽屉默认关闭）
  watch(isMobile, (mobile) => {
    if (mobile) showSidebar.value = false
  }, { immediate: true })

  // 抽屉开关直接读写 showSidebar：桌面端驱动 inline，移动端驱动抽屉
  const drawerOpen = computed({
    get: () => showSidebar.value,
    set: (v) => { showSidebar.value = v },
  })

  function toggleSidebar() {
    showSidebar.value = !showSidebar.value
  }

  /**
   * 分割描边点击切换：区分「拖拽」与「点击」——
   * 按下后位移超过阈值（5px）视为拖拽，忽略 click。
   * 返回的对象可直接用于 `v-on="handleToggle"`。
   */
  function makeHandleToggle(toggle: () => void) {
    let downX = 0
    let downY = 0
    let moved = false
    return {
      pointerdown: (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; moved = false },
      pointermove: (e: PointerEvent) => {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) moved = true
      },
      click: (e: MouseEvent) => {
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
        if (!moved && dist < 5) toggle()
      },
    }
  }
  const handleToggle = makeHandleToggle(toggleSidebar)

  return {
    isMobile,
    showSidebar,
    toggleSidebar,
    panelRef,
    isCollapsed,
    drawerOpen,
    handleToggle,
    defaultSize,
  }
}
