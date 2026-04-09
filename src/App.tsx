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

  onMount(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const isDark = resolveDarkMode(settings.theme, mq.matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    applyTheme()

    createEffect(() => {
      void settings.theme
      applyTheme()
    })

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
        <header class="flex items-center bg-surface px-5 py-3 shadow-card">
          <span class="text-base font-bold tracking-tight text-heading">Lutzy</span>
          <button
            onClick={() => setShowSettings(true)}
            class="ml-auto text-text-3 hover:text-text-2 rounded-lg p-1.5 hover:bg-surface-hover"
            aria-label="Settings"
          >
            <AiOutlineSetting size={18} />
          </button>
        </header>

        <div class="flex flex-1 min-h-0">
          <div class="flex w-[420px] flex-col bg-surface">
            <div class="p-3">
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
            <div class="flex items-center justify-between px-4 py-2.5">
              <span class="text-xs text-text-2">
                {selectedCount()} of {totalCount()} selected
              </span>
              <button
                onClick={toggleSelectAll}
                disabled={totalCount() === 0}
                class="text-xs text-accent font-medium hover:text-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedCount() === totalCount() && totalCount() > 0
                  ? 'Deselect all'
                  : 'Select all'}
              </button>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-5">
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

        <footer class="flex items-center gap-4 bg-surface px-5 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.06)]">
          {missingLutCameras().length > 0 && selectedCount() > 0 && (
            <span class="text-xs text-warning font-medium shrink-0">
              No LUT for:{' '}
              {missingLutCameras()
                .map(c => c.display)
                .join(', ')}
            </span>
          )}
          <div class="h-2.5 flex-1 rounded-full bg-surface-3">
            <div
              class="h-full rounded-full bg-accent transition-all duration-300"
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
          {(() => {
            const p = exportController.exportProgress()
            if (!exportController.exporting() || !p) return null
            return (
              <span class="text-xs text-text-2 shrink-0 max-w-[180px] truncate">
                {p.fileIndex + 1}/{p.totalFiles} {p.filename}
              </span>
            )
          })()}
          <button
            onClick={() => void exportController.handleExport()}
            disabled={!canExport()}
            class="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 min-w-[140px] text-center"
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
