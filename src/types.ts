export interface VideoFile {
  filename: string
  path: string
  fileSize: number
  resolution: string
  framerate: number
  duration: number
  cameraKey: string
  cameraDisplay: string
  selected: boolean
}

export interface OutputSettings {
  destination: 'same' | 'custom'
  customPath: string
  suffix: string
  overwrite: boolean
}

export interface LutFile {
  id: number
  filename: string
  label: string
  storedPath: string
  addedAt: string
}
