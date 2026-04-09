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
        class="shrink-0 rounded-lg bg-surface-hover px-2.5 py-2 text-xs text-text-2 hover:bg-surface-3 hover:text-body"
        title="Back to folder selection"
      >
        ←
      </button>
      <button
        onClick={pickDirectory}
        class="flex-1 min-w-0 truncate rounded-lg bg-surface-hover px-3 py-2 text-sm text-body text-left hover:bg-surface-3"
        title={props.directory || 'No directory selected'}
      >
        {props.directory ? folderName(props.directory) : 'No directory selected'}
      </button>
    </div>
  )
}

export default DirectoryPicker
