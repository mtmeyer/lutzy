import { createEffect, createSignal, createMemo, onMount } from 'solid-js'
import type { LutFile } from '../../types'
import type { DropdownOption } from '../../components/Dropdown'
import type { CameraInfo, UseVideoBatchReturn } from '../videos/useVideoBatch'
import { useSettings } from '../../stores/settings'
import { getLuts, getCameraLuts, getAppSettings, setAppSetting } from '../../services/tauriApi'

export interface UseLutSelectionsReturn {
  luts: () => LutFile[]
  setLuts: (luts: LutFile[]) => void
  lutSelections: () => Record<string, DropdownOption | null>
  setLutSelections: (selections: Record<string, DropdownOption | null>) => void
  missingLutCameras: () => CameraInfo[]
  fetchLuts: () => void
  handleLutSelectionChange: (cameraKey: string, option: DropdownOption | null) => void
}

export function useLutSelections(
  videoBatch: Pick<
    UseVideoBatchReturn,
    | 'selectedVideos'
    | 'uniqueCameras'
  >
): UseLutSelectionsReturn {
  const { settings } = useSettings()
  const [luts, setLuts] = createSignal<LutFile[]>([])
  const [lutSelections, setLutSelections] = createSignal<Record<string, DropdownOption | null>>({})

  const fetchLuts = () => {
    getLuts()
      .then(result => setLuts(result))
      .catch(err => console.error('Failed to fetch LUTs:', err))
  }

  onMount(fetchLuts)

  const uniqueCameras = videoBatch.uniqueCameras

  const missingLutCameras = createMemo(() => {
    if (!settings.perCameraLut) {
      return lutSelections()['all'] ? [] : uniqueCameras()
    }
    return uniqueCameras().filter(c => !lutSelections()[c.key])
  })

  const handleLutSelectionChange = (cameraKey: string, option: DropdownOption | null) => {
    setLutSelections(prev => ({ ...prev, [cameraKey]: option }))

    if (cameraKey === 'all') {
      setAppSetting('global_lut', option?.value ?? '').catch(err =>
        console.error('Failed to save global_lut:', err)
      )
    }
  }

  // Prefill LUT dropdowns from saved camera→LUT mappings (per-camera mode only)
  createEffect(() => {
    if (!settings.perCameraLut) return

    const cameras = uniqueCameras()

    // Clear 'all' key so global persist effect doesn't save stale value when switching modes
    setLutSelections(prev => {
      if (!prev['all']) return prev
      const next = { ...prev }
      delete next['all']
      return next
    })

    if (cameras.length === 0) return

    // Build a lookup from stored path → LUT dropdown option
    const lutByPath = new Map<string, DropdownOption>()
    for (const lut of luts()) {
      lutByPath.set(lut.storedPath, { label: lut.label, value: lut.storedPath })
    }

    getCameraLuts()
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

  // Restore global LUT from SQLite (global mode only, after luts are loaded)
  createEffect(() => {
    if (settings.perCameraLut) return
    if (lutSelections()['all']) return // already populated
    if (luts().length === 0) return // luts not loaded yet

    getAppSettings()
      .then(saved => {
        const savedPath = saved.global_lut
        if (!savedPath) return

        const lut = luts().find(l => l.storedPath === savedPath)
        if (lut) {
          setLutSelections(prev => ({
            ...prev,
            all: { label: lut.label, value: lut.storedPath }
          }))
        }
      })
      .catch(err => console.error('Failed to load global_lut:', err))
  })

  return {
    luts,
    setLuts,
    lutSelections,
    setLutSelections,
    missingLutCameras,
    fetchLuts,
    handleLutSelectionChange
  }
}
