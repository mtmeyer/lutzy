import { open } from '@tauri-apps/plugin-dialog'
import type { Component } from 'solid-js'

interface DirectoryPickerProps {
  directory: string | null
  onDirectoryChange: (path: string | null) => void
}

const DirectoryPicker: Component<DirectoryPickerProps> = props => {
  const pickDirectory = () => {
    void open({
      directory: true,
      multiple: false,
      title: 'Select video directory'
    }).then(selected => {
      if (selected) {
        props.onDirectoryChange(selected)
      }
    })
  }

  return (
    <div class="flex items-center gap-2">
      <div class="flex-1 min-w-0 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 truncate">
        {props.directory || 'No directory selected'}
      </div>
      <button
        onClick={pickDirectory}
        class="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        title="Browse"
      >
        ↗
      </button>
    </div>
  )
}

export default DirectoryPicker
