import { MiraSDKServiceBase } from '../MiraSDKServiceBase'

/**
 * 统计模块 partial —— 镜像 core SDK StatisticsModule
 */
export class MiraSDKStatisticsPart extends MiraSDKServiceBase {
  /** 统计相关（Dashboard 统计卡片数据来源，对应服务端 /api/statistics/*） */
  get statistics() {
    if (!this.client) throw new Error('Not connected to Mira server')
    return this.client.statistics()
  }
}
