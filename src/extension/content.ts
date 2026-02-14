import { ExportEngine, downloadExport, type Progress, type Config, type ExportFormat } from '../core'

let engine: ExportEngine | null = null
let currentConfig: Partial<Config> = {}

const reportProgress = (progress: Progress): void => {
  chrome.runtime.sendMessage({ type: 'progress', data: progress })
  const { downloaded, total, errors, status, rate, eta, currentTitle } = progress
  const etaStr = eta !== null ? ` ETA ${formatEta(eta)}` : ''
  console.log(
    `[ChatGPT Export] ${status} — ${downloaded}/${total} downloaded, ${errors} errors, ${rate.toFixed(0)}/min${etaStr}${currentTitle ? ` — ${currentTitle}` : ''}`,
  )
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const start = (config: Partial<Config> = {}): void => {
  if (engine) {
    console.warn('[ChatGPT Export] Already running — stop first')
    return
  }

  currentConfig = config

  engine = new ExportEngine(config, (progress) => {
    reportProgress(progress)
    if (progress.status === 'done' || progress.status === 'error') {
      engine = null
    }
  })

  console.log('[ChatGPT Export] Starting export...')
  engine.run().then((result) => {
    if (result) {
      downloadExport(result, currentConfig)
      console.log(`[ChatGPT Export] ✅ Done! ${result.meta.successful} conversations exported as ${currentConfig.format || 'json'}.`)
    }
  })
}

const stop = (): void => {
  if (!engine) return
  engine.abort()
  engine = null
  console.log('[ChatGPT Export] Stopped')
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.action) {
    case 'start':
      start(message.config as Partial<Config> | undefined)
      sendResponse({ ok: true })
      break
    case 'stop':
      stop()
      sendResponse({ ok: true })
      break
    case 'toggle':
      engine ? stop() : start()
      sendResponse({ ok: true })
      break
    case 'status':
      sendResponse({ running: !!engine })
      break
    case 'setFormat':
      currentConfig.format = message.format as ExportFormat
      sendResponse({ ok: true })
      break
  }
})

console.log('[ChatGPT Export] Extension loaded — use the popup to start.')
