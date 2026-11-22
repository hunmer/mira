import type { ServerWebPlugin } from 'mira-app-core/shared/sdk'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'

/**
 * 插件模块 partial —— 镜像 core SDK PluginModule
 */
export class MiraSDKPluginPart extends MiraSDKServiceBase {
  async getServerWebPlugins(libraryId: string): Promise<ServerWebPlugin[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.plugins().getWeb(libraryId)
  }
}
