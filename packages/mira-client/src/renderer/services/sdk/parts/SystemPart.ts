import type { SystemInfo, SystemHealth } from '../../../../shared/types'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'
import { TypeAdapter } from '../support'

/**
 * 系统模块 partial —— 镜像 core SDK SystemModule
 */
export class MiraSDKSystemPart extends MiraSDKServiceBase {
  /**
   * 系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.system().getSystemInfo()
      return TypeAdapter.convertSystemInfo(result)
    } catch (error) {
      console.error('MiraSDKService: Failed to get system info', error)
      throw error
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const health = await this.client.system().getHealth()
      return {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        isDocker: !!(health as any).isDocker,
      }
    } catch (error) {
      console.error('MiraSDKService: Failed to get system health', error)
      return {
        status: 'error' as const,
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}
