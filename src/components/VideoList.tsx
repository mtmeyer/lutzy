import { AiOutlineCheckCircle, AiOutlineCloseCircle } from 'solid-icons/ai'
import { For, Show, type Component } from 'solid-js'
import type { ExportStatus, VideoFile } from '../types'
import { formatFramerate, formatResolution, formatSize } from '../utils'

interface FileProgressState {
  state: ExportStatus
  percent: number
}

interface VideoListProps {
  videos: VideoFile[]
  loading: boolean
  onToggleSelect: (path: string) => void
  fileProgress?: Record<string, FileProgressState>
}

const VideoList: Component<VideoListProps> = props => {
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
                class="flex items-start gap-3 px-4 py-2.5 text-left hover:bg-surface-hover rounded-none transition-colors"
              >
                <div class="mt-1 shrink-0 w-4 h-4 flex items-center justify-center">
                  <Show
                    when={p()}
                    fallback={
                      <input
                        type="checkbox"
                        checked={video.selected}
                        onChange={() => props.onToggleSelect(video.path)}
                        class="pointer-events-none"
                      />
                    }
                  >
                    <StatusIcon state={p().state} />
                  </Show>
                </div>
                <div class="shrink-0 w-12 h-8 rounded-md bg-surface-3 flex items-center justify-center mt-0.5">
                  <svg class="size-4 text-text-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-heading truncate">
                    {video.filename}
                  </div>
                  <div class="mt-0.5 flex items-center gap-1.5 text-xs text-text-2">
                    <span>{formatResolution(video.resolution)}</span>
                    <span class="text-text-3">·</span>
                    <span>
                      {video.framerate
                        ? `${formatFramerate(video.framerate)}fps`
                        : '\u2014'}
                    </span>
                    <span class="text-text-3">·</span>
                    <span>{formatSize(video.fileSize)}</span>
                    <CameraBadge display={video.cameraDisplay} key={video.cameraKey} />
                  </div>
                  <Show when={p()?.state === 'processing' ? p() : null}>
                    {pp => (
                      <div class="mt-1.5 h-1 w-full rounded-full bg-surface-3">
                        <div
                          class="h-full rounded-full bg-accent transition-all duration-300"
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
        <AiOutlineCheckCircle class="text-success" />
      </Show>
      <Show when={props.state === 'error' || props.state.startsWith('error:')}>
        <AiOutlineCloseCircle class="text-error" />
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
    <span class="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
      {label}
    </span>
  )
}

export default VideoList
