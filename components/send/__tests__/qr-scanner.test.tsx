import { render, screen, fireEvent } from '@testing-library/react'
import { QRScanner } from '../qr-scanner'

describe('QRScanner', () => {
  it('renders the scanner view', () => {
    render(<QRScanner onScan={jest.fn()} onClose={jest.fn()} />)

    expect(screen.getByText('Scan QR code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mock scan result' })).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<QRScanner onScan={jest.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onScan with the mock address when a scan completes', () => {
    const onScan = jest.fn()
    render(<QRScanner onScan={onScan} onClose={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mock scan result' }))

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith('GABCDEF1234567890')
  })
})
