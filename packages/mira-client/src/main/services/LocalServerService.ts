import { app } from 'electron'
import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'

export interface LocalServerScriptOptions {
  onOutput?: (line: string) => void
}

let serverStartPromise: Promise<void> | null = null

function getScriptPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'scripts', 'mira-server-service.mjs')
    : path.join(app.getAppPath(), 'scripts', 'mira-server-service.mjs')
}

function getScriptArgs(command: 'start' | 'stop' | 'status'): string[] {
  const stateDir = path.join(app.getPath('userData'), 'mira-app-server')
  return [
    getScriptPath(),
    command,
    '--state-dir', stateDir,
    '--data-path', stateDir,
    '--http-port', '8081',
    '--ws-port', '8018',
  ]
}

function getScriptEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  }
}

export function runLocalServerScript(
  command: 'start' | 'stop' | 'status',
  options: LocalServerScriptOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, getScriptArgs(command), {
      windowsHide: true,
      env: getScriptEnvironment(),
    })
    let settled = false
    const emitChunk = (chunk: Buffer | string) => {
      String(chunk)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => options.onOutput?.(line))
    }
    child.stdout?.on('data', emitChunk)
    child.stderr?.on('data', emitChunk)
    child.once('error', error => {
      if (settled) return
      settled = true
      reject(error)
    })
    child.once('close', exitCode => {
      if (settled) return
      settled = true
      if (exitCode === 0) resolve()
      else reject(new Error(`Local server script exited with code ${exitCode ?? -1}`))
    })
  })
}

export function ensureLocalServerStarted(options: LocalServerScriptOptions = {}): Promise<void> {
  if (!serverStartPromise) {
    serverStartPromise = runLocalServerScript('start', options).catch(error => {
      serverStartPromise = null
      throw error
    })
  }
  return serverStartPromise
}

export function runLocalServerScriptSync(command: 'stop'): string {
  return execFileSync(process.execPath, getScriptArgs(command), {
    encoding: 'utf8',
    env: getScriptEnvironment(),
    timeout: 10000,
    windowsHide: true,
  }).trim()
}
