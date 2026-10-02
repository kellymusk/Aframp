/**
 * The one date format the app uses for timestamps: "2 Oct 2026, 09:13",
 * day-first as Nigerian users expect, never the US "10/2/2026".
 */
const DATE_TIME = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DATE_ONLY = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function format(formatter: Intl.DateTimeFormat, value: string | number | Date): string {
  const date = new Date(value)
  // A missing or malformed timestamp shouldn't crash a whole list.
  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date)
}

export function formatDateTime(value: string | number | Date): string {
  return format(DATE_TIME, value)
}

export function formatDate(value: string | number | Date): string {
  return format(DATE_ONLY, value)
}
