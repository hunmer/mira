/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

/** plugin-window-preload 注入的宿主 API（本插件用到的子集） */
interface MiraPluginWindowApi {
  app: {
    version: string
    platform: string
    theme: 'DARK' | 'LIGHT'
    isDarkColors(): boolean
  }
  plugin: { manifest: { id: string; name: string }; path: string }
  shell: {
    openPath(path: string): Promise<unknown>
    showItemInFolder(path: string): Promise<unknown>
  }
  item: {
    getSelected(): Promise<any[]>
    addFromURL(url: string, options?: any): Promise<any>
  }
  exec: {
    run(name: string, args: string[], options?: { jobId?: string; cwd?: string; timeoutMs?: number }): Promise<{ success: boolean; jobId: string; command: string }>
    abort(jobId: string): Promise<{ success: boolean }>
    check(name: string): Promise<{ available: boolean; command: string; version: string | null }>
    setBinaryPath(name: string, filePath: string): Promise<{ success: boolean; path: string }>
    getBinaryPaths(): Promise<Record<string, { configured: string | null; resolved: string }>>
    onOutput(callback: (payload: { jobId: string; stream: 'stdout' | 'stderr'; data: string }) => void | true): () => void
    onExit(callback: (payload: { jobId: string; code: number; error: string | null }) => void | true): () => void
  }
  fs: {
    getPathForFile(file: File): string
    getTempDir(sub?: string): Promise<{ dir: string }>
    readDir(dirPath: string): Promise<{ entries: Array<{ name: string; isFile: boolean; isDirectory: boolean; size: number; mtimeMs: number }> }>
    readFile(filePath: string): Promise<Uint8Array>
    stat(filePath: string): Promise<{ exists: boolean; isFile?: boolean; isDirectory?: boolean; size?: number; mtimeMs?: number }>
    remove(filePath: string): Promise<{ success: boolean }>
  }
  onThemeChanged(callback: (theme: { theme: 'DARK' | 'LIGHT' }) => void): void
  onPluginBeforeExit(callback: () => void): void
}

interface Window {
  mira?: MiraPluginWindowApi
  eagle?: MiraPluginWindowApi
}
