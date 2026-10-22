import type { Withdrawal } from '@/lib/api'
import {
  detectWithdrawalChanges,
  hasActiveWithdrawal,
  showSystemNotification,
  snapshotStatuses,
} from '@/lib/withdrawal-notifications'

function w(id: string, status: Withdrawal['status'], failure_reason: string | null = null) {
  return { id, status, failure_reason, asset: 'cNGN', amount_stroops: 5_000_000_000n } as Withdrawal
}

describe('detectWithdrawalChanges', () => {
  it('notifies on completion and failure of in-flight withdrawals', () => {
    const before = snapshotStatuses([w('a', 'processing'), w('b', 'pending')])
    const notices = detectWithdrawalChanges(before, [
      w('a', 'completed'),
      w('b', 'failed', 'Invalid account'),
    ])
    expect(notices.map((n) => [n.id, n.kind])).toEqual([
      ['a', 'success'],
      ['b', 'failure'],
    ])
    expect(notices[1].body).toContain('Invalid account')
  })

  it('ignores unchanged, still-active and previously-unseen withdrawals', () => {
    const before = snapshotStatuses([w('a', 'processing'), w('c', 'completed')])
    expect(
      detectWithdrawalChanges(before, [w('a', 'processing'), w('c', 'completed'), w('d', 'failed')])
    ).toEqual([])
  })
})

describe('hasActiveWithdrawal', () => {
  it('is true while any withdrawal is pending or processing', () => {
    expect(hasActiveWithdrawal([w('a', 'completed'), w('b', 'pending')])).toBe(true)
    expect(hasActiveWithdrawal([w('a', 'processing')])).toBe(true)
    expect(hasActiveWithdrawal([w('a', 'completed'), w('b', 'failed')])).toBe(false)
  })
})

describe('detectWithdrawalChanges failure copy', () => {
  it('reassures the merchant when no failure reason is given', () => {
    const [notice] = detectWithdrawalChanges(snapshotStatuses([w('a', 'pending')]), [
      w('a', 'failed'),
    ])
    expect(notice.body).toContain('Your balance is unchanged')
  })
})

describe('showSystemNotification', () => {
  const notice = {
    id: 'a',
    title: 'Cash-out complete',
    body: 'Paid',
    tag: 'withdrawal-a',
    url: '/withdraw',
    kind: 'success' as const,
  }
  const showNotification = jest.fn()

  beforeEach(() => {
    showNotification.mockReset().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ showNotification }) },
    })
  })

  afterEach(() => {
    delete (window as { Notification?: unknown }).Notification
    delete (navigator as { serviceWorker?: unknown }).serviceWorker
  })

  it('shows a system notification when permission is granted', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted' },
    })
    await showSystemNotification(notice)
    expect(showNotification).toHaveBeenCalledWith('Cash-out complete', {
      body: 'Paid',
      icon: '/icon-192x192.png',
      tag: 'withdrawal-a',
      data: { url: '/withdraw' },
    })
  })

  it('does nothing without notification permission', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default' },
    })
    await showSystemNotification(notice)
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('ignores a failing service worker', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'granted' },
    })
    showNotification.mockRejectedValue(new Error('no sw'))
    await expect(showSystemNotification(notice)).resolves.toBeUndefined()
  })
})
