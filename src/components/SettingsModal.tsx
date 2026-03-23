import { Dialog } from '@kobalte/core/dialog'
import { type Component } from 'solid-js'
import { useSettings } from '../stores/settings'
import Dropdown, { type DropdownOption } from './Dropdown'
import Toggle from './Toggle'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const themeOptions: DropdownOption[] = [
  { label: 'System (Default)', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
]

const SettingsModal: Component<SettingsModalProps> = props => {
  const { settings, setSettings } = useSettings()

  const currentTheme = () =>
    themeOptions.find(o => o.value === settings.theme) ?? themeOptions[0]

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="mx-4 w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title class="text-lg font-semibold text-gray-900">
                Settings
              </Dialog.Title>
              <Dialog.CloseButton class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Dialog.CloseButton>
            </div>
            <div class="p-6">
              <div class="rounded-lg border border-gray-200 bg-white">
                <div class="divide-y divide-gray-100">
                  <div class="flex items-center justify-between px-3 py-2.5">
                    <span class="text-sm text-gray-500">Theme</span>
                    <div class="w-40">
                      <Dropdown
                        options={themeOptions}
                        value={currentTheme()}
                        onChange={option => {
                          if (option)
                            setSettings(
                              'theme',
                              option.value as 'system' | 'light' | 'dark'
                            )
                        }}
                      />
                    </div>
                  </div>
                  <div class="flex items-center justify-between px-3 py-2.5">
                    <span class="text-sm text-gray-500">Per-camera LUT assignment</span>
                    <Toggle
                      checked={settings.perCameraLut}
                      onChange={pressed => setSettings('perCameraLut', pressed)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export default SettingsModal
