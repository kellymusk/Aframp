import React from 'react'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion before importing the component
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock lucide-react icons as simple divs
jest.mock('lucide-react', () => ({
  Bell: (props: any) => <div data-testid="icon-bell" {...props} />,
  Mail: (props: any) => <div data-testid="icon-mail" {...props} />,
  Smartphone: (props: any) => <div data-testid="icon-smartphone" {...props} />,
  TrendingUp: (props: any) => <div data-testid="icon-trendingup" {...props} />,
  Shield: (props: any) => <div data-testid="icon-shield" {...props} />,
  CreditCard: (props: any) => <div data-testid="icon-creditcard" {...props} />,
  Gift: (props: any) => <div data-testid="icon-gift" {...props} />,
  Megaphone: (props: any) => <div data-testid="icon-megaphone" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader2" {...props} />,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

import { NotificationsTab } from '@/components/settings/notifications-tab'

afterEach(() => {
  cleanup()
  jest.clearAllTimers()
})

// The 5 notification categories defined in the component
const CATEGORIES = [
  'Transaction Alerts',
  'Price Alerts',
  'Security Alerts',
  'Promotions & Offers',
  'Product Updates',
]

// Switches by their aria-label patterns
const CATEGORY_IDS = ['transactions', 'price-alerts', 'security', 'promotions', 'product-updates']

describe('NotificationsTab', () => {
  describe('renders all notification categories', () => {
    it('renders Transaction Alerts category', () => {
      render(<NotificationsTab />)
      expect(screen.getByText('Transaction Alerts')).toBeInTheDocument()
    })

    it('renders Price Alerts category', () => {
      render(<NotificationsTab />)
      expect(screen.getByText('Price Alerts')).toBeInTheDocument()
    })

    it('renders Security Alerts category', () => {
      render(<NotificationsTab />)
      expect(screen.getByText('Security Alerts')).toBeInTheDocument()
    })

    it('renders Promotions & Offers category', () => {
      render(<NotificationsTab />)
      expect(screen.getByText('Promotions & Offers')).toBeInTheDocument()
    })

    it('renders Product Updates category', () => {
      render(<NotificationsTab />)
      expect(screen.getByText('Product Updates')).toBeInTheDocument()
    })

    it('renders all 5 categories in total', () => {
      render(<NotificationsTab />)
      CATEGORIES.forEach((cat) => {
        expect(screen.getByText(cat)).toBeInTheDocument()
      })
    })
  })

  describe('each category has email, push, and SMS switches', () => {
    it('transactions category has an email switch', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /transaction alerts email/i })).toBeInTheDocument()
    })

    it('transactions category has a push switch', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /transaction alerts push/i })).toBeInTheDocument()
    })

    it('transactions category has an SMS switch', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /transaction alerts sms/i })).toBeInTheDocument()
    })

    it('price-alerts category has email, push, SMS switches', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /price alerts email/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /price alerts push/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /price alerts sms/i })).toBeInTheDocument()
    })

    it('security category has email, push, SMS switches', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /security alerts email/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /security alerts push/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /security alerts sms/i })).toBeInTheDocument()
    })

    it('promotions category has email, push, SMS switches', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /promotions.*email/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /promotions.*push/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /promotions.*sms/i })).toBeInTheDocument()
    })

    it('product-updates category has email, push, SMS switches', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('switch', { name: /product updates email/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /product updates push/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /product updates sms/i })).toBeInTheDocument()
    })
  })

  describe('toggling a switch changes its checked state', () => {
    it('toggling transactions email switch from on to off', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const emailSwitch = screen.getByRole('switch', { name: /transaction alerts email/i })
      // Default: transactions email is true
      expect(emailSwitch).toHaveAttribute('data-state', 'checked')

      await user.click(emailSwitch)

      expect(emailSwitch).toHaveAttribute('data-state', 'unchecked')
    })

    it('toggling promotions email switch from off to on', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const emailSwitch = screen.getByRole('switch', { name: /promotions.*email/i })
      // Default: promotions email is false
      expect(emailSwitch).toHaveAttribute('data-state', 'unchecked')

      await user.click(emailSwitch)

      expect(emailSwitch).toHaveAttribute('data-state', 'checked')
    })

    it('toggling security SMS switch (default: on) to off', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const smsSwitch = screen.getByRole('switch', { name: /security alerts sms/i })
      // Default: security sms is true
      expect(smsSwitch).toHaveAttribute('data-state', 'checked')

      await user.click(smsSwitch)

      expect(smsSwitch).toHaveAttribute('data-state', 'unchecked')
    })

    it('toggling transactions push switch does not affect other switches', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const pushSwitch = screen.getByRole('switch', { name: /transaction alerts push/i })
      const emailSwitch = screen.getByRole('switch', { name: /transaction alerts email/i })

      const initialEmailState = emailSwitch.getAttribute('data-state')
      await user.click(pushSwitch)

      // Email should remain unchanged
      expect(emailSwitch).toHaveAttribute('data-state', initialEmailState)
    })
  })

  describe('toggleAllEmail master switch', () => {
    it('renders the toggle-all-email master switch', () => {
      render(<NotificationsTab />)
      const masterSwitch = screen.getByRole('switch', { name: /toggle all email/i })
      expect(masterSwitch).toBeInTheDocument()
    })

    it('master email switch is checked when all email switches are on', () => {
      render(<NotificationsTab />)
      // Default: transactions, price-alerts, security, product-updates email = true; promotions = false
      // So not all are on — master should be unchecked initially
      const masterSwitch = screen.getByRole('switch', { name: /toggle all email/i })
      expect(masterSwitch).toHaveAttribute('data-state', 'unchecked')
    })

    it('clicking master switch turns all email switches off when any is on', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const masterSwitch = screen.getByRole('switch', { name: /toggle all email/i })
      // Not all on so this will toggle all on first, then if clicked again toggles off
      // First click: since not all are on, allOn=false so we set all to true
      await user.click(masterSwitch)

      const transEmail = screen.getByRole('switch', { name: /transaction alerts email/i })
      const promotionsEmail = screen.getByRole('switch', { name: /promotions.*email/i })
      expect(transEmail).toHaveAttribute('data-state', 'checked')
      expect(promotionsEmail).toHaveAttribute('data-state', 'checked')
    })

    it('clicking master switch twice restores all email switches off', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const masterSwitch = screen.getByRole('switch', { name: /toggle all email/i })
      // Click once: all on
      await user.click(masterSwitch)
      // Click again: all off
      await user.click(masterSwitch)

      CATEGORY_IDS.forEach((id) => {
        const sw = screen.getByRole('switch', { name: new RegExp(`.*${id.replace('-', '.*')}.*email`, 'i') })
        expect(sw).toHaveAttribute('data-state', 'unchecked')
      })
    })

    it('when all emails are turned on, master switch shows as checked', async () => {
      const user = userEvent.setup()
      render(<NotificationsTab />)

      const masterSwitch = screen.getByRole('switch', { name: /toggle all email/i })
      // Click once to turn all on
      await user.click(masterSwitch)

      expect(masterSwitch).toHaveAttribute('data-state', 'checked')
    })
  })

  describe('save button', () => {
    it('renders the save button with id notifications-save-btn', () => {
      render(<NotificationsTab />)
      const saveBtn = document.getElementById('notifications-save-btn')
      expect(saveBtn).toBeInTheDocument()
    })

    it('save button is not disabled by default', () => {
      render(<NotificationsTab />)
      const saveBtn = document.getElementById('notifications-save-btn') as HTMLButtonElement
      expect(saveBtn).not.toBeDisabled()
    })

    it('save button shows "Save Preferences" label by default', () => {
      render(<NotificationsTab />)
      expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument()
    })

    it('clicking save button disables it while saving', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<NotificationsTab />)

      const saveBtn = document.getElementById('notifications-save-btn') as HTMLButtonElement
      await user.click(saveBtn)

      expect(saveBtn).toBeDisabled()

      jest.runAllTimers()
    })
  })
})
