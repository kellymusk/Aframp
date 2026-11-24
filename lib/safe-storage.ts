/**
 * sessionStorage wrapper that never throws (#865). Safari private mode, strict
 * privacy settings and some in-app browsers block storage, and touching it
 * throws `SecurityError`. Falls back to an in-memory map for the life of the
 * page, which survives client-side navigation (login → /verify).
 */
const memory = new Map<string, string>()

function storage(): Storage | null {
  try {
    const s = window.sessionStorage
    const probe = '__aframp_probe__'
    s.setItem(probe, probe)
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

export const safeSessionStorage = {
  getItem(key: string): string | null {
    const s = storage()
    if (s) {
      try {
        const value = s.getItem(key)
        if (value !== null) return value
      } catch {
        // fall through to memory
      }
    }
    return memory.get(key) ?? null
  },
  /** Returns false if the value could not be kept anywhere persistent across reloads. */
  setItem(key: string, value: string): boolean {
    memory.set(key, value)
    const s = storage()
    if (!s) return false
    try {
      s.setItem(key, value)
      return true
    } catch {
      return false
    }
  },
  removeItem(key: string): void {
    memory.delete(key)
    try {
      storage()?.removeItem(key)
    } catch {
      // ignore
    }
  },
}
