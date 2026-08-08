/**
 * Web Push / VAPID sender
 *
 * Sends push notifications via the Web Push Protocol using VAPID authentication.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  – base64url VAPID public key (also exposed to client)
 *   VAPID_PRIVATE_KEY             – base64url VAPID private key (server only)
 *   VAPID_SUBJECT                 – mailto: or https: contact for VAPID claims
 *
 * Generate a key pair once with:
 *   npx web-push generate-vapid-keys
 */

import {
  getSubscriptionsForUser,
  removeSubscription,
  type StoredPushSubscription,
} from './push-subscriptions-store'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
}

// ── VAPID helpers ─────────────────────────────────────────────────────────────

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:support@aframp.com'

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID keys are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.'
    )
  }

  return { publicKey, privateKey, subject }
}

/**
 * Build a signed JWT for the VAPID Authorization header.
 * Uses the Web Crypto API (available in Node 18+ / Edge runtime).
 */
async function buildVapidAuthorizationHeader(
  endpoint: string,
  { publicKey, privateKey, subject }: { publicKey: string; privateKey: string; subject: string }
): Promise<string> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60 // 12 hours

  // JWT header + claims
  const header = { alg: 'ES256', typ: 'JWT' }
  const claims = { aud: audience, exp: expiry, sub: subject }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const unsignedToken = `${encode(header)}.${encode(claims)}`

  // Import the VAPID private key (PKCS8 / raw base64url ES256)
  // web-push generate-vapid-keys produces a raw 32-byte private key in base64url.
  const rawPrivate = Buffer.from(privateKey, 'base64url')

  // Construct PKCS8 DER wrapper for P-256 (OID 1.2.840.10045.2.1 / 1.3.132.0.10)
  const pkcs8Prefix = Buffer.from(
    '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420',
    'hex'
  )
  const pkcs8Suffix = Buffer.from('a144034200', 'hex')

  // P-256 PKCS8: prefix ‖ rawPrivate (32 bytes)
  const pkcs8Der = Buffer.concat([pkcs8Prefix, rawPrivate, pkcs8Suffix])

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    Buffer.from(unsignedToken)
  )

  const signedToken = `${unsignedToken}.${Buffer.from(signature).toString('base64url')}`
  return `vapid t=${signedToken},k=${publicKey}`
}

// ── Message encryption (AES-128-GCM / RFC 8291) ───────────────────────────────

/**
 * Encrypt a push message payload per RFC 8291 (HTTP Encrypted Content Encoding).
 * Returns the encrypted body buffer along with the required headers.
 */
async function encryptPayload(
  subscription: PushSubscriptionJSON,
  payload: string
): Promise<{ encrypted: Buffer; headers: Record<string, string> }> {
  const { keys } = subscription
  if (!keys?.p256dh || !keys?.auth) {
    throw new Error('Push subscription is missing p256dh / auth keys')
  }

  // Client public key and auth secret
  const clientPublicKey = Buffer.from(keys.p256dh, 'base64url')
  const authSecret = Buffer.from(keys.auth, 'base64url')

  // Generate an ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const serverPublicKeyRaw = Buffer.from(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  )

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  )
  const sharedSecret = Buffer.from(sharedSecretBits)

  // Generate a random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF key derivation (RFC 8291 §3.3)
  const hkdfExtract = async (ikm: Buffer, prk: Buffer, info: Buffer, length: number) => {
    const key = await crypto.subtle.importKey('raw', prk, { name: 'HKDF' }, false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: ikm, info },
      key,
      length * 8
    )
    return Buffer.from(bits)
  }

  // PRK = HKDF-Extract(auth, ECDH output)
  const prkKey = Buffer.concat([
    sharedSecret,
    clientPublicKey,
    serverPublicKeyRaw,
  ])
  const prk = await hkdfExtract(
    authSecret,
    prkKey,
    Buffer.from('Content-Encoding: auth\0'),
    32
  )

  // Content encryption key (16 bytes) and nonce (12 bytes)
  const cekInfo = Buffer.from(
    `Content-Encoding: aes128gcm\0\0\0 P-256\0${Buffer.from(clientPublicKey).toString('binary')}\0${Buffer.from(serverPublicKeyRaw).toString('binary')}`
  )
  const contentEncryptionKey = await hkdfExtract(Buffer.from(salt), prk, cekInfo, 16)
  const nonceInfo = Buffer.from(
    `Content-Encoding: nonce\0\0\0 P-256\0${Buffer.from(clientPublicKey).toString('binary')}\0${Buffer.from(serverPublicKeyRaw).toString('binary')}`
  )
  const nonce = await hkdfExtract(Buffer.from(salt), prk, nonceInfo, 12)

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // Pad the payload (RFC 8291 requires at least 1 delimiter byte)
  const plaintextBuffer = Buffer.from(payload, 'utf8')
  const paddedPlaintext = Buffer.concat([plaintextBuffer, Buffer.from([2])]) // delimiter = 0x02

  const ciphertextBits = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    paddedPlaintext
  )
  const ciphertext = Buffer.from(ciphertextBits)

  // Build the RFC 8291 binary header:
  // salt (16) | rs (4, big-endian uint32) | idlen (1) | keyid (server public key, 65 bytes)
  const rs = 4096
  const rsBuffer = Buffer.alloc(4)
  rsBuffer.writeUInt32BE(rs, 0)
  const idlen = Buffer.from([serverPublicKeyRaw.length])
  const header = Buffer.concat([Buffer.from(salt), rsBuffer, idlen, serverPublicKeyRaw])

  const encrypted = Buffer.concat([header, ciphertext])

  return {
    encrypted,
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(encrypted.length),
    },
  }
}

// ── Core send function ────────────────────────────────────────────────────────

/**
 * Send a push notification to a single subscription.
 * Throws on unrecoverable errors; returns `{ gone: true }` when the endpoint
 * has expired (HTTP 410 Gone) so callers can clean it up.
 */
export async function sendToSubscription(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<{ success: boolean; gone?: boolean }> {
  const vapid = getVapidConfig()

  if (!subscription.endpoint) {
    throw new Error('Push subscription has no endpoint')
  }

  const serialised = JSON.stringify(payload)

  const [{ encrypted, headers }, authorization] = await Promise.all([
    encryptPayload(subscription, serialised),
    buildVapidAuthorizationHeader(subscription.endpoint, vapid),
  ])

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      Authorization: authorization,
      TTL: '86400', // seconds the push service should retain the message
    },
    body: encrypted,
  })

  if (response.status === 410 || response.status === 404) {
    // Subscription has expired or been removed by the browser
    return { success: false, gone: true }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Push service returned ${response.status}: ${text}`)
  }

  return { success: true }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a push notification to all active subscriptions for a user.
 * Expired subscriptions are automatically removed from the store.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; removed: number }> {
  const subscriptions = await getSubscriptionsForUser(userId)

  let sent = 0
  let failed = 0
  let removed = 0

  await Promise.allSettled(
    subscriptions.map(async (stored) => {
      try {
        const result = await sendToSubscription(stored.subscription, payload)
        if (result.gone) {
          await removeSubscription(userId, stored.subscription.endpoint!)
          removed++
        } else if (result.success) {
          sent++
        }
      } catch (err) {
        console.error('[push] Failed to send to subscription', err)
        failed++
      }
    })
  )

  return { sent, failed, removed }
}

/**
 * Broadcast a push notification to ALL users in the subscription store.
 * Useful for system-wide announcements or scheduled price-alert checks.
 */
export async function broadcastPush(
  payload: PushPayload
): Promise<{ sent: number; failed: number; removed: number }> {
  const { getAllSubscriptions } = await import('./push-subscriptions-store')
  const all = await getAllSubscriptions()

  let sent = 0
  let failed = 0
  let removed = 0

  await Promise.allSettled(
    all.map(async (stored) => {
      try {
        const result = await sendToSubscription(stored.subscription, payload)
        if (result.gone) {
          await removeSubscription(stored.userId, stored.subscription.endpoint!)
          removed++
        } else if (result.success) {
          sent++
        }
      } catch (err) {
        console.error('[push] Broadcast failed for user', stored.userId, err)
        failed++
      }
    })
  )

  return { sent, failed, removed }
}
