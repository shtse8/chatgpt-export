import type { ExportResult } from '../export-engine'
import type { FormattedFile } from './index'
import { parseConversation, formatTimestamp, formatRole } from './conversation-parser'

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Convert plain text content to HTML, preserving code blocks and line breaks.
 */
function contentToHtml(text: string): string {
  // Handle fenced code blocks
  const parts: string[] = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push(inlineTextToHtml(text.slice(lastIndex, match.index)))
    }
    // Code block
    const lang = match[1] ? ` data-lang="${escapeHtml(match[1])}"` : ''
    parts.push(`<pre><code${lang}>${escapeHtml(match[2])}</code></pre>`)
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(inlineTextToHtml(text.slice(lastIndex)))
  }

  return parts.join('')
}

/**
 * Convert inline text to HTML (handles line breaks and inline code).
 */
function inlineTextToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>\n')
}

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #f7f7f8;
  --surface: #ffffff;
  --text: #374151;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --user-bg: #f3f4f6;
  --assistant-bg: #ffffff;
  --accent: #10a37f;
  --code-bg: #1e1e1e;
  --code-text: #d4d4d4;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #212121;
    --surface: #2f2f2f;
    --text: #ececec;
    --text-muted: #9b9b9b;
    --border: #444444;
    --user-bg: #2f2f2f;
    --assistant-bg: #212121;
    --code-bg: #1e1e1e;
    --code-text: #d4d4d4;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  font-size: 15px;
}

.export-header {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px 16px;
  text-align: center;
}

.export-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.export-header .meta {
  font-size: 13px;
  color: var(--text-muted);
}

.conversation {
  max-width: 800px;
  margin: 16px auto;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.conversation-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.conversation-header .date {
  font-size: 12px;
  color: var(--text-muted);
}

.message {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.message:last-child {
  border-bottom: none;
}

.message.user {
  background: var(--user-bg);
}

.message.assistant {
  background: var(--assistant-bg);
}

.message .role {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  margin-bottom: 6px;
}

.message .content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message pre {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.5;
}

.message code {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.message pre code {
  background: none;
  padding: 0;
}

.error-entry {
  padding: 16px 20px;
  color: #ef4444;
  font-style: italic;
}

footer {
  max-width: 800px;
  margin: 24px auto;
  padding: 16px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}
`.trim()

/**
 * Format export data as self-contained HTML with inline CSS.
 */
export function formatHtml(data: ExportResult): FormattedFile {
  const date = new Date().toISOString().slice(0, 10)
  const parts: string[] = []

  parts.push(`<!DOCTYPE html>`)
  parts.push(`<html lang="en">`)
  parts.push(`<head>`)
  parts.push(`<meta charset="UTF-8">`)
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`)
  parts.push(`<title>ChatGPT Export — ${escapeHtml(data.meta.exported_at.slice(0, 10))}</title>`)
  parts.push(`<style>${CSS}</style>`)
  parts.push(`</head>`)
  parts.push(`<body>`)

  // Header
  parts.push(`<div class="export-header">`)
  parts.push(`<h1>💬 ChatGPT Export</h1>`)
  parts.push(`<p class="meta">`)
  parts.push(`${escapeHtml(data.meta.user_email)} · ${escapeHtml(data.meta.plan_type)} plan · `)
  parts.push(`${data.meta.successful} of ${data.meta.total_conversations} conversations · `)
  parts.push(`${data.meta.exported_at.slice(0, 10)}`)
  parts.push(`</p>`)
  parts.push(`</div>`)

  // Conversations
  for (const convo of data.conversations) {
    const parsed = parseConversation(convo)
    const dateStr = formatTimestamp(parsed.createTime)

    parts.push(`<div class="conversation">`)
    parts.push(`<div class="conversation-header">`)
    parts.push(`<h2>${escapeHtml(parsed.title)}</h2>`)
    if (dateStr) {
      parts.push(`<span class="date">${dateStr}</span>`)
    }
    parts.push(`</div>`)

    if (parsed.messages.length === 0) {
      const obj = convo as Record<string, unknown>
      if (obj.error) {
        parts.push(`<div class="error-entry">⚠️ Export error: ${escapeHtml(String(obj.error))}</div>`)
      }
    } else {
      for (const msg of parsed.messages) {
        const roleClass = msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : ''
        parts.push(`<div class="message ${roleClass}">`)
        parts.push(`<div class="role">${escapeHtml(formatRole(msg.role))}</div>`)
        parts.push(`<div class="content">${contentToHtml(msg.content)}</div>`)
        parts.push(`</div>`)
      }
    }

    parts.push(`</div>`)
  }

  // Footer
  parts.push(`<footer>`)
  parts.push(`Generated by <a href="https://github.com/shtse8/chatgpt-export">ChatGPT Export</a>`)
  parts.push(`</footer>`)

  parts.push(`</body>`)
  parts.push(`</html>`)

  return {
    filename: `chatgpt-export-${date}.html`,
    content: parts.join('\n'),
    mimeType: 'text/html',
  }
}
