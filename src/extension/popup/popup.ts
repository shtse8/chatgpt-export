import './popup.css'

const startBtn = document.getElementById('startBtn') as HTMLButtonElement
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement
const progressSection = document.getElementById('progressSection') as HTMLDivElement
const progressFill = document.getElementById('progressFill') as HTMLDivElement
const downloadedCount = document.getElementById('downloadedCount') as HTMLSpanElement
const totalCount = document.getElementById('totalCount') as HTMLSpanElement
const rateText = document.getElementById('rateText') as HTMLSpanElement
const statusText = document.getElementById('statusText') as HTMLSpanElement

const sendToContent = (message: Record<string, unknown>): Promise<unknown> =>
  new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return resolve(null)
      chrome.tabs.sendMessage(tab.id, message, resolve)
    })
  })

const setRunning = (running: boolean): void => {
  startBtn.hidden = running
  stopBtn.hidden = !running
  progressSection.hidden = !running
}

startBtn.addEventListener('click', async () => {
  await sendToContent({ action: 'start' })
  setRunning(true)
})

stopBtn.addEventListener('click', async () => {
  await sendToContent({ action: 'stop' })
  setRunning(false)
})

sendToContent({ action: 'status' }).then((res: unknown) => {
  if (res && (res as { running: boolean }).running) setRunning(true)
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'progress') {
    const { downloaded, total, rate, status } = message.data
    const pct = total > 0 ? Math.min(100, (downloaded / total) * 100) : 0

    progressFill.style.width = `${pct}%`
    downloadedCount.textContent = String(downloaded)
    totalCount.textContent = total > 0 ? String(total) : '...'
    rateText.textContent = `${rate.toFixed(0)}/min`

    const statusMap: Record<string, string> = {
      authenticating: '🔑 Authenticating...',
      listing: '📂 Listing...',
      downloading: '⬇️ Downloading...',
      saving: '💾 Saving...',
      done: '✅ Done!',
      error: '❌ Error',
      idle: '⏸ Idle',
    }
    statusText.textContent = statusMap[status] ?? status

    if (status === 'done' || status === 'error') setRunning(false)
  }
})
