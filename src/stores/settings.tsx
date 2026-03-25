import { invoke } from '@tauri-apps/api/core'
import {
  createContext,
  createEffect,
  onMount,
  useContext,
  type Component,
  type JSX
} from 'solid-js'
import { createStore, type SetStoreFunction } from 'solid-js/store'
import { defaultSettings, parseSettings } from '../utils'

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  perCameraLut: boolean
}

interface SettingsContextValue {
  settings: Settings
  setSettings: SetStoreFunction<Settings>
}

const SettingsContext = createContext<SettingsContextValue>()

export const SettingsProvider: Component<{ children: JSX.Element }> = props => {
  const [settings, setSettings] = createStore<Settings>({ ...defaultSettings })

  // Hydrate from SQLite on mount
  onMount(() => {
    invoke<Record<string, string>>('get_app_settings')
      .then(saved => {
        setSettings(parseSettings(saved))
      })
      .catch(err => console.error('Failed to load settings:', err))
  })

  // Persist theme to SQLite + localStorage on change
  createEffect(() => {
    const theme = settings.theme
    localStorage.setItem('theme', theme)
    invoke('set_app_setting', { key: 'theme', value: theme }).catch(err =>
      console.error('Failed to save theme:', err)
    )
  })

  // Persist perCameraLut to SQLite on change
  createEffect(() => {
    const value = String(settings.perCameraLut)
    invoke('set_app_setting', { key: 'perCameraLut', value }).catch(err =>
      console.error('Failed to save perCameraLut:', err)
    )
  })

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {props.children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
