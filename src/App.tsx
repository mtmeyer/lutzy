import DirectoryPicker from '@components/DirectoryPicker'
import ExportCompleteModal from '@components/ExportCompleteModal'
import FilenameCollisionModal from '@components/FilenameCollisionModal'
import LutAssignment from '@components/LutAssignment'
import SettingsModal from '@components/SettingsModal'
import VideoList from '@components/VideoList'
import WelcomeScreen from '@components/WelcomeScreen'
import { useVideoBatch } from './features/videos/useVideoBatch'
import { useLutSelections } from './features/lut/useLutSelections'
import { useExportController } from './features/export/useExportController'
import { AiOutlineSetting } from 'solid-icons/ai'
import {
  createSignal,
  Show,
  type Component,
  type JSX
} from 'solid-js'
import { SettingsProvider, useSettings } from './stores/settings'
import type {
  OutputSettings
} from './types'
import { resolveDarkMode } from './utils'
import { onCleanup, onMount, createEffect } from 'solid-js'

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
  const [showSettings, setShowSettings] = createSignal(false)
  
  const exportController = useExportController({
    selectedVideos: videoBatch.selectedVideos,
    selectedCount: videoBatch.selectedCount,
    lutSelections: lutSelections_.lutSelections,
    outputSettings,
    setOutputSettings
  })

  const { handleDirectoryChange, clearAndGoBack, toggleSelect, toggleSelectAll, resetVideoBatch, directory, videos, loading } = videoBatch
  const { uniqueCameras, selectedCount, totalCount } = videoBatch
  const { missingLutCameras } = lutSelections_

  const fullClearAndGoBack = () => {
    resetVideoBatch()
    lutSelections_.setLutSelections({})
    exportController.resetExport()
  }

  const handleNewBatch = () => {
    exportController.setShowExportComplete(false)
    fullClearAndGoBack()
  }

  const hasFilenameCollision = exportController.hasFilenameCollision
  const canExport = exportController.canExport

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
                fileProgress={exportController.fileProgress()}
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
                  const p = exportController.exportProgress()
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
            const p = exportController.exportProgress()
            if (!exportController.exporting() || !p) return null
            return (
              <span class="text-xs text-text-2 shrink-0 max-w-[180px] truncate">
                {p.fileIndex + 1}/{p.totalFiles} {p.filename}
              </span>
            )
          })()}
          {/* Export button */}
          <button
            onClick={() => void exportController.handleExport()}
            disabled={!canExport()}
            class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {exportController.exporting()
              ? `Exporting… ${(exportController.exportProgress()?.fileIndex ?? 0) + 1}/${selectedCount()}`
              : `Export ${selectedCount()} clip${selectedCount() !== 1 ? 's' : ''}`}
          </button>
        </footer>

        <ExportCompleteModal
          open={exportController.showExportComplete()}
          onOpenChange={exportController.setShowExportComplete}
          fileProgress={exportController.fileProgress()}
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
          open={exportController.collisionPaths() !== null}
          onOpenChange={open => {
            if (!open) exportController.setCollisionPaths(null)
          }}
          paths={exportController.collisionPaths() ?? []}
          onDismiss={() => exportController.setCollisionPaths(null)}
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
