import { createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import type { DropdownOption } from '../../components/Dropdown'
import type { ExportJob, ExportProgress, OutputSettings, VideoFile } from '../../types'
import { useSettings } from '../../stores/settings'
import { checkOverwrite, startExport as invokeStartExport } from '../../services/tauriApi'
import { subscribeToExportProgress } from '../../services/events'

export interface FileProgressEntry {
  state: string
  percent: number
}

export interface UseExportControllerDeps {
  selectedVideos: () => VideoFile[]
  selectedCount: () => number
  lutSelections: () => Record<string, DropdownOption | null>
  outputSettings: () => OutputSettings
  setOutputSettings: (settings: OutputSettings) => void
}

export interface UseExportControllerReturn {
  exporting: () => boolean
  exportProgress: () => ExportProgress | null
  fileProgress: () => Record<string, FileProgressEntry>
  showExportComplete: () => boolean
  setShowExportComplete: (show: boolean) => void
  collisionPaths: () => string[] | null
  setCollisionPaths: (paths: string[] | null) => void
  canExport: () => boolean
  hasFilenameCollision: () => boolean
  handleExport: () => void
  startExport: () => void
  handleNewBatch: () => void
  resetExport: () => void
}

export function useExportController(deps: UseExportControllerDeps): UseExportControllerReturn {
  const { settings } = useSettings()
  const [exporting, setExporting] = createSignal(false)
  const [exportProgress, setExportProgress] = createSignal<ExportProgress | null>(null)
  const [fileProgress, setFileProgress] = createSignal<
    Record<string, FileProgressEntry>
  >({})
  const [showExportComplete, setShowExportComplete] = createSignal(false)
  const [collisionPaths, setCollisionPaths] = createSignal<string[] | null>(null)

  const selectedVideos = deps.selectedVideos
  const selectedCount = deps.selectedCount

  // Listen for export progress events
  onMount(() => {
    void subscribeToExportProgress(p => {
      setExportProgress(p)

      // Map fileIndex to video path using the selected videos order
      const selected = selectedVideos()
      const videoPath = selected[p.fileIndex]?.path

      if (videoPath && p.status !== 'complete') {
        setFileProgress(prev => {
          const entry: FileProgressEntry = {
            state: p.status,
            percent: p.percent ?? 0
          }
          if (p.status === 'done') entry.percent = 100
          return { ...prev, [videoPath]: entry }
        })
      }

      if (p.status === 'complete') {
        setExporting(false)
        setShowExportComplete(true)
      }
    }).then(unlisten => {
      onCleanup(unlisten)
    })
  })

  const missingLutCameras = createMemo(() => {
    const selections = deps.lutSelections()
    const allOpt = selections['all']
    if (!settings.perCameraLut) {
      // Global mode: need 'all' LUT selected
      return allOpt ? [] : selectedVideos().map(v => ({
        key: v.cameraKey || 'unknown',
        display: v.cameraDisplay || v.cameraKey || 'Unknown'
      }))
    }
    // Per-camera mode: each unique camera needs a LUT
    const seen = new Set<string>()
    const cameras: { key: string; display: string }[] = []
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
    return cameras.filter(c => !selections[c.key])
  })

  const canExport = createMemo(
    () => selectedCount() > 0 && !exporting() && missingLutCameras().length === 0
  )

  const hasFilenameCollision = createMemo(() => {
    const pattern = deps.outputSettings().pattern
    const ext = deps.outputSettings().outputExtension
    if (!pattern.includes('{name}')) return false
    for (const v of selectedVideos()) {
      const parts = v.filename.split('.')
      parts.pop()
      const stem = parts.join('.')
      if (!stem) continue
      const resolved = pattern.replace('{name}', stem)
      const srcExt = v.filename.split('.').pop()?.toLowerCase() ?? ''
      const outExt = ext === 'same' ? srcExt : ext.toLowerCase()
      if (resolved === stem && outExt === srcExt) {
        return true
      }
    }
    return false
  })

  const buildExportJob = (): ExportJob => {
    const cameraLuts: Record<string, string> = {}
    if (settings.perCameraLut) {
      for (const [key, opt] of Object.entries(deps.lutSelections())) {
        if (opt) cameraLuts[key] = opt.value
      }
    } else {
      const allOpt = deps.lutSelections()['all']
      if (allOpt) {
        for (const v of selectedVideos()) {
          cameraLuts[v.cameraKey] = allOpt.value
        }
      }
    }

    return {
      videos: selectedVideos().map(v => ({
        path: v.path,
        cameraKey: v.cameraKey,
        duration: v.duration,
        videoCodec: v.videoCodec,
        bitRate: v.bitRate
      })),
      cameraLuts,
      outputSettings: {
        destination: deps.outputSettings().destination,
        customPath: deps.outputSettings().customPath,
        pattern: deps.outputSettings().pattern,
        videoCodec: deps.outputSettings().videoCodec,
        outputExtension: deps.outputSettings().outputExtension
      }
    }
  }

  const startExport = () => {
    if (!canExport()) return
    const job = buildExportJob()
    setExporting(true)
    setExportProgress(null)
    setFileProgress({})

    void invokeStartExport(job).catch(err => {
      console.error('Export failed:', err)
      setExporting(false)
    })
  }

  const handleExport = () => {
    if (!canExport()) return
    const job = buildExportJob()

    void checkOverwrite(job)
      .then(conflicts => {
        if (conflicts.length > 0) {
          setCollisionPaths(conflicts)
          return
        }
        startExport()
      })
      .catch(err => console.error('Export check failed:', err))
  }

  const handleNewBatch = () => {
    setShowExportComplete(false)
    resetExport()
  }

  const resetExport = () => {
    setExporting(false)
    setExportProgress(null)
    setFileProgress({})
    setShowExportComplete(false)
    setCollisionPaths(null)
  }

  return {
    exporting,
    exportProgress,
    fileProgress,
    showExportComplete,
    setShowExportComplete,
    collisionPaths,
    setCollisionPaths,
    canExport,
    hasFilenameCollision,
    handleExport,
    startExport,
    handleNewBatch,
    resetExport
  }
}
