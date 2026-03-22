import { open } from '@tauri-apps/plugin-dialog'
import { createSignal, type Component } from 'solid-js'

interface WelcomeScreenProps {
  onSelect: (path: string) => void
}

const WelcomeScreen: Component<WelcomeScreenProps> = props => {
  const [loading, setLoading] = createSignal(false)

  const pickDirectory = () => {
    if (loading()) return
    setLoading(true)
    void open({
      directory: true,
      multiple: false,
      title: 'Select video directory'
    })
      .then(selected => {
        if (selected) {
          props.onSelect(selected)
        }
      })
      .finally(() => setLoading(false))
  }

  return (
    <div class="flex h-screen flex-col items-center justify-center bg-gray-50 select-none">
      <h1 class="text-4xl font-semibold tracking-tight text-gray-900">Flut</h1>
      <p class="mt-2 text-sm text-gray-400">Batch LUT applicator for video files</p>
      <button
        onClick={pickDirectory}
        disabled={loading()}
        class="mt-8 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        {loading() ? 'Scanning…' : 'Select Folder'}
      </button>
      <p class="mt-3 text-xs text-gray-300">or drag &amp; drop a folder here</p>
    </div>
  )
}

export default WelcomeScreen
