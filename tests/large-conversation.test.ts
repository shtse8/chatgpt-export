import { describe, it, expect } from 'vitest'
import { parseConversation } from '../src/core/formatters/conversation-parser'
import { formatExport, AVAILABLE_FORMATS } from '../src/core/formatters'
import type { ExportResult } from '../src/core/export-engine'
import { makeLargeConversation } from './fixtures/large-conversation'

function exportData(conversation: unknown): ExportResult {
  return {
    meta: {
      exported_at: '2026-02-14T15:00:00.000Z',
      user_email: 'synthetic@example.test',
      plan_type: 'team',
      total_conversations: 1,
      successful: 1,
      errors: 0,
      export_duration_seconds: 0,
      format: 'json',
    },
    conversations: [conversation],
  }
}

describe('large conversation export', () => {
  // Exceeds V8's function-argument limit; no timing threshold or machine-size assumption.
  const count = 150_000
  const wide = makeLargeConversation(count)

  it('parses every message in a broad frontier in order without truncating Unicode', () => {
    const parsed = parseConversation(wide)
    expect(parsed.messages).toHaveLength(count)
    for (let i = 0; i < count; i++) {
      const source = wide.mapping[`m${i}`].message!
      const actual = parsed.messages[i]
      // A plain equality check keeps successful runs cheap while reporting full failing values.
      if (actual.content !== source.content.parts[0]
        || actual.role !== source.author.role
        || actual.timestamp !== source.create_time) {
        expect(actual).toEqual({
          role: source.author.role,
          content: source.content.parts[0],
          timestamp: source.create_time,
        })
      }
    }
  })

  it('preserves all raw JSON fields and the readable formats byte for byte', () => {
    const linear = makeLargeConversation(count, 'linear')
    for (const format of AVAILABLE_FORMATS) {
      const data = exportData(wide)
      const output = formatExport(data, format)
      if (format === 'json') {
        expect(output.content).toBe(JSON.stringify(data, null, 2))
      } else {
        const control = formatExport(exportData(linear), format)
        expect(output).toEqual(control)
      }
    }
  }, 30_000)

  it('keeps breadth-first order across cycles, duplicate and missing child references', () => {
    const conversation = makeLargeConversation(4)
    conversation.mapping.root.children = ['m0', 'missing', 'm1', 'm0']
    conversation.mapping.m0.children = ['m2', 'root']
    conversation.mapping.m1.children = ['m3', 'm2']
    conversation.mapping.m3.children = ['m1']
    const parsed = parseConversation(conversation)
    expect(parsed.messages.map(m => m.content)).toEqual(
      [0, 1, 2, 3].map(i => conversation.mapping[`m${i}`].message!.content.parts[0]),
    )
  })
})
