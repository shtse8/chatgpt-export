import type { ExportResult } from '../export-engine'
import type { FormattedFile } from './index'
import { parseConversation, formatTimestamp, formatRole } from './conversation-parser'

/**
 * Format export data as plain text.
 *
 * Simple, readable format with clear role labels and separators.
 */
export function formatText(data: ExportResult): FormattedFile {
  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = []

  lines.push(`ChatGPT Export`)
  lines.push(`Exported: ${data.meta.exported_at.slice(0, 10)}`)
  lines.push(`Account: ${data.meta.user_email} (${data.meta.plan_type})`)
  lines.push(`Conversations: ${data.meta.successful} of ${data.meta.total_conversations}`)
  lines.push(``)
  lines.push(`${'='.repeat(72)}`)
  lines.push(``)

  for (const convo of data.conversations) {
    const parsed = parseConversation(convo)
    const dateStr = formatTimestamp(parsed.createTime)

    lines.push(parsed.title)
    if (dateStr) {
      lines.push(`Created: ${dateStr}`)
    }
    lines.push(`${'-'.repeat(72)}`)
    lines.push(``)

    if (parsed.messages.length === 0) {
      const obj = convo as Record<string, unknown>
      if (obj.error) {
        lines.push(`[Export error: ${obj.error}]`)
        lines.push(``)
      }
      continue
    }

    for (const msg of parsed.messages) {
      lines.push(`[${formatRole(msg.role)}]`)
      lines.push(msg.content)
      lines.push(``)
    }

    lines.push(`${'='.repeat(72)}`)
    lines.push(``)
  }

  return {
    filename: `chatgpt-export-${date}.txt`,
    content: lines.join('\n'),
    mimeType: 'text/plain',
  }
}
