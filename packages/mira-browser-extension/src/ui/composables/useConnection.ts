import { ref } from 'vue';
import { useBackground } from './useBackground';
import type { Library } from 'mira-app-core/shared/sdk';
import { dbg } from '@/shared/debug';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'failed';

/** 自动登录默认凭据 —— 启动页面时自动用这些登录,失败才显示登录界面 */
export const DEFAULT_SERVER_URL = 'http://localhost:8081';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'admin123';

const status = ref<ConnStatus>('idle');
const libraries = ref<Library[]>([]);
const bg = useBackground();

export function useConnection() {
  async function login(serverURL: string, username: string, password: string) {
    status.value = 'connecting';
    try {
      // 先保存 serverURL
      await bg.setSettings({ serverURL, username, password });
      await bg.login(username, password);
      status.value = 'connected';
      await refreshLibraries();
    } catch (e: any) {
      status.value = 'failed';
      throw e;
    }
  }
  async function refreshLibraries() {
    try {
      libraries.value = await bg.listLibraries();
    } catch {
      libraries.value = [];
    }
  }

  /**
   * 自动登录:用保存的凭据(无则用默认 admin/admin123)尝试登录。
   * serverURL 用 settings 里保存的,无则默认。
   * 返回是否成功。
   */
  async function autoLogin(saved: {
    serverURL?: string;
    username?: string;
    password?: string;
  }): Promise<boolean> {
    const serverURL = saved.serverURL || DEFAULT_SERVER_URL;
    const username = saved.username || DEFAULT_USERNAME;
    const password = saved.password || DEFAULT_PASSWORD;
    dbg.info('conn', 'autoLogin', { serverURL, username });
    try {
      await login(serverURL, username, password);
      return true;
    } catch (e: any) {
      dbg.warn('conn', 'autoLogin failed', e?.message);
      return false;
    }
  }

  /**
   * 校验当前 token:已认证则保持;未认证则尝试自动登录;
   * 两者都失败才落回 idle(显示登录界面)。
   */
  async function verify(saved?: { serverURL?: string; username?: string; password?: string }) {
    try {
      const r = await bg.verify();
      if (r.authenticated) {
        status.value = 'connected';
        await refreshLibraries();
        return;
      }
    } catch {
      // verify 抛错(无 token / 网络问题)→ 走自动登录
    }
    // 未认证 → 自动登录(默认 admin/admin123 或保存的凭据)
    const ok = await autoLogin(saved ?? {});
    if (!ok) status.value = 'idle';
  }
  return { status, libraries, login, refreshLibraries, verify, autoLogin };
}
