/**
 * 多服务器配置 CRUD。
 *
 * servers / activeServerId 持久在 ExtensionSettings(经 useSettings 响应式),
 * 这里只封装「增删改 + 激活 + 测试连接」的便捷方法,底层走 background。
 *
 * 激活服务器会清 session/token 并同步顶层兼容字段 → 触发重新登录;
 * 因此 activate 后调用方需重新 verify(见 useConnection.switchServer)。
 */
import { computed } from 'vue';
import { useSettings } from './useSettings';
import { useBackground } from './useBackground';
import { newServerId } from '@/shared/storage';
import type { ServerConfig } from '@/shared/types';

export function useServers() {
  const { settings, update } = useSettings();
  const bg = useBackground();

  const servers = computed(() => settings.value.servers);
  const activeServer = computed(
    () => servers.value.find(s => s.id === settings.value.activeServerId) ?? null,
  );

  async function add(input: Omit<ServerConfig, 'id'>): Promise<ServerConfig> {
    const server: ServerConfig = { id: newServerId(), ...input };
    const next = [...settings.value.servers, server];
    // saveServers 返回最新 settings,写回以触发 servers computed 更新(否则列表不刷新)
    settings.value = await bg.saveServers(next);
    return server;
  }

  async function edit(id: string, patch: Partial<Omit<ServerConfig, 'id'>>): Promise<void> {
    const next = settings.value.servers.map(s => (s.id === id ? { ...s, ...patch } : s));
    settings.value = await bg.saveServers(next);
    // 若改的是激活服务器,同步顶层兼容字段,保证 ensureClient 用新地址
    if (id === settings.value.activeServerId && (patch.serverURL || patch.username || patch.password)) {
      const cur = next.find(s => s.id === id);
      if (cur) await update({ serverURL: cur.serverURL, username: cur.username, password: cur.password });
    }
  }

  async function remove(id: string): Promise<void> {
    const next = settings.value.servers.filter(s => s.id !== id);
    settings.value = await bg.saveServers(next);
    // 删的是激活服务器:自动切到第一个;无服务器则清空激活
    if (id === settings.value.activeServerId) {
      if (next.length) {
        settings.value = await bg.activateServer(next[0].id);
      } else {
        await update({ activeServerId: '', serverURL: '', username: '', password: '' });
      }
    }
  }

  async function activate(id: string): Promise<void> {
    await bg.activateServer(id);
  }

  function test(serverURL: string, username: string, password: string) {
    return bg.testServer(serverURL, username, password);
  }

  return { servers, activeServer, add, edit, remove, activate, test };
}
