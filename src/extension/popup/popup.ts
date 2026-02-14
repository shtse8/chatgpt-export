import './popup.css'
import type { ExportFormat } from '../../core/formatters'

// --- DOM Elements ---

const formatSelect = document.getElementById('formatSelect') as HTMLSelectElement
const scopeRadios = document.querySelectorAll<HTMLInputElement>('input[name="scope"]')
const searchField = document.getElementById('searchField') as HTMLDivElement
const searchInput = document.getElementById('searchInput') as HTMLInputElement

const progressSection = document.getElementById('progressSection') as HTMLDivElement
const statusText = document.getElementById('statusText') as HTMLSpanElement
const currentTitle = document.getElementById('currentTitle') as HTMLDivElement
const currentTitleText = document.getElementById('currentTitleText') as HTMLSpanElement
const progressRing = document.getElementById('progressRing') as unknown as SVGCircleElement
const progressPct = document.getElementById('progressPct') as HTMLSpanElement
const downloadedCount = document.getElementById('downloadedCount') as HTMLSpanElement
const totalCount = document.getElementById('totalCount') as HTMLSpanElement
const rateText = document.getElementById('rateText') as HTMLSpanElement
const etaText = document.getElementById('etaText') as HTMLSpanElement
const elapsedText = document.getElementById('elapsedText') as HTMLSpanElement
const errorCount = document.getElementById('errorCount') as HTMLSpanElement

const errorDisplay = document.getElementById('errorDisplay') as HTMLDivElement
const errorMessage = document.getElementById('errorMessage') as HTMLSpanElement

const startBtn = document.getElementById('startBtn') as HTMLButtonElement
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement
const settingsSection = document.getElementById('settingsSection') as HTMLElement

const historySection = document.getElementById('historySection') as HTMLElement
const historyDate = document.getElementById('historyDate') as HTMLSpanElement
const historyCount = document.getElementById('historyCount') as HTMLSpanElement
const historyFormat = document.getElementById('historyFormat') as HTMLSpanElement

// --- State ---

let elapsedInterval: ReturnType<typeof setInterval> | null = null
let startedAt = 0

// --- Storage ---

interface StoredPrefs {
  format: ExportFormat
  scope: 'all' | 'new' | 'search'
  searchQuery: string
  lastExportDate: string | null
  lastExportCount: number | null
  lastExportFormat: string | null
  lastExportTimestamp: number | null
}

const DEFAULT_PREFS: StoredPrefs = {
  format: 'json',
  scope: 'all',
  searchQuery: '',
  lastExportDate: null,
  lastExportCount: null,
  lastExportFormat: null,
  lastExportTimestamp: null,
}

async function loadPrefs(): Promise<StoredPrefs> {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_PREFS, (items) => {
      resolve(items as StoredPrefs)
    })
  })
}

async function savePrefs(prefs: Partial<StoredPrefs>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(prefs, resolve)
  })
}

// --- Communication ---

function sendToContent(message: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return resolve(null)
      chrome.tabs.sendMessage(tab.id, message, resolve)
    })
  })
}

// --- UI State ---

function setRunning(running: boolean): void {
  startBtn.hidden = running
  stopBtn.hidden = !running
  progressSection.hidden = !running
  settingsSection.style.opacity = running ? '0.5' : '1'
  settingsSection.style.pointerEvents = running ? 'none' : 'auto'

  if (running) {
    errorDisplay.hidden = true
    startedAt = Date.now()
    startElapsedTimer()
  } else {
    stopElapsedTimer()
  }
}

function startElapsedTimer(): void {
  stopElapsedTimer()
  elapsedInterval = setInterval(() => {
    if (startedAt > 0) {
      elapsedText.textContent = formatDuration((Date.now() - startedAt) / 1000)
    }
  }, 1000)
}

function stopElapsedTimer(): void {
  if (elapsedInterval) {
    clearInterval(elapsedInterval)
    elapsedInterval = null
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatEtaDisplay(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—'
  return formatDuration(seconds)
}

// --- Scope Radio Handler ---

function onScopeChange(): void {
  const scope = getSelectedScope()
  searchField.hidden = scope !== 'search'
}

function getSelectedScope(): string {
  for (const radio of scopeRadios) {
    if (radio.checked) return radio.value
  }
  return 'all'
}

// --- Event Handlers ---

scopeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    onScopeChange()
    savePrefs({ scope: getSelectedScope() as StoredPrefs['scope'] })
  })
})

formatSelect.addEventListener('change', () => {
  savePrefs({ format: formatSelect.value as ExportFormat })
})

searchInput.addEventListener('input', () => {
  savePrefs({ searchQuery: searchInput.value })
})

startBtn.addEventListener('click', async () => {
  const format = formatSelect.value as ExportFormat
  const scope = getSelectedScope()

  const config: Record<string, unknown> = { format }

  if (scope === 'search' && searchInput.value.trim()) {
    config.searchQuery = searchInput.value.trim()
  }

  if (scope === 'new') {
    const prefs = await loadPrefs()
    if (prefs.lastExportTimestamp) {
      config.afterTimestamp = prefs.lastExportTimestamp
    }
  }

  await sendToContent({ action: 'start', config })
  setRunning(true)
})

stopBtn.addEventListener('click', async () => {
  await sendToContent({ action: 'stop' })
  setRunning(false)
})

// --- Progress Updates ---

const STATUS_MAP: Record<string, string> = {
  authenticating: '🔑 Authenticating...',
  listing: '📂 Listing conversations...',
  downloading: '⬇️ Downloading...',
  saving: '💾 Saving...',
  done: '✅ Export complete!',
  error: '❌ Error',
  idle: '⏸ Idle',
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 35 // ~220

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type !== 'progress') return

  const { downloaded, total, rate, status, eta, errors, error: errorMsg, currentTitle: title } = message.data

  // Progress percentage
  const pct = total > 0 ? Math.min(100, (downloaded / total) * 100) : 0
  progressPct.textContent = `${Math.round(pct)}%`

  // Progress ring
  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE
  progressRing.style.strokeDashoffset = String(offset)

  // Stats
  downloadedCount.textContent = String(downloaded)
  totalCount.textContent = total > 0 ? String(total) : '—'
  rateText.textContent = rate > 0 ? rate.toFixed(0) : '—'
  etaText.textContent = formatEtaDisplay(eta)
  errorCount.textContent = String(errors)

  // Status text
  statusText.textContent = STATUS_MAP[status] ?? status

  // Status class for pulse dot color
  const statusIndicator = document.querySelector('.status-row')
  statusIndicator?.classList.remove('status-done', 'status-error', 'status-listing', 'status-downloading')
  if (status === 'done') statusIndicator?.classList.add('status-done')
  else if (status === 'error') statusIndicator?.classList.add('status-error')
  else if (status === 'listing') statusIndicator?.classList.add('status-listing')
  else if (status === 'downloading') statusIndicator?.classList.add('status-downloading')

  // Current title
  if (title && status === 'downloading') {
    currentTitle.hidden = false
    currentTitleText.textContent = title
  } else {
    currentTitle.hidden = true
  }

  // Error display
  if (status === 'error' && errorMsg) {
    errorDisplay.hidden = false
    errorMessage.textContent = errorMsg
  }

  // Export complete
  if (status === 'done' || status === 'error') {
    setRunning(false)

    if (status === 'done' && downloaded > 0) {
      // Save export history
      const now = new Date()
      await savePrefs({
        lastExportDate: now.toISOString().slice(0, 16).replace('T', ' '),
        lastExportCount: downloaded,
        lastExportFormat: formatSelect.value.toUpperCase(),
        lastExportTimestamp: now.getTime(),
      })
      updateHistory()
    }
  }
})

// --- History Display ---

async function updateHistory(): Promise<void> {
  const prefs = await loadPrefs()
  if (prefs.lastExportDate) {
    historySection.hidden = false
    historyDate.textContent = prefs.lastExportDate
    historyCount.textContent = String(prefs.lastExportCount ?? 0)
    historyFormat.textContent = prefs.lastExportFormat ?? 'JSON'
  }
}

// --- Init ---

async function init(): Promise<void> {
  // Load preferences
  const prefs = await loadPrefs()
  formatSelect.value = prefs.format
  searchInput.value = prefs.searchQuery
  for (const radio of scopeRadios) {
    radio.checked = radio.value === prefs.scope
  }
  onScopeChange()

  // Check if already running
  const res = await sendToContent({ action: 'status' })
  if (res && (res as { running: boolean }).running) {
    setRunning(true)
  }

  // Show export history
  updateHistory()
}

init()
