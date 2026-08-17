// 通用真实页面 UI 测试驱动：
//   pnpm run test:ui:remote <testName> ['["arg1", ...]']
//   node scripts/test-ui.mjs <testName> [jsonArgsArray]
// 测试名对应 renderer/procm-ui-tests/index.ts 注册的 window.__procmUiTests 键。
import { readFileSync } from 'node:fs'
import { createProcmClient, collectLogs, executeCustom } from '@hunmer/procm-mcp-sdk'

const testName = process.argv[2]
if (!testName) {
  const indexSource = readFileSync(new URL('../src/renderer/procm-ui-tests/index.ts', import.meta.url), 'utf8')
  const registry = indexSource.match(/const uiTests[^{]*\{([\s\S]*?)\}/)?.[1] ?? ''
  const names = registry.split(',').map((line) => line.trim()).filter((line) => /^[A-Za-z]/.test(line))
  console.log('usage: pnpm run test:ui:remote <testName> [jsonArgsArray]')
  console.log(`\navailable tests (${names.length}):\n${names.map((name) => `  - ${name}`).join('\n')}`)
  process.exit(0)
}
const testArgs = process.argv[3] ? JSON.parse(process.argv[3]) : []

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
    (context, ...args) => context.runUiTest(testName, ...args),
    testArgs,
    { timeout: 60_000 },
  )
  const endTime = Date.now()
  // Allow the managed process logger to flush Renderer console frames before querying.
  await new Promise((resolve) => setTimeout(resolve, 250))
  const logs = await collectLogs(client, { startTime, endTime, count: 500 })
  console.log(JSON.stringify({ ok: true, result, logs }, null, 2))
} finally {
  client.close()
}
