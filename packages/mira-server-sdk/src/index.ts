/**
 * Mira App Server TypeScript SDK
 * 
 * 提供链式调用的 TypeScript SDK，用于与 Mira App Server API 交互
 * 
 * @example
 * ```typescript
 * import { MiraClient } from './sdk';
 * 
 * const client = new MiraClient('http://localhost:8081');
 * 
 * // 链式调用示例
 * const result = await client
 *   .auth()
 *   .login('username', 'password')
 *   .then(() => client.libraries().getAll())
 *   .then(libraries => console.log(libraries));
 * ```
 */

export { MiraClient } from './client/MiraClient';
export { WebSocketClient } from './client/WebSocketClient';
export { AuthModule } from './modules/AuthModule';
export { UserModule } from './modules/UserModule';
export { LibraryModule } from './modules/LibraryModule';
export { PluginModule } from './modules/PluginModule';
export { FileModule } from './modules/FileModule';
export { DatabaseModule } from './modules/DatabaseModule';
export { DeviceModule } from './modules/DeviceModule';
export { SystemModule } from './modules/SystemModule';
export { TagModule } from './modules/TagModule';
export { FolderModule } from './modules/FolderModule';

// 导出类型定义
export * from './types';
export type { WebSocketOptions, WebSocketMessage, WebSocketEventCallback } from './types';
