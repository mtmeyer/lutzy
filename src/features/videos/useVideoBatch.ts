import { createMemo, createSignal } from 'solid-js'
import type { VideoFile } from '../../types'
import { scanDirectory } from '../../services/tauriApi'

export interface CameraInfo {
  key: string
  display: string
}

export interface UseVideoBatchReturn {
  directory: () => string | null
  setDirectory: (path: string | null) => void
  videos: () => VideoFile[]
  setVideos: (videos: VideoFile[]) => void
  loading: () => boolean
  setLoading: (loading: boolean) => void
  selectedVideos: () => VideoFile[]
  selectedCount: () => number
  totalCount: () => number
  uniqueCameras: () => CameraInfo[]
  handleDirectoryChange: (path: string | null) => void
  clearAndGoBack: () => void
  toggleSelect: (path: string) => void
  toggleSelectAll: () => void
  resetVideoBatch: () => void
}

export function useVideoBatch(): UseVideoBatchReturn {
  const [directory, setDirectory] = createSignal<string | null>(null)
  const [videos, setVideos] = createSignal<VideoFile[]>([])
  const [loading, setLoading] = createSignal(false)

  const selectedVideos = createMemo(() => videos().filter(v => v.selected))
  const selectedCount = createMemo(() => selectedVideos().length)
  const totalCount = createMemo(() => videos().length)

  const uniqueCameras = createMemo(() => {
    const seen = new Set<string>()
    const cameras: CameraInfo[] = []
    for (const v of selectedVideos()) {
      const key = v.cameraKey || 'unknown'
      if (!seen.has(key)) {
        seen.add(key)
        cameras.push({
          key,
          display: v.cameraDisplay || v.cameraKey || 'Unknown'
        })
      }
    }
    return cameras
  })

  const handleDirectoryChange = (path: string | null) => {
    setDirectory(path)
    if (!path) {
      setVideos([])
      return
    }
    setLoading(true)
    scanDirectory(path)
      .then(result => setVideos(result.map(v => ({ ...v, selected: true }))))
      .catch(err => {
        console.error('Scan failed:', err)
        setVideos([])
      })
      .finally(() => setLoading(false))
  }

  const clearAndGoBack = () => {
    setDirectory(null)
    setVideos([])
  }

  const toggleSelect = (path: string) => {
    setVideos(prev =>
      prev.map(v => (v.path === path ? { ...v, selected: !v.selected } : v))
    )
  }

  const toggleSelectAll = () => {
    const allSelected = videos().every(v => v.selected)
    setVideos(prev => prev.map(v => ({ ...v, selected: !allSelected })))
  }

  const resetVideoBatch = () => {
    setDirectory(null)
    setVideos([])
  }

  return {
    directory,
    setDirectory,
    videos,
    setVideos,
    loading,
    setLoading,
    selectedVideos,
    selectedCount,
    totalCount,
    uniqueCameras,
    handleDirectoryChange,
    clearAndGoBack,
    toggleSelect,
    toggleSelectAll,
    resetVideoBatch
  }
}