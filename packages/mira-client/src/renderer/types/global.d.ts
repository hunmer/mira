// Global type declarations for Electron API

declare global {
  interface Window {
    electronAPI: import('../shared/types').ElectronAPI
  }

  var process: NodeJS.Process

  // vite 通过 define 注入，取自 package.json 的版本号
  const __APP_VERSION__: string
}

export {}
