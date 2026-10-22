import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { LoadingSpinner } from './loading-spinner'

const meta = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingSpinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
  args: { className: 'h-5 w-5' },
}

export const Large: Story = {
  args: { className: 'h-16 w-16' },
}
