import type { UserInfo } from '../../../../shared/types'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'
import { TypeAdapter } from '../support'

/**
 * 用户模块 partial —— 镜像 core SDK UserModule
 */
export class MiraSDKUserPart extends MiraSDKServiceBase {
  /**
   * 读取当前登录用户的用户文件（服务器 /user_data/{user_id}/ 下的文本文件，按用户隔离）
   * @param relPath 相对路径，如 'dashboard/layouts.json'
   * @returns 文件内容，文件不存在返回 null
   */
  async readUserFile(relPath: string): Promise<string | null> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.user().readFile(relPath)
  }

  /**
   * 写入当前登录用户的用户文件（父目录不存在时自动创建）
   */
  async writeUserFile(relPath: string, content: string): Promise<void> {
    if (!this.client) throw new Error('Not connected to Mira server')
    await this.client.user().writeFile(relPath, content)
  }

  async getCurrentUser(): Promise<UserInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.user().getInfo()
      return TypeAdapter.convertUserInfo(result)
    } catch (error) {
      console.error('MiraSDKService: Failed to get current user', error)
      throw error
    }
  }
}
