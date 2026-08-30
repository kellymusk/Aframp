/**
 * SEP-0007 URI helpers for the payment request page.
 *
 * Spec reference: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 * Every SEP-7 request URI uses the `web+stellar:` scheme, which both
 * Freighter and Lobstr register as a protocol handler — so the same link
 * that renders the QR code can also be used as a plain "open in wallet" link
 * on the customer's own device.
 */

export const SEP7_SCHEME = 'web+stellar:'

/** Narrows `string | null` to a confirmed, well-formed SEP-7 URI. */
export function isValidSep7Uri(uri: string | null | undefined): uri is string {
  if (!uri) return false
  return uri.startsWith(SEP7_SCHEME) && uri.length > SEP7_SCHEME.length
}
