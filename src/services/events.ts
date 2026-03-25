import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { ExportProgress } from '../types'

export type ExportProgressHandler = (progress: ExportProgress) => void

export async function subscribeToExportProgress(
  handler: ExportProgressHandler
): Promise<UnlistenFn> {
  return listen<ExportProgress>('export-progress', event => {
    handler(event.payload)
  })
}