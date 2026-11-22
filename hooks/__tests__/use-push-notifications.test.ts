import { renderHook, waitFor } from '@testing-library/react'
import { usePushNotifications } from '../use-push-notifications'

// Mock environment variable
const originalEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

describe('usePushNotifications', () => {
  let mockServiceWorker: {
    register: jest.Mock
  }
  let mockPushManager: {
    subscribe: jest.Mock
    getSubscription: jest.Mock
  }
  let mockRegistration: {
    pushManager: typeof mockPushManager
  }
  let mockPermissionStatus: {
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }

  beforeEach(() => {
    // Reset mocks
    mockPushManager = {
      subscribe: jest.fn(),
      getSubscription: jest.fn().mockResolvedValue(null),
    }
    mockRegistration = {
      pushManager: mockPushManager,
    }
    mockServiceWorker = {
      register: jest.fn().mockResolvedValue(mockRegistration),
    }
    mockPermissionStatus = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    // Setup window/navigator mocks
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        serviceWorker: mockServiceWorker,
        permissions: {
          query: jest.fn().mockResolvedValue(mockPermissionStatus),
        },
      },
    })
    Object.defineProperty(window, 'PushManager', {
      writable: true,
      value: {},
    })
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: jest.fn().mockResolvedValue('granted'),
      },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalEnv
  })

  describe('listener cleanup', () => {
    it('should remove permission change listener on unmount', async () => {
      const { unmount } = renderHook(() => usePushNotifications())

      await waitFor(() => {
        expect(mockPermissionStatus.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      })

      unmount()

      expect(mockPermissionStatus.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should not accumulate listeners on multiple mount/unmount cycles', async () => {
      const { unmount: unmount1 } = renderHook(() => usePushNotifications())
      await waitFor(() => {
        expect(mockPermissionStatus.addEventListener).toHaveBeenCalledTimes(1)
      })
      unmount1()
      expect(mockPermissionStatus.removeEventListener).toHaveBeenCalledTimes(1)

      const { unmount: unmount2 } = renderHook(() => usePushNotifications())
      await waitFor(() => {
        expect(mockPermissionStatus.addEventListener).toHaveBeenCalledTimes(2)
      })
      unmount2()
      expect(mockPermissionStatus.removeEventListener).toHaveBeenCalledTimes(2)

      const { unmount: unmount3 } = renderHook(() => usePushNotifications())
      await waitFor(() => {
        expect(mockPermissionStatus.addEventListener).toHaveBeenCalledTimes(3)
      })
      unmount3()
      expect(mockPermissionStatus.removeEventListener).toHaveBeenCalledTimes(3)
    })

    it('should not add listener if component unmounts before permission query resolves', async () => {
      let resolveQuery: (value: typeof mockPermissionStatus) => void
      const delayedQuery = new Promise<typeof mockPermissionStatus>((resolve) => {
        resolveQuery = resolve
      })

      Object.defineProperty(window.navigator, 'permissions', {
        value: {
          query: jest.fn().mockReturnValue(delayedQuery),
        },
      })

      const { unmount } = renderHook(() => usePushNotifications())
      unmount()

      // Resolve after unmount
      resolveQuery!(mockPermissionStatus)
      await waitFor(() => {
        expect(mockPermissionStatus.addEventListener).not.toHaveBeenCalled()
      })
    })
  })

  describe('VAPID key validation', () => {
    it('should show error when VAPID key is empty', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ''

      const { result } = renderHook(() => usePushNotifications())

      await waitFor(() => {
        expect(result.current.permission).toBe('default')
      })

      await result.current.subscribe()

      expect(result.current.error).toBe('Push notifications are not configured. Contact your administrator.')
      expect(mockPushManager.subscribe).not.toHaveBeenCalled()
    })

    it('should show error when VAPID key is undefined', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      const { result } = renderHook(() => usePushNotifications())

      await result.current.subscribe()

      expect(result.current.error).toBe('Push notifications are not configured. Contact your administrator.')
      expect(mockPushManager.subscribe).not.toHaveBeenCalled()
    })

    it('should proceed with subscribe when VAPID key is configured', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcx'

      const mockSubscription = {
        toJSON: () => ({
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'key1',
            auth: 'key2',
          },
        }),
      }
      mockPushManager.subscribe.mockResolvedValue(mockSubscription)

      const { result } = renderHook(() => usePushNotifications())

      await waitFor(() => {
        expect(result.current.permission).toBe('default')
      })

      await result.current.subscribe()

      expect(mockPushManager.subscribe).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })
  })

  describe('unsupported environments', () => {
    it('should set permission to unsupported when serviceWorker is not available', () => {
      Object.defineProperty(window.navigator, 'serviceWorker', {
        value: undefined,
      })

      const { result } = renderHook(() => usePushNotifications())

      expect(result.current.permission).toBe('unsupported')
    })

    it('should set permission to unsupported when PushManager is not available', () => {
      Object.defineProperty(window, 'PushManager', {
        value: undefined,
      })

      const { result } = renderHook(() => usePushNotifications())

      expect(result.current.permission).toBe('unsupported')
    })
  })
})
