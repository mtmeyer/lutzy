import { open } from '@tauri-apps/plugin-dialog'
import { createMemo, createSignal, For, Show, type Component } from 'solid-js'
import type { LutFile, OutputSettings } from '../types'
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
    <div class="flex flex-col gap-6">
      <Show when={props.cameras.length === 0}>
        <div class="flex items-center justify-center py-12 text-text-3 text-sm">
          No files selected
        </div>
      </Show>

      <Show when={props.cameras.length > 0}>
        <div>
          <div class="mb-3 flex items-center justify-between">
            <div class="text-xs font-semibold uppercase tracking-wider text-text-2">
              LUT Assignment
            </div>
            <button
              onClick={() => void handleAddLuts()}
              disabled={adding()}
              class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-body transition-colors hover:bg-surface-2 hover:text-heading disabled:opacity-50"
            >
              {adding() ? 'Adding…' : 'Add LUT'}
            </button>
          </div>
          <div class="flex flex-col gap-3">
            <Show when={props.perCameraLut}>
              <For each={props.cameras}>
                {camera => (
                  <div class="rounded-lg border border-border bg-surface">
                    <div class="border-b border-border px-3 py-2 text-sm font-medium text-heading">
                      {camera.display}
                    </div>
                    <div class="p-3">
                      <div class="flex items-center gap-2">
                        <Dropdown
                          options={dropdownOptions()}
                          value={props.selections[camera.key] ?? null}
                          onChange={option => props.onSelectionChange(camera.key, option)}
                          placeholder="Select a LUT…"
                          disabled={dropdownOptions().length === 0}
                        />
                      </div>
                      <div class="mt-2 text-xs text-text-3">last used</div>
                    </div>
                  </div>
                )}
              </For>
            </Show>
            <Show when={!props.perCameraLut}>
              <div class="rounded-lg border border-border bg-surface">
                <div class="border-b border-border px-3 py-2 text-sm font-medium text-heading">
                  Apply to all videos
                </div>
                <div class="p-3">
                  <Dropdown
                    options={dropdownOptions()}
                    value={props.selections['all'] ?? null}
                    onChange={option => props.onSelectionChange('all', option)}
                    placeholder="Select a LUT…"
                    disabled={dropdownOptions().length === 0}
                  />
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.cameras.length > 0}>
        <div>
          <div class="mb-3 text-xs font-semibold uppercase tracking-wider text-text-2">
            Output
          </div>
          <div class="rounded-lg border border-border bg-surface">
            <div class="divide-y divide-border">
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-text-2">Destination</span>
                <div class="w-40">
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
                </div>
              </div>
              <Show when={props.outputSettings.destination === 'custom'}>
                <div class="flex items-center justify-between px-3 py-2.5">
                  <span class="text-sm text-text-2">Folder</span>
                  <div class="flex items-center gap-2">
                    <span
                      class="max-w-[140px] truncate text-sm text-heading"
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
                      class="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-body transition-colors hover:bg-surface-2 hover:text-heading"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </Show>
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-text-2">Filename</span>
                <InputField
                  value={props.outputSettings.pattern}
                  onChange={value =>
                    props.onOutputChange({
                      ...props.outputSettings,
                      pattern: value
                    })
                  }
                  class="w-40 text-right"
                  error={
                    props.hasFilenameCollision
                      ? 'Will overwrite source files'
                      : undefined
                  }
                />
              </div>
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-text-2">Codec</span>
                <div class="w-40">
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
                      const codec = option?.value ?? 'same'
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
              </div>
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-text-2">Format</span>
                <div class="w-40">
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
                        outputExtension: option?.value ?? 'same'
                      })
                    }
                    disabled={props.outputSettings.videoCodec === 'same'}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default LutAssignment
