import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExportEngine, type Progress } from '../src/core/export-engine'
import { AVAILABLE_FORMATS, formatExport } from '../src/core/formatters'

const summary = (id: string, title = id) => ({ id, title, create_time: 1, update_time: 2 })
const conversation = (id: string) => ({ ...summary(id), mapping: {} })
const config = { listDelay: 0, downloadDelay: 0, retryDelay: 0, retryAttempts: 2, concurrency: 2 }

afterEach(() => vi.unstubAllGlobals())

function fixture(page: (offset: number) => Response | Promise<Response>, failedDownload?: string) {
  const requests: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url)
    if (url === '/api/auth/session') return Response.json({ accessToken: 'synthetic' })
    if (url.startsWith('/backend-api/conversations?')) {
      return page(Number(new URL(url, 'https://fixture.test').searchParams.get('offset')))
    }
    const id = url.split('/').at(-1)!
    if (id === failedDownload) return Response.json({ detail: 'fixture' }, { status: 403 })
    // Complete the first download last to exercise ordering with concurrent workers.
    if (id === 'fixture-alpha') await new Promise(resolve => setTimeout(resolve, 10))
    return Response.json(conversation(id))
  })
  const engine = new ExportEngine(config)
  const progress: Progress[] = []
  const done = vi.fn()
  const error = vi.fn()
  engine.on('progress', p => progress.push(p))
  engine.on('done', done)
  engine.on('error', error)
  return { engine, requests, progress, done, error }
}

describe('listing failures never produce a successful partial collection', () => {
  const failures: [string, () => Response | Promise<Response>][] = [
    ...[401, 403, 429, 500, 503].map(status => [
      `HTTP ${status}`,
      () => Response.json({ items: [], detail: 'fixture' }, { status }),
    ] as [string, () => Response]),
    ['network failure', () => Promise.reject(new Error('Synthetic network failure'))],
    ['invalid JSON', () => new Response('<html>Not JSON</html>')],
    ['null JSON', () => Response.json(null)],
    ['missing items', () => Response.json({ detail: 'fixture' })],
    ['null items', () => Response.json({ items: null })],
    ['object items', () => Response.json({ items: { length: 0 } })],
    ['string items', () => Response.json({ items: 'invalid' })],
    ['invalid item', () => Response.json({ items: [null] })],
    ['missing conversation ID', () => Response.json({ items: [{ title: 'fixture' }] })],
    ['empty conversation ID', () => Response.json({ items: [summary(' ')] })],
  ]

  it.each(failures)('%s after a successful page', async (_name, failure) => {
    const f = fixture(offset => offset === 0
      ? Response.json({ items: [summary('first')], total: 2 })
      : offset === 1 ? failure() : Response.json({ items: [] }))
    expect(await f.engine.run()).toBeNull()
    expect(f.progress.at(-1)).toMatchObject({ status: 'error', downloaded: 0, total: 1 })
    expect(f.progress.at(-1)?.error).toBeTruthy()
    expect(f.progress.some(p => p.status === 'done')).toBe(false)
    expect(f.done).not.toHaveBeenCalled()
    expect(f.error).toHaveBeenCalledOnce()
    expect(f.requests.some(url => url.startsWith('/backend-api/conversation/'))).toBe(false)
  })

  it('also rejects a failure on the first page', async () => {
    const f = fixture(() => Response.json({ detail: 'fixture' }, { status: 403 }))
    expect(await f.engine.run()).toBeNull()
    expect(f.progress.at(-1)).toMatchObject({ status: 'error', total: 0 })
    expect(f.done).not.toHaveBeenCalled()
  })
})

it('exports every listed conversation in listing order in all four formats', async () => {
  const f = fixture(async offset => {
    if (offset === 0) return Response.json({ items: [summary('fixture-alpha'), summary('fixture-beta')], total: 3 })
    if (offset === 2) return Response.json({ items: [summary('fixture-gamma')], total: 3 })
    // Continue to the explicit empty page, regardless of short pages or totals.
    return Response.json({ items: [] })
  })
  const result = await f.engine.run()
  expect(result?.conversations).toEqual(['fixture-alpha', 'fixture-beta', 'fixture-gamma'].map(conversation))
  expect(result?.meta).toMatchObject({ total_conversations: 3, successful: 3, errors: 0 })
  expect(f.progress.at(-1)?.status).toBe('done')
  expect(f.done).toHaveBeenCalledOnce()
  expect(AVAILABLE_FORMATS).toHaveLength(4)
  for (const format of AVAILABLE_FORMATS) {
    const { content } = formatExport(result!, format)
    expect(content).toContain('fixture-alpha')
    expect(content.indexOf('fixture-alpha')).toBeLessThan(content.indexOf('fixture-beta'))
    expect(content.indexOf('fixture-beta')).toBeLessThan(content.indexOf('fixture-gamma'))
  }
})

it('accepts a valid empty listing', async () => {
  const f = fixture(() => Response.json({ items: [], total: 0 }))
  expect(await f.engine.run()).toBeNull()
  expect(f.progress.at(-1)).toMatchObject({ status: 'done', total: 0, errors: 0 })
  expect(f.error).not.toHaveBeenCalled()
})

it.each([401, 503])('keeps retry recovery for HTTP %s during pagination', async status => {
  let retried = false
  const f = fixture(offset => {
    if (offset === 0) return Response.json({ items: [summary('first')] })
    if (!retried) {
      retried = true
      return Response.json({ detail: 'fixture' }, { status })
    }
    return Response.json({ items: offset === 1 ? [summary('second')] : [] })
  })
  expect((await f.engine.run())?.conversations).toEqual(['first', 'second'].map(conversation))
  expect(f.progress.at(-1)?.status).toBe('done')
  expect(f.error).not.toHaveBeenCalled()
})

it('keeps individual download failures as explicit error entries', async () => {
  const f = fixture(offset => Response.json({ items: offset === 0
    ? [summary('first'), summary('second'), summary('third')]
    : [] }), 'second')
  const result = await f.engine.run()
  expect(result?.conversations).toEqual([
    conversation('first'), { ...summary('second'), error: 'HTTP 403' }, conversation('third'),
  ])
  expect(result?.meta).toMatchObject({ total_conversations: 3, successful: 2, errors: 1 })
  expect(f.progress.at(-1)?.status).toBe('done')
})
