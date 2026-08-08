/**
 * Payer identity for screening.
 *
 * Every velocity rule keys off `ScreeningSubject.userId`.  The offramp path has
 * a wallet public key to use; the mobile-money and bill-payment paths often do
 * not — a customer can pay a bill by card without ever connecting a wallet.
 * Screening those transactions under a per-request id would key each one to a
 * fresh account, and every rule that counts behaviour over time — structuring,
 * fan-out, dormancy — would silently never fire.  That is a worse failure than
 * not screening at all, because the queue looks healthy while it happens.
 *
 * So an anonymous payer gets a stable identity derived from the instrument they
 * paid with.  It is imperfect: one person with two phone numbers is two
 * accounts here, and a shared handset is one account for two people.  Both are
 * accepted limitations of instrument-derived identity, and both resolve once
 * the payer connects a wallet — which is why callers pass the wallet key when
 * they have one and only fall back to this.
 */

import { hashCounterparty } from './ledger'

/** Instrument a payer identity can be derived from. */
export type PayerInstrument = 'msisdn' | 'email'

/**
 * Derives a stable pseudonymous account id from a payment instrument.
 *
 * Salted and hashed via the ledger's own function, so a payer's identity and
 * their counterparty key are protected identically and by the same secret —
 * these are phone numbers and email addresses, and the ledger is not a place to
 * accumulate raw contact details.  Missing COMPLIANCE_HASH_SALT throws; see the
 * note on hashCounterparty().
 *
 * The instrument is part of the hashed input, so the same string arriving as a
 * phone number and as an email cannot collide into one account.  The prefix on
 * the returned id keeps it legible to an analyst reading a case file, who needs
 * to know they are looking at a derived identity rather than a wallet key.
 */
export function payerIdentity(instrument: PayerInstrument, value: string): string {
  const normalised = instrument === 'email' ? value.trim().toLowerCase() : value.replace(/\s+/g, '')
  return `${instrument}:${hashCounterparty(`${instrument}:${normalised}`)}`
}
