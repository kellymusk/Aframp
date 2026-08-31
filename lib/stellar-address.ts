/**
 * Client-side Stellar (classic) address validation — StrKey format, no
 * network round-trip. Used to reject a malformed address before it's ever
 * sent to the backend. (#483)
 *
 * A full base32 + CRC16-XMODEM checksum check, not just a length/charset
 * regex: a 56-character G-string with the right alphabet can still be an
 * invalid address if its checksum doesn't match, and that's exactly the
 * class of typo (one swapped character) this exists to catch.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
/** StrKey version byte for an ed25519 public key ("G..." addresses). */
const ED25519_PUBLIC_KEY_VERSION_BYTE = 6 << 3

function base32Decode(input: string): Uint8Array | null {
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const char of input) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) return null
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 0xff)
    }
  }

  return Uint8Array.from(bytes)
}

/** CRC16/XMODEM — the checksum algorithm StrKey addresses use. */
function crc16xmodem(bytes: Uint8Array): number {
  let crc = 0x0000
  for (const byte of bytes) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc
}

/**
 * True for a well-formed, checksum-valid Stellar classic public address
 * ("G..."). Does not check whether the account exists on-chain.
 */
export function isValidStellarAddress(address: string): boolean {
  if (typeof address !== 'string') return false
  if (!/^G[A-Z2-7]{55}$/.test(address)) return false

  const decoded = base32Decode(address)
  // 1 version byte + 32-byte public key + 2-byte checksum
  if (!decoded || decoded.length !== 35) return false

  if (decoded[0] !== ED25519_PUBLIC_KEY_VERSION_BYTE) return false

  const payload = decoded.subarray(0, 33)
  const checksum = decoded[33] | (decoded[34] << 8) // little-endian
  return checksum === crc16xmodem(payload)
}

/** Inline form-field message for an invalid Stellar address, or undefined when it's valid. */
export function validateStellarAddress(address: string): string | undefined {
  const trimmed = address.trim()
  if (!trimmed) return 'Stellar address is required'
  if (!trimmed.startsWith('G')) return 'Stellar addresses start with G'
  if (trimmed.length !== 56) {
    return `Stellar address must be exactly 56 characters (this one has ${trimmed.length})`
  }
  if (!isValidStellarAddress(trimmed)) return 'Invalid Stellar address'
  return undefined
}
