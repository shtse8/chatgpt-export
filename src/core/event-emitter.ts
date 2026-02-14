/**
 * Minimal typed EventEmitter — no external dependencies.
 *
 * Usage:
 *   type Events = { progress: [Progress]; done: [ExportResult] }
 *   const emitter = new EventEmitter<Events>()
 *   emitter.on('progress', (p) => { ... })
 *   emitter.emit('progress', progressData)
 */

/** Listener function type for a given event payload tuple. */
type Listener<T extends unknown[]> = (...args: T) => void

/**
 * A strongly-typed event emitter.
 *
 * @typeParam Events — a record mapping event names to payload tuples.
 */
export class EventEmitter<Events extends Record<string, unknown[]>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<unknown[]>>>()

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener as Listener<unknown[]>)
    return () => {
      set!.delete(listener as Listener<unknown[]>)
    }
  }

  /** Subscribe to an event, but only fire once. */
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const wrapper: Listener<Events[K]> = (...args) => {
      unsub()
      listener(...args)
    }
    const unsub = this.on(event, wrapper)
    return unsub
  }

  /** Remove a specific listener. */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown[]>)
  }

  /** Emit an event to all registered listeners. */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      listener(...args)
    }
  }

  /** Remove all listeners, optionally for a specific event only. */
  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  /** Returns the count of listeners for an event. */
  listenerCount(event: keyof Events): number {
    return this.listeners.get(event)?.size ?? 0
  }
}
