import { request, type UUID } from './shared'

export interface AuthResponse {
  token: string
  user_id: UUID
  /**
   * Nullable by contract. Signup always creates a merchant today, but an
   * account without one gets 400 — not 401 — from every merchant-scoped call.
   */
  merchant_id: UUID | null
}

/**
 * What `/signup` always returns, and what `/login` returns for any account
 * with a verified phone (i.e. every account created since OTP shipped) —
 * neither endpoint issues a session directly anymore. `/verify-otp` is the
 * only call that ever turns this into an `AuthResponse`.
 */
export interface OtpChallengeResponse {
  challenge_id: UUID
  expires_in_secs: number
}

/**
 * `/login`'s response is conditional: a challenge for any phone-verified
 * account (the normal case), or a session directly for a legacy account
 * with no phone on file (only possible pre-OTP-rollout). Narrow with
 * `'challenge_id' in result`.
 */
export type LoginResult = AuthResponse | OtpChallengeResponse

/** Identity-verification state. Not yet in openapi.yaml; the cash-out page gates on 'approved' (#735). */
export type KycStatus = 'pending' | 'approved' | 'rejected'

export interface Me {
  user_id: UUID
  email: string
  name: string
  is_admin: boolean
  created_at: string
  merchant_id: UUID | null
  merchant_name: string | null
  phone_number?: string | null
  phone_verified?: boolean
  kyc_status?: KycStatus | null
}

export interface UpdateProfileRequest {
  name?: string
  merchant_name?: string
}

export interface UpdateProfileResponse {
  user_id: UUID
  email: string
  name: string
  merchant_id: UUID | null
  merchant_name: string | null
}

export interface ChangeEmailRequest {
  new_email: string
}

export interface ChangeEmailResponse {
  message: string
}

/** Phone change is a two-step OTP flow (current number, then new number).
 * The backend contract lives in aframp-backend#1342; this client only calls
 * the documented POST /me/phone endpoint through the /backend proxy. */
export interface PhoneChangeChallenge {
  challenge_id: UUID
  expires_in_secs: number
}

export interface PhoneChangeResult {
  message: string
}

export type PhoneChangeResponse = PhoneChangeChallenge | PhoneChangeResult

export interface DeleteAccountResponse {
  message: string
}

export interface PushSubscriptionRequest {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSubscriptionResponse {
  id: UUID
  merchant_id: UUID
  endpoint: string
  created_at: string
}

export interface PushSubscriptionStatus {
  enabled: boolean
}

/** Never returns a session directly — always a challenge. The account is
 * only created once `verifyOtp` succeeds. */
export function signup(
  email: string,
  password: string,
  name: string,
  phoneNumber: string
): Promise<OtpChallengeResponse> {
  return request<OtpChallengeResponse>('/signup', {
    method: 'POST',
    body: { email, password, name, phone_number: phoneNumber },
  })
}

/** A challenge for any phone-verified account, or a session directly for
 * a legacy no-phone account — see `LoginResult`. */
export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/login', { method: 'POST', body: { email, password } })
}

/** The only call that ever turns a challenge into a session. */
export function verifyOtp(challengeId: string, code: string): Promise<AuthResponse> {
  return request<AuthResponse>('/verify-otp', {
    method: 'POST',
    body: { challenge_id: challengeId, code },
  })
}

export function logout(token?: string): Promise<void> {
  return request<void>('/logout', { method: 'POST', token })
}

/** The JWT carries only ids; this is how anything human-readable is rendered. */
export function getMe(token: string, signal?: AbortSignal): Promise<Me> {
  return request<Me>('/me', { token, signal })
}

export function updateProfile(
  token: string,
  body: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  return request<UpdateProfileResponse>('/me', { method: 'POST', token, body })
}

export function changeEmail(token: string, newEmail: string): Promise<ChangeEmailResponse> {
  return request<ChangeEmailResponse>('/me/email', {
    method: 'POST',
    token,
    body: { new_email: newEmail },
  })
}

/** Start a phone change (OTP to the current number), or submit an OTP code.
 * A successful verification of the current number returns the next challenge;
 * verifying the new number completes the change. */
export function changePhone(
  token: string,
  body: { new_phone?: string; challenge_id?: string; code?: string }
): Promise<PhoneChangeResponse> {
  return request<PhoneChangeResponse>('/me/phone', { method: 'POST', token, body })
}

export function deleteAccount(token: string): Promise<DeleteAccountResponse> {
  return request<DeleteAccountResponse>('/me', { method: 'DELETE', token })
}

export function registerPushSubscription(
  token: string,
  subscription: PushSubscriptionRequest
): Promise<PushSubscriptionResponse> {
  return request<PushSubscriptionResponse>('/push/subscribe', {
    method: 'POST',
    token,
    body: subscription,
  })
}

export function unregisterPushSubscription(token: string): Promise<void> {
  return request<void>('/push/unsubscribe', { method: 'DELETE', token })
}

export function getPushSubscriptionStatus(
  token: string,
  signal?: AbortSignal
): Promise<PushSubscriptionStatus> {
  return request<PushSubscriptionStatus>('/push/status', { token, signal })
}

export const authApi = {
  signup,
  login,
  verifyOtp,
  logout,
  getMe,
  updateProfile,
  changeEmail,
  changePhone,
  deleteAccount,
  registerPushSubscription,
  unregisterPushSubscription,
  getPushSubscriptionStatus,
}
