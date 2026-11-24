const MIN_PASSWORD_LENGTH = 8
export const MIN_PASSWORD_STRENGTH = 3

export function getPasswordStrength(password: string): number {
  if (password.length < MIN_PASSWORD_LENGTH) return 0

  const characterClasses = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length
  const distinctCharacters = new Set(password).size

  if (distinctCharacters <= 1) return 0

  let score = password.length >= 12 ? 2 : 1
  if (characterClasses >= 2) score += 1
  if (characterClasses >= 3) score += 1
  if (characterClasses === 4) score += 1

  return Math.min(score, 4)
}

export async function isCommonPassword(password: string): Promise<boolean> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Password exposure check is unavailable. Please try again in a secure browser.')
  }

  const hashBuffer = await globalThis.crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(password)
  )
  const hash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  let response: Response
  try {
    response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      cache: 'no-store',
    })
  } catch {
    throw new Error('Unable to check whether this password has been exposed. Please try again.')
  }

  if (!response.ok) {
    throw new Error(`Password exposure check failed (HTTP ${response.status}). Please try again.`)
  }

  const hashes = await response.text()
  return hashes.split(/\r?\n/).some((line) => line.split(':', 1)[0] === suffix)
}
