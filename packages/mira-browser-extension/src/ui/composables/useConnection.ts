import { ref } from 'vue';
import { useBackground } from './useBackground';
import type { Library } from 'mira-app-core/shared/sdk';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'failed';

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
  async function verify() {
    try {
      const r = await bg.verify();
      status.value = r.authenticated ? 'connected' : 'idle';
      if (status.value === 'connected') await refreshLibraries();
    } catch {
      status.value = 'idle';
    }
  }
  return { status, libraries, login, refreshLibraries, verify };
}
