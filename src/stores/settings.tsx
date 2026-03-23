import { createContext, useContext, type Component, type JSX } from 'solid-js'
import { createStore, type SetStoreFunction } from 'solid-js/store'

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  perCameraLut: boolean
}

interface SettingsContextValue {
  settings: Settings
  setSettings: SetStoreFunction<Settings>
}

const defaultSettings: Settings = {
  theme: 'system',
  perCameraLut: true
}

const SettingsContext = createContext<SettingsContextValue>()

export const SettingsProvider: Component<{ children: JSX.Element }> = props => {
  const [settings, setSettings] = createStore<Settings>({ ...defaultSettings })

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
