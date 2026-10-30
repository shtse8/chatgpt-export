import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

/** Decide whether a new submission is needed without disturbing an accepted one. */
export function needsSubmission(status, version) {
  const hasVersion = revision => revision?.distributionChannels?.some(c => c.crxVersion === version)
  if (status.publishedItemRevisionStatus?.state === 'PUBLISHED'
    && hasVersion(status.publishedItemRevisionStatus)) return false

  const submitted = status.submittedItemRevisionStatus
  if (['PENDING_REVIEW', 'STAGED'].includes(submitted?.state)) {
    if (hasVersion(submitted)) return false
    throw new Error('Another version is already submitted; inspect that receipt before uploading.')
  }
  if (status.lastAsyncUploadState === 'IN_PROGRESS') {
    throw new Error('An upload is already in progress; inspect that receipt before uploading.')
  }
  return true
}

async function main() {
  const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, PUBLISHER_ID, EXTENSION_ID } = process.env
  if (![CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, PUBLISHER_ID, EXTENSION_ID].every(Boolean)) {
    throw new Error('Chrome publishing needs OAuth secrets, EXTENSION_ID and CWS_PUBLISHER_ID.')
  }
  const auth = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(30_000),
  })
  const token = await auth.json()
  if (!auth.ok || !token.access_token) {
    // Never log an OAuth response or token; only the non-secret error code.
    throw new Error(`Chrome OAuth failed (HTTP ${auth.status}, ${token.error || 'missing_token'}).`)
  }

  const name = `publishers/${encodeURIComponent(PUBLISHER_ID)}/items/${encodeURIComponent(EXTENSION_ID)}`
  const endpoint = `https://chromewebstore.googleapis.com/v2/${name}:fetchStatus`
  const readStatus = async () => {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(30_000),
    })
    const status = await response.json()
    console.log(JSON.stringify({ endpoint, readAt: new Date().toISOString(), httpStatus: response.status, status }))
    if (!response.ok) throw new Error(`Chrome status read failed (HTTP ${response.status}).`)
    return status
  }
  const status = await readStatus()

  if (!process.argv.includes('--read-only')) {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
    const required = needsSubmission(status, version)
    console.log(JSON.stringify({ version, submissionRequired: required }))
    if (required && process.argv.includes('--publish')) {
      const startedAt = new Date().toISOString()
      const endpoints = [`https://chromewebstore.googleapis.com/upload/v2/${name}:upload`, `https://chromewebstore.googleapis.com/v2/${name}:publish`]
      console.log(JSON.stringify({ startedAt, endpoints, name, version, action: 'upload-and-publish' }))
      const result = spawnSync('bunx', ['chrome-webstore-upload-cli@4.0.2', '--source', 'chatgpt-export.zip'], { stdio: 'inherit' })
      console.log(JSON.stringify({ startedAt, name, version, cliExitStatus: result.status, httpStatus: 'not exposed by CLI' }))
      await readStatus()
      if (result.error || result.status !== 0) throw new Error(`Chrome publishing failed (CLI exit ${result.status}).`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
