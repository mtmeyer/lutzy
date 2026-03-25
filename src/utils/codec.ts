import type { OutputExtension, VideoCodec } from '../types'

export const CODEC_EXT_OPTIONS: Record<
  VideoCodec,
  { options: { label: string; value: OutputExtension }[]; default: OutputExtension }
> = {
  h264: {
    options: [
      { label: 'mp4', value: 'mp4' },
      { label: 'mkv', value: 'mkv' },
      { label: 'mov', value: 'mov' }
    ],
    default: 'mp4'
  },
  h265: {
    options: [
      { label: 'mp4', value: 'mp4' },
      { label: 'mkv', value: 'mkv' },
      { label: 'mov', value: 'mov' }
    ],
    default: 'mp4'
  },
  prores: {
    options: [
      { label: 'mov', value: 'mov' },
      { label: 'mkv', value: 'mkv' }
    ],
    default: 'mov'
  },
  same: {
    options: [
      { label: 'same as source', value: 'same' }
    ],
    default: 'same'
  }
}

const SAME_SOURCE_EXT: { label: string; value: OutputExtension }[] = [
  { label: 'same as source', value: 'same' }
]

export function getExtForCodec(codec: VideoCodec) {
  return CODEC_EXT_OPTIONS[codec] ?? { options: SAME_SOURCE_EXT, default: 'same' as OutputExtension }
}

