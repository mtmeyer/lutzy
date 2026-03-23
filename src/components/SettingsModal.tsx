import { Dialog } from '@kobalte/core/dialog'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { createSignal, For, Show, type Component } from 'solid-js'
import { useSettings } from '../stores/settings'
import type { LutFile } from '../types'
import Dropdown, { type DropdownOption } from './Dropdown'
import InputField from './InputField'
import Toggle from './Toggle'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  luts: LutFile[]
  onLutsChanged: () => void
}

const themeOptions: DropdownOption[] = [
  { label: 'System (Default)', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
]

const SettingsModal: Component<SettingsModalProps> = props => {
  const { settings, setSettings } = useSettings()
  const [editingId, setEditingId] = createSignal<number | null>(null)
  const [editLabel, setEditLabel] = createSignal('')
  const [saving, setSaving] = createSignal(false)
  const [deletingId, setDeletingId] = createSignal<number | null>(null)
  const [adding, setAdding] = createSignal(false)

  const currentTheme = () =>
    themeOptions.find(o => o.value === settings.theme) ?? themeOptions[0]

  const startEdit = (lut: LutFile) => {
    setEditingId(lut.id)
    setEditLabel(lut.label)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
  }

  const saveEdit = async () => {
    const id = editingId()
    if (id === null) return
    setSaving(true)
    try {
      await invoke('rename_lut', { id, label: editLabel() })
      props.onLutsChanged()
      cancelEdit()
    } catch (err) {
      console.error('Failed to rename LUT:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (lut: LutFile) => {
    if (!window.confirm(`Delete "${lut.label}"?`)) return
    setDeletingId(lut.id)
    try {
      await invoke('delete_lut', { id: lut.id })
      props.onLutsChanged()
    } catch (err) {
      console.error('Failed to delete LUT:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddLuts = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'LUT Files', extensions: ['cube', '3dl'] }]
    })

    if (!selected || (Array.isArray(selected) && selected.length === 0)) return

    const paths = Array.isArray(selected) ? selected : [selected]
    setAdding(true)

    try {
      await invoke('add_luts', { filePaths: paths })
      props.onLutsChanged()
    } catch (err) {
      console.error('Failed to add LUTs:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="mx-4 flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl">
            <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
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
            <div class="flex-1 overflow-y-auto p-6">
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

              <div class="mt-6">
                <div class="mb-3 flex items-center justify-between">
                  <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    LUTs
                  </div>
                  <button
                    onClick={() => void handleAddLuts()}
                    disabled={adding()}
                    class="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
                  >
                    {adding() ? 'Adding…' : 'Add LUT'}
                  </button>
                </div>
                <Show
                  when={props.luts.length > 0}
                  fallback={
                    <p class="text-center text-sm text-gray-400 py-6">
                      No LUTs added yet
                    </p>
                  }
                >
                  <div class="rounded-lg border border-gray-200 bg-white">
                    <div class="divide-y divide-gray-100">
                      <For each={props.luts}>
                        {lut => (
                          <div class="flex items-center gap-2 px-3 py-2.5">
                            <Show
                              when={editingId() === lut.id}
                              fallback={
                                <>
                                  <span class="flex-1 min-w-0 truncate text-sm text-gray-800">
                                    {lut.label}
                                  </span>
                                  <button
                                    onClick={() => startEdit(lut)}
                                    class="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Rename"
                                  >
                                    <svg
                                      class="size-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      stroke-width="2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                    >
                                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                      <path d="m15 5 4 4" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => void handleDelete(lut)}
                                    disabled={deletingId() === lut.id}
                                    class="shrink-0 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                    aria-label="Delete"
                                  >
                                    <svg
                                      class="size-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      stroke-width="2"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
                                  </button>
                                </>
                              }
                            >
                              <div class="flex flex-1 items-center gap-2">
                                <div class="flex-1 min-w-0">
                                  <InputField
                                    value={editLabel()}
                                    onChange={setEditLabel}
                                  />
                                </div>
                                <button
                                  onClick={() => void saveEdit()}
                                  disabled={saving() || !editLabel().trim()}
                                  class="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  {saving() ? '…' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving()}
                                  class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export default SettingsModal
