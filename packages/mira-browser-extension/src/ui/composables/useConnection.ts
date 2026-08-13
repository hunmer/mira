import { computed, ref } from 'vue';
import { useBackground } from './useBackground';
import { useSettings } from './useSettings';
import type { Library } from 'mira-app-core/shared/sdk';
import type { ExtensionSettings, ServerConfig } from '@/shared/types';
import { newServerId } from '@/shared/storage';
import { dbg } from '@/shared/debug';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'failed';

/** 自动登录默认凭据 —— 启动页面时自动用这些登录,失败才显示登录界面 */
export const DEFAULT_SERVER_URL = 'http://localhost:8081';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'admin123';

/**
 * 心跳间隔(ms)。后台 verify 经 withAuth:token 失效会自动重登一次,
 * 因此一次探活即能覆盖「可达 + 已认证」双重判定。
 */
export const HEALTH_CHECK_INTERVAL = 30000;

const status = ref<ConnStatus>('idle');
const libraries = ref<Library[]>([]);
const bg = useBackground();
// 心跳定时器(模块级,跨 useConnection() 调用共享;popup/side panel 各自一份上下文)
let healthTimer: ReturnType<typeof setInterval> | null = null;

export function useConnection() {
  const { settings, update } = useSettings();

  const servers = computed(() => settings.value.servers);
  const activeServer = computed<ServerConfig | null>(
    () => servers.value.find(s => s.id === settings.value.activeServerId) ?? null,
  );

  /**
   * 登录到「当前激活服务器」(凭据来自 activeServer,无则用传入参数并同步到顶层)。
   * 内部只调 background 的 login:它会用 settings.serverURL 建 client。
   */
  async function login(serverURL: string, username: string, password: string) {
    status.value = 'connecting';
    try {
      // 先把待登录的地址/账号写进 settings(同步顶层兼容字段 + 若存在激活服务器也一并更新)
      const patch: Partial<ExtensionSettings> = { serverURL, username, password };
      const active = activeServer.value;
      if (active) {
        // 登录的是激活服务器:同步其凭据
        if (active.serverURL !== serverURL || active.username !== username || active.password !== password) {
          patch.servers = settings.value.servers.map(s =>
            s.id === active.id ? { ...s, serverURL, username, password } : s,
          );
        }
      }
      await bg.setSettings(patch);
      await bg.login(username, password);
      status.value = 'connected';
      await refreshLibraries();
    } catch (e: any) {
      status.value = 'failed';
      throw e;
    }
  }

  /**
   * 登录成功后,把刚刚用的地址/账号存为一条新 ServerConfig 并激活。
   * 用于 ConnectionForm 的「手动登录」路径:首次连接自动入库,后续可一键切换。
   * 已存在同 URL 的服务器则复用并激活。
   */
  async function saveAndActivateServer(input: Pick<ServerConfig, 'name' | 'serverURL' | 'username' | 'password'>): Promise<ServerConfig> {
    const existing = settings.value.servers.find(s => s.serverURL === input.serverURL);
    let server: ServerConfig;
    if (existing) {
      server = { ...existing, ...input };
      const servers = settings.value.servers.map(s => (s.id === server.id ? server : s));
      await bg.saveServers(servers);
    } else {
      server = { id: newServerId(), ...input };
      await bg.saveServers([...settings.value.servers, server]);
    }
    await bg.activateServer(server.id);
    return server;
  }

  async function refreshLibraries() {
    try {
      libraries.value = await bg.listLibraries();
    } catch {
      libraries.value = [];
    }
  }

  /**
   * 切换激活服务器:激活(清 session/token + 同步顶层字段)→ 重新登录到新服务器。
   * 失败则落回 idle(显示登录界面)。
   */
  async function switchServer(id: string): Promise<boolean> {
    const target = servers.value.find(s => s.id === id);
    if (!target) return false;
    dbg.info('conn', 'switchServer', { id, serverURL: target.serverURL });
    status.value = 'connecting';
    try {
      // activateServer 返回含新 activeServerId 的 settings,写回以同步 activeServer computed
      settings.value = await bg.activateServer(id);
      await bg.login(target.username, target.password);
      status.value = 'connected';
      await refreshLibraries();
      // 切到新服务器后,旧 libraryId 在新服务器多半不存在 → 清空以触发素材库重选
      const lid = settings.value.libraryId;
      if (lid && !libraries.value.some(l => l.id === lid)) {
        await update({ libraryId: '' });
      }
      return true;
    } catch (e: any) {
      dbg.warn('conn', 'switchServer failed', e?.message);
      status.value = 'idle';
      return false;
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
      if (r?.authenticated) {
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

  // ---- 心跳探活 ----
  // lastCheckedAt:最近一次探活完成时间(ms);0 表示尚未探活。供 UI 展示「刚刚检查」。
  const lastCheckedAt = ref(0);
  // 进行中的探活标志:避免 popup 与 side panel 同时探活或重叠定时器重复请求。
  let healthChecking = false;

  /**
   * 探活:后台 verify 经 withAuth,token 失效会自动重登一次。
   *
   * 仅在「已进入主界面」的状态下生效 —— idle(未登录)/connecting(登录中)
   * 时跳过,避免与登录流程互相干扰。结果:
   *  - 仍认证 → connected
   *  - 失败(不可达 / 重登仍失败)→ failed(不落回 idle,保留主界面 + 红点提示)
   */
  async function checkHealth(): Promise<void> {
    // idle/connecting 不探活:登录流程自己负责状态转换
    if (status.value === 'idle' || status.value === 'connecting') return;
    if (healthChecking) return;
    healthChecking = true;
    try {
      const r = await bg.verify();
      if (r?.authenticated) {
        status.value = 'connected';
      } else {
        // verify 返回 { error } 或无 authenticated → 视为不可达
        status.value = 'failed';
      }
    } catch {
      status.value = 'failed';
    } finally {
      lastCheckedAt.value = Date.now();
      healthChecking = false;
    }
  }

  /**
   * 启动定时心跳。重复调用安全:会先清掉旧定时器再建新的。
   * 返回停止函数(供 onUnmounted 清理,避免 popup 关闭后残留定时器)。
   */
  function startHealthCheck(interval = HEALTH_CHECK_INTERVAL): () => void {
    stopHealthCheck();
    healthTimer = setInterval(() => { void checkHealth(); }, interval);
    return stopHealthCheck;
  }

  function stopHealthCheck(): void {
    if (healthTimer) {
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  return {
    status,
    libraries,
    servers,
    activeServer,
    lastCheckedAt,
    login,
    saveAndActivateServer,
    switchServer,
    refreshLibraries,
    verify,
    autoLogin,
    checkHealth,
    startHealthCheck,
    stopHealthCheck,
  };
}
