import { For, type Component } from 'solid-js'
import type { VideoFile } from '../types'

interface VideoListProps {
  videos: VideoFile[]
  loading: boolean
}

const VideoList: Component<VideoListProps> = props => {
  if (props.loading) {
    return (
      <div class="flex items-center justify-center h-full text-gray-400 text-sm">
        Scanning...
      </div>
    )
  }

  if (props.videos.length === 0) {
    return (
      <div class="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a directory to begin
      </div>
    )
  }

  return (
    <div class="flex flex-col gap-1 overflow-y-auto">
      <For each={props.videos}>
        {video => (
          <div class="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="truncate text-sm font-medium text-gray-900">
                {video.filename}
              </div>
              <div class="text-xs text-gray-500">{formatSize(video.fileSize)}</div>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default VideoList
