import { nextTick } from 'vue'

const CHILDREN_SLIDE_MS = 240

function getDescendantRows(targetRow: HTMLElement): HTMLElement[] {
  const targetLevel = Number(targetRow.getAttribute('aria-level') || 0)
  if (!targetLevel) return []

  const descendants: HTMLElement[] = []
  let row = targetRow.nextElementSibling as HTMLElement | null
  while (row) {
    const level = Number(row.getAttribute('aria-level') || 0)
    if (level > 0 && level <= targetLevel) break
    descendants.push(row)
    row = row.nextElementSibling as HTMLElement | null
  }
  return descendants
}

function getTargetRow(event: MouseEvent): HTMLElement | null {
  return (event.currentTarget as HTMLElement).closest<HTMLElement>('.tree-node')
}

function animateChildRows(rows: HTMLElement[], phase: 'expand' | 'collapse'): Promise<void> {
  const keyframes: Keyframe[] = phase === 'expand'
    ? [
      { transform: 'translateX(-24px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ]
    : [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(24px)', opacity: 0 },
    ]
  const animations = rows.map(row => row.animate(keyframes, {
    duration: CHILDREN_SLIDE_MS,
    easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    fill: 'both',
  }))

  return Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
    animations.forEach(animation => animation.cancel())
  })
}

/** 展开/折叠子节点时的滑入滑出动画 */
export function useNodeToggleAnimation() {
  const animatingStats = new WeakSet<object>()

  async function toggleNode(stat: any, event: MouseEvent) {
    if (animatingStats.has(stat)) return
    animatingStats.add(stat)
    const targetRow = getTargetRow(event)

    try {
      if (!stat.open) {
        stat.open = true
        await nextTick()
        const descendants = targetRow ? getDescendantRows(targetRow) : []
        await animateChildRows(descendants, 'expand')
        return
      }

      const descendants = targetRow ? getDescendantRows(targetRow) : []
      await animateChildRows(descendants, 'collapse')
      stat.open = false
    } finally {
      animatingStats.delete(stat)
    }
  }

  return { toggleNode }
}
