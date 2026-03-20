import DirectoryPicker from '@components/DirectoryPicker'
import type { DropdownOption } from '@components/Dropdown'
import LutAssignment from '@components/LutAssignment'
import VideoList from '@components/VideoList'
import { invoke } from '@tauri-apps/api/core'
import { createMemo, createSignal, type Component } from 'solid-js'
import type { OutputSettings, VideoFile } from './types'

const App: Component = () => {
  const [directory, setDirectory] = createSignal<string | null>(null)
  const [videos, setVideos] = createSignal<VideoFile[]>([])
  const [loading, setLoading] = createSignal(false)
  const [outputSettings, setOutputSettings] = createSignal<OutputSettings>({
    destination: 'same',
    customPath: '',
    suffix: '_graded',
    overwrite: false
  })
  const luts: DropdownOption[] = []

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
            luts={luts}
            outputSettings={outputSettings()}
            onOutputChange={setOutputSettings}
          />
        </div>
      </div>

      {/* Footer */}
      <footer class="flex items-center gap-4 border-t border-gray-200 bg-white px-4 py-3">
        <div class="h-2 flex-1 rounded-full bg-gray-200">
          <div class="h-full w-0 rounded-full bg-blue-500 transition-all" />
        </div>
        <button
          disabled={selectedCount() === 0}
          class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Export {selectedCount()} clip{selectedCount() !== 1 ? 's' : ''}
        </button>
      </footer>
    </div>
  )
}

export default App
