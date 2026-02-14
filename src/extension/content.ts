import { ExportEngine, downloadJson, type Progress } from '../core'

let engine: ExportEngine | null = null

const reportProgress = (progress: Progress): void => {
  chrome.runtime.sendMessage({ type: 'progress', data: progress })
  const { downloaded, total, errors, status, rate } = progress
  console.log(
    `[ChatGPT Export] ${status} — ${downloaded}/${total} downloaded, ${errors} errors, ${rate.toFixed(0)}/min`,
  )
}

const start = (): void => {
  if (engine) {
    console.warn('[ChatGPT Export] Already running — stop first')
    return
  }

  engine = new ExportEngine({}, async (progress) => {
    reportProgress(progress)
    if (progress.status === 'done' || progress.status === 'error') {
      engine = null
    }
  })

  console.log('[ChatGPT Export] Starting export...')
  engine.run().then((result) => {
    if (result) {
      downloadJson(result)
      console.log(`[ChatGPT Export] ✅ Done! ${result.meta.successful} conversations exported.`)
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
      start()
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
  }
})

console.log('[ChatGPT Export] Extension loaded — use the popup to start.')
