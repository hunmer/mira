// Global type declarations for Electron API

declare global {
  interface Window {
    electronAPI: import('../shared/types').ElectronAPI
  }

  var process: NodeJS.Process
}

export {}
