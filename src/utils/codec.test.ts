import { describe, it, expect } from 'vitest'
import { getExtForCodec } from './codec'

describe('getExtForCodec', () => {
  it('returns mp4/mkv/mov for h264 with mp4 default', () => {
    const result = getExtForCodec('h264')
    expect(result.default).toBe('mp4')
    expect(result.options).toEqual([
      { label: 'mp4', value: 'mp4' },
      { label: 'mkv', value: 'mkv' },
      { label: 'mov', value: 'mov' }
    ])
  })

  it('returns mp4/mkv/mov for h265 with mp4 default', () => {
    const result = getExtForCodec('h265')
    expect(result.default).toBe('mp4')
    expect(result.options.map(o => o.value)).toEqual(['mp4', 'mkv', 'mov'])
  })

  it('returns mov/mkv for prores with mov default', () => {
    const result = getExtForCodec('prores')
    expect(result.default).toBe('mov')
    expect(result.options).toEqual([
      { label: 'mov', value: 'mov' },
      { label: 'mkv', value: 'mkv' }
    ])
  })

  it('returns same-as-source fallback for unknown codec', () => {
    const result = getExtForCodec('unknown' as 'h264')
    expect(result.default).toBe('same')
    expect(result.options).toEqual([{ label: 'same as source', value: 'same' }])
  })

  it('returns same-as-source fallback for empty string', () => {
    const result = getExtForCodec('' as 'h264')
    expect(result.default).toBe('same')
  })

  it('returns same-as-source fallback for "same"', () => {
    const result = getExtForCodec('same')
    expect(result.default).toBe('same')
  })
})
