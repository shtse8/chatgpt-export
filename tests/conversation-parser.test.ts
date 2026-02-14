import { describe, it, expect } from 'vitest'
import { parseConversation, formatTimestamp, formatRole } from '../src/core/formatters/conversation-parser'

describe('Conversation Parser', () => {
  it('should parse a simple conversation', () => {
    const convo = {
      id: 'test-id',
      title: 'Test Title',
      create_time: 1700000000,
      update_time: 1700000100,
      mapping: {
        root: { id: 'root', children: ['m1'] },
        m1: {
          id: 'm1',
          parent: 'root',
          children: ['m2'],
          message: { author: { role: 'user' }, content: { parts: ['Hello'] } },
        },
        m2: {
          id: 'm2',
          parent: 'm1',
          children: [],
          message: { author: { role: 'assistant' }, content: { parts: ['Hi there!'] } },
        },
      },
    }

    const result = parseConversation(convo)
    expect(result.id).toBe('test-id')
    expect(result.title).toBe('Test Title')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[0].content).toBe('Hello')
    expect(result.messages[1].role).toBe('assistant')
    expect(result.messages[1].content).toBe('Hi there!')
  })

  it('should skip system messages', () => {
    const convo = {
      id: 'sys-test',
      title: 'System Test',
      mapping: {
        root: { id: 'root', children: ['sys', 'm1'] },
        sys: {
          id: 'sys',
          parent: 'root',
          children: ['m1'],
          message: { author: { role: 'system' }, content: { parts: ['System prompt'] } },
        },
        m1: {
          id: 'm1',
          parent: 'sys',
          children: [],
          message: { author: { role: 'user' }, content: { parts: ['Hello'] } },
        },
      },
    }

    const result = parseConversation(convo)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].role).toBe('user')
  })

  it('should skip empty messages', () => {
    const convo = {
      id: 'empty-test',
      title: 'Empty Test',
      mapping: {
        root: { id: 'root', children: ['m1'] },
        m1: {
          id: 'm1',
          parent: 'root',
          children: [],
          message: { author: { role: 'user' }, content: { parts: [''] } },
        },
      },
    }

    const result = parseConversation(convo)
    expect(result.messages).toHaveLength(0)
  })

  it('should handle conversation without mapping', () => {
    const convo = { id: 'no-map', title: 'No Mapping' }
    const result = parseConversation(convo)
    expect(result.messages).toHaveLength(0)
  })

  it('should concatenate multiple parts', () => {
    const convo = {
      id: 'multi-part',
      title: 'Multi Part',
      mapping: {
        root: { id: 'root', children: ['m1'] },
        m1: {
          id: 'm1',
          parent: 'root',
          children: [],
          message: { author: { role: 'user' }, content: { parts: ['Part 1', 'Part 2'] } },
        },
      },
    }

    const result = parseConversation(convo)
    expect(result.messages[0].content).toBe('Part 1\nPart 2')
  })

  it('should handle conversation_id as fallback', () => {
    const convo = { conversation_id: 'fallback-id', title: 'Test' }
    const result = parseConversation(convo)
    expect(result.id).toBe('fallback-id')
  })

  it('should default title to Untitled', () => {
    const convo = { id: 'no-title' }
    const result = parseConversation(convo)
    expect(result.title).toBe('Untitled')
  })
})

describe('formatTimestamp', () => {
  it('should format Unix timestamp to ISO date', () => {
    // 2023-11-14
    expect(formatTimestamp(1700000000)).toBe('2023-11-14')
  })

  it('should return empty string for undefined', () => {
    expect(formatTimestamp(undefined)).toBe('')
  })

  it('should return empty string for 0', () => {
    expect(formatTimestamp(0)).toBe('')
  })
})

describe('formatRole', () => {
  it('should capitalize known roles', () => {
    expect(formatRole('user')).toBe('User')
    expect(formatRole('assistant')).toBe('Assistant')
    expect(formatRole('tool')).toBe('Tool')
  })

  it('should capitalize unknown roles', () => {
    expect(formatRole('custom')).toBe('Custom')
  })
})
