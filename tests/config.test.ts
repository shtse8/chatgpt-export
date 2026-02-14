import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG, type Config } from '../src/core/config'

describe('Config', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_CONFIG.format).toBe('json')
    expect(DEFAULT_CONFIG.batchSize).toBe(100)
    expect(DEFAULT_CONFIG.retryAttempts).toBe(3)
    expect(DEFAULT_CONFIG.concurrency).toBe(3)
    expect(DEFAULT_CONFIG.conversationIds).toEqual([])
    expect(DEFAULT_CONFIG.searchQuery).toBe('')
    expect(DEFAULT_CONFIG.afterTimestamp).toBeNull()
  })

  it('should allow partial config merging', () => {
    const partial: Partial<Config> = { format: 'markdown', concurrency: 5 }
    const merged = { ...DEFAULT_CONFIG, ...partial }
    expect(merged.format).toBe('markdown')
    expect(merged.concurrency).toBe(5)
    expect(merged.batchSize).toBe(DEFAULT_CONFIG.batchSize)
  })

  it('should preserve all default keys when merging empty', () => {
    const merged = { ...DEFAULT_CONFIG, ...{} }
    expect(Object.keys(merged).sort()).toEqual(Object.keys(DEFAULT_CONFIG).sort())
  })
})
