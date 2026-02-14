import type { ExportResult } from '../export-engine'
import type { FormattedFile } from './index'
import { parseConversation, formatTimestamp, formatRole } from './conversation-parser'

/**
 * Format export data as Markdown.
 *
 * Each conversation becomes a section with role-prefixed messages.
 * Code blocks and formatting from the original content are preserved.
 */
export function formatMarkdown(data: ExportResult): FormattedFile {
  const date = new Date().toISOString().slice(0, 10)
  const sections: string[] = []

  // Header
  sections.push(`# ChatGPT Export`)
  sections.push(``)
  sections.push(`*Exported: ${data.meta.exported_at.slice(0, 10)}*`)
  sections.push(`*Account: ${data.meta.user_email} (${data.meta.plan_type})*`)
  sections.push(`*Conversations: ${data.meta.successful} of ${data.meta.total_conversations}*`)
  sections.push(``)
  sections.push(`---`)
  sections.push(``)

  for (const convo of data.conversations) {
    const parsed = parseConversation(convo)
    const dateStr = formatTimestamp(parsed.createTime)

    sections.push(`# ${parsed.title}`)
    if (dateStr) {
      sections.push(`*Created: ${dateStr}*`)
    }
    sections.push(``)

    if (parsed.messages.length === 0) {
      // Check if it's an error entry
      const obj = convo as Record<string, unknown>
      if (obj.error) {
        sections.push(`> ⚠️ Export error: ${obj.error}`)
        sections.push(``)
      }
      continue
    }

    for (const msg of parsed.messages) {
      sections.push(`## ${formatRole(msg.role)}`)
      sections.push(``)
      sections.push(msg.content)
      sections.push(``)
    }

    sections.push(`---`)
    sections.push(``)
  }

  return {
    filename: `chatgpt-export-${date}.md`,
    content: sections.join('\n'),
    mimeType: 'text/markdown',
  }
}
