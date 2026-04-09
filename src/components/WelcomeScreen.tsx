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
    <div class="flex h-screen flex-col items-center justify-center bg-surface-2 select-none">
      <div class="flex flex-col items-center">
        <h1 class="text-5xl font-bold tracking-tight text-heading">Lutzy</h1>
        <div class="mt-3 h-0.5 w-8 rounded-full bg-accent" />
        <p class="mt-4 text-sm text-text-2">Batch LUT applicator for video files</p>
      </div>
      <button
        onClick={pickDirectory}
        disabled={loading()}
        class="mt-10 rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-card hover:shadow-card-hover hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
      >
        {loading() ? 'Scanning…' : 'Select Folder'}
      </button>
    </div>
  )
}

export default WelcomeScreen
