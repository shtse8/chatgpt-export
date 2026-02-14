import { describe, it, expect } from 'vitest'
import { formatJson } from '../src/core/formatters/json'
import { formatMarkdown } from '../src/core/formatters/markdown'
import { formatText } from '../src/core/formatters/text'
import { formatHtml } from '../src/core/formatters/html'
import { formatExport, AVAILABLE_FORMATS, FORMAT_LABELS, FORMAT_EXTENSIONS } from '../src/core/formatters'
import type { ExportResult } from '../src/core/export-engine'

// Sample conversation matching ChatGPT API structure
const sampleConversation = {
  id: 'conv-123',
  title: 'Test Conversation',
  create_time: 1700000000,
  update_time: 1700000100,
  mapping: {
    root: {
      id: 'root',
      children: ['msg1'],
    },
    msg1: {
      id: 'msg1',
      parent: 'root',
      children: ['msg2'],
      message: {
        author: { role: 'user' },
        content: { content_type: 'text', parts: ['Hello, how are you?'] },
        create_time: 1700000010,
      },
    },
    msg2: {
      id: 'msg2',
      parent: 'msg1',
      children: [],
      message: {
        author: { role: 'assistant' },
        content: { content_type: 'text', parts: ['I am doing well, thank you!'] },
        create_time: 1700000020,
      },
    },
  },
}

const sampleConvoWithCode = {
  id: 'conv-456',
  title: 'Code Conversation',
  create_time: 1700000200,
  update_time: 1700000300,
  mapping: {
    root: {
      id: 'root',
      children: ['msg1'],
    },
    msg1: {
      id: 'msg1',
      parent: 'root',
      children: ['msg2'],
      message: {
        author: { role: 'user' },
        content: { content_type: 'text', parts: ['Show me a code example'] },
        create_time: 1700000210,
      },
    },
    msg2: {
      id: 'msg2',
      parent: 'msg1',
      children: [],
      message: {
        author: { role: 'assistant' },
        content: {
          content_type: 'text',
          parts: ['Here is an example:\n```typescript\nconsole.log("hello")\n```\nThat\'s it!'],
        },
        create_time: 1700000220,
      },
    },
  },
}

const errorConversation = {
  id: 'conv-err',
  title: 'Failed Conversation',
  error: 'HTTP 500',
  create_time: 1700000400,
  update_time: 1700000400,
}

function makeSampleExport(conversations: unknown[] = [sampleConversation]): ExportResult {
  return {
    meta: {
      exported_at: '2026-02-14T15:00:00.000Z',
      user_email: 'test@example.com',
      plan_type: 'team',
      total_conversations: conversations.length,
      successful: conversations.filter((c: unknown) => !(c as Record<string, unknown>).error).length,
      errors: conversations.filter((c: unknown) => !!(c as Record<string, unknown>).error).length,
      export_duration_seconds: 60,
      format: 'json',
    },
    conversations,
  }
}

describe('JSON Formatter', () => {
  it('should produce valid JSON', () => {
    const result = formatJson(makeSampleExport())
    expect(result.mimeType).toBe('application/json')
    expect(result.filename).toMatch(/chatgpt-export-\d{4}-\d{2}-\d{2}\.json/)
    const parsed = JSON.parse(result.content)
    expect(parsed.meta.user_email).toBe('test@example.com')
    expect(parsed.conversations).toHaveLength(1)
  })

  it('should pretty-print JSON', () => {
    const result = formatJson(makeSampleExport())
    expect(result.content).toContain('\n')
    expect(result.content).toContain('  ')
  })
})

describe('Markdown Formatter', () => {
  it('should produce valid Markdown', () => {
    const result = formatMarkdown(makeSampleExport())
    expect(result.mimeType).toBe('text/markdown')
    expect(result.filename).toMatch(/\.md$/)
  })

  it('should include conversation title', () => {
    const result = formatMarkdown(makeSampleExport())
    expect(result.content).toContain('# Test Conversation')
  })

  it('should include role headers', () => {
    const result = formatMarkdown(makeSampleExport())
    expect(result.content).toContain('## User')
    expect(result.content).toContain('## Assistant')
  })

  it('should include message content', () => {
    const result = formatMarkdown(makeSampleExport())
    expect(result.content).toContain('Hello, how are you?')
    expect(result.content).toContain('I am doing well, thank you!')
  })

  it('should handle error conversations', () => {
    const result = formatMarkdown(makeSampleExport([errorConversation]))
    expect(result.content).toContain('Export error')
    expect(result.content).toContain('HTTP 500')
  })
})

describe('Text Formatter', () => {
  it('should produce plain text', () => {
    const result = formatText(makeSampleExport())
    expect(result.mimeType).toBe('text/plain')
    expect(result.filename).toMatch(/\.txt$/)
  })

  it('should include role labels', () => {
    const result = formatText(makeSampleExport())
    expect(result.content).toContain('[User]')
    expect(result.content).toContain('[Assistant]')
  })

  it('should include separators', () => {
    const result = formatText(makeSampleExport())
    expect(result.content).toContain('='.repeat(72))
  })
})

describe('HTML Formatter', () => {
  it('should produce valid HTML', () => {
    const result = formatHtml(makeSampleExport())
    expect(result.mimeType).toBe('text/html')
    expect(result.filename).toMatch(/\.html$/)
    expect(result.content).toContain('<!DOCTYPE html>')
    expect(result.content).toContain('</html>')
  })

  it('should include inline CSS', () => {
    const result = formatHtml(makeSampleExport())
    expect(result.content).toContain('<style>')
    expect(result.content).toContain('prefers-color-scheme')
  })

  it('should escape HTML in content', () => {
    const convo = {
      id: 'xss',
      title: '<script>alert("xss")</script>',
      create_time: 1700000000,
      mapping: {
        root: { id: 'root', children: ['msg1'] },
        msg1: {
          id: 'msg1',
          parent: 'root',
          children: [],
          message: {
            author: { role: 'user' },
            content: { parts: ['<b>bold</b> & "quoted"'] },
          },
        },
      },
    }
    const result = formatHtml(makeSampleExport([convo]))
    expect(result.content).not.toContain('<script>alert')
    expect(result.content).toContain('&lt;script&gt;')
    expect(result.content).toContain('&amp;')
  })

  it('should handle code blocks', () => {
    const result = formatHtml(makeSampleExport([sampleConvoWithCode]))
    expect(result.content).toContain('<pre><code')
    expect(result.content).toContain('console.log')
  })

  it('should include conversation structure', () => {
    const result = formatHtml(makeSampleExport())
    expect(result.content).toContain('class="conversation"')
    expect(result.content).toContain('class="message user"')
    expect(result.content).toContain('class="message assistant"')
  })
})

describe('Formatter Registry', () => {
  it('should have all formats available', () => {
    expect(AVAILABLE_FORMATS).toContain('json')
    expect(AVAILABLE_FORMATS).toContain('markdown')
    expect(AVAILABLE_FORMATS).toContain('text')
    expect(AVAILABLE_FORMATS).toContain('html')
  })

  it('should have labels for all formats', () => {
    for (const format of AVAILABLE_FORMATS) {
      expect(FORMAT_LABELS[format]).toBeTruthy()
    }
  })

  it('should have extensions for all formats', () => {
    expect(FORMAT_EXTENSIONS.json).toBe('.json')
    expect(FORMAT_EXTENSIONS.markdown).toBe('.md')
    expect(FORMAT_EXTENSIONS.text).toBe('.txt')
    expect(FORMAT_EXTENSIONS.html).toBe('.html')
  })

  it('should format via formatExport()', () => {
    const data = makeSampleExport()
    const json = formatExport(data, 'json')
    const md = formatExport(data, 'markdown')
    const txt = formatExport(data, 'text')
    const html = formatExport(data, 'html')
    expect(json.mimeType).toBe('application/json')
    expect(md.mimeType).toBe('text/markdown')
    expect(txt.mimeType).toBe('text/plain')
    expect(html.mimeType).toBe('text/html')
  })
})
