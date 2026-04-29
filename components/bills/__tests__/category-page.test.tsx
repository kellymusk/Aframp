import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryPageClient } from '@/components/bills/category-page-client'
import '@testing-library/jest-dom'

// Mock the hooks
jest.mock('@/hooks/use-bills-data', () => ({
  useBillsData: () => ({
    categories: [{ id: 'electricity', name: 'Electricity', icon: '⚡' }],
    recentBillers: [
      {
        id: 'aedc',
        name: 'AEDC',
        category: 'electricity',
        description: 'Power provider',
        logo: '💡',
      },
    ],
    loading: false,
  }),
}))

jest.mock('@/hooks/use-wallet-connection', () => ({
  useWalletConnection: () => ({
    address: 'GABC...XYZ',
    connected: true,
  }),
}))

describe('CategoryPageClient', () => {
  it('renders the correct category title', () => {
    render(<CategoryPageClient categorySlug="electricity" />)
    // Use getAllByText because it appears in header and breadcrumbs, then check the H1 specifically
    const headings = screen.getAllByText(/Electricity/i)
    expect(headings[0]).toBeInTheDocument()
  })

  it('filters billers based on search input', () => {
    render(<CategoryPageClient categorySlug="electricity" />)

    expect(screen.getByText('AEDC')).toBeInTheDocument()

    // Updated to match the actual placeholder: "Search for a provider..."
    const searchInput = screen.getByPlaceholderText(/Search for a provider/i)
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } })

    expect(screen.queryByText('AEDC')).not.toBeInTheDocument()
  })

  it('navigates back to the bills landing page', () => {
    render(<CategoryPageClient categorySlug="electricity" />)
    // Matches "Back to Categories" instead of just "Back"
    const backButton = screen.getByRole('link', { name: /back/i })
    expect(backButton).toHaveAttribute('href', '/bills')
  })
})
