import DirectoryPicker from '@components/DirectoryPicker'
import ExportCompleteModal from '@components/ExportCompleteModal'
import FilenameCollisionModal from '@components/FilenameCollisionModal'
import LutAssignment from '@components/LutAssignment'
import SettingsModal from '@components/SettingsModal'
import VideoList from '@components/VideoList'
import WelcomeScreen from '@components/WelcomeScreen'
import { checkOverwrite } from './services/tauriApi'
import { subscribeToExportProgress } from './services/events'
import { useVideoBatch } from './features/videos/useVideoBatch'
import { useLutSelections } from './features/lut/useLutSelections'
import { AiOutlineSetting } from 'solid-icons/ai'
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
  type JSX
} from 'solid-js'
import { SettingsProvider, useSettings } from './stores/settings'
import type {
  ExportJob,
  ExportProgress,
  OutputSettings
} from './types'
import { resolveDarkMode } from './utils'

const ThemeApplier: Component<{ children: JSX.Element }> = props => {
  const { settings } = useSettings()

  // Apply dark class and listen for system preference changes
  onMount(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const isDark = resolveDarkMode(settings.theme, mq.matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    // Apply immediately
    applyTheme()

    // Re-apply when settings change (createEffect tracks reactive reads)
    createEffect(() => {
      void settings.theme
      applyTheme()
    })

    // Listen for system preference changes
    const handler = () => {
      if (settings.theme === 'system') applyTheme()
    }
    mq.addEventListener('change', handler)
    onCleanup(() => mq.removeEventListener('change', handler))
  })

  return <>{props.children}</>
}

const AppContent: Component = () => {
  const { settings } = useSettings()
  const videoBatch = useVideoBatch()
  const lutSelections_ = useLutSelections(videoBatch)
  const [outputSettings, setOutputSettings] = createSignal<OutputSettings>({
    destination: 'same',
    customPath: '',
    pattern: '{name}_graded',
    videoCodec: 'same',
    outputExtension: 'same'
  })
  const [exporting, setExporting] = createSignal(false)
  const [exportProgress, setExportProgress] = createSignal<ExportProgress | null>(null)
  const [fileProgress, setFileProgress] = createSignal<
    Record<string, { state: string; percent: number }>
  >({})
  const [showExportComplete, setShowExportComplete] = createSignal(false)
  const [showSettings, setShowSettings] = createSignal(false)
  const [collisionPaths, setCollisionPaths] = createSignal<string[] | null>(null)

  // Listen for export progress events
  onMount(() => {
    void subscribeToExportProgress(p => {
      setExportProgress(p)

      // Map fileIndex to video path using the selected videos order
      const selected = selectedVideos()
      const videoPath = selected[p.fileIndex]?.path

      if (videoPath && p.status !== 'complete') {
        setFileProgress(prev => {
          const entry = {
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

  const selectedVideos = videoBatch.selectedVideos
  const selectedCount = videoBatch.selectedCount
  const totalCount = videoBatch.totalCount
  const uniqueCameras = videoBatch.uniqueCameras
  const missingLutCameras = lutSelections_.missingLutCameras

  const canExport = createMemo(
    () => selectedCount() > 0 && !exporting() && missingLutCameras().length === 0
  )

  const { handleDirectoryChange, clearAndGoBack, toggleSelect, toggleSelectAll, resetVideoBatch, directory, videos, loading } = videoBatch

  const fullClearAndGoBack = () => {
    resetVideoBatch()
    lutSelections_.setLutSelections({})
    setExporting(false)
    setExportProgress(null)
    setFileProgress({})
    setShowExportComplete(false)
  }

  const handleNewBatch = () => {
    setShowExportComplete(false)
    fullClearAndGoBack()
  }

  const hasFilenameCollision = createMemo(() => {
    const pattern = outputSettings().pattern
    const ext = outputSettings().outputExtension
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
      for (const [key, opt] of Object.entries(lutSelections_.lutSelections())) {
        if (opt) cameraLuts[key] = opt.value
      }
    } else {
      const allOpt = lutSelections_.lutSelections()['all']
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
        destination: outputSettings().destination,
        customPath: outputSettings().customPath,
        pattern: outputSettings().pattern,
        videoCodec: outputSettings().videoCodec,
        outputExtension: outputSettings().outputExtension
      }
    }
  }

  const startExport = async () => {
    const job = buildExportJob()
    setExporting(true)
    setExportProgress(null)
    setFileProgress({})

    try {
      await startExport(job)
    } catch (err) {
      console.error('Export failed:', err)
      setExporting(false)
    }
  }

  const handleExport = async () => {
    if (!canExport()) return

    const job = buildExportJob()

    try {
      const conflicts = await checkOverwrite(job)
      if (conflicts.length > 0) {
        setCollisionPaths(conflicts)
        return
      }
      await startExport()
    } catch (err) {
      console.error('Export check failed:', err)
    }
  }

  return (
    <Show
      when={directory()}
      fallback={<WelcomeScreen onSelect={handleDirectoryChange} />}
    >
      <div class="flex flex-col h-screen bg-surface-2 text-heading">
        {/* Header */}
        <header class="flex items-center border-b border-border bg-surface px-4 py-2">
          <span class="text-sm font-semibold tracking-wide text-body">Lutzy</span>
          <button
            onClick={() => setShowSettings(true)}
            class="ml-auto text-text-3 hover:text-text-2 transition-colors"
            aria-label="Settings"
          >
            <AiOutlineSetting size={18} />
          </button>
        </header>

        {/* Main area */}
        <div class="flex flex-1 min-h-0">
          {/* Left panel */}
          <div class="flex w-[420px] flex-col border-r border-border bg-surface">
            <div class="border-b border-border p-3">
              <DirectoryPicker
                directory={directory()}
                onDirectoryChange={handleDirectoryChange}
                onBack={clearAndGoBack}
              />
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto">
              <VideoList
                videos={videos()}
                loading={loading()}
                onToggleSelect={toggleSelect}
                fileProgress={fileProgress()}
              />
            </div>
            <div class="flex items-center justify-between border-t border-border px-3 py-2">
              <span class="text-xs text-text-2">
                {selectedCount()} of {totalCount()} selected
              </span>
              <button
                onClick={toggleSelectAll}
                disabled={totalCount() === 0}
                class="text-xs text-accent hover:text-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
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
              luts={lutSelections_.luts()}
              onLutsAdded={lutSelections_.fetchLuts}
              outputSettings={outputSettings()}
              onOutputChange={setOutputSettings}
              selections={lutSelections_.lutSelections()}
              onSelectionChange={lutSelections_.handleLutSelectionChange}
              perCameraLut={settings.perCameraLut}
              hasFilenameCollision={hasFilenameCollision()}
            />
          </div>
        </div>

        {/* Footer */}
        <footer class="flex items-center gap-4 border-t border-border bg-surface px-4 py-3">
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
          <div class="h-2 flex-1 rounded-full bg-border">
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
              <span class="text-xs text-text-2 shrink-0 max-w-[180px] truncate">
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

        <ExportCompleteModal
          open={showExportComplete()}
          onOpenChange={setShowExportComplete}
          fileProgress={fileProgress()}
          totalFiles={selectedCount()}
          onNewBatch={handleNewBatch}
        />
        <SettingsModal
          open={showSettings()}
          onOpenChange={setShowSettings}
          luts={lutSelections_.luts()}
          onLutsChanged={lutSelections_.fetchLuts}
        />
        <FilenameCollisionModal
          open={collisionPaths() !== null}
          onOpenChange={open => {
            if (!open) setCollisionPaths(null)
          }}
          paths={collisionPaths() ?? []}
          onDismiss={() => setCollisionPaths(null)}
        />
      </div>
    </Show>
  )
}

const App: Component = () => {
  return (
    <SettingsProvider>
      <ThemeApplier>
        <AppContent />
      </ThemeApplier>
    </SettingsProvider>
  )
}

export default App
