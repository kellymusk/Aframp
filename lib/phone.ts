/**
 * Phone number utilities for Aframp Pay.
 *
 * `normalizePhone` accepts the most common ways a user can type or paste a
 * mobile number and returns a valid E.164 string, or throws with a
 * human-readable message if the input cannot be resolved.
 */

export const E164_REGEX = /^\+[1-9]\d{6,14}$/

export interface CountryPhoneConfig {
  /** ISO 3166-1 alpha-2 code, e.g. "NG". */
  code: string
  /** Dial code without the leading "+", e.g. "234". */
  dialCode: string
  /** Accepted lengths of the national subscriber number *after* stripping
   *  the dial code and any trunk prefix ("0"). */
  nationalLengths: number[]
  /** Human-readable name, used only in error messages. */
  name: string
}

export const SUPPORTED_COUNTRIES: CountryPhoneConfig[] = [
  { code: 'NG', dialCode: '234', nationalLengths: [10], name: 'Nigeria' },
  { code: 'KE', dialCode: '254', nationalLengths: [9], name: 'Kenya' },
  { code: 'GH', dialCode: '233', nationalLengths: [9], name: 'Ghana' },
  { code: 'ZA', dialCode: '27', nationalLengths: [9], name: 'South Africa' },
]

/**
 * Normalises a user-supplied phone string to E.164.
 *
 * Accepted forms (all produce the same E.164 output for a Nigerian number):
 *   "+2348011234567"   — already E.164
 *   "2348011234567"    — dial code without "+"
 *   "23408011234567"   — dial code + trunk-0 + national (fix for #1129)
 *   "08011234567"      — local with trunk-0
 *
 * @param raw      - The user's input, may contain spaces/dashes.
 * @param country  - The country context selected in the UI.
 * @returns        E.164 string, e.g. "+2348011234567".
 * @throws         Error with a localised message if the number is invalid.
 */
export function normalizePhone(raw: string, country: CountryPhoneConfig): string {
  // Strip every non-digit character except a leading "+".
  const hasPlus = raw.trimStart().startsWith('+')
  const digits = raw.replace(/\D/g, '')

  let national: string

  if (hasPlus) {
    // User typed "+234…" or "+233…".
    if (!digits.startsWith(country.dialCode)) {
      throw new Error(`The number doesn't match the selected country (+${country.dialCode}).`)
    }
    national = digits.slice(country.dialCode.length)
  } else if (digits.startsWith(country.dialCode)) {
    // Pasted as "234…" or "23408…" without the "+".
    // Slice the dial code first, then strip a trunk "0" before the length
    // check so "23408011234567" (dial + trunk + national) is accepted (#1129).
    national = digits.slice(country.dialCode.length)
    if (national.startsWith('0')) national = national.slice(1)
  } else {
    // Local format: "0801…" or bare national "801…".
    national = digits
  }

  // Strip a leading trunk "0" in the local case as well.
  if (national.startsWith('0')) national = national.slice(1)

  if (!country.nationalLengths.includes(national.length)) {
    throw new Error(
      `A ${country.name} number has ${country.nationalLengths.join(' or ')} digits after the country code (got ${national.length}).`
    )
  }

  const e164 = `+${country.dialCode}${national}`

  if (!E164_REGEX.test(e164)) {
    throw new Error('The resulting number is not a valid E.164 phone number.')
  }

  return e164
}
