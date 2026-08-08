import fs from 'fs'
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../notifications-store'

const mockReadFile = jest.spyOn(fs.promises, 'readFile') as jest.MockedFunction<typeof fs.promises.readFile>
const mockWriteFile = jest.spyOn(fs.promises, 'writeFile') as jest.MockedFunction<typeof fs.promises.writeFile>
const mockMkdir = jest.spyOn(fs.promises, 'mkdir') as jest.MockedFunction<typeof fs.promises.mkdir>

const BASE_ITEM = {
  id: 'notif-1',
  userId: 'wallet-1',
  title: 'KYC approved',
  message: 'Your KYC is verified.',
  category: 'kyc' as const,
  priority: 'normal' as const,
  isRead: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  metadata: {},
}

beforeEach(() => {
  mockReadFile.mockReset()
  mockWriteFile.mockReset()
  mockMkdir.mockReset()
  // mkdir is always a no-op in tests
  mockMkdir.mockResolvedValue(undefined)
  // writeFile succeeds by default
  mockWriteFile.mockResolvedValue(undefined)
})

describe('notifications store', () => {
  it('creates and fetches notifications for a user', async () => {
    // createNotification → readStore returns empty (no file yet)
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))

    const created = await createNotification({
      userId: 'wallet-1',
      title: 'Funds received',
      message: 'You received 2 XLM.',
      category: 'payment',
      priority: 'high',
    })

    expect(created.title).toBe('Funds received')
    expect(created.isRead).toBe(false)

    // getNotifications → readStore returns the created item
    mockReadFile.mockResolvedValueOnce(JSON.stringify([created]))

    const items = await getNotifications('wallet-1')
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Funds received')
  })

  it('marks a single notification as read', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify([BASE_ITEM]))

    const updated = await markNotificationRead('notif-1')
    expect(updated?.isRead).toBe(true)
  })

  it('returns null when marking a missing notification', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify([BASE_ITEM]))

    const result = await markNotificationRead('does-not-exist')
    expect(result).toBeNull()
  })

  it('returns the unread count for a user', async () => {
    const items = [
      { ...BASE_ITEM, id: 'n1', isRead: false },
      { ...BASE_ITEM, id: 'n2', isRead: true },
      { ...BASE_ITEM, id: 'n3', isRead: false },
    ]
    mockReadFile.mockResolvedValueOnce(JSON.stringify(items))

    const count = await getUnreadCount('wallet-1')
    expect(count).toBe(2)
  })

  it('marks all notifications as read for a user, leaves other users untouched', async () => {
    const items = [
      { ...BASE_ITEM, id: 'n1', userId: 'wallet-1', isRead: false },
      { ...BASE_ITEM, id: 'n2', userId: 'wallet-1', isRead: false },
      { ...BASE_ITEM, id: 'n3', userId: 'wallet-2', isRead: false },
    ]
    mockReadFile.mockResolvedValueOnce(JSON.stringify(items))

    const count = await markAllNotificationsRead('wallet-1')
    expect(count).toBe(2)

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as typeof items
    const wallet1 = written.filter((i) => i.userId === 'wallet-1')
    const wallet2 = written.filter((i) => i.userId === 'wallet-2')
    expect(wallet1.every((i) => i.isRead)).toBe(true)
    expect(wallet2[0].isRead).toBe(false)
  })

  it('filters notifications by userId', async () => {
    const items = [
      { ...BASE_ITEM, id: 'n1', userId: 'wallet-1' },
      { ...BASE_ITEM, id: 'n2', userId: 'wallet-2' },
    ]
    mockReadFile.mockResolvedValueOnce(JSON.stringify(items))

    const result = await getNotifications('wallet-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('n1')
  })
})
