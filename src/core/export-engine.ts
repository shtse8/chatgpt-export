import { type Config, DEFAULT_CONFIG } from './config'
import { EventEmitter } from './event-emitter'
import { formatExport, type FormattedFile } from './formatters'
import { sleep, log, warn, error } from './utils'

export interface ConversationSummary {
  id: string
  title: string
  create_time: number
  update_time: number
}

export interface ExportMeta {
  exported_at: string
  user_email: string
  plan_type: string
  account_id?: string
  total_conversations: number
  successful: number
  errors: number
  export_duration_seconds: number
  format: string
}

export interface ExportResult {
  meta: ExportMeta
  conversations: unknown[]
}

export interface Progress {
  status: 'idle' | 'authenticating' | 'listing' | 'downloading' | 'saving' | 'done' | 'error'
  total: number
  downloaded: number
  errors: number
  rate: number
  startedAt: number
  eta: number | null
  currentTitle: string
  error?: string
}

export type ProgressCallback = (progress: Progress) => void

/** Events emitted by the export engine. */
export type ExportEngineEvents = {
  progress: [Progress]
  done: [ExportResult]
  error: [Error]
}

/**
 * Core export engine — fetches all ChatGPT conversations via the backend API.
 *
 * Features:
 * - Multiple export formats (JSON, Markdown, Text, HTML)
 * - Selective export by conversation IDs
 * - Search/filter by title keyword
 * - Incremental export (only conversations after a timestamp)
 * - Concurrent batch downloads with configurable concurrency
 * - ETA calculation based on download rate
 * - Exponential backoff with jitter on retries
 * - Token refresh resilience
 * - Typed EventEmitter for progress notifications
 */
export class ExportEngine extends EventEmitter<ExportEngineEvents> {
  private config: Config
  private progress: Progress
  private onProgress?: ProgressCallback
  private aborted = false
  private headers: Record<string, string> = {}

  constructor(config: Partial<Config> = {}, onProgress?: ProgressCallback) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.onProgress = onProgress
    this.progress = {
      status: 'idle',
      total: 0,
      downloaded: 0,
      errors: 0,
      rate: 0,
      startedAt: Date.now(),
      eta: null,
      currentTitle: '',
    }
  }

  abort(): void {
    this.aborted = true
  }

  async run(): Promise<ExportResult | null> {
    this.aborted = false
    this.progress = {
      status: 'authenticating',
      total: 0,
      downloaded: 0,
      errors: 0,
      rate: 0,
      startedAt: Date.now(),
      eta: null,
      currentTitle: '',
    }
    this.emitProgress()

    try {
      // Step 1: Authenticate
      const session = await this.getSession()
      if (!session) return null

      // Step 2: List conversations (with filtering)
      this.progress.status = 'listing'
      this.emitProgress()

      let conversations: ConversationSummary[]

      if (this.config.conversationIds.length > 0) {
        // Selective export — use provided IDs directly
        conversations = this.config.conversationIds.map(id => ({
          id,
          title: '',
          create_time: 0,
          update_time: 0,
        }))
        log(`📊 Selective export: ${conversations.length} conversations`)
      } else {
        // Full list with optional filtering
        conversations = await this.listAll()
        conversations = this.filterConversations(conversations)
      }

      this.progress.total = conversations.length

      if (conversations.length === 0) {
        warn('No conversations found matching criteria.')
        this.progress.status = 'done'
        this.emitProgress()
        return null
      }

      log(`📊 Total: ${conversations.length} conversations to export`)

      // Step 3: Download conversations (concurrently)
      this.progress.status = 'downloading'
      this.emitProgress()
      const results = await this.downloadAllConcurrent(conversations)

      // Step 4: Build export
      const elapsed = (Date.now() - this.progress.startedAt) / 1000

      const exportData: ExportResult = {
        meta: {
          exported_at: new Date().toISOString(),
          user_email: session.email,
          plan_type: session.planType,
          account_id: session.accountId,
          total_conversations: results.length,
          successful: this.progress.downloaded,
          errors: this.progress.errors,
          export_duration_seconds: parseFloat(elapsed.toFixed(1)),
          format: this.config.format,
        },
        conversations: results,
      }

      this.progress.status = 'done'
      this.progress.eta = 0
      this.emitProgress()
      this.emit('done', exportData)

      return exportData
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      error(msg)
      this.progress.status = 'error'
      this.progress.error = msg
      this.emitProgress()
      this.emit('error', err instanceof Error ? err : new Error(msg))
      return null
    }
  }

  // --- Auth ---

  private async getSession(): Promise<{ token: string; accountId?: string; planType: string; email: string } | null> {
    log('🔑 Getting session...')
    const res = await fetch('/api/auth/session')
    const session = await res.json()

    if (!session.accessToken) {
      error('Not logged in. Please sign in to ChatGPT first.')
      this.progress.status = 'error'
      this.progress.error = 'Not logged in'
      this.emitProgress()
      return null
    }

    const token = session.accessToken
    const accountId = session.account?.id
    const planType = session.account?.planType || 'unknown'
    const email = session.user?.email || 'unknown'

    log(`✅ Logged in as: ${email} (${planType} plan)`)

    this.headers = { authorization: `Bearer ${token}` }
    if (accountId) this.headers['chatgpt-account-id'] = accountId

    return { token, accountId, planType, email }
  }

  // --- Fetch with retry (exponential backoff + jitter) ---

  private async fetchWithRetry(url: string): Promise<Response> {
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const res = await fetch(url, { headers: this.headers })

        if (res.ok) return res

        if (res.status === 401) {
          warn('Token expired, refreshing...')
          const refreshed = await this.refreshToken()
          if (refreshed) {
            log('Token refreshed')
            continue
          }
        }

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after')
          const wait = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.backoffDelay(attempt)
          warn(`Rate limited, waiting ${(wait / 1000).toFixed(1)}s...`)
          await sleep(wait)
          continue
        }

        if (res.status >= 500 && attempt < this.config.retryAttempts - 1) {
          const wait = this.backoffDelay(attempt)
          warn(`Server error ${res.status}, retrying in ${(wait / 1000).toFixed(1)}s...`)
          await sleep(wait)
          continue
        }

        return res
      } catch (e) {
        if (attempt < this.config.retryAttempts - 1) {
          const wait = this.backoffDelay(attempt)
          warn(`Network error, retrying in ${(wait / 1000).toFixed(1)}s...`)
          await sleep(wait)
          continue
        }
        throw e
      }
    }

    throw new Error('Max retries exceeded')
  }

  /** Exponential backoff with jitter: base * 2^attempt + random jitter */
  private backoffDelay(attempt: number): number {
    const base = this.config.retryDelay * Math.pow(2, attempt)
    const jitter = Math.random() * this.config.retryDelay * 0.5
    return base + jitter
  }

  /** Attempt to refresh the session token. Returns true on success. */
  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/session')
      if (!res.ok) return false
      const session = await res.json()
      if (!session.accessToken) return false
      this.headers.authorization = `Bearer ${session.accessToken}`
      if (session.account?.id) {
        this.headers['chatgpt-account-id'] = session.account.id
      }
      return true
    } catch {
      return false
    }
  }

  // --- Filtering ---

  private filterConversations(conversations: ConversationSummary[]): ConversationSummary[] {
    let filtered = conversations

    // Filter by search query (title keyword)
    if (this.config.searchQuery) {
      const query = this.config.searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        (c.title || '').toLowerCase().includes(query),
      )
      log(`🔍 Search "${this.config.searchQuery}": ${filtered.length} matches`)
    }

    // Filter by timestamp (incremental export)
    if (this.config.afterTimestamp !== null) {
      const afterSec = this.config.afterTimestamp / 1000 // convert ms to seconds
      filtered = filtered.filter(c => c.update_time > afterSec)
      log(`📅 After ${new Date(this.config.afterTimestamp).toISOString().slice(0, 10)}: ${filtered.length} matches`)
    }

    return filtered
  }

  // --- List all conversations ---

  private async listAll(): Promise<ConversationSummary[]> {
    log('📂 Fetching conversation list...')
    const all: ConversationSummary[] = []
    let offset = 0

    while (!this.aborted) {
      const url = `/backend-api/conversations?offset=${offset}&limit=${this.config.batchSize}&order=updated`
      const res = await this.fetchWithRetry(url)
      const data = await res.json()

      if (!data.items || data.items.length === 0) break

      all.push(...data.items)
      offset += data.items.length
      log(`  Found ${all.length} conversations so far...`)

      await sleep(this.config.listDelay)
    }

    return all
  }

  // --- Download conversations concurrently ---

  private async downloadAllConcurrent(conversations: ConversationSummary[]): Promise<unknown[]> {
    log(`⬇️  Downloading ${conversations.length} conversations (concurrency: ${this.config.concurrency})...`)
    const results: unknown[] = new Array(conversations.length)
    let nextIndex = 0

    const worker = async (): Promise<void> => {
      while (!this.aborted) {
        const index = nextIndex++
        if (index >= conversations.length) break

        const convo = conversations[index]
        this.progress.currentTitle = convo.title || convo.id

        try {
          const res = await this.fetchWithRetry(`/backend-api/conversation/${convo.id}`)

          if (res.ok) {
            results[index] = await res.json()
            this.progress.downloaded++
          } else {
            warn(`[${index + 1}/${conversations.length}] ${convo.title || convo.id} → HTTP ${res.status}`)
            results[index] = {
              id: convo.id,
              title: convo.title,
              error: `HTTP ${res.status}`,
              create_time: convo.create_time,
              update_time: convo.update_time,
            }
            this.progress.errors++
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          warn(`[${index + 1}/${conversations.length}] ${convo.title || convo.id} → ${msg}`)
          results[index] = {
            id: convo.id,
            title: convo.title,
            error: msg,
            create_time: convo.create_time,
            update_time: convo.update_time,
          }
          this.progress.errors++
        }

        // Update rate and ETA
        this.updateRateAndEta()
        this.emitProgress()

        // Rate limiting delay between downloads
        await sleep(this.config.downloadDelay)
      }
    }

    // Launch concurrent workers
    const workers: Promise<void>[] = []
    for (let i = 0; i < this.config.concurrency; i++) {
      workers.push(worker())
    }
    await Promise.all(workers)

    return results
  }

  /** Update download rate and ETA based on progress. */
  private updateRateAndEta(): void {
    const elapsed = (Date.now() - this.progress.startedAt) / 1000
    const completed = this.progress.downloaded + this.progress.errors

    if (elapsed > 0 && completed > 0) {
      this.progress.rate = (completed / elapsed) * 60 // per minute
      const remaining = this.progress.total - completed
      const secondsPerItem = elapsed / completed
      this.progress.eta = Math.ceil(remaining * secondsPerItem)
    }
  }

  private emitProgress(): void {
    const snapshot = { ...this.progress }
    this.onProgress?.(snapshot)
    this.emit('progress', snapshot)
  }
}

/** Download a formatted file as a browser download. */
export function downloadFile(file: FormattedFile): void {
  const sizeMB = (file.content.length / 1024 / 1024).toFixed(1)
  const blob = new Blob([file.content], { type: file.mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)

  log(`💾 File saved: ${file.filename} (${sizeMB} MB)`)
}

/**
 * Download export data as JSON (legacy convenience function).
 * @deprecated Use downloadFile(formatExport(data, 'json')) instead.
 */
export function downloadJson(data: ExportResult): void {
  downloadFile(formatExport(data, 'json'))
}

/** Format and download export data in the configured format. */
export function downloadExport(data: ExportResult, config: Partial<Config> = {}): void {
  const format = config.format ?? DEFAULT_CONFIG.format
  const file = formatExport(data, format)
  downloadFile(file)
}
