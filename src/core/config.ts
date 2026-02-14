export interface Config {
  /** Conversations per page when listing */
  batchSize: number
  /** Delay between list pagination requests (ms) */
  listDelay: number
  /** Delay between conversation downloads (ms) */
  downloadDelay: number
  /** Pause after every N downloads */
  downloadBatch: number
  /** Max retry attempts per request */
  retryAttempts: number
  /** Base delay between retries (ms) — doubles on each retry */
  retryDelay: number
}

export const DEFAULT_CONFIG: Config = {
  batchSize: 100,
  listDelay: 500,
  downloadDelay: 300,
  downloadBatch: 3,
  retryAttempts: 3,
  retryDelay: 2000,
}
