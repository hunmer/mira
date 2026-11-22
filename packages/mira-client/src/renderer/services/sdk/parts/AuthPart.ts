import type { LoginCredentials, UserInfo, BaseResponse } from '../../../../shared/types'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'
import { TypeAdapter } from '../support'

/**
 * 认证模块 partial —— 镜像 core SDK AuthModule
 */
export class MiraSDKAuthPart extends MiraSDKServiceBase {
  /**
   * 认证相关
   */
  async login(credentials: LoginCredentials): Promise<{user: UserInfo, token: string}> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const loginResult = await this.client.auth().login(credentials.username, credentials.password)

      // 获取用户信息
      const verifyResult = await this.client.auth().verify()
      const userInfo = TypeAdapter.convertUserInfo(verifyResult.user)

      return {
        user: userInfo,
        token: loginResult.accessToken
      }
    } catch (error) {
      console.error('MiraSDKService: Login failed', error)
      throw error
    }
  }

  async register(userData: {
    username: string;
    password: string;
    email?: string;
    realName?: string
  }): Promise<UserInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.auth().register(userData.username, userData.password)

      // 转换为我们的 UserInfo 类型
      const userInfo: UserInfo = {
        id: result.data?.id?.toString() || `user_${Date.now()}`,
        username: userData.username,
        email: userData.email,
        realName: userData.realName,
        role: 'user'
      }

      return userInfo
    } catch (error) {
      console.error('MiraSDKService: Registration failed', error)
      throw error
    }
  }

  async logout(): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.auth().logout()
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: Logout failed', error)
      throw error
    }
  }
}
