import assert from 'node:assert/strict'
import test from 'node:test'
import express from 'express'
import { FileRoutes } from './FileRoutes'

test('rename ignores same-name files in the recycle bin', async () => {
  let savedName = 'source.jpg'
  let siblingFilters: Record<string, unknown> | undefined
  let siblings = [{ id: 2, name: 'target.jpg', folder_id: 3, recycled: 1 }]
  const libraryService = {
    config: {},
    getFile: async () => ({ id: 1, name: savedName, folder_id: 3 }),
    getFiles: async ({ filters }: { filters: Record<string, unknown> }) => {
      siblingFilters = filters
      return {
        result: filters.recycled === 0
          ? siblings.filter(file => file.recycled === 0)
          : siblings,
      }
    },
    getItemFilePath: async () => '',
    updateFile: async (_id: number, patch: { name: string }) => {
      savedName = patch.name
      return { success: true, oldData: { name: 'source.jpg' } }
    },
  }
  const backend = {
    dataPath: process.cwd(),
    libraries: { getLibrary: () => ({ libraryService }) },
  }
  const routes = new FileRoutes(backend as never)
  const app = express()
  app.use(express.json())
  app.use('/api/files', routes.getRouter())
  const server = app.listen(0)

  try {
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const rename = () => fetch(`http://127.0.0.1:${address.port}/api/files/rename`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ libraryId: 'library-1', fileId: '1', name: 'target.jpg' }),
      })

    const response = await rename()
    const body = await response.json() as { data: { name: string } }

    assert.equal(response.status, 200)
    assert.deepEqual(siblingFilters, { folder: 3, recycled: 0 })
    assert.equal(body.data.name, 'target.jpg')

    savedName = 'source.jpg'
    siblings = [{ id: 2, name: 'target.jpg', folder_id: 3, recycled: 0 }]
    const conflictResponse = await rename()
    const conflictBody = await conflictResponse.json() as { data: { name: string } }
    assert.equal(conflictBody.data.name, 'target (1).jpg')
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
