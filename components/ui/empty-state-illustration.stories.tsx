import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyStateIllustration } from './empty-state-illustration'

const meta = {
  title: 'UI/EmptyStateIllustration',
  component: EmptyStateIllustration,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['empty', 'search', 'calendar'],
    },
  },
} satisfies Meta<typeof EmptyStateIllustration>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: { variant: 'empty' },
}

export const Search: Story = {
  args: { variant: 'search' },
}

export const Calendar: Story = {
  args: { variant: 'calendar' },
}
