import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion before importing the component
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock lucide-react icons as simple divs
jest.mock('lucide-react', () => ({
  User: (props: any) => <div data-testid="icon-user" {...props} />,
  Mail: (props: any) => <div data-testid="icon-mail" {...props} />,
  Phone: (props: any) => <div data-testid="icon-phone" {...props} />,
  MapPin: (props: any) => <div data-testid="icon-mappin" {...props} />,
  Camera: (props: any) => <div data-testid="icon-camera" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader2" {...props} />,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

import { ProfileTab } from '@/components/settings/profile-tab'

afterEach(() => {
  cleanup()
  jest.clearAllTimers()
})

describe('ProfileTab', () => {
  describe('renders all required form fields', () => {
    it('renders the display name input with default value', () => {
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /display name/i })
      expect(input).toBeInTheDocument()
      expect((input as HTMLInputElement).value).toBe('Aframp User')
    })

    it('renders the email input with default value', () => {
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /email address/i })
      expect(input).toBeInTheDocument()
      expect((input as HTMLInputElement).value).toBe('user@aframp.com')
    })

    it('renders the username input with default value', () => {
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /username/i })
      expect(input).toBeInTheDocument()
      expect((input as HTMLInputElement).value).toBe('aframp_user')
    })

    it('renders the phone number input with default value', () => {
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /phone number/i })
      expect(input).toBeInTheDocument()
      expect((input as HTMLInputElement).value).toBe('+234 800 000 0000')
    })

    it('renders the location input with default value', () => {
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /location/i })
      expect(input).toBeInTheDocument()
      expect((input as HTMLInputElement).value).toBe('Lagos, Nigeria')
    })
  })

  describe('handleChange updates input values', () => {
    it('updates display name when user types', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /display name/i }) as HTMLInputElement

      await user.clear(input)
      await user.type(input, 'New Name')

      expect(input.value).toBe('New Name')
    })

    it('updates email when user types', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /email address/i }) as HTMLInputElement

      await user.clear(input)
      await user.type(input, 'newemail@test.com')

      expect(input.value).toBe('newemail@test.com')
    })

    it('updates username when user types', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /username/i }) as HTMLInputElement

      await user.clear(input)
      await user.type(input, 'new_username')

      expect(input.value).toBe('new_username')
    })

    it('updates phone when user types', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /phone number/i }) as HTMLInputElement

      await user.clear(input)
      await user.type(input, '+1 555 000 1234')

      expect(input.value).toBe('+1 555 000 1234')
    })

    it('updates location when user types', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)
      const input = screen.getByRole('textbox', { name: /location/i }) as HTMLInputElement

      await user.clear(input)
      await user.type(input, 'Nairobi, Kenya')

      expect(input.value).toBe('Nairobi, Kenya')
    })
  })

  describe('save and cancel buttons', () => {
    it('renders the save button', () => {
      render(<ProfileTab />)
      const saveBtn = screen.getByRole('button', { name: /save changes/i })
      expect(saveBtn).toBeInTheDocument()
    })

    it('save button has the expected id', () => {
      render(<ProfileTab />)
      expect(document.getElementById('profile-save-btn')).toBeInTheDocument()
    })

    it('save button is clickable (not disabled by default)', () => {
      render(<ProfileTab />)
      const saveBtn = screen.getByRole('button', { name: /save changes/i })
      expect(saveBtn).not.toBeDisabled()
    })

    it('clicking save button disables it while saving', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<ProfileTab />)

      const saveBtn = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveBtn)

      // Button should be disabled while the async save is in progress
      expect(document.getElementById('profile-save-btn')).toBeDisabled()

      jest.runAllTimers()
    })

    it('renders the cancel button', () => {
      render(<ProfileTab />)
      const cancelBtn = screen.getByRole('button', { name: /cancel/i })
      expect(cancelBtn).toBeInTheDocument()
    })

    it('cancel button has the expected id', () => {
      render(<ProfileTab />)
      expect(document.getElementById('profile-cancel-btn')).toBeInTheDocument()
    })
  })

  describe('bio textarea and character counter', () => {
    it('renders the bio textarea with default value', () => {
      render(<ProfileTab />)
      const bio = document.getElementById('profile-bio') as HTMLTextAreaElement
      expect(bio).toBeInTheDocument()
      expect(bio.value).toBe('Crypto enthusiast building the future of African finance.')
    })

    it('shows character counter with current count', () => {
      render(<ProfileTab />)
      // Default bio is "Crypto enthusiast building the future of African finance." = 56 chars
      expect(screen.getByText(/\/160 characters/i)).toBeInTheDocument()
    })

    it('character counter updates when bio is changed', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)
      const bio = document.getElementById('profile-bio') as HTMLTextAreaElement

      await user.clear(bio)
      await user.type(bio, 'Hello')

      expect(screen.getByText('5/160 characters')).toBeInTheDocument()
    })

    it('bio textarea has a maxLength of 160', () => {
      render(<ProfileTab />)
      const bio = document.getElementById('profile-bio') as HTMLTextAreaElement
      expect(bio.maxLength).toBe(160)
    })
  })

  describe('avatar section', () => {
    it('renders the profile photo card section', () => {
      render(<ProfileTab />)
      expect(screen.getByText('Profile Photo')).toBeInTheDocument()
    })

    it('renders the avatar with initials for the default display name', () => {
      render(<ProfileTab />)
      // "Aframp User" => initials "AU"
      expect(screen.getByText('AU')).toBeInTheDocument()
    })

    it('renders the display name next to the avatar', () => {
      render(<ProfileTab />)
      // The display name appears in the avatar section
      const names = screen.getAllByText('Aframp User')
      expect(names.length).toBeGreaterThanOrEqual(1)
    })

    it('renders the username with @ prefix next to the avatar', () => {
      render(<ProfileTab />)
      expect(screen.getByText('@aframp_user')).toBeInTheDocument()
    })

    it('renders the avatar upload button', () => {
      render(<ProfileTab />)
      expect(document.getElementById('avatar-upload-btn')).toBeInTheDocument()
    })

    it('avatar upload button has correct aria-label', () => {
      render(<ProfileTab />)
      const uploadBtn = screen.getByRole('button', { name: /upload profile photo/i })
      expect(uploadBtn).toBeInTheDocument()
    })

    it('initials update when display name is changed', async () => {
      const user = userEvent.setup()
      render(<ProfileTab />)

      const input = screen.getByRole('textbox', { name: /display name/i })
      await user.clear(input)
      await user.type(input, 'Kwame Mensah')

      expect(screen.getByText('KM')).toBeInTheDocument()
    })
  })
})
