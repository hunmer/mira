import { createProcmClient, collectLogs, executeCustom } from '@hunmer/procm-mcp-sdk'

const roomId = process.env.PROCM_ROOM_ID || 'mira-dev'
const wsUrl = process.env.PROCM_WS_URL || 'ws://127.0.0.1:7331/room'
const client = createProcmClient({ clientName: 'mira-ui-test', roomId, url: wsUrl, reconnect: false })
const waitOpen = () => client.connectionState === 'open'
  ? Promise.resolve()
  : new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('procm connection timed out')), 10_000)
    const off = client.onState((state) => {
      if (state !== 'open') return
      clearTimeout(timer)
      off()
      resolve()
    })
  })

try {
  await waitOpen()
  const startTime = Date.now()
  const result = await executeCustom(
    client,
    process.env.PROCM_UI_TARGET || 'mira-client',
    (context, title) => context.runUiTest('createFolder', title),
    [`procm-ui-${startTime}`],
    { timeout: 30_000 },
  )
  const endTime = Date.now()
  // Allow the managed process logger to flush Renderer console frames before querying.
  await new Promise((resolve) => setTimeout(resolve, 250))
  const logs = await collectLogs(client, { startTime, endTime, count: 500 })
  console.log(JSON.stringify({ ok: true, result, logs }, null, 2))
} finally {
  client.close()
}
