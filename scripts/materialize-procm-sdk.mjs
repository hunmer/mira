#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const source = path.resolve('../procm-mcp/packages/procm-sdk')
if (!existsSync(path.join(source, 'dist', 'index.js'))) {
  throw new Error(`Built procm-mcp SDK not found: ${source}`)
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
for (const packageRoot of ['packages/mira-client', 'packages/mira-app-server']) {
  const target = path.resolve(packageRoot, 'node_modules/@hunmer/procm-mcp-sdk')
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(path.join(source, 'package.json'), path.join(target, 'package.json'))
  cpSync(path.join(source, 'dist'), path.join(target, 'dist'), { recursive: true })
  execFileSync(npm, ['install', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: target,
    stdio: 'inherit',
  })
}

console.log('Materialized procm-mcp SDK in client and server node_modules')
