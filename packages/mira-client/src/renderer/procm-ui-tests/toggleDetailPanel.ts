import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * The right detail panel is the only <aside> rendered inside the desktop
 * resizable layout (index.vue third ResizablePanel, v-if="!isDetailCollapsed").
 * Its existence in the DOM flips with the panel collapse state.
 */
function findDetailAside(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('aside')).find((element) =>
      element.closest('[data-slot="resizable-panel"]'),
    ) ?? null
  )
}

function findToggleButton(): HTMLButtonElement {
  const button = screen.getAllByRole('button', { name: /view_sidebar/i })[0]
  if (!button) throw new Error('view_sidebar toggle button is not available')
  return button as HTMLButtonElement
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function toggleDetailPanel(): Promise<{
  initialVisible: boolean
  toggled: boolean
  restored: boolean
}> {
  console.info('[procm-ui-test] toggle-detail-panel started')
  const user = userEvent.setup()

  const button = findToggleButton()
  const initialVisible = Boolean(findDetailAside())

  await user.click(button)
  await waitFor(() => {
    const visible = Boolean(findDetailAside())
    if (visible === initialVisible) {
      throw new Error(`detail panel visibility did not flip after clicking view_sidebar (still ${visible})`)
    }
  }, { timeout: 10_000 })

  // Second click restores the initial state.
  await user.click(button)
  await waitFor(() => {
    const visible = Boolean(findDetailAside())
    if (visible !== initialVisible) {
      throw new Error(`detail panel did not return to initial visibility (initial ${initialVisible}, current ${visible})`)
    }
  }, { timeout: 10_000 })

  console.info('[procm-ui-test] toggle-detail-panel finished', { initialVisible })
  return { initialVisible, toggled: true, restored: true }
}
