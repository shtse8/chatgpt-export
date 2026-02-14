/**
 * ChatGPT Export — Standalone injection script.
 * Paste into DevTools console on chatgpt.com to export all conversations.
 * Creates a floating widget UI — no system dialogs, no console-only output.
 */
import { ExportEngine, downloadExport, type Progress, type ExportFormat, AVAILABLE_FORMATS, FORMAT_LABELS } from '../core'

;(() => {
  // Remove any existing widget
  document.getElementById('cgpt-export-container')?.remove()

  const container = document.createElement('div')
  container.id = 'cgpt-export-container'
  container.innerHTML = `
<div id="cgpt-export-widget" style="
  position:fixed; bottom:20px; right:20px; z-index:99999;
  background:#1e1e32; color:#e8e8e8; border-radius:14px;
  box-shadow:0 8px 32px rgba(0,0,0,0.5); padding:16px 20px;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:13px; min-width:260px; user-select:none;
  border:1px solid rgba(255,255,255,0.08); backdrop-filter:blur(16px);
">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
    <span style="font-weight:700; font-size:14px;">💬 ChatGPT Export</span>
    <div style="display:flex; gap:4px;">
      <button id="cgpt-min" style="background:none;border:none;color:#666;cursor:pointer;font-size:16px;padding:0 4px;line-height:1;" title="Minimize">−</button>
      <button id="cgpt-close" style="background:none;border:none;color:#666;cursor:pointer;font-size:14px;padding:0 4px;line-height:1;" title="Close">✕</button>
    </div>
  </div>
  <div id="cgpt-body">
    <div style="margin-bottom:10px;">
      <label style="font-size:11px;color:#888;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.3px;">Format</label>
      <select id="cgpt-format" style="
        width:100%;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
        background:rgba(255,255,255,0.06);color:#e8e8e8;font-size:12px;cursor:pointer;outline:none;
      ">
        ${AVAILABLE_FORMATS.map(f => `<option value="${f}">${FORMAT_LABELS[f]}</option>`).join('')}
      </select>
    </div>
    <div id="cgpt-progress" style="display:none;">
      <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:5px;overflow:hidden;margin-bottom:8px;">
        <div id="cgpt-bar" style="height:100%;background:linear-gradient(90deg,#10b981,#3b82f6);width:0%;transition:width 0.3s ease;border-radius:4px;"></div>
      </div>
      <div id="cgpt-stats" style="font-size:11px;color:#999;margin-bottom:6px;"></div>
    </div>
    <div id="cgpt-error" style="display:none;font-size:11px;color:#ef4444;background:rgba(239,68,68,0.1);padding:6px 10px;border-radius:6px;margin-bottom:8px;"></div>
    <button id="cgpt-start" style="
      width:100%;padding:9px;border:none;border-radius:8px;font-size:13px;font-weight:600;
      background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;cursor:pointer;
      transition:opacity 0.2s;
    ">▶ Export All</button>
    <button id="cgpt-stop" style="
      width:100%;padding:9px;border:none;border-radius:8px;font-size:13px;font-weight:600;
      background:#ef4444;color:#fff;cursor:pointer;display:none;
      transition:opacity 0.2s;
    ">■ Stop</button>
  </div>
</div>
`
  document.body.appendChild(container)

  let engine: ExportEngine | null = null
  let minimized = false

  const $ = (id: string) => document.getElementById(id)!
  const widget = $('cgpt-export-widget')
  const body = $('cgpt-body')
  const progressEl = $('cgpt-progress')
  const bar = $('cgpt-bar')
  const stats = $('cgpt-stats')
  const errorEl = $('cgpt-error')
  const startBtn = $('cgpt-start') as HTMLButtonElement
  const stopBtn = $('cgpt-stop') as HTMLButtonElement
  const minBtn = $('cgpt-min')
  const closeBtn = $('cgpt-close')
  const formatSelect = $('cgpt-format') as HTMLSelectElement

  minBtn.addEventListener('click', () => {
    minimized = !minimized
    body.style.display = minimized ? 'none' : 'block'
    minBtn.textContent = minimized ? '+' : '−'
    widget.style.minWidth = minimized ? 'auto' : '260px'
  })

  closeBtn.addEventListener('click', () => {
    engine?.abort()
    container.remove()
  })

  const formatEta = (seconds: number): string => {
    if (seconds <= 0) return ''
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return m > 0 ? `${m}m ${s}s left` : `${s}s left`
  }

  const updateUI = (p: Progress): void => {
    const running = !['idle', 'done', 'error'].includes(p.status)
    startBtn.style.display = running ? 'none' : 'block'
    stopBtn.style.display = running ? 'block' : 'none'
    progressEl.style.display = (p.total > 0 || running) ? 'block' : 'none'
    formatSelect.disabled = running

    if (p.total > 0) {
      bar.style.width = `${Math.min(100, (p.downloaded / p.total) * 100)}%`
    }

    errorEl.style.display = p.status === 'error' ? 'block' : 'none'
    if (p.status === 'error') {
      errorEl.textContent = p.error || 'Something went wrong'
    }

    const etaStr = p.eta !== null && p.eta > 0 ? ` · ${formatEta(p.eta)}` : ''
    const statusMap: Record<string, string> = {
      authenticating: '🔑 Authenticating...',
      listing: '📂 Finding conversations...',
      downloading: `⬇️ ${p.downloaded}/${p.total} · ${p.rate.toFixed(0)}/min${etaStr}`,
      done: `✅ Done — ${p.downloaded} conversations exported`,
      error: '❌ Export failed',
    }
    stats.textContent = statusMap[p.status] ?? p.status

    if (p.status === 'done') {
      startBtn.textContent = '▶ Export Again'
      bar.style.background = 'linear-gradient(90deg, #10b981, #10b981)'
    }
  }

  startBtn.addEventListener('click', () => {
    if (engine) return
    errorEl.style.display = 'none'
    bar.style.width = '0%'
    bar.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)'
    startBtn.textContent = '▶ Export All'

    const format = formatSelect.value as ExportFormat
    engine = new ExportEngine({ format }, (p) => {
      updateUI(p)
      if (p.status === 'done' || p.status === 'error') engine = null
    })
    engine.run().then((result) => {
      if (result) downloadExport(result, { format })
    })
  })

  stopBtn.addEventListener('click', () => {
    engine?.abort()
    engine = null
    startBtn.style.display = 'block'
    stopBtn.style.display = 'none'
    stats.textContent = '⏹ Stopped'
  })

  console.log('💬 ChatGPT Export widget loaded — use the floating panel at bottom-right')
})()
