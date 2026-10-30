import { it, expect, vi } from 'vitest'
import { ExportEngine } from '../src/core/export-engine'
import { makeLargeConversation } from './fixtures/large-conversation'

it('handles a large listing page and exports only the matching conversation', async () => {
  const count = 150_000
  const conversation = makeLargeConversation(2)
  const items = Array.from({ length: count }, (_, i) => ({
    id: i === count - 1 ? conversation.id : `conversation-${i}`,
    title: i === count - 1 ? 'Selected conversation' : `Other ${i}`,
    create_time: 1700000000,
    update_time: 1700000000,
  }))
  const requests: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url)
    if (url === '/api/auth/session') {
      return Response.json({ accessToken: 'synthetic', user: { email: 'synthetic@example.test' } })
    }
    if (url === `/backend-api/conversations?offset=0&limit=${count}&order=updated`) {
      return Response.json({ items })
    }
    if (url === `/backend-api/conversations?offset=${count}&limit=${count}&order=updated`) {
      return Response.json({ items: [] })
    }
    if (url === `/backend-api/conversation/${conversation.id}`) return Response.json(conversation)
    throw new Error(`Unexpected request: ${url}`)
  })
  try {
    const engine = new ExportEngine({
      batchSize: count,
      searchQuery: 'Selected',
      listDelay: 0,
      downloadDelay: 0,
      retryAttempts: 1,
    })
    const result = await engine.run()
    expect(result?.conversations).toEqual([conversation])
    expect(result?.meta.successful).toBe(1)
    expect(result?.meta.errors).toBe(0)
    expect(requests).toEqual([
      '/api/auth/session',
      `/backend-api/conversations?offset=0&limit=${count}&order=updated`,
      `/backend-api/conversations?offset=${count}&limit=${count}&order=updated`,
      `/backend-api/conversation/${conversation.id}`,
    ])
  } finally {
    vi.unstubAllGlobals()
  }
})
