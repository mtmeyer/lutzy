import { For, Show, type Component } from 'solid-js'
import type { VideoFile } from '../types'

interface VideoListProps {
  videos: VideoFile[]
  loading: boolean
  onToggleSelect: (path: string) => void
}

const VideoList: Component<VideoListProps> = props => {
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
          {video => (
            <button
              type="button"
              onClick={() => props.onToggleSelect(video.path)}
              class="flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <input
                type="checkbox"
                checked={video.selected}
                onChange={() => props.onToggleSelect(video.path)}
                class="mt-0.5 rounded border-gray-300 shrink-0 pointer-events-none"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  {video.filename}
                </div>
                <div class="mt-0.5 text-xs text-gray-500">
                  {formatResolution(video.resolution)} ·{' '}
                  {video.framerate ? `${formatFramerate(video.framerate)}fps` : '\u2014'}{' '}
                  · {formatSize(video.fileSize)}{' '}
                  <CameraBadge display={video.cameraDisplay} key={video.cameraKey} />
                </div>
              </div>
            </button>
          )}
        </For>
      </Show>
    </div>
  )
}

function CameraBadge(props: { display: string; key: string }) {
  const label = props.display || props.key
  if (!label) {
    return <span class="text-gray-400">[?]</span>
  }
  // Show a short abbreviation from the display name
  const short = abbreviateCamera(label)
  return (
    <span class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-600">
      [{short}]
    </span>
  )
}

function abbreviateCamera(name: string): string {
  // Pull out a short identifier: model number or acronym

  // iPhone: just show the number
  const iphoneMatch = name.match(/iPhone\s+(\S+)/i)
  if (iphoneMatch) return iphoneMatch[1]

  // Sony: FX3, FX6, A7IV etc
  const sonyMatch = name.match(/(FX\d+|A\d+\w*|ILME-FX\d+)/i)
  if (sonyMatch) {
    return sonyMatch[1].replace(/^ILME-/, '').toUpperCase()
  }

  // Canon: R5, R6, R5C etc
  const canonMatch = name.match(/EOS\s+(R\d+C?|R\d)/i)
  if (canonMatch) return canonMatch[1].toUpperCase()

  // BMPCC: 6K, 4K etc
  const bmpccMatch = name.match(/(BMPCC|Pocket)\s*(\d+K)/i)
  if (bmpccMatch) return bmpccMatch[2].toUpperCase()

  // Nikon: Z6, Z8, Z9
  const nikonMatch = name.match(/Z(\d)/i)
  if (nikonMatch) return `Z${nikonMatch[1]}`

  // Generic: first word, capped
  const parts = name.split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 6).toUpperCase()
  return parts[parts.length - 1].substring(0, 6).toUpperCase()
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
