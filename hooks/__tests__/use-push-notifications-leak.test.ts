import { renderHook, waitFor } from '@testing-library/react'
import { usePushNotifications } from '../use-push-notifications'

describe('usePushNotifications - Memory Leak Fix', () => {
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
})
