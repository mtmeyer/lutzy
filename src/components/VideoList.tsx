import { createEffect, For, Show, type Component } from 'solid-js'
import type { VideoFile } from '../types'

interface VideoListProps {
  videos: VideoFile[]
  loading: boolean
}

const VideoList: Component<VideoListProps> = props => {

  return (
    <div class="flex flex-col gap-1 h-full overflow-y-auto">
      <Show when={props.loading}>
        <div class="flex items-center justify-center h-full text-gray-400 text-sm">
          Scanning...
        </div>
      </Show>
      <Show when={props.videos.length === 0}>
        <div class="flex items-center justify-center h-full text-gray-400 text-sm">
          Select a directory to begin
        </div>
      </Show>
      <Show when={!props.loading && props.videos.length > 0}>
        <For each={props.videos}>
          {video => (
            <div class="rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">
                  {video.filename}
                </div>
                <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {video.cameraKey || 'Unknown'}
                </span>
              </div>
              <div class="mt-1 text-xs text-gray-500">
                {video.resolution || '\u2014'} ·{' '}
                {video.framerate ? `${video.framerate}fps` : '\u2014'} ·{' '}
                {video.duration ? formatDuration(video.duration) : '\u2014'} ·{' '}
                {formatSize(video.fileSize)}
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default VideoList
