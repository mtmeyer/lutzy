import { For, Show, type Component } from 'solid-js'
import type { OutputSettings } from '../types'

interface LutAssignmentProps {
  cameras: { key: string; display: string }[]
  outputSettings: OutputSettings
  onOutputChange: (settings: OutputSettings) => void
}

const LutAssignment: Component<LutAssignmentProps> = props => {
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
                      <select
                        class="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 appearance-none"
                        disabled
                      >
                        <option>Select a LUT…</option>
                      </select>
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
                <input
                  type="text"
                  value={props.outputSettings.suffix}
                  onInput={e =>
                    props.onOutputChange({
                      ...props.outputSettings,
                      suffix: e.currentTarget.value
                    })
                  }
                  class="w-32 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-right text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div class="flex items-center justify-between px-3 py-2.5">
                <span class="text-sm text-gray-500">Overwrite</span>
                <label class="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={props.outputSettings.overwrite}
                    onChange={e =>
                      props.onOutputChange({
                        ...props.outputSettings,
                        overwrite: e.currentTarget.checked
                      })
                    }
                    class="peer sr-only"
                  />
                  <div class="h-5 w-9 rounded-full bg-gray-200 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-4" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default LutAssignment
