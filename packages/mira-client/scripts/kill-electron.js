/**
 * Kill all running Electron processes (cross-platform).
 *
 * Run via: pnpm electron:kill
 *
 * On macOS / Linux: first SIGTERM (give the app a chance to run before-quit
 * cleanup), then SIGKILL any survivors.
 * On Windows: taskkill the whole process tree (/T) forcefully.
 */
const { exec } = require('child_process')

const isWin = process.platform === 'win32'

if (isWin) {
  // /T kills the whole process tree (parent + helper/renderer/GPU children)
  exec('taskkill /F /IM electron.exe /T', (error, stdout, stderr) => {
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
    if (error) {
      console.error(`Failed to kill Electron processes: ${error.message}`)
      // 128 = "no such process" — already gone, that's fine
      process.exit(typeof error.code === 'number' && error.code !== 128 ? error.code : 0)
    }
    console.log('Electron processes terminated.')
  })
} else {
  // 1) SIGTERM — lets main process run before-quit / cleanup (tray.destroy etc.)
  exec('pkill -TERM -f "[Ee]lectron"', (termErr) => {
    const noMatch = termErr && termErr.code === 1 // pkill: no process matched

    // 2) Wait briefly, then SIGKILL any stubborn survivors
    setTimeout(() => {
      exec('pkill -KILL -f "[Ee]lectron"', (killErr) => {
        const stillNone = killErr && killErr.code === 1
        if (noMatch && stillNone) {
          console.log('No Electron process found.')
          return
        }
        if (killErr && !stillNone) {
          console.error(`Failed to kill Electron processes: ${killErr.message}`)
          process.exit(killErr.code || 1)
        }
        console.log('Electron processes terminated.')
      })
    }, 800)
  })
}
