/**
 * Kill all running Electron processes (cross-platform).
 *
 * Run via: pnpm electron:kill
 */
const { exec } = require('child_process')

const isWin = process.platform === 'win32'
const command = isWin
  ? 'taskkill /F /IM electron.exe /T'
  : 'pkill -f "[Ee]lectron"'

exec(command, (error, stdout, stderr) => {
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)

  // pkill returns 1 when no matching process was found — that's fine here.
  if (error && (!isWin || error.code !== 1)) {
    console.error(`Failed to kill Electron processes: ${error.message}`)
    process.exit(isWin ? error.code || 1 : 0)
  }

  console.log('Electron processes terminated.')
})
