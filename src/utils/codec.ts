export const CODEC_EXT_OPTIONS: Record<string, { options: { label: string; value: string }[]; default: string }> = {
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
  }
}

const SAME_SOURCE_EXT: { label: string; value: string }[] = [
  { label: 'same as source', value: 'same' }
]

export function getExtForCodec(codec: string) {
  return CODEC_EXT_OPTIONS[codec] ?? { options: SAME_SOURCE_EXT, default: 'same' }
}

