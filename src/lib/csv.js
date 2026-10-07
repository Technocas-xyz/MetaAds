// Build a CSV file in the browser and hand it to the user as a download.

function cell(value) {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value) ? value.join('; ') : String(value)
  // Quote anything with separators, quotes or line breaks; double inner quotes.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * @param {string} filename  e.g. "ai-analysis-2026-10-06.csv"
 * @param {Array<{label: string, value: (row) => any}>} columns
 * @param {Array<object>} rows
 */
export function downloadCSV(filename, columns, rows) {
  const lines = [
    columns.map((c) => cell(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(',')),
  ]
  // BOM so Excel opens UTF-8 (emoji, accents) correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const todayStamp = () => new Date().toISOString().slice(0, 10)
