import { type Config, DEFAULT_CONFIG } from './config'
import { EventEmitter } from './event-emitter'
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
  rate: number // conversations per minute
  startedAt: number
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
 * Emits typed events via EventEmitter and also supports a legacy callback.
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
    }
  }

  abort(): void {
    this.aborted = true
  }

  async run(): Promise<ExportResult | null> {
    this.aborted = false
    this.progress.startedAt = Date.now()
    this.progress.status = 'authenticating'
    this.emitProgress()

    try {
      // Step 1: Authenticate
      const session = await this.getSession()
      if (!session) return null

      // Step 2: List all conversations
      this.progress.status = 'listing'
      this.emitProgress()
      const conversations = await this.listAll()
      this.progress.total = conversations.length

      if (conversations.length === 0) {
        warn('No conversations found.')
        this.progress.status = 'done'
        this.emitProgress()
        return null
      }

      log(`📊 Total: ${conversations.length} conversations to export`)

      // Step 3: Download each conversation
      this.progress.status = 'downloading'
      this.emitProgress()
      const results = await this.downloadAll(conversations)

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
        },
        conversations: results,
      }

      this.progress.status = 'done'
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

        // Token expired — attempt refresh (up to once per retry cycle)
        if (res.status === 401) {
          warn('Token expired, refreshing...')
          const refreshed = await this.refreshToken()
          if (refreshed) {
            log('Token refreshed')
            continue
          }
          // If refresh failed, fall through to retry delay
        }

        // Rate limit — respect Retry-After header if present
        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after')
          const wait = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.backoffDelay(attempt)
          warn(`Rate limited, waiting ${(wait / 1000).toFixed(1)}s...`)
          await sleep(wait)
          continue
        }

        // Other server errors — retry with backoff
        if (res.status >= 500 && attempt < this.config.retryAttempts - 1) {
          const wait = this.backoffDelay(attempt)
          warn(`Server error ${res.status}, retrying in ${(wait / 1000).toFixed(1)}s...`)
          await sleep(wait)
          continue
        }

        // Non-retryable error or final attempt
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

  // --- Download all conversations ---

  private async downloadAll(conversations: ConversationSummary[]): Promise<unknown[]> {
    log('⬇️  Downloading conversations...')
    const results: unknown[] = []

    for (let i = 0; i < conversations.length; i++) {
      if (this.aborted) break

      const convo = conversations[i]

      try {
        const res = await this.fetchWithRetry(`/backend-api/conversation/${convo.id}`)

        if (res.ok) {
          results.push(await res.json())
          this.progress.downloaded++
        } else {
          warn(`[${i + 1}/${conversations.length}] ${convo.title || convo.id} → HTTP ${res.status}`)
          results.push({
            id: convo.id,
            title: convo.title,
            error: `HTTP ${res.status}`,
            create_time: convo.create_time,
            update_time: convo.update_time,
          })
          this.progress.errors++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        warn(`[${i + 1}/${conversations.length}] ${convo.title || convo.id} → ${msg}`)
        results.push({
          id: convo.id,
          title: convo.title,
          error: msg,
          create_time: convo.create_time,
          update_time: convo.update_time,
        })
        this.progress.errors++
      }

      // Update rate
      const elapsed = (Date.now() - this.progress.startedAt) / 1000
      this.progress.rate = elapsed > 0 ? ((i + 1) / elapsed) * 60 : 0
      this.emitProgress()

      // Rate limiting
      if (i % this.config.downloadBatch === 0) {
        await sleep(this.config.downloadDelay)
      }
    }

    return results
  }

  private emitProgress(): void {
    const snapshot = { ...this.progress }
    this.onProgress?.(snapshot)
    this.emit('progress', snapshot)
  }
}

/** Download a JSON blob as a file in the browser */
export function downloadJson(data: ExportResult): void {
  const json = JSON.stringify(data, null, 2)
  const sizeMB = (json.length / 1024 / 1024).toFixed(1)
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `chatgpt-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)

  log(`💾 File saved: ${a.download} (${sizeMB} MB)`)
}
