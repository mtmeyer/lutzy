import { AiOutlineCheckCircle, AiOutlineCloseCircle } from 'solid-icons/ai'
import { createEffect, For, Show, type Component } from 'solid-js'
import type { VideoFile } from '../types'
import { formatFramerate, formatResolution, formatSize } from '../utils'

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
        <div class="flex items-center justify-center py-12 text-text-3 text-sm">
          Scanning...
        </div>
      </Show>
      <Show when={!props.loading && props.videos.length === 0}>
        <div class="flex items-center justify-center py-12 text-text-3 text-sm">
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
                class="flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-2 border-b border-border last:border-b-0 transition-colors"
              >
                <div class="mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center">
                  <Show
                    when={p()}
                    fallback={
                      <input
                        type="checkbox"
                        checked={video.selected}
                        onChange={() => props.onToggleSelect(video.path)}
                        class="rounded border-border-strong pointer-events-none"
                      />
                    }
                  >
                    <StatusIcon state={p().state} />
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-heading truncate">
                    {video.filename}
                  </div>
                  <div class="mt-0.5 text-xs text-text-2">
                    {formatResolution(video.resolution)} ·{' '}
                    {video.framerate
                      ? `${formatFramerate(video.framerate)}fps`
                      : '\u2014'}{' '}
                    · {formatSize(video.fileSize)}{' '}
                    <CameraBadge display={video.cameraDisplay} key={video.cameraKey} />
                  </div>
                  <Show when={p()?.state === 'processing' ? p() : null}>
                    {pp => (
                      <div class="mt-1.5 h-1 w-full rounded-full bg-border">
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
        <AiOutlineCheckCircle class="text-green-500" />
      </Show>
      <Show when={props.state === 'error' || props.state.startsWith('error:')}>
        <AiOutlineCloseCircle class="text-red-500" />
      </Show>
    </>
  )
}

function CameraBadge(props: { display: string; key: string }) {
  const label = props.display || props.key
  if (!label) {
    return <span class="text-text-3">[?]</span>
  }
  return (
    <span class="rounded bg-surface-3 px-1 py-0.5 text-[10px] font-medium text-body">
      {label}
    </span>
  )
}

export default VideoList
