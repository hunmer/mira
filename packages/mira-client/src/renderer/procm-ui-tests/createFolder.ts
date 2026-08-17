import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

function findFolderAddButton(): HTMLButtonElement {
  const button = screen.getAllByTitle(/创建文件夹|添加文件夹|addFolder/i)
    .find((element) => element.classList.contains('header-action-btn'))
  if (!button) throw new Error('sidebar folder add button is not available')
  return button as HTMLButtonElement
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function createFolder(title = `procm-ui-${Date.now()}`): Promise<{ title: string; visible: boolean }> {
  console.info('[procm-ui-test] create-folder started', title)
  const user = userEvent.setup()
  await user.click(findFolderAddButton())

  const titleInput = document.querySelector<HTMLInputElement>('#folderTitle')
  if (!titleInput) throw new Error('folder creation dialog did not open')
  await user.clear(titleInput)
  await user.type(titleInput, title)

  const createButton = screen.getByRole('button', {
    name: /创建|create/i,
  }) as HTMLButtonElement
  await user.click(createButton)

  await waitFor(() => {
    const text = document.body.textContent ?? ''
    if (!text.includes(title)) throw new Error(`created folder "${title}" is not visible yet`)
  }, { timeout: 15_000 })

  console.info('[procm-ui-test] create-folder completed', title)
  return { title, visible: true }
}
