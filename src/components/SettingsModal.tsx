import { Dialog } from '@kobalte/core/dialog'
import { open } from '@tauri-apps/plugin-dialog'
import { createSignal, For, Show, type Component } from 'solid-js'
import { useSettings } from '../stores/settings'
import type { LutFile } from '../types'
import { addLuts, deleteLut, renameLut } from '../services/tauriApi'
import ConfirmModal from './ConfirmModal'
import Dropdown, { type DropdownOption } from './Dropdown'
import InputField from './InputField'
import Modal from './Modal'
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
  const [confirmDeleteId, setConfirmDeleteId] = createSignal<LutFile | null>(null)

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
      await renameLut(id, editLabel())
      props.onLutsChanged()
      cancelEdit()
    } catch (err) {
      console.error('Failed to rename LUT:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const lut = confirmDeleteId()
    if (!lut) return
    setConfirmDeleteId(null)
    setDeletingId(lut.id)
    try {
      await deleteLut(lut.id)
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
      await addLuts(paths)
      props.onLutsChanged()
    } catch (err) {
      console.error('Failed to add LUTs:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <Modal
        open={props.open}
        onOpenChange={props.onOpenChange}
        class="max-h-[80vh] flex-col"
      >
        <div class="flex shrink-0 items-center justify-between px-6 py-5">
          <Dialog.Title class="text-lg font-bold text-heading">Settings</Dialog.Title>
          <Dialog.CloseButton class="rounded-lg p-1 text-text-3 hover:text-text-2 hover:bg-surface-hover">
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
        <div class="flex-1 overflow-y-auto px-6 pb-6">
          <div class="rounded-xl bg-surface-2 p-4 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-2">Theme</span>
              <div class="w-40">
                <Dropdown
                  options={themeOptions}
                  value={currentTheme()}
                  onChange={option => {
                    if (option)
                      setSettings('theme', option.value as 'system' | 'light' | 'dark')
                  }}
                />
              </div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-2">Per-camera LUT assignment</span>
              <Toggle
                checked={settings.perCameraLut}
                onChange={pressed => setSettings('perCameraLut', pressed)}
              />
            </div>
          </div>

          <div class="mt-8">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-widest text-text-2">
                LUTs
              </h3>
              <button
                onClick={() => void handleAddLuts()}
                disabled={adding()}
                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft active:scale-[0.97] disabled:opacity-50"
              >
                {adding() ? 'Adding…' : '+ Add LUT'}
              </button>
            </div>
            <Show
              when={props.luts.length > 0}
              fallback={
                <p class="text-center text-sm text-text-3 py-8">No LUTs added yet</p>
              }
            >
              <div class="flex flex-col gap-2">
                <For each={props.luts}>
                  {lut => (
                    <div class="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 hover:bg-surface-hover">
                      <Show
                        when={editingId() === lut.id}
                        fallback={
                          <>
                            <span class="flex-1 min-w-0 truncate text-sm font-medium text-heading">
                              {lut.label}
                            </span>
                            <button
                              onClick={() => startEdit(lut)}
                              class="shrink-0 rounded-lg p-1.5 text-text-3 hover:text-text-2 hover:bg-surface-3"
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
                              onClick={() => setConfirmDeleteId(lut)}
                              disabled={deletingId() === lut.id}
                              class="shrink-0 rounded-lg p-1.5 text-text-3 hover:text-error hover:bg-surface-3 disabled:opacity-50"
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
                            <InputField value={editLabel()} onChange={setEditLabel} />
                          </div>
                          <button
                            onClick={() => void saveEdit()}
                            disabled={saving() || !editLabel().trim()}
                            class="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                          >
                            {saving() ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving()}
                            class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-text-2 hover:text-body disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmDeleteId() !== null}
        onOpenChange={open => !open && setConfirmDeleteId(null)}
        title="Delete LUT"
        message={`Delete "${confirmDeleteId()?.label ?? ''}"? This will also remove any camera assignments for this LUT.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  )
}

export default SettingsModal
