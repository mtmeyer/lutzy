import type { Settings } from '../stores/settings'

export const defaultSettings: Settings = {
  theme: 'system',
  perCameraLut: true
}

export function resolveDarkMode(
  theme: Settings['theme'],
  systemPrefersDark: boolean
): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

export function parseSettings(saved: Record<string, string>): Settings {
  const result = { ...defaultSettings }

  if (saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'system') {
    result.theme = saved.theme
  }

  if (saved.perCameraLut !== undefined) {
    result.perCameraLut = saved.perCameraLut === 'true'
  }

  return result
}
