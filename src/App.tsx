import DirectoryPicker from '@components/DirectoryPicker'
import type { DropdownOption } from '@components/Dropdown'
import LutAssignment from '@components/LutAssignment'
import VideoList from '@components/VideoList'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createEffect, createMemo, createSignal, onCleanup, onMount, type Component } from 'solid-js'
import type {
  ExportJob,
  ExportProgress,
  LutFile,
  OutputSettings,
  VideoFile
} from './types'

const App: Component = () => {
  const [directory, setDirectory] = createSignal<string | null>(null)
  const [videos, setVideos] = createSignal<VideoFile[]>([])
  const [loading, setLoading] = createSignal(false)
  const [outputSettings, setOutputSettings] = createSignal<OutputSettings>({
    destination: 'same',
    customPath: '',
    suffix: '_graded',
    overwrite: false,
    videoCodec: 'same',
    outputExtension: 'same'
  })
  const [luts, setLuts] = createSignal<LutFile[]>([])
  const [lutSelections, setLutSelections] = createSignal<
    Record<string, DropdownOption | null>
  >({})
  const [exporting, setExporting] = createSignal(false)
  const [exportProgress, setExportProgress] = createSignal<ExportProgress | null>(null)

  const fetchLuts = () => {
    invoke<LutFile[]>('get_luts')
      .then(result => setLuts(result))
      .catch(err => console.error('Failed to fetch LUTs:', err))
  }

  onMount(fetchLuts)

  // Listen for export progress events
  onMount(() => {
    void listen<ExportProgress>('export-progress', event => {
      setExportProgress(event.payload)
      if (event.payload.status === 'complete') {
        setExporting(false)
      }
    }).then(unlisten => {
      onCleanup(unlisten)
    })
  })

  const selectedVideos = createMemo(() => videos().filter(v => v.selected))
  const selectedCount = createMemo(() => selectedVideos().length)
  const totalCount = createMemo(() => videos().length)

  const uniqueCameras = createMemo(() => {
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
    return cameras
  })

  const missingLutCameras = createMemo(() => {
    return uniqueCameras().filter(c => !lutSelections()[c.key])
  })

  const canExport = createMemo(
    () => selectedCount() > 0 && !exporting() && missingLutCameras().length === 0
  )

  const handleDirectoryChange = (path: string | null) => {
    setDirectory(path)
    if (!path) {
      setVideos([])
      return
    }
    setLoading(true)
    invoke<VideoFile[]>('scan_directory', { dirPath: path })
      .then(result => setVideos(result.map(v => ({ ...v, selected: true }))))
      .catch(err => {
        console.error('Scan failed:', err)
        setVideos([])
      })
      .finally(() => setLoading(false))
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

  const handleLutSelectionChange = (cameraKey: string, option: DropdownOption | null) => {
    setLutSelections(prev => ({ ...prev, [cameraKey]: option }))
  }

  // Prefill LUT dropdowns from saved camera→LUT mappings
  createEffect(() => {
    const cameras = uniqueCameras()
    if (cameras.length === 0) return

    // Build a lookup from stored path → LUT dropdown option
    const lutByPath = new Map<string, DropdownOption>()
    for (const lut of luts()) {
      lutByPath.set(lut.storedPath, { label: lut.label, value: lut.storedPath })
    }

    invoke<Record<string, string>>('get_camera_luts')
      .then(saved => {
        const selections: Record<string, DropdownOption | null> = {}
        for (const camera of cameras) {
          const savedPath = saved[camera.key]
          if (savedPath) {
            selections[camera.key] = lutByPath.get(savedPath) ?? null
          }
        }
        setLutSelections(prev => ({ ...selections, ...prev }))
      })
      .catch(err => console.error('Failed to load camera LUTs:', err))
  })

  const handleExport = async () => {
    if (!canExport()) return

    const cameraLuts: Record<string, string> = {}
    for (const [key, opt] of Object.entries(lutSelections())) {
      if (opt) cameraLuts[key] = opt.value
    }

    const job: ExportJob = {
      videos: selectedVideos().map(v => ({
        path: v.path,
        cameraKey: v.cameraKey,
        duration: v.duration,
        videoCodec: v.videoCodec,
        bitRate: v.bitRate
      })),
      cameraLuts,
      outputSettings: {
        destination: outputSettings().destination,
        customPath: outputSettings().customPath,
        suffix: outputSettings().suffix,
        overwrite: outputSettings().overwrite,
        videoCodec: outputSettings().videoCodec,
        outputExtension: outputSettings().outputExtension
      }
    }

    setExporting(true)
    setExportProgress(null)

    try {
      await invoke('start_export', { job })
    } catch (err) {
      console.error('Export failed:', err)
      setExporting(false)
    }
  }

  return (
    <div class="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header class="flex items-center border-b border-gray-200 bg-white px-4 py-2">
        <span class="text-sm font-semibold tracking-wide text-gray-800">Flut</span>
      </header>

      {/* Main area */}
      <div class="flex flex-1 min-h-0">
        {/* Left panel */}
        <div class="flex w-[420px] flex-col border-r border-gray-200 bg-white">
          <div class="border-b border-gray-200 p-3">
            <DirectoryPicker
              directory={directory()}
              onDirectoryChange={handleDirectoryChange}
            />
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto">
            <VideoList
              videos={videos()}
              loading={loading()}
              onToggleSelect={toggleSelect}
            />
          </div>
          <div class="flex items-center justify-between border-t border-gray-200 px-3 py-2">
            <span class="text-xs text-gray-500">
              {selectedCount()} of {totalCount()} selected
            </span>
            <button
              onClick={toggleSelectAll}
              disabled={totalCount() === 0}
              class="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selectedCount() === totalCount() && totalCount() > 0
                ? 'Deselect all'
                : 'Select all'}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div class="flex-1 min-h-0 overflow-y-auto p-4">
          <LutAssignment
            cameras={uniqueCameras()}
            luts={luts()}
            onLutsAdded={fetchLuts}
            outputSettings={outputSettings()}
            onOutputChange={setOutputSettings}
            selections={lutSelections()}
            onSelectionChange={handleLutSelectionChange}
          />
        </div>
      </div>

      {/* Footer */}
      <footer class="flex items-center gap-4 border-t border-gray-200 bg-white px-4 py-3">
        {/* Validation warning */}
        {missingLutCameras().length > 0 && selectedCount() > 0 && (
          <span class="text-xs text-amber-600 shrink-0">
            No LUT for:{' '}
            {missingLutCameras()
              .map(c => c.display)
              .join(', ')}
          </span>
        )}
        {/* Progress bar */}
        <div class="h-2 flex-1 rounded-full bg-gray-200">
          <div
            class="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: (() => {
                const p = exportProgress()
                if (!p) return '0%'
                const percent =
                  ((p.fileIndex + (p.percent ?? 0) / 100) / p.totalFiles) * 100
                return `${Math.min(percent, 100)}%`
              })()
            }}
          />
        </div>
        {/* Progress text */}
        {(() => {
          const p = exportProgress()
          if (!exporting() || !p) return null
          return (
            <span class="text-xs text-gray-500 shrink-0 max-w-[180px] truncate">
              {p.fileIndex + 1}/{p.totalFiles} {p.filename}
            </span>
          )
        })()}
        {/* Export button */}
        <button
          onClick={() => void handleExport()}
          disabled={!canExport()}
          class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {exporting()
            ? `Exporting… ${(exportProgress()?.fileIndex ?? 0) + 1}/${selectedCount()}`
            : `Export ${selectedCount()} clip${selectedCount() !== 1 ? 's' : ''}`}
        </button>
      </footer>
    </div>
  )
}

export default App
