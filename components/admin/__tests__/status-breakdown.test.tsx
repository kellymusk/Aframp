import { render, screen } from '@testing-library/react'
import { StatusBreakdown } from '../status-breakdown'

describe('StatusBreakdown', () => {
  it('lists each status with a thousands-separated count', () => {
    render(
      <StatusBreakdown
        title="Payments"
        items={[
          { status: 'confirmed', count: 15201 },
          { status: 'failed', count: 212 },
        ]}
      />
    )
    expect(screen.getByText('Payments')).toBeInTheDocument()
    expect(screen.getByText('15,201')).toBeInTheDocument()
    expect(screen.getByText('212')).toBeInTheDocument()
  })
})
