import { describe, it, expect } from 'vitest'
import { formatResolution, formatFramerate, formatSize, folderName, folderLabel } from './formatting'

describe('formatResolution', () => {
  it('maps 1080p height', () => {
    expect(formatResolution('1920x1080')).toBe('1080p')
  })

  it('maps 720p height', () => {
    expect(formatResolution('1280x720')).toBe('720p')
  })

  it('maps 4K height', () => {
    expect(formatResolution('3840x2160')).toBe('4K')
  })

  it('maps 8K height', () => {
    expect(formatResolution('7680x4320')).toBe('8K')
  })

  it('maps 6K height', () => {
    expect(formatResolution('6144x3456')).toBe('6K')
  })

  it('maps QHD height', () => {
    expect(formatResolution('2560x1440')).toBe('QHD')
  })

  it('returns original for non-standard resolution', () => {
    expect(formatResolution('640x480')).toBe('640x480')
  })

  it('returns em dash for empty string', () => {
    expect(formatResolution('')).toBe('\u2014')
  })

  it('returns original for unparseable string', () => {
    expect(formatResolution('unknown')).toBe('unknown')
  })
})

describe('formatFramerate', () => {
  it('shows clean integer fps', () => {
    expect(formatFramerate(24)).toBe('24')
  })

  it('shows clean 25 fps', () => {
    expect(formatFramerate(25)).toBe('25')
  })

  it('shows clean 30 fps', () => {
    expect(formatFramerate(30)).toBe('30')
  })

  it('shows 23.98 with two decimals', () => {
    expect(formatFramerate(23.98)).toBe('23.98')
  })

  it('shows 59.94 with two decimals', () => {
    expect(formatFramerate(59.94)).toBe('59.94')
  })

  it('shows 29.97 with two decimals', () => {
    expect(formatFramerate(29.97)).toBe('29.97')
  })
})

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(500)).toBe('500 B')
  })

  it('formats 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B')
  })

  it('formats kilobytes', () => {
    expect(formatSize(2048)).toBe('2.0KB')
  })

  it('formats megabytes', () => {
    expect(formatSize(1572864)).toBe('1.5MB')
  })

  it('formats gigabytes', () => {
    expect(formatSize(1610612736)).toBe('1.5GB')
  })

  it('formats 1024 bytes as 1.0KB', () => {
    expect(formatSize(1024)).toBe('1.0KB')
  })

  it('formats 1MB boundary', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0MB')
  })

  it('formats 1GB boundary', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.0GB')
  })
})

describe('folderName', () => {
  it('extracts last path segment on Unix', () => {
    expect(folderName('/Users/michael/Videos/project')).toBe('project')
  })

  it('extracts last path segment on Windows', () => {
    expect(folderName('C:\\Users\\michael\\Videos\\project')).toBe('project')
  })

  it('handles trailing slash on Unix', () => {
    expect(folderName('/Users/michael/Videos/project/')).toBe('project')
  })

  it('handles trailing backslash on Windows', () => {
    expect(folderName('C:\\Users\\michael\\Videos\\project\\')).toBe('project')
  })

  it('handles root path', () => {
    expect(folderName('/')).toBe('/')
  })

  it('handles single segment path', () => {
    expect(folderName('videos')).toBe('videos')
  })

  it('handles deeply nested path', () => {
    expect(folderName('/a/b/c/d/e/final')).toBe('final')
  })
})

describe('folderLabel', () => {
  it('extracts last two path segments on Unix', () => {
    expect(folderLabel('/Users/michael/Videos/project')).toBe('Videos/project')
  })

  it('extracts last two path segments on Windows', () => {
    expect(folderLabel('C:\\Users\\michael\\Videos\\project')).toBe('Videos/project')
  })

  it('handles trailing slash', () => {
    expect(folderLabel('/Users/michael/Videos/project/')).toBe('Videos/project')
  })

  it('handles single segment path', () => {
    expect(folderLabel('project')).toBe('project')
  })

  it('handles root path', () => {
    expect(folderLabel('/')).toBe('')
  })

  it('handles two-segment path', () => {
    expect(folderLabel('/Videos/project')).toBe('Videos/project')
  })
})
