export interface PhoneCountry {
  code: string
  name: string
  /** Dial code without the leading "+". */
  dialCode: string
  /** Accepted lengths of the national significant number (no trunk "0"). */
  nationalLengths: number[]
  example: string
}

/** Countries Aframp merchants sign up from, Nigeria first as the default. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'NG', name: 'Nigeria', dialCode: '234', nationalLengths: [10], example: '0801 234 5678' },
  { code: 'GH', name: 'Ghana', dialCode: '233', nationalLengths: [9], example: '024 123 4567' },
  { code: 'KE', name: 'Kenya', dialCode: '254', nationalLengths: [9], example: '0712 345 678' },
  { code: 'ZA', name: 'South Africa', dialCode: '27', nationalLengths: [9], example: '082 123 4567' },
  { code: 'UG', name: 'Uganda', dialCode: '256', nationalLengths: [9], example: '0712 345 678' },
  { code: 'TZ', name: 'Tanzania', dialCode: '255', nationalLengths: [9], example: '0712 345 678' },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]

export function getPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.code === code) ?? DEFAULT_PHONE_COUNTRY
}

export type PhoneResult = { ok: true; e164: string } | { ok: false; message: string }

const E164 = /^\+[1-9]\d{7,14}$/

/**
 * Validate a phone number and normalise it to E.164 (e.g. +2348012345678).
 * Accepts national format ("0801 234 5678"), international ("+234 801 234 5678"
 * or "00234…") and strips spaces, dashes, dots and brackets.
 */
export function normalizePhone(input: string, country: PhoneCountry): PhoneResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, message: 'Enter your phone number.' }

  if (/[^\d\s\-().+]/.test(trimmed)) {
    return { ok: false, message: 'Phone numbers can only contain digits, spaces and a leading +.' }
  }

  let digits = trimmed.replace(/\D/g, '')
  const international = trimmed.startsWith('+') || digits.startsWith('00')
  if (digits.startsWith('00')) digits = digits.slice(2)

  let national: string
  if (international) {
    if (!digits.startsWith(country.dialCode)) {
      return {
        ok: false,
        message: `That number doesn't start with +${country.dialCode}. Pick the right country or use a ${country.name} number.`,
      }
    }
    national = digits.slice(country.dialCode.length)
  } else if (digits.startsWith('0')) {
    national = digits.slice(1)
  } else if (
    digits.startsWith(country.dialCode) &&
    country.nationalLengths.includes(digits.length - country.dialCode.length)
  ) {
    // Pasted as 234801… without the "+".
    national = digits.slice(country.dialCode.length)
  } else {
    national = digits
  }

  if (national.startsWith('0')) national = national.slice(1)

  if (!country.nationalLengths.includes(national.length)) {
    const expected = country.nationalLengths.join(' or ')
    return {
      ok: false,
      message: `A ${country.name} number has ${expected} digits after the country code (e.g. ${country.example}). Check for a missing or extra digit.`,
    }
  }

  if (country.code === 'NG' && !/^[789]/.test(national)) {
    return {
      ok: false,
      message: `That doesn't look like a Nigerian mobile number (e.g. ${country.example}).`,
    }
  }

  const e164 = `+${country.dialCode}${national}`
  if (!E164.test(e164)) return { ok: false, message: 'Enter a valid phone number.' }
  return { ok: true, e164 }
}
