export function formatResolution(res: string): string {
  if (!res) return '\u2014'
  const match = res.match(/^(\d+)x(\d+)$/)
  if (!match) return res
  const h = parseInt(match[2], 10)
  if (h >= 4320) return '8K'
  if (h >= 3160) return '6K'
  if (h >= 2160) return '4K'
  if (h >= 1440) return 'QHD'
  if (h >= 1080) return '1080p'
  if (h >= 720) return '720p'
  return res
}

export function formatFramerate(fps: number): string {
  if (fps % 1 === 0) return `${fps}`
  return fps.toFixed(2)
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

export function folderName(path: string): string {
  const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/)
  return parts[parts.length - 1] || path
}

export function folderLabel(path: string): string {
  const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/)
  return parts.slice(-2).join('/')
}

