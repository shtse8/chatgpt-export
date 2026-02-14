/**
 * ChatGPT Export — Standalone console injection script.
 * Paste into DevTools console on chatgpt.com to export all conversations.
 */
import { ExportEngine, downloadJson } from '../core'

const engine = new ExportEngine({}, (progress) => {
  const { downloaded, total, errors, status, rate } = progress
  const elapsed = ((Date.now() - progress.startedAt) / 1000).toFixed(0)
  console.log(
    `[ChatGPT Export] ${status} | ${downloaded}/${total} | ${errors} errors | ${rate.toFixed(0)}/min | ${elapsed}s`,
  )
})

// Allow stopping from console
;(window as unknown as Record<string, unknown>).__chatgpt_export_stop = () => engine.abort()

console.log('💬 ChatGPT Export — Starting...')
console.log('💡 To stop: __chatgpt_export_stop()')

engine.run().then((result) => {
  if (result) {
    downloadJson(result)
    console.log(`✅ Done! ${result.meta.successful} conversations exported.`)
  } else {
    console.log('❌ Export failed or no conversations found.')
  }
})
