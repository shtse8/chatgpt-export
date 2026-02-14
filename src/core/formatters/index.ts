import type { ExportResult } from '../export-engine'
import { formatJson } from './json'
import { formatMarkdown } from './markdown'
import { formatText } from './text'
import { formatHtml } from './html'

/** Supported export formats. */
export type ExportFormat = 'json' | 'markdown' | 'text' | 'html'

/** A single formatted file ready for download. */
export interface FormattedFile {
  filename: string
  content: string
  mimeType: string
}

/** Formatter function signature. */
export type Formatter = (data: ExportResult) => FormattedFile

/** Registry of all available formatters. */
const formatters: Record<ExportFormat, Formatter> = {
  json: formatJson,
  markdown: formatMarkdown,
  text: formatText,
  html: formatHtml,
}

/** Get a formatter by format name. */
export function getFormatter(format: ExportFormat): Formatter {
  return formatters[format]
}

/** Format export data using the specified format. */
export function formatExport(data: ExportResult, format: ExportFormat): FormattedFile {
  return getFormatter(format)(data)
}

/** List of all available format names. */
export const AVAILABLE_FORMATS: readonly ExportFormat[] = ['json', 'markdown', 'text', 'html'] as const

/** Human-readable labels for each format. */
export const FORMAT_LABELS: Record<ExportFormat, string> = {
  json: 'JSON',
  markdown: 'Markdown',
  text: 'Plain Text',
  html: 'HTML',
}

/** File extensions for each format. */
export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  json: '.json',
  markdown: '.md',
  text: '.txt',
  html: '.html',
}

export { formatJson } from './json'
export { formatMarkdown } from './markdown'
export { formatText } from './text'
export { formatHtml } from './html'
