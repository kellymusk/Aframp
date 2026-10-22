import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Payment received</CardTitle>
        <CardDescription>A merchant charge just settled.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">125.00 USDC</p>
      </CardContent>
      <CardFooter>
        <Button size="sm" className="w-full">
          View details
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>No content yet</CardTitle>
        <CardDescription>Cards work with just a header.</CardDescription>
      </CardHeader>
    </Card>
  ),
}
