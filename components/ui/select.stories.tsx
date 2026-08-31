import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select an asset" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="xlm">XLM</SelectItem>
        <SelectItem value="usdc">USDC</SelectItem>
        <SelectItem value="btc">BTC</SelectItem>
        <SelectItem value="eth">ETH</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="usdc">
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="xlm">XLM</SelectItem>
        <SelectItem value="usdc">USDC</SelectItem>
        <SelectItem value="btc">BTC</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Unavailable" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="xlm">XLM</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Small trigger" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="xlm">XLM</SelectItem>
        <SelectItem value="usdc">USDC</SelectItem>
      </SelectContent>
    </Select>
  ),
}
