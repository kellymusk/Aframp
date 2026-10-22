import type { Withdrawal } from '@/lib/api'
import { detectWithdrawalChanges, snapshotStatuses } from '@/lib/withdrawal-notifications'

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
