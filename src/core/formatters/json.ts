import type { ExportResult } from '../export-engine'
import type { FormattedFile } from './index'

/**
 * Format export data as pretty-printed JSON.
 */
export function formatJson(data: ExportResult): FormattedFile {
  const date = new Date().toISOString().slice(0, 10)
  return {
    filename: `chatgpt-export-${date}.json`,
    content: JSON.stringify(data, null, 2),
    mimeType: 'application/json',
  }
}
