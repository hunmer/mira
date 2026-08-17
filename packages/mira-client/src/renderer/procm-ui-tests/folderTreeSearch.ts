import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

const NO_MATCH_QUERY = 'zzz-procm-no-match'

/** Folders module section root (reka-ui Collapsible root div). */
function findFoldersSection(): HTMLElement | null {
  const titleEl = screen
    .getAllByText(/文件夹树|folder tree/i)
    .find((element) => element.classList.contains('section-title'))
  return titleEl?.closest<HTMLElement>('[data-slot="collapsible"]') ?? null
}

function findSearchButton(): HTMLButtonElement {
  const button = screen
    .getAllByTitle(/搜索文件夹|search folders/i)
    .find((element) => element.classList.contains('header-action-btn'))
  if (!button) throw new Error('sidebar folder search button is not available')
  return button as HTMLButtonElement
}

/** Visible folder tree node rows inside the folders section (excludes shortcuts module). */
function countNodes(section: HTMLElement): number {
  return section.querySelectorAll('[data-folder-tree-node-id]').length
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function folderTreeSearch(): Promise<{
  initialCount: number
  filteredCount: number
  restoredCount: number
}> {
  console.info('[procm-ui-test] folder-tree-search started')
  const user = userEvent.setup()

  const section = findFoldersSection()
  if (!section) throw new Error('sidebar folders section is not available')
  const searchButton = findSearchButton()

  const initialCount = countNodes(section)
  if (initialCount === 0) {
    throw new Error('folder tree has no visible nodes, cannot verify search filtering')
  }

  let filteredCount = initialCount
  let restoredCount = initialCount

  await user.click(searchButton)
  try {
    const searchInput = await waitFor(() => {
      // The input lives in FolderTreeHeader's .search-shell, inside this section.
      const input = section.querySelector<HTMLInputElement>('.search-shell input')
      if (!input) {
        throw new Error(
          'folder tree search input did not appear: FolderTreeComponent is mounted with hide-header '
          + 'in the sidebar, and FolderTreeHeader (owner of the search input) is skipped when hideHeader is set',
        )
      }
      return input
    }, { timeout: 10_000 })

    await waitFor(() => {
      if (document.activeElement !== searchInput) {
        throw new Error('folder tree search input is not focused')
      }
    }, { timeout: 10_000 })

    await user.type(searchInput, NO_MATCH_QUERY)
    await waitFor(() => {
      filteredCount = countNodes(section)
      if (filteredCount >= initialCount) {
        throw new Error(`non-matching query "${NO_MATCH_QUERY}" kept ${filteredCount} nodes visible (initial ${initialCount})`)
      }
    }, { timeout: 10_000 })

    await user.clear(searchInput)
    await waitFor(() => {
      restoredCount = countNodes(section)
      if (restoredCount !== initialCount) {
        throw new Error(`clearing the query left ${restoredCount} nodes visible (expected ${initialCount})`)
      }
    }, { timeout: 10_000 })
  } finally {
    // Toggle search off to restore the initial UI (toggleSearch also clears the query).
    await user.click(searchButton)
    await waitFor(() => {
      if (section.querySelector('.search-shell input')) {
        throw new Error('folder tree search input is still visible after closing')
      }
    }, { timeout: 10_000 }).catch(() => undefined)
  }

  console.info('[procm-ui-test] folder-tree-search finished', { initialCount, filteredCount, restoredCount })
  return { initialCount, filteredCount, restoredCount }
}
