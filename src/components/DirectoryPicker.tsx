import { open } from '@tauri-apps/plugin-dialog'
import type { Component } from 'solid-js'
import { folderName } from '../utils'

interface DirectoryPickerProps {
  directory: string | null
  onDirectoryChange: (path: string) => void
  onBack: () => void
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
      <button
        onClick={props.onBack}
        class="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        title="Back to folder selection"
      >
        ←
      </button>
      <button
        onClick={pickDirectory}
        class="flex-1 min-w-0 truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 text-left hover:border-gray-300 transition-colors cursor-pointer"
        title={props.directory || 'No directory selected'}
      >
        {props.directory ? folderName(props.directory) : 'No directory selected'}
      </button>
    </div>
  )
}

export default DirectoryPicker
