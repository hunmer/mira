#!/usr/bin/env node

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const PACKAGE_NAME = 'mira-app-server'
const IS_WIN = process.platform === 'win32'

function readOptions(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (!key.startsWith('--')) continue
    options[key.slice(2)] = argv[index + 1]
    index += 1
  }
  return options
}

const command = process.argv[2]
const options = readOptions(process.argv.slice(3))
const configPointerFile = path.join(os.homedir(), '.mira-app-server-service.json')
let savedConfig = {}
try {
  savedConfig = JSON.parse(readFileSync(configPointerFile, 'utf8'))
} catch {
  savedConfig = {}
}
const httpPort = Number(options['http-port'] || savedConfig.httpPort || 8081)
const wsPort = Number(options['ws-port'] || savedConfig.wsPort || 8018)
const stateDir = path.resolve(options['state-dir'] || savedConfig.stateDir || path.join(os.homedir(), '.mira-app-server'))
const dataPath = path.resolve(options['data-path'] || savedConfig.dataPath || path.join(stateDir, 'data'))
const stateFile = path.join(stateDir, 'service.json')
const logFile = path.join(stateDir, 'service.log')

function output(message) {
  process.stdout.write(`${message}\n`)
}

function readState() {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'))
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function isHealthy() {
  try {
    const response = await fetch(`http://127.0.0.1:${httpPort}/health`, {
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) return false
    const body = await response.json()
    return body?.status === 'ok'
  } catch {
    return false
  }
}

function resolveServerCli() {
  const globalRoot = execFileSync('npm', ['root', '-g'], {
    encoding: 'utf8',
    shell: IS_WIN,
    windowsHide: true,
  }).trim()
  const packageDir = path.join(globalRoot, PACKAGE_NAME)
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
  const binPath = typeof packageJson.bin === 'string'
    ? packageJson.bin
    : packageJson.bin?.[PACKAGE_NAME]
  if (!binPath) throw new Error(`Server CLI entry not found in ${PACKAGE_NAME}/package.json`)
  return path.resolve(packageDir, binPath)
}

function stopProcessTree(pid) {
  if (!isProcessAlive(pid)) return
  if (IS_WIN) {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
    return
  }
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    process.kill(pid, 'SIGTERM')
  }
}

async function startService() {
  if (await isHealthy()) {
    output(`Mira server is already healthy on port ${httpPort}`)
    return
  }

  const previous = readState()
  if (previous?.pid && isProcessAlive(previous.pid)) {
    output(`Stopping stale service process ${previous.pid}`)
    stopProcessTree(previous.pid)
  }

  mkdirSync(stateDir, { recursive: true })
  mkdirSync(dataPath, { recursive: true })
  writeFileSync(configPointerFile, JSON.stringify({ stateDir, dataPath, httpPort, wsPort }, null, 2))
  const serverCli = resolveServerCli()
  if (!existsSync(serverCli)) {
    throw new Error(`Server CLI not found: ${serverCli}`)
  }

  const logFd = openSync(logFile, 'a')
  const child = spawn(
    process.execPath,
    [serverCli, 'start', '--http-port', String(httpPort), '--ws-port', String(wsPort), '--data-path', dataPath],
    {
      detached: true,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', logFd, logFd],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        INITIAL_ADMIN_USERNAME: 'admin',
        INITIAL_ADMIN_PASSWORD: 'admin123',
      },
    },
  )
  closeSync(logFd)
  if (!child.pid) throw new Error('Failed to obtain the Mira server process ID')
  child.unref()
  writeFileSync(stateFile, JSON.stringify({
    pid: child.pid,
    executable: serverCli,
    dataPath,
    httpPort,
    wsPort,
    logFile,
    startedAt: new Date().toISOString(),
  }, null, 2))
  output(`Started service process ${child.pid}`)
  output(`Log file: ${logFile}`)

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isHealthy()) {
      output(`Mira server is healthy on port ${httpPort}`)
      return
    }
    if (!isProcessAlive(child.pid)) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  stopProcessTree(child.pid)
  rmSync(stateFile, { force: true })
  throw new Error(`Mira server failed to become healthy; see ${logFile}`)
}

async function stopService() {
  const state = readState()
  if (!state?.pid) {
    output('No script-managed Mira server process found')
    return
  }
  if (isProcessAlive(state.pid)) {
    stopProcessTree(state.pid)
    output(`Stopped service process ${state.pid}`)
  } else {
    output(`Service process ${state.pid} is no longer running`)
  }
  rmSync(stateFile, { force: true })
}

async function showStatus() {
  const state = readState()
  const healthy = await isHealthy()
  output(JSON.stringify({
    healthy,
    managed: Boolean(state?.pid && isProcessAlive(state.pid)),
    pid: state?.pid || null,
    httpPort,
    dataPath,
    logFile,
  }))
  if (!healthy) process.exitCode = 1
}

try {
  if (command === 'start') await startService()
  else if (command === 'stop') await stopService()
  else if (command === 'status') await showStatus()
  else throw new Error('Usage: mira-server-service.mjs <start|stop|status> [options]')
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
