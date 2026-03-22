import { createEffect, For, Show, type Component } from 'solid-js'
import type { VideoFile } from '../types'
import { AiOutlineCloseCircle, AiOutlineCheckCircle } from 'solid-icons/ai'

interface FileProgressState {
  state: string
  percent: number
}

interface VideoListProps {
  videos: VideoFile[]
  loading: boolean
  onToggleSelect: (path: string) => void
  fileProgress?: Record<string, FileProgressState>
}

const VideoList: Component<VideoListProps> = props => {
  createEffect(() => console.log(props.fileProgress))
  return (
    <div class="flex flex-col">
      <Show when={props.loading}>
        <div class="flex items-center justify-center py-12 text-gray-400 text-sm">
          Scanning...
        </div>
      </Show>
      <Show when={!props.loading && props.videos.length === 0}>
        <div class="flex items-center justify-center py-12 text-gray-400 text-sm">
          Select a directory to begin
        </div>
      </Show>
      <Show when={!props.loading && props.videos.length > 0}>
        <For each={props.videos}>
          {video => {
            const p = () => props.fileProgress?.[video.path] ?? null
            return (
              <button
                type="button"
                onClick={() => props.onToggleSelect(video.path)}
                class="flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div class="mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center">
                  <Show
                    when={p()}
                    fallback={
                      <input
                        type="checkbox"
                        checked={video.selected}
                        onChange={() => props.onToggleSelect(video.path)}
                        class="rounded border-gray-300 pointer-events-none"
                      />
                    }
                  >
                    <StatusIcon state={p().state} />
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {video.filename}
                  </div>
                  <div class="mt-0.5 text-xs text-gray-500">
                    {formatResolution(video.resolution)} ·{' '}
                    {video.framerate
                      ? `${formatFramerate(video.framerate)}fps`
                      : '\u2014'}{' '}
                    · {formatSize(video.fileSize)}{' '}
                    <CameraBadge display={video.cameraDisplay} key={video.cameraKey} />
                  </div>
                  <Show when={p()?.state === 'processing' ? p() : null}>
                    {pp => (
                      <div class="mt-1.5 h-1 w-full rounded-full bg-gray-200">
                        <div
                          class="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(pp().percent, 100)}%` }}
                        />
                      </div>
                    )}
                  </Show>
                </div>
              </button>
            )
          }}
        </For>
      </Show>
    </div>
  )
}

function StatusIcon(props: { state: string }) {
  return (
    <>
      <Show when={props.state === 'done'}>
        <AiOutlineCheckCircle color="#85d254" />
      </Show>
      <Show when={props.state === 'error' || props.state.startsWith('error:')}>
        <AiOutlineCloseCircle color="#d9534f" />
      </Show>
    </>
  )
}

function CameraBadge(props: { display: string; key: string }) {
  const label = props.display || props.key
  if (!label) {
    return <span class="text-gray-400">[?]</span>
  }
  return (
    <span class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-600">
      {label}
    </span>
  )
}

function formatResolution(res: string): string {
  if (!res) return '\u2014'
  const match = res.match(/^(\d+)x(\d+)$/)
  if (!match) return res
  const h = parseInt(match[2], 10)
  if (h >= 4320) return '8K'
  if (h >= 3160) return '6K'
  if (h >= 2160) return '4K'
  if (h >= 1440) return 'QHD'
  if (h >= 1080) return '1080p'
  if (h >= 720) return '720p'
  return res
}

function formatFramerate(fps: number): string {
  // Show clean numbers: 23.98 → 23.98, 24.0 → 24, 25.0 → 25
  if (fps % 1 === 0) return `${fps}`
  return fps.toFixed(2)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

export default VideoList
