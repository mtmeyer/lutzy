import { createSignal, For, Show, type Component } from 'solid-js'
import type { OutputSettings } from '../types'
import Dropdown, { type DropdownOption } from './Dropdown'
import InputField from './InputField'
import Toggle from './Toggle'

interface LutAssignmentProps {
  cameras: { key: string; display: string }[]
  luts: DropdownOption[]
  outputSettings: OutputSettings
  onOutputChange: (settings: OutputSettings) => void
}

const LutAssignment: Component<LutAssignmentProps> = props => {
  const [selections, setSelections] = createSignal<Record<string, DropdownOption | null>>(
    {}
  )

  const handleChange = (cameraKey: string, option: DropdownOption | null) => {
    setSelections(prev => ({ ...prev, [cameraKey]: option }))
  }

  return (
    <div class="flex flex-col gap-6">
      <Show when={props.cameras.length === 0}>
        <div class="flex items-center justify-center py-12 text-gray-400 text-sm">
          No files selected
        </div>
      </Show>

      <Show when={props.cameras.length > 0}>
        <div>
          <div class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            LUT Assignment
          </div>
          <div class="flex flex-col gap-3">
            <For each={props.cameras}>
              {camera => (
                <div class="rounded-lg border border-gray-200 bg-white">
                  <div class="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-800">
                    {camera.display}
                  </div>
                  <div class="p-3">
                    <div class="flex items-center gap-2">
                      <Dropdown
                        options={props.luts}
                        value={selections()[camera.key] ?? null}
                        onChange={option => handleChange(camera.key, option)}
                        placeholder="Select a LUT…"
                        disabled={props.luts.length === 0}
                      />
                    </div>
                    <div class="mt-2 text-xs text-gray-400">last used</div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.cameras.length > 0}>
        <div>
          <div class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Output
          </div>
          <div class="rounded-lg border border-gray-200 bg-white">
            <div class="divide-y divide-gray-100">
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-gray-500">Destination</span>
                <span class="text-sm text-gray-800">same dir</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-gray-500">Suffix</span>
                <InputField
                  value={props.outputSettings.suffix}
                  onChange={value =>
                    props.onOutputChange({
                      ...props.outputSettings,
                      suffix: value
                    })
                  }
                  class="w-32 text-right"
                />
              </div>
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-gray-500">Overwrite</span>
                <Toggle
                  checked={props.outputSettings.overwrite}
                  onChange={pressed =>
                    props.onOutputChange({
                      ...props.outputSettings,
                      overwrite: pressed
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default LutAssignment
