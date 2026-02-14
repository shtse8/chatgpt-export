// ==UserScript==
// @name         ChatGPT Export
// @namespace    https://github.com/shtse8/chatgpt-export
// @version      __VERSION__
// @description  Export all your ChatGPT conversations to JSON, Markdown, Text, or HTML
// @author       Kyle Tse
// @match        https://chatgpt.com/*
// @grant        none
// @homepage     https://github.com/shtse8/chatgpt-export
// @supportURL   https://github.com/shtse8/chatgpt-export/issues
// @license      MIT
// @downloadURL  https://github.com/shtse8/chatgpt-export/releases/latest/download/chatgpt-export.user.js
// @updateURL    https://github.com/shtse8/chatgpt-export/releases/latest/download/chatgpt-export.user.js
// ==/UserScript==

import { ExportEngine, downloadExport, type Progress, type ExportFormat, AVAILABLE_FORMATS, FORMAT_LABELS } from '../core'

// --- Floating Widget UI ---

function createWidget(): void {
  const container = document.createElement('div')
  container.innerHTML = `
<div id="cgpt-export-widget" style="
  position: fixed; bottom: 20px; right: 20px; z-index: 99999;
  background: #1a1a2e; color: #e0e0e0; border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4); padding: 14px 18px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px; min-width: 240px; user-select: none;
  border: 1px solid #333; transition: all 0.2s;
">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
    <span style="font-weight:600; font-size:14px;">💬 ChatGPT Export</span>
    <button id="cgpt-minimize" style="
      background:none; border:none; color:#888; cursor:pointer; font-size:16px; padding:0 4px;
    ">−</button>
  </div>
  <div id="cgpt-body">
    <div style="margin-bottom:8px;">
      <label style="font-size:11px; color:#888; display:block; margin-bottom:3px;">Format</label>
      <select id="cgpt-format" style="
        width:100%; padding:5px 8px; border-radius:6px; border:1px solid #444;
        background:#16213e; color:#e0e0e0; font-size:12px; cursor:pointer;
      ">
        ${AVAILABLE_FORMATS.map(f => `<option value="${f}">${FORMAT_LABELS[f]}</option>`).join('')}
      </select>
    </div>
    <div id="cgpt-progress" style="display:none;">
      <div style="background:#16213e; border-radius:3px; height:5px; overflow:hidden; margin-bottom:6px;">
        <div id="cgpt-bar" style="height:100%; background:linear-gradient(90deg,#10b981,#3b82f6); width:0%; transition:width 0.3s;"></div>
      </div>
      <div id="cgpt-stats" style="font-size:11px; color:#888;"></div>
    </div>
    <button id="cgpt-start" style="
      width:100%; padding:8px; border:none; border-radius:6px; font-size:13px; font-weight:600;
      background:linear-gradient(135deg,#10b981,#3b82f6); color:#fff; cursor:pointer; margin-top:4px;
    ">▶ Export All</button>
    <button id="cgpt-stop" style="
      width:100%; padding:8px; border:none; border-radius:6px; font-size:13px; font-weight:600;
      background:#ef4444; color:#fff; cursor:pointer; margin-top:4px; display:none;
    ">■ Stop</button>
  </div>
</div>
`
  document.body.appendChild(container)

  let engine: ExportEngine | null = null
  let minimized = false

  const widget = document.getElementById('cgpt-export-widget')!
  const body = document.getElementById('cgpt-body')!
  const progress = document.getElementById('cgpt-progress')!
  const bar = document.getElementById('cgpt-bar')!
  const stats = document.getElementById('cgpt-stats')!
  const startBtn = document.getElementById('cgpt-start')!
  const stopBtn = document.getElementById('cgpt-stop')!
  const minimizeBtn = document.getElementById('cgpt-minimize')!
  const formatSelect = document.getElementById('cgpt-format') as HTMLSelectElement

  minimizeBtn.addEventListener('click', () => {
    minimized = !minimized
    body.style.display = minimized ? 'none' : 'block'
    minimizeBtn.textContent = minimized ? '+' : '−'
    widget.style.minWidth = minimized ? 'auto' : '240px'
  })

  const formatEta = (seconds: number): string => {
    if (seconds <= 0) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `ETA ${m}m ${s}s` : `ETA ${s}s`
  }

  const updateUI = (p: Progress): void => {
    const running = !['idle', 'done', 'error'].includes(p.status)
    startBtn.style.display = running ? 'none' : 'block'
    stopBtn.style.display = running ? 'block' : 'none'
    progress.style.display = p.total > 0 || running ? 'block' : 'none'
    formatSelect.disabled = running

    if (p.total > 0) {
      const pct = Math.min(100, (p.downloaded / p.total) * 100)
      bar.style.width = `${pct}%`
    }

    const etaStr = p.eta !== null && p.eta > 0 ? ` · ${formatEta(p.eta)}` : ''
    const statusMap: Record<string, string> = {
      authenticating: '🔑 Auth...',
      listing: '📂 Listing...',
      downloading: `⬇️ ${p.downloaded}/${p.total} (${p.rate.toFixed(0)}/min)${etaStr}`,
      done: `✅ Done! ${p.downloaded} exported`,
      error: `❌ ${p.error || 'Error'}`,
    }
    stats.textContent = statusMap[p.status] ?? p.status
  }

  startBtn.addEventListener('click', () => {
    if (engine) return
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
  })
}

// Wait for page to load, then inject widget
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWidget)
} else {
  createWidget()
}
