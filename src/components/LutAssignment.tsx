import { open } from '@tauri-apps/plugin-dialog'
import { createMemo, createSignal, For, Show, type Component } from 'solid-js'
import type { LutFile, OutputSettings, VideoCodec, OutputExtension } from '../types'
import { folderLabel, getExtForCodec } from '../utils'
import { addLuts } from '../services/tauriApi'
import Dropdown, { type DropdownOption } from './Dropdown'
import InputField from './InputField'

interface LutAssignmentProps {
  cameras: { key: string; display: string }[]
  luts: LutFile[]
  onLutsAdded: () => void
  outputSettings: OutputSettings
  onOutputChange: (settings: OutputSettings) => void
  selections: Record<string, DropdownOption | null>
  onSelectionChange: (cameraKey: string, option: DropdownOption | null) => void
  perCameraLut: boolean
  hasFilenameCollision: boolean
}

const LutAssignment: Component<LutAssignmentProps> = props => {
  const [adding, setAdding] = createSignal(false)

  const dropdownOptions = createMemo<DropdownOption[]>(() =>
    props.luts.map(l => ({ label: l.label, value: l.storedPath }))
  )

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
      props.onLutsAdded()
    } catch (err) {
      console.error('Failed to add LUTs:', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div class="flex flex-col gap-8">
      <Show when={props.cameras.length === 0}>
        <div class="flex items-center justify-center py-16 text-text-3 text-sm">
          No files selected
        </div>
      </Show>

      <Show when={props.cameras.length > 0}>
        <div>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-widest text-text-2">
              LUT Assignment
            </h2>
            <button
              onClick={() => void handleAddLuts()}
              disabled={adding()}
              class="rounded-lg px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft active:scale-[0.97] disabled:opacity-50"
            >
              {adding() ? 'Adding…' : '+ Add LUT'}
            </button>
          </div>
          <div class="flex flex-col gap-3">
            <Show when={props.perCameraLut}>
              <For each={props.cameras}>
                {camera => (
                  <div class="rounded-xl bg-surface shadow-card p-4">
                    <div class="text-sm font-semibold text-heading mb-3">
                      {camera.display}
                    </div>
                    <Dropdown
                      options={dropdownOptions()}
                      value={props.selections[camera.key] ?? null}
                      onChange={option => props.onSelectionChange(camera.key, option)}
                      placeholder="Select a LUT…"
                      disabled={dropdownOptions().length === 0}
                    />
                    <div class="mt-2 text-xs text-text-3">last used</div>
                  </div>
                )}
              </For>
            </Show>
            <Show when={!props.perCameraLut}>
              <div class="rounded-xl bg-surface shadow-card p-4">
                <div class="text-sm font-semibold text-heading mb-3">
                  Apply to all videos
                </div>
                <Dropdown
                  options={dropdownOptions()}
                  value={props.selections['all'] ?? null}
                  onChange={option => props.onSelectionChange('all', option)}
                  placeholder="Select a LUT…"
                  disabled={dropdownOptions().length === 0}
                />
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.cameras.length > 0}>
        <div>
          <h2 class="mb-4 text-xs font-bold uppercase tracking-widest text-text-2">
            Output
          </h2>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2 rounded-xl bg-surface shadow-card p-4">
              <label class="text-xs font-semibold text-text-2 mb-2 block">Destination</label>
              <Dropdown
                options={[
                  { label: 'Same as source', value: 'same' },
                  { label: 'Custom folder', value: 'custom' }
                ]}
                value={
                  props.outputSettings.destination === 'custom'
                    ? { label: 'Custom folder', value: 'custom' }
                    : { label: 'Same as source', value: 'same' }
                }
                onChange={option => {
                  const dest = option?.value ?? 'same'
                  props.onOutputChange({
                    ...props.outputSettings,
                    destination: dest as 'same' | 'custom',
                    customPath:
                      dest === 'custom' ? props.outputSettings.customPath : ''
                  })
                }}
              />
              <Show when={props.outputSettings.destination === 'custom'}>
                <div class="mt-3 flex items-center gap-2">
                  <span
                    class="flex-1 min-w-0 truncate text-sm text-heading"
                    title={props.outputSettings.customPath || 'No folder selected'}
                  >
                    {props.outputSettings.customPath
                      ? folderLabel(props.outputSettings.customPath)
                      : 'No folder selected'}
                  </span>
                  <button
                    onClick={() => {
                      void open({
                        directory: true,
                        multiple: false,
                        title: 'Select output folder'
                      }).then(selected => {
                        if (selected) {
                          props.onOutputChange({
                            ...props.outputSettings,
                            customPath: selected
                          })
                        }
                      })
                    }}
                    class="shrink-0 rounded-lg bg-surface-hover px-3 py-1.5 text-xs font-medium text-body hover:bg-surface-3"
                  >
                    Browse
                  </button>
                </div>
              </Show>
            </div>

            <div class="rounded-xl bg-surface shadow-card p-4">
              <label class="text-xs font-semibold text-text-2 mb-2 block">Filename</label>
              <InputField
                value={props.outputSettings.pattern}
                onChange={value =>
                  props.onOutputChange({
                    ...props.outputSettings,
                    pattern: value
                  })
                }
                error={
                  props.hasFilenameCollision
                    ? 'Will overwrite source files'
                    : undefined
                }
              />
            </div>

            <div class="rounded-xl bg-surface shadow-card p-4">
              <label class="text-xs font-semibold text-text-2 mb-2 block">Codec</label>
              <Dropdown
                options={[
                  { label: 'Same as source', value: 'same' },
                  { label: 'H.264', value: 'h264' },
                  { label: 'H.265', value: 'h265' },
                  { label: 'ProRes', value: 'prores' }
                ]}
                value={(() => {
                  const codec = props.outputSettings.videoCodec
                  return codec && codec !== 'same'
                    ? { label: codec.toUpperCase(), value: codec }
                    : { label: 'Same as source', value: 'same' }
                })()}
                onChange={option => {
                  const codec = (option?.value as VideoCodec) ?? 'same'
                  const extInfo = getExtForCodec(codec)
                  props.onOutputChange({
                    ...props.outputSettings,
                    videoCodec: codec,
                    outputExtension: extInfo.default
                  })
                }}
                placeholder="Same as source"
              />
            </div>

            <Show when={props.outputSettings.videoCodec !== 'same'}>
              <div class="rounded-xl bg-surface shadow-card p-4">
                <label class="text-xs font-semibold text-text-2 mb-2 block">Format</label>
                <Dropdown
                  options={getExtForCodec(props.outputSettings.videoCodec).options}
                  value={(() => {
                    const codec = props.outputSettings.videoCodec
                    const ext = props.outputSettings.outputExtension || 'same'
                    const info = getExtForCodec(codec)
                    const found = info.options.find(o => o.value === ext)
                    return found ?? info.options[0]
                  })()}
                  onChange={option =>
                    props.onOutputChange({
                      ...props.outputSettings,
                      outputExtension: (option?.value as OutputExtension) ?? 'same'
                    })
                  }
                />
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default LutAssignment
