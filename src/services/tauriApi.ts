import { invoke } from '@tauri-apps/api/core'
import type { LutFile, VideoFile, ExportJob } from '../types'

export async function getLuts(): Promise<LutFile[]> {
  return invoke<LutFile[]>('get_luts')
}

export async function addLuts(filePaths: string[]): Promise<LutFile[]> {
  return invoke<LutFile[]>('add_luts', { filePaths })
}

export async function deleteLut(id: number): Promise<void> {
  return invoke('delete_lut', { id })
}

export async function renameLut(id: number, label: string): Promise<void> {
  return invoke('rename_lut', { id, label })
}

export async function scanDirectory(dirPath: string): Promise<VideoFile[]> {
  return invoke<VideoFile[]>('scan_directory', { dirPath })
}

export async function getCameraLuts(): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_camera_luts')
}

export async function getAppSettings(): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_app_settings')
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  return invoke('set_app_setting', { key, value })
}

export async function checkOverwrite(job: ExportJob): Promise<string[]> {
  return invoke<string[]>('check_overwrite', { job })
}

export async function startExport(job: ExportJob): Promise<void> {
  return invoke('start_export', { job })
}