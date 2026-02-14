import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/core/event-emitter'

type TestEvents = {
  data: [string]
  count: [number]
  multi: [string, number]
  empty: []
}

describe('EventEmitter', () => {
  it('should emit and receive events', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('data', handler)
    emitter.emit('data', 'hello')
    expect(handler).toHaveBeenCalledWith('hello')
  })

  it('should support multiple listeners', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    emitter.on('data', handler1)
    emitter.on('data', handler2)
    emitter.emit('data', 'test')
    expect(handler1).toHaveBeenCalledWith('test')
    expect(handler2).toHaveBeenCalledWith('test')
  })

  it('should return unsubscribe function from on()', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    const unsub = emitter.on('data', handler)
    emitter.emit('data', 'first')
    unsub()
    emitter.emit('data', 'second')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith('first')
  })

  it('should support off() to remove listener', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('data', handler)
    emitter.off('data', handler)
    emitter.emit('data', 'ignored')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should support once() — fire only once', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.once('count', handler)
    emitter.emit('count', 1)
    emitter.emit('count', 2)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(1)
  })

  it('should handle events with multiple arguments', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('multi', handler)
    emitter.emit('multi', 'hello', 42)
    expect(handler).toHaveBeenCalledWith('hello', 42)
  })

  it('should handle events with no arguments', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('empty', handler)
    emitter.emit('empty')
    expect(handler).toHaveBeenCalledWith()
  })

  it('should not throw when emitting with no listeners', () => {
    const emitter = new EventEmitter<TestEvents>()
    expect(() => emitter.emit('data', 'test')).not.toThrow()
  })

  it('should removeAllListeners for a specific event', () => {
    const emitter = new EventEmitter<TestEvents>()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on('data', h1)
    emitter.on('count', h2)
    emitter.removeAllListeners('data')
    emitter.emit('data', 'ignored')
    emitter.emit('count', 5)
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledWith(5)
  })

  it('should removeAllListeners for all events', () => {
    const emitter = new EventEmitter<TestEvents>()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on('data', h1)
    emitter.on('count', h2)
    emitter.removeAllListeners()
    emitter.emit('data', 'ignored')
    emitter.emit('count', 0)
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('should report correct listenerCount', () => {
    const emitter = new EventEmitter<TestEvents>()
    expect(emitter.listenerCount('data')).toBe(0)
    const unsub = emitter.on('data', () => {})
    expect(emitter.listenerCount('data')).toBe(1)
    emitter.on('data', () => {})
    expect(emitter.listenerCount('data')).toBe(2)
    unsub()
    expect(emitter.listenerCount('data')).toBe(1)
  })
})
