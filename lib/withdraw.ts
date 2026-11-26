/**
 * Cash-out (offramp) rules per asset: which banks it settles to, the minimum
 * amount, and the account number format.
 *
 * **Units: every amount here is in stroops, never whole asset units.**
 * Stellar amounts are integers of stroops where 1 unit = 10,000,000 stroops,
 * so `minimumStroops: 500_000_000n` is 50 cNGN. The conversions, the
 * `formatStroops` display helper and the `parseAmountToStroops` input parser
 * all live in `lib/money.ts` — use them rather than dividing by hand.
 */

import type { Balance, Withdrawal } from '@/lib/api'
import { BANKS_BY_COUNTRY, type Bank, type BankCountry } from '@/lib/banks'
import { formatStroops, isAmountMultipleOf } from '@/lib/money'

/**
 * Assets with a cash-out (offramp) route. cNGN settles to Nigerian bank
 * accounts, cKES to Kenyan banks / mobile money and cGHS to Ghanaian banks /
 * mobile money. XLM and USDC have no cash-out path yet.
 */
export type WithdrawalAsset = 'cNGN' | 'cKES' | 'cGHS'

/**
 * Every asset that has a cash-out route, in the order the UI presents them.
 *
 * This is the canonical order, not a preference: `getWithdrawableAssets`
 * filters it so a merchant's options always read cNGN, cKES, cGHS regardless
 * of the order balances happen to arrive in. Every entry needs a
 * `WITHDRAWAL_ASSET_CONFIG` record, since the type is `Record<…>` and
 * TypeScript enforces it.
 */
export const WITHDRAWAL_ASSETS: WithdrawalAsset[] = ['cNGN', 'cKES', 'cGHS']

/** Per-asset rules the cash-out form and validation both read. */
export interface WithdrawalAssetConfig {
  /** The asset these rules apply to. Redundant with the record key, but it keeps
   * a config entry self-describing when logged or spread into a payload. */
  asset: WithdrawalAsset
  /** Which `BANKS_BY_COUNTRY` list `getBankOptions` should offer. */
  country: BankCountry
  /**
   * Lowest amount a merchant can cash out, in **stroops** — not whole units.
   *
   * 1 unit = 10,000,000 stroops (see `STROOPS_PER_UNIT` in `lib/money.ts`), so
   * 500,000,000n is 50 cNGN, not 500,000,000 cNGN. Getting this wrong is the
   * classic off-by-10^7 bug: the figure below is 50 cNGN because
   * 50 * 10_000_000 = 500_000_000.
   *
   * To add a new asset, write the provider's floor in its own currency unit
   * and multiply — don't paste the raw provider number.
   */
  minimumStroops: bigint
  /** Smallest supported currency sub-unit, in stroops. */
  minimumPrecisionStroops: bigint
  /** Digit count the destination account number must have for this country. */
  accountNumberLength: number
}

/**
 * Per-asset cash-out rules. Minimums are stopgap figures mirroring each
 * provider's own floor (Paystack NGN 50, M-Pesa KES 10, MoMo GHS 5).
 *
 * Keyed by `WithdrawalAsset`, so adding an asset to the union above forces an
 * entry here rather than letting it fall through to `undefined` at runtime.
 */
export const WITHDRAWAL_ASSET_CONFIG: Record<WithdrawalAsset, WithdrawalAssetConfig> = {
  cNGN: {
    asset: 'cNGN',
    country: 'Nigeria',
    minimumStroops: 500_000_000n,
    minimumPrecisionStroops: 100_000n,
    accountNumberLength: 10,
  },
  cKES: {
    asset: 'cKES',
    country: 'Kenya',
    minimumStroops: 100_000_000n,
    minimumPrecisionStroops: 100_000n,
    accountNumberLength: 10,
  },
  cGHS: {
    asset: 'cGHS',
    country: 'Ghana',
    minimumStroops: 50_000_000n,
    minimumPrecisionStroops: 100_000n,
    accountNumberLength: 10,
  },
}

/**
 * The cash-out rules for one asset — country, minimum amount and account
 * number length.
 *
 * A direct lookup rather than a fallback: the `asset` argument is typed as
 * `WithdrawalAsset`, and `WITHDRAWAL_ASSET_CONFIG` is a total `Record` over
 * that union, so a valid asset always has an entry. Never widen the parameter
 * to `string`; that is what turns this into a possible `undefined`.
 */
export function getWithdrawalAssetConfig(asset: WithdrawalAsset): WithdrawalAssetConfig {
  return WITHDRAWAL_ASSET_CONFIG[asset]
}

export function validateWithdrawal(
  amount: bigint | null,
  config: WithdrawalAssetConfig,
  available: bigint,
  bankCode: string,
  accountNumber: string
): string | null {
  if (amount === null || amount <= 0n) return 'Enter an amount to cash out.'
  if (!isAmountMultipleOf(amount, config.minimumPrecisionStroops)) {
    return 'Amount must have at most 2 decimal places.'
  }
  if (amount < config.minimumStroops) {
    return `The smallest cash-out is ${formatStroops(config.minimumStroops)} ${config.asset}.`
  }
  if (amount > available) return 'That is more than your available balance.'
  if (!bankCode) return 'Choose your bank.'
  if (accountNumber.length !== config.accountNumberLength) {
    return `Account numbers are ${config.accountNumberLength} digits.`
  }
  return null
}

/**
 * Banks / mobile-money options for the country a given asset settles in.
 *
 * Two-step country lookup: the asset picks its `country` via
 * `WITHDRAWAL_ASSET_CONFIG`, and that country picks a list out of
 * `BANKS_BY_COUNTRY`. The lists are hardcoded pending a backend `/banks`
 * endpoint — see the note in `lib/banks.ts`.
 *
 * The returned array is the shared list from `lib/banks.ts`, not a copy. Treat
 * it as read-only; callers that need to mutate must copy it first.
 */
export function getBankOptions(asset: WithdrawalAsset): Bank[] {
  return BANKS_BY_COUNTRY[WITHDRAWAL_ASSET_CONFIG[asset].country]
}

/**
 * Assets the merchant actually holds a non-zero balance in, in canonical order.
 *
 * Two filters, in this order:
 *  1. `available > 0n` — `available` is a `bigint` of stroops, so the
 *     comparison has to be against `0n`, not `0`. A zero-balance asset is
 *     dropped because the form can't cash it out, and offering it would just
 *     lead to a guaranteed "insufficient balance" error.
 *  2. Membership in `WITHDRAWAL_ASSETS` — drops assets with no cash-out route
 *     (XLM, USDC), which merchants do receive.
 *
 * The result iterates `WITHDRAWAL_ASSETS` rather than `balances`, so the
 * order is canonical (cNGN, cKES, cGHS) no matter what order the backend
 * returned balances in, and duplicates in `balances` can't produce duplicates
 * here. Empty means the merchant has nothing to cash out.
 */
export function getWithdrawableAssets(balances: Balance[]): WithdrawalAsset[] {
  const held = new Set(
    balances.filter((balance) => balance.available > 0n).map((balance) => balance.asset)
  )
  return WITHDRAWAL_ASSETS.filter((asset) => held.has(asset))
}

/** A bank + account pair the merchant has used before. */
export interface SavedBeneficiary {
  bankCode: string
  bankName: string
  accountNumber: string
}

/**
 * Unique bank+account pairs extracted from past withdrawals, most-recent first.
 *
 * Only withdrawals that have both `bank_code` and `account_number` are
 * considered. The dedup key is `${bankCode}:${accountNumber}`, so the same
 * account at different banks is treated as separate entries (which it is).
 *
 * The list is scoped to the given `asset` so a cNGN beneficiary never shows up
 * when the merchant is cashing out cKES. Pass `undefined` to skip the filter.
 */
export function getSavedBeneficiaries(
  withdrawals: Withdrawal[],
  asset?: WithdrawalAsset
): SavedBeneficiary[] {
  const seen = new Set<string>()
  const result: SavedBeneficiary[] = []

  for (const w of withdrawals) {
    if (!w.bank_code || !w.account_number) continue
    if (asset && w.asset !== asset) continue

    const key = `${w.bank_code}:${w.account_number}`
    if (seen.has(key)) continue
    seen.add(key)

    // Look up the display name from the hardcoded bank lists. If the code
    // isn't recognised (e.g. a new bank added since the last deploy), fall back
    // to the raw code so the button still renders something meaningful.
    const country = WITHDRAWAL_ASSET_CONFIG[w.asset as WithdrawalAsset]?.country
    const banks = country ? BANKS_BY_COUNTRY[country] : []
    const bankName = banks.find((b) => b.code === w.bank_code)?.name ?? w.bank_code

    result.push({ bankCode: w.bank_code, bankName, accountNumber: w.account_number })
  }

  return result
}
