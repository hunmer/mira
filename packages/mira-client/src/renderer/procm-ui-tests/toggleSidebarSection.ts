import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

interface SidebarSection {
  header: HTMLElement
  content: HTMLElement
  title: string
}

/**
 * Locate a sidebar module section by its localized title.
 * Each module renders as a reka-ui Collapsible:
 *   root   [data-slot="collapsible"].sidebar-section
 *   header .section-header (CollapsibleTrigger as-child, keeps data-state)
 *   body   [data-slot="collapsible-content"] (force-mount, keeps data-state)
 */
function findSectionByTitle(pattern: RegExp): SidebarSection | null {
  const titleEl = screen
    .getAllByText(pattern)
    .find((element) => element.classList.contains('section-title'))
  if (!titleEl) return null
  const section = titleEl.closest<HTMLElement>('[data-slot="collapsible"]')
  const header = section?.querySelector<HTMLElement>('.section-header')
  const content = section?.querySelector<HTMLElement>('[data-slot="collapsible-content"]')
  if (!section || !header || !content) return null
  return { header, content, title: (titleEl.textContent ?? '').trim() }
}

function findAnySection(): SidebarSection | null {
  const header = document.querySelector<HTMLElement>('.sidebar-section > .section-header')
  const section = header?.closest<HTMLElement>('[data-slot="collapsible"]')
  const content = section?.querySelector<HTMLElement>('[data-slot="collapsible-content"]')
  const titleEl = header?.querySelector<HTMLElement>('.section-title')
  if (!section || !header || !content || !titleEl) return null
  return { header, content, title: (titleEl.textContent ?? '').trim() }
}

function readSectionState(section: SidebarSection): string {
  return section.content.dataset.state ?? section.header.dataset.state ?? 'unknown'
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function toggleSidebarSection(): Promise<{
  sectionTitle: string
  initialState: string
  toggled: boolean
  restored: boolean
}> {
  console.info('[procm-ui-test] toggle-sidebar-section started')
  const user = userEvent.setup()

  // Prefer the tags module, then folders, then any first collapsible section.
  const target =
    findSectionByTitle(/标签树|tag tree/i) ??
    findSectionByTitle(/文件夹树|folder tree/i) ??
    findAnySection()
  if (!target) throw new Error('no collapsible sidebar section is available')

  const initialState = readSectionState(target)
  if (initialState !== 'open' && initialState !== 'closed') {
    throw new Error(`sidebar section "${target.title}" has unexpected data-state "${initialState}"`)
  }
  const toggledState = initialState === 'open' ? 'closed' : 'open'
  // Click the title area only: header action buttons stop propagation on purpose.
  const clickTarget = target.header.querySelector('.section-title') ?? target.header

  await user.click(clickTarget)
  await waitFor(() => {
    const state = readSectionState(target)
    if (state !== toggledState) {
      throw new Error(`section "${target.title}" data-state is "${state}", expected "${toggledState}" after first click`)
    }
  }, { timeout: 10_000 })

  // Second click restores the initial state.
  await user.click(clickTarget)
  await waitFor(() => {
    const state = readSectionState(target)
    if (state !== initialState) {
      throw new Error(`section "${target.title}" data-state is "${state}", expected "${initialState}" after restore click`)
    }
  }, { timeout: 10_000 })

  console.info('[procm-ui-test] toggle-sidebar-section finished', target.title)
  return { sectionTitle: target.title, initialState, toggled: true, restored: true }
}
