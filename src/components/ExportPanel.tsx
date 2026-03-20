import type { Component } from 'solid-js'
import type { VideoFile } from '../types'

interface ExportPanelProps {
  videos: VideoFile[]
}

const ExportPanel: Component<ExportPanelProps> = props => {
  if (props.videos.length === 0) {
    return (
      <div class="flex items-center justify-center h-full text-gray-400 text-sm">
        No files selected
      </div>
    )
  }

  return (
    <div class="flex flex-col gap-4 p-4">
      <div class="text-sm font-medium text-gray-700">LUT Assignment</div>
      <div class="text-xs text-gray-400">Coming soon — LUT selector per camera group</div>
    </div>
  )
}

export default ExportPanel
