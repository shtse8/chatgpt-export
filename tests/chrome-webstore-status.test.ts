import { describe, it, expect } from 'vitest'
import { needsSubmission } from '../scripts/chrome-webstore-status.mjs'

const revision = (state: string, crxVersion: string) => ({ state, distributionChannels: [{ crxVersion }] })

describe('Chrome Web Store submission preflight', () => {
  it('allows a new version when no request is in flight', () => {
    expect(needsSubmission({ publishedItemRevisionStatus: revision('PUBLISHED', '2.1.1') }, '2.1.3')).toBe(true)
  })

  it('does not resend an already published version', () => {
    expect(needsSubmission({ publishedItemRevisionStatus: revision('PUBLISHED', '2.1.3') }, '2.1.3')).toBe(false)
  })

  for (const state of ['PENDING_REVIEW', 'STAGED']) {
    it(`does not resend the same version in ${state}`, () => {
      expect(needsSubmission({ submittedItemRevisionStatus: revision(state, '2.1.3') }, '2.1.3')).toBe(false)
    })

    it(`preserves another version in ${state}`, () => {
      expect(() => needsSubmission({ submittedItemRevisionStatus: revision(state, '2.1.2') }, '2.1.3')).toThrow('already submitted')
    })
  }

  it('does not interrupt an asynchronous upload', () => {
    expect(() => needsSubmission({ lastAsyncUploadState: 'IN_PROGRESS' }, '2.1.3')).toThrow('in progress')
  })

  it('allows recovery after a rejected or cancelled submission', () => {
    for (const state of ['REJECTED', 'CANCELLED']) {
      expect(needsSubmission({ submittedItemRevisionStatus: revision(state, '2.1.2') }, '2.1.3')).toBe(true)
    }
  })
})
