import DirectoryPicker from '@components/DirectoryPicker'
import ExportPanel from '@components/ExportPanel'
import VideoList from '@components/VideoList'
import { invoke } from '@tauri-apps/api/core'
import { createSignal, type Component } from 'solid-js'
import type { VideoFile } from './types'

const App: Component = () => {
  const [directory, setDirectory] = createSignal<string | null>(null)
  const [videos, setVideos] = createSignal<VideoFile[]>([])
  const [loading, setLoading] = createSignal(false)

  const handleDirectoryChange = (path: string | null) => {
    setDirectory(path)
    if (!path) {
      setVideos([])
      return
    }
    setLoading(true)
    invoke<VideoFile[]>('scan_directory', { dirPath: path })
      .then(result => setVideos(result))
      .catch(err => {
        console.error('Scan failed:', err)
        setVideos([])
      })
      .finally(() => setLoading(false))
  }

  return (
    <div class="flex flex-col h-screen bg-gray-50 text-gray-900">
      <div class="flex flex-1 min-h-0">
        {/* Left panel */}
        <div class="flex w-80 flex-col border-r border-gray-200 bg-white">
          <div class="p-4 border-b border-gray-200">
            <DirectoryPicker
              directory={directory()}
              onDirectoryChange={handleDirectoryChange}
              videos={videos()}
            />
          </div>
          <div class="flex-1 min-h-0 overflow-hidden p-4">
            <VideoList videos={videos()} loading={loading()} />
          </div>
        </div>

        {/* Right panel */}
        <div class="flex-1 min-h-0">
          <ExportPanel videos={videos()} />
        </div>
      </div>

      {/* Footer */}
      <footer class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
        <div class="text-sm text-gray-500">
          {videos().length > 0
            ? `${videos().length} clip${videos().length !== 1 ? 's' : ''} ready`
            : 'No clips loaded'}
        </div>
        <button
          disabled={videos().length === 0}
          class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Export
        </button>
      </footer>
    </div>
  )
}

export default App
