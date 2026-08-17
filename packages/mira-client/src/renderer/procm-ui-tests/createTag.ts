import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

// NOTE: this test really creates a tag in the current library. The tag is
// intentionally NOT removed afterwards (same trade-off as createFolder).
// If the persisted "auto open tab" preference is on (default), a tab named
// after the tag is opened as well. Task 2 (deleteFolderDialog) or manual
// cleanup can remove leftovers.

function findTagAddButton(): HTMLButtonElement {
  const button = screen.getAllByTitle(/添加标签|创建标签|add\s*tag/i)
    .find((element) => element.classList.contains('header-action-btn'))
  if (!button) throw new Error('sidebar tag add button is not available')
  return button as HTMLButtonElement
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function createTag(name = `procm-ui-tag-${Date.now()}`): Promise<{ name: string; visible: boolean }> {
  console.info('[procm-ui-test] create-tag started', name)
  const user = userEvent.setup()
  await user.click(findTagAddButton())

  // The tag tree reuses FolderEditDialog (itemType="tag") with the same input.
  const nameInput = document.querySelector<HTMLInputElement>('#folderTitle')
  if (!nameInput) throw new Error('tag creation dialog did not open')
  await user.clear(nameInput)
  await user.type(nameInput, name)

  const createButton = screen.getByRole('button', {
    name: /创建|create/i,
  }) as HTMLButtonElement
  await user.click(createButton)

  await waitFor(() => {
    const text = document.body.textContent ?? ''
    if (!text.includes(name)) throw new Error(`created tag "${name}" is not visible yet`)
  }, { timeout: 15_000 })

  console.info('[procm-ui-test] create-tag finished', name)
  return { name, visible: true }
}
