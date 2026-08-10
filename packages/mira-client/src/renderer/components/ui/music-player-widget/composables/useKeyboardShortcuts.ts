import { onBeforeUnmount, onMounted } from 'vue'

export interface ShortcutActions {
  toggle: () => void
  next: () => void
  prev: () => void
  seekForward: () => void
  seekBackward: () => void
  toggleShuffle: () => void
  cycleLoop: () => void
}

/**
 * 全局键盘快捷键：空格播放/暂停，←/→ ±5s，Shift+←/→ 切歌，s 随机，l 循环。
 * 焦点在 INPUT/TEXTAREA 上时不拦截。
 */
export function useKeyboardShortcuts(getActions: () => ShortcutActions) {
  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    const actions = getActions()
    switch (e.key) {
      case ' ':
        e.preventDefault()
        actions.toggle()
        break
      case 'ArrowRight':
        e.preventDefault()
        if (e.shiftKey) actions.next()
        else actions.seekForward()
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (e.shiftKey) actions.prev()
        else actions.seekBackward()
        break
      case 's':
      case 'S':
        actions.toggleShuffle()
        break
      case 'l':
      case 'L':
        actions.cycleLoop()
        break
    }
  }

  onMounted(() => document.addEventListener('keydown', handler))
  onBeforeUnmount(() => document.removeEventListener('keydown', handler))
}
