const LAST_DATA_UPDATE_KEY = 'aframp:last-data-update'

export const DATA_UPDATE_EVENT = 'aframp:data-update'

export function readLastDataUpdate(): number | null {
  if (typeof window === 'undefined') return null

  try {
    const value = Number(window.localStorage.getItem(LAST_DATA_UPDATE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function recordDataUpdate(timestamp = Date.now()): void {
  if (typeof window === 'undefined' || !Number.isFinite(timestamp) || timestamp <= 0) return

  try {
    const current = readLastDataUpdate()
    const latest = current ? Math.max(current, timestamp) : timestamp
    window.localStorage.setItem(LAST_DATA_UPDATE_KEY, String(latest))
    window.dispatchEvent(new CustomEvent(DATA_UPDATE_EVENT))
  } catch {
    // Storage can be unavailable in private browsing mode.
  }
}
