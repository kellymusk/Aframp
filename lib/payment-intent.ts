export const PAYMENT_INTENTS = ['spend', 'buy'] as const

export type PaymentIntent = (typeof PAYMENT_INTENTS)[number]
export type AuthFlow = 'login' | 'signup'

export function getPaymentIntent(value: string | null): PaymentIntent | null {
  return PAYMENT_INTENTS.find((intent) => intent === value) ?? null
}

export function getPostAuthPath(intent: PaymentIntent | null): string {
  return intent ? `/home?intent=${intent}` : '/charge'
}

export function getLoginPath(intent: PaymentIntent | null): string {
  return intent ? `/login?intent=${intent}` : '/login'
}

export function getSignupPath(intent: PaymentIntent | null): string {
  return intent ? `/signup?intent=${intent}` : '/signup'
}

export function getVerifyPath(
  challengeId: string,
  flow: AuthFlow,
  intent: PaymentIntent | null
): string {
  const params = new URLSearchParams({ challenge_id: challengeId, flow })
  if (intent) params.set('intent', intent)
  return `/verify?${params.toString()}`
}
