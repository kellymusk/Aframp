/**
 * Wire types shared by the order API routes and the browser client.
 *
 * Kept in their own module so client bundles can import the shapes without
 * pulling in the server-only store (lib/orders/order-store.ts).
 */

export type OrderKind = 'onramp' | 'offramp'

/** Maximum serialised size of an order payload, in bytes. */
export const MAX_PAYLOAD_BYTES = 16_384

/** Maximum orders retained per wallet — oldest are pruned beyond this. */
export const MAX_ORDERS_PER_WALLET = 100

/**
 * An order as returned by the API.  `payload` is the full client-side order
 * object (OnrampOrder or OfframpOrder) stored verbatim; `status` is lifted out
 * of it so callers can filter without parsing the payload.
 */
export interface StoredOrder<TPayload = Record<string, unknown>> {
  id: string
  walletAddress: string
  kind: OrderKind
  status: string
  payload: TPayload
  /** ISO 8601 timestamps. */
  createdAt: string
  updatedAt: string
}
