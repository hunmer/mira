import { ref } from 'vue';
import { useBackground } from './useBackground';
import type { ExtensionSettings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

const settings = ref<ExtensionSettings>({ ...DEFAULT_SETTINGS });
const bg = useBackground();

export function useSettings() {
  async function load() {
    settings.value = await bg.getSettings();
  }
  async function update(partial: Partial<ExtensionSettings>) {
    settings.value = await bg.setSettings(partial);
  }
  return { settings, load, update };
}
