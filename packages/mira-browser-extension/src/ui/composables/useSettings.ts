import { ref } from 'vue';
import { useBackground } from './useBackground';
import type { ExtensionSettings, ServerConfig } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

const settings = ref<ExtensionSettings>({ ...DEFAULT_SETTINGS });
const bg = useBackground();

export function useSettings() {
  async function load() {
    settings.value = await bg.getSettings();
  }

  /**
   * 统一写回入口:执行任意返回最新 settings 的 background 写操作,
   * 并把结果同步到响应式 settings,杜绝「background 改了、UI 没回写」的遗漏。
   * 所有改动 settings 的 bg 调用(setSettings / saveServers / activateServer)
   * 都必须经此(或下面派生的 update/saveServers/activateServer)走。
   */
  async function commit(p: Promise<ExtensionSettings>): Promise<ExtensionSettings> {
    settings.value = await p;
    return settings.value;
  }

  async function update(partial: Partial<ExtensionSettings>) {
    return commit(bg.setSettings(partial));
  }

  async function saveServers(servers: ServerConfig[]) {
    return commit(bg.saveServers(servers));
  }

  async function activateServer(id: string) {
    return commit(bg.activateServer(id));
  }

  return { settings, load, update, saveServers, activateServer, commit };
}
