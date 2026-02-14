import type { ExportFormat } from './formatters'

export interface Config {
  /** Export format */
  format: ExportFormat
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
  /** Max concurrent conversation downloads */
  concurrency: number
  /** Only export conversations with these IDs (empty = all) */
  conversationIds: string[]
  /** Filter conversations by title keyword */
  searchQuery: string
  /** Only export conversations updated after this timestamp (ms) */
  afterTimestamp: number | null
}

export const DEFAULT_CONFIG: Config = {
  format: 'json',
  batchSize: 100,
  listDelay: 500,
  downloadDelay: 300,
  downloadBatch: 3,
  retryAttempts: 3,
  retryDelay: 2000,
  concurrency: 3,
  conversationIds: [],
  searchQuery: '',
  afterTimestamp: null,
}
