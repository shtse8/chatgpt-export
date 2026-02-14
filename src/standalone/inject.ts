/**
 * ChatGPT Export — Standalone console injection script.
 * Paste into DevTools console on chatgpt.com to export all conversations.
 */
import { ExportEngine, downloadExport, type ExportFormat, AVAILABLE_FORMATS } from '../core'

// Ask user for format (default to JSON if cancelled)
const formatInput = prompt(
  `Choose export format:\n${AVAILABLE_FORMATS.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nEnter number or name (default: json):`,
)

let format: ExportFormat = 'json'
if (formatInput) {
  const trimmed = formatInput.trim().toLowerCase()
  const byNumber = AVAILABLE_FORMATS[parseInt(trimmed, 10) - 1]
  const byName = AVAILABLE_FORMATS.find(f => f === trimmed)
  format = byNumber || byName || 'json'
}

const engine = new ExportEngine({ format }, (progress) => {
  const { downloaded, total, errors, status, rate, eta } = progress
  const elapsed = ((Date.now() - progress.startedAt) / 1000).toFixed(0)
  const etaStr = eta !== null && eta > 0 ? ` | ETA ${Math.ceil(eta / 60)}m` : ''
  console.log(
    `[ChatGPT Export] ${status} | ${downloaded}/${total} | ${errors} errors | ${rate.toFixed(0)}/min | ${elapsed}s${etaStr}`,
  )
})

// Allow stopping from console
;(window as unknown as Record<string, unknown>).__chatgpt_export_stop = () => engine.abort()

console.log(`💬 ChatGPT Export — Starting (format: ${format})...`)
console.log('💡 To stop: __chatgpt_export_stop()')

engine.run().then((result) => {
  if (result) {
    downloadExport(result, { format })
    console.log(`✅ Done! ${result.meta.successful} conversations exported as ${format}.`)
  } else {
    console.log('❌ Export failed or no conversations found.')
  }
})
