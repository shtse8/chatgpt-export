import { describe, it, expect, vi } from 'vitest'
import { sleep, log, warn, error } from '../src/core/utils'

describe('Utils', () => {
  it('sleep should resolve after specified time', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(40) // Allow some tolerance
  })

  it('log should call console.log with prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log('test message')
    expect(spy).toHaveBeenCalledWith('[ChatGPT Export] test message')
    spy.mockRestore()
  })

  it('warn should call console.warn with prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warn('warning')
    expect(spy).toHaveBeenCalledWith('[ChatGPT Export] ⚠️ warning')
    spy.mockRestore()
  })

  it('error should call console.error with prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    error('failure')
    expect(spy).toHaveBeenCalledWith('[ChatGPT Export] ❌ failure')
    spy.mockRestore()
  })
})
