export type VideoCodec = 'h264' | 'h265' | 'prores' | 'same'
export type OutputExtension = 'mp4' | 'mkv' | 'mov' | 'same'
export type ExportStatus = 'processing' | 'done' | 'error' | 'complete'

export interface VideoFile {
  filename: string
  path: string
  fileSize: number
  resolution: string
  framerate: number
  duration: number
  cameraKey: string
  cameraDisplay: string
  videoCodec: VideoCodec
  bitRate: number | null
  selected: boolean
}

export interface OutputSettings {
  destination: 'same' | 'custom'
  customPath: string
  pattern: string
  videoCodec: VideoCodec
  outputExtension: OutputExtension
}

export interface LutFile {
  id: number
  filename: string
  label: string
  storedPath: string
  addedAt: string
}

export interface ExportVideo {
  path: string
  cameraKey: string
  duration: number
  videoCodec: VideoCodec
  bitRate: number | null
}

export interface ExportOutputSettings {
  destination: 'same' | 'custom'
  customPath: string
  pattern: string
  videoCodec: VideoCodec
  outputExtension: OutputExtension
}

export interface ExportJob {
  videos: ExportVideo[]
  cameraLuts: Record<string, string>
  outputSettings: ExportOutputSettings
}

export interface ExportProgress {
  fileIndex: number
  totalFiles: number
  filename: string
  frame: number | null
  fps: number | null
  time: string | null
  speed: string | null
  percent: number | null
  status: ExportStatus
}
