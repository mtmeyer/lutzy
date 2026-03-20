import { open } from '@tauri-apps/plugin-dialog'
import type { Component } from 'solid-js'
import type { VideoFile } from '../types'

interface DirectoryPickerProps {
  directory: string | null
  onDirectoryChange: (path: string | null) => void
  videos: VideoFile[]
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
    <div class="flex flex-col gap-3">
      <button
        onClick={pickDirectory}
        class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
      >
        Select Directory
      </button>
      {props.directory && (
        <div class="text-sm text-gray-600 truncate" title={props.directory}>
          {props.directory}
        </div>
      )}
      {props.directory && props.videos.length > 0 && (
        <div class="text-xs text-gray-500">
          {props.videos.length} video{props.videos.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  )
}

export default DirectoryPicker
