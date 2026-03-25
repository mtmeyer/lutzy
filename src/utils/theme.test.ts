import { describe, it, expect } from 'vitest'
import { resolveDarkMode, parseSettings, defaultSettings } from './theme'

describe('resolveDarkMode', () => {
  it('returns true when theme is dark', () => {
    expect(resolveDarkMode('dark', false)).toBe(true)
    expect(resolveDarkMode('dark', true)).toBe(true)
  })

  it('returns false when theme is light', () => {
    expect(resolveDarkMode('light', false)).toBe(false)
    expect(resolveDarkMode('light', true)).toBe(false)
  })

  it('returns true when theme is system and system prefers dark', () => {
    expect(resolveDarkMode('system', true)).toBe(true)
  })

  it('returns false when theme is system and system prefers light', () => {
    expect(resolveDarkMode('system', false)).toBe(false)
  })
})

describe('parseSettings', () => {
  it('returns defaults when saved is empty', () => {
    expect(parseSettings({})).toEqual(defaultSettings)
  })

  it('hydrates a valid theme value', () => {
    const result = parseSettings({ theme: 'dark' })
    expect(result.theme).toBe('dark')
    expect(result.perCameraLut).toBe(true)
  })

  it('hydrates perCameraLut from string true', () => {
    const result = parseSettings({ perCameraLut: 'true' })
    expect(result.perCameraLut).toBe(true)
  })

  it('hydrates perCameraLut from string false', () => {
    const result = parseSettings({ perCameraLut: 'false' })
    expect(result.perCameraLut).toBe(false)
  })

  it('ignores unknown keys in saved object', () => {
    const result = parseSettings({ theme: 'light', randomKey: 'hello' })
    expect(result.theme).toBe('light')
    expect(result).toEqual({ theme: 'light', perCameraLut: true })
  })

  it('uses default theme when saved theme is missing', () => {
    const result = parseSettings({ perCameraLut: 'false' })
    expect(result.theme).toBe('system')
  })

  it('ignores invalid theme values', () => {
    const result = parseSettings({ theme: 'invalid' })
    expect(result.theme).toBe('system')
  })
})

describe('defaultSettings', () => {
  it('has system theme and perCameraLut enabled', () => {
    expect(defaultSettings).toEqual({ theme: 'system', perCameraLut: true })
  })
})
