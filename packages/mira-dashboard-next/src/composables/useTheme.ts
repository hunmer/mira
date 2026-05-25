import { ref, watch } from 'vue'
import { usePreferredDark, useStorage } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'system'

const prefersDark = usePreferredDark()
const stored = useStorage<ThemeMode>('theme', 'system')

function applyTheme(mode: ThemeMode) {
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark.value)
  document.documentElement.classList.toggle('dark', isDark)
}

export function useTheme() {
  const mode = ref<ThemeMode>(stored.value)

  watch(mode, (val) => {
    stored.value = val
    applyTheme(val)
  }, { immediate: true })

  watch(prefersDark, () => {
    if (mode.value === 'system') applyTheme('system')
  })

  return { mode }
}
