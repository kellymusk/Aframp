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

/** One signed-in device, as listed by `GET /sessions`. */
export interface DeviceSession {
  id: UUID
  /** Browser or app the session was opened from, when the backend could tell. */
  device: string | null
  ip: string | null
  created_at: string
  last_seen_at: string
  /** True for the session making the request, which can't be revoked from here. */
  current?: boolean
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

/**
 * TODO(aframp-backend#1341): Replace this placeholder with the contract from
 * the backend `openapi.yaml` once the audit log endpoint ships. Field names,
 * event taxonomy, and path/filters are intentionally provisional.
 */
export interface AuditLogEvent {
  id: string
  created_at: string
  /** e.g. sign-in, API key change, email change, cash-out */
  event_type?: string | null
  description?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
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
  phoneNumber: string,
  acceptedTermsVersion: string
): Promise<OtpChallengeResponse> {
  return request<OtpChallengeResponse>('/signup', {
    method: 'POST',
    body: {
      email,
      password,
      name,
      phone_number: phoneNumber,
      accepted_terms_version: acceptedTermsVersion,
    },
  })
}

/** A challenge for any phone-verified account, or a session directly for
 * a legacy no-phone account — see `LoginResult`. */
export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/login', { method: 'POST', body: { email, password } })
}

/**
 * Starts a password reset. The backend answers the same way whether or not the
 * email has an account, so this never reveals which emails are registered.
 */
export function requestPasswordReset(email: string): Promise<OtpChallengeResponse> {
  return request<OtpChallengeResponse>('/password-reset', { method: 'POST', body: { email } })
}

/** Completes a reset with the OTP; the backend signs out existing sessions. */
export function confirmPasswordReset(
  challengeId: string,
  code: string,
  newPassword: string
): Promise<void> {
  return request<void>('/password-reset/confirm', {
    method: 'POST',
    body: { challenge_id: challengeId, code, new_password: newPassword },
  })
}

/** The only call that ever turns a challenge into a session. */
export function verifyOtp(challengeId: string, code: string): Promise<AuthResponse> {
  return request<AuthResponse>('/verify-otp', {
    method: 'POST',
    body: { challenge_id: challengeId, code },
  })
}

export function listSessions(token: string, signal?: AbortSignal): Promise<DeviceSession[]> {
  return request<DeviceSession[]>('/sessions', { token, signal })
}

/** Signs that device out immediately; its token stops working. */
export function revokeSession(token: string, id: UUID): Promise<void> {
  return request<void>(`/sessions/${id}`, { method: 'DELETE', token })
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

/**
 * TODO(aframp-backend#1341): Update path, params, and response shape to match
 * the backend `openapi.yaml` contract when available.
 */
export function listAuditLogEvents(token: string, signal?: AbortSignal): Promise<AuditLogEvent[]> {
  return request<AuditLogEvent[]>('/audit-log', { token, signal })
}

export const authApi = {
  signup,
  login,
  verifyOtp,
  requestPasswordReset,
  confirmPasswordReset,
  listSessions,
  revokeSession,
  logout,
  getMe,
  updateProfile,
  changeEmail,
  changePhone,
  deleteAccount,
  registerPushSubscription,
  unregisterPushSubscription,
  getPushSubscriptionStatus,
  listAuditLogEvents,
}
