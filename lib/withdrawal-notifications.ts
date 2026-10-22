import type { Withdrawal } from '@/lib/api'
import { formatStroops } from '@/lib/money'

export interface WithdrawalNotice {
  id: string
  title: string
  body: string
  tag: string
  url: string
  kind: 'success' | 'failure'
}

/** Withdrawals still moving through the provider; worth polling for. */
export function hasActiveWithdrawal(withdrawals: Withdrawal[]): boolean {
  return withdrawals.some((w) => w.status === 'pending' || w.status === 'processing')
}

export function snapshotStatuses(withdrawals: Withdrawal[]): Map<string, Withdrawal['status']> {
  return new Map(withdrawals.map((w) => [w.id, w.status]))
}

/**
 * Notices for withdrawals that moved from pending/processing to a final status
 * since `previous`. Withdrawals first seen already final produce nothing, so
 * opening the page never replays old results.
 */
export function detectWithdrawalChanges(
  previous: Map<string, Withdrawal['status']>,
  next: Withdrawal[]
): WithdrawalNotice[] {
  const notices: WithdrawalNotice[] = []
  for (const w of next) {
    const before = previous.get(w.id)
    if (before !== 'pending' && before !== 'processing') continue
    const amount = `${formatStroops(w.amount_stroops)} ${w.asset}`
    if (w.status === 'completed') {
      notices.push({
        id: w.id,
        kind: 'success',
        title: 'Cash-out complete',
        body: `${amount} has been paid out to your bank account.`,
        tag: `withdrawal-${w.id}`,
        url: '/withdraw',
      })
    } else if (w.status === 'failed') {
      notices.push({
        id: w.id,
        kind: 'failure',
        title: 'Cash-out failed',
        body: w.failure_reason
          ? `${amount} could not be paid out: ${w.failure_reason}`
          : `${amount} could not be paid out. Your balance is unchanged.`,
        tag: `withdrawal-${w.id}`,
        url: '/withdraw',
      })
    }
  }
  return notices
}

/** Show a system notification when the merchant has granted permission. */
export async function showSystemNotification(notice: WithdrawalNotice): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(notice.title, {
      body: notice.body,
      icon: '/icon-192x192.png',
      tag: notice.tag,
      data: { url: notice.url },
    })
  } catch {
    // The in-page notice still covers the merchant.
  }
}
